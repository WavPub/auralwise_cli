import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { stat, unlink, writeFile } from 'node:fs/promises';

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
