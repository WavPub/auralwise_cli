import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stat, unlink, writeFile } from 'node:fs/promises';

// Upstream service limits (asr-service/dispatcher/handlers/user.go).
// Kept in sync so the CLI rejects invalid inputs locally instead of
// round-tripping to the API only to be refused.
export const MIN_FILE_BYTES = 1024;                     // 1 KB
export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;   // 2 GB
export const MAX_DURATION_SECONDS = 5 * 3600;           // 5 hours

// Practical cap for base64-encoded uploads. Below the 2 GB server cap but
// keeps request payloads reasonable.
export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

let ffmpegAvailable = null;

export function isFfmpegAvailable() {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    ffmpegAvailable = r.status === 0;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

export function tmpMp3Path() {
  return join(tmpdir(), `auralwise-${randomUUID()}.mp3`);
}

export async function downloadToTemp(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const urlName = (() => {
    try {
      const u = new URL(url);
      const base = u.pathname.split('/').pop() || 'audio';
      return base;
    } catch {
      return 'audio';
    }
  })();
  const path = join(tmpdir(), `auralwise-dl-${randomUUID()}-${urlName}`);
  await writeFile(path, buf);
  return path;
}

// Vocal enhancement filter chain (ported from asr-service fc_preprocess):
//   afftdn      FFT-based denoise (remove environmental noise)
//   highpass    Cut rumble below 80Hz
//   equalizer   -2dB @ 300Hz to reduce muddiness
//   equalizer   +3dB @ 2500Hz to boost voice clarity
//   dynaudnorm  Single-pass loudness normalization
export const VOCAL_FILTER_CHAIN =
  'afftdn=nf=-25:nr=10,highpass=f=80:poles=2,' +
  'equalizer=f=300:width_type=o:width=2:g=-2,' +
  'equalizer=f=2500:width_type=o:width=2:g=3,' +
  'dynaudnorm=p=0.95:m=10:s=3';

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else {
        const err = new Error(stderr.trim() || `ffmpeg exited with code ${code}`);
        err.code = code;
        reject(err);
      }
    });
  });
}

function baseArgs(inputPath, outputPath, filterChain) {
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', inputPath,
    '-map', '0:a',
    '-vn',
  ];
  if (filterChain) args.push('-af', filterChain);
  args.push(
    '-ac', '1',
    '-ar', '16000',
    '-b:a', '32k',
    '-f', 'mp3',
    outputPath,
  );
  return args;
}

// Returns { output, enhanced } where `enhanced` indicates whether the vocal
// filter chain succeeded. On filter failure, falls back to plain transcoding.
export async function transcodeToMp3(inputPath, outputPath, { enhance = true } = {}) {
  if (enhance) {
    try {
      await runFfmpeg(baseArgs(inputPath, outputPath, VOCAL_FILTER_CHAIN));
      return { output: outputPath, enhanced: true };
    } catch (err) {
      // Filter unsupported or incompatible with this source — fall through
      // to plain transcoding below.
    }
  }
  await runFfmpeg(baseArgs(inputPath, outputPath, null));
  return { output: outputPath, enhanced: false };
}

export async function safeUnlink(path) {
  if (!path) return;
  try { await unlink(path); } catch {}
}

export async function fileSize(path) {
  const s = await stat(path);
  return s.size;
}

// Probe audio duration in seconds via ffprobe. Returns null when ffprobe is
// unavailable or the file has no audio stream — the caller should treat that
// as "unknown" rather than "too long".
export function probeDurationSeconds(path) {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=duration:format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      path,
    ]);
    let stdout = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.on('error', () => resolve(null));
    proc.on('close', (code) => {
      if (code !== 0) return resolve(null);
      const lines = stdout.split('\n').map(s => s.trim()).filter(Boolean);
      for (const l of lines) {
        const n = parseFloat(l);
        if (Number.isFinite(n) && n > 0) return resolve(n);
      }
      resolve(null);
    });
  });
}
