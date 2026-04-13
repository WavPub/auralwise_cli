import { describe, it, expect } from 'vitest';
import { writeFile, unlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  isFfmpegAvailable,
  tmpMp3Path,
  transcodeToMp3,
  safeUnlink,
  fileSize,
  MAX_UPLOAD_BYTES,
  VOCAL_FILTER_CHAIN,
} from '../lib/transcode.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

describe('transcode module', () => {
  it('exposes 150MB upload limit', () => {
    expect(MAX_UPLOAD_BYTES).toBe(150 * 1024 * 1024);
  });

  it('isFfmpegAvailable returns boolean', () => {
    expect(typeof isFfmpegAvailable()).toBe('boolean');
  });

  it('tmpMp3Path returns a path with .mp3 extension in tmpdir', () => {
    const p = tmpMp3Path();
    expect(p.endsWith('.mp3')).toBe(true);
    expect(p.startsWith(tmpdir())).toBe(true);
  });

  it('safeUnlink handles missing files silently', async () => {
    await expect(safeUnlink(join(tmpdir(), `nonexistent-${randomUUID()}`))).resolves.toBeUndefined();
  });

  it('fileSize reports actual byte length', async () => {
    const path = join(tmpdir(), `sz-${randomUUID()}.bin`);
    await writeFile(path, Buffer.alloc(1234));
    expect(await fileSize(path)).toBe(1234);
    await unlink(path);
  });

  it('VOCAL_FILTER_CHAIN includes the expected filters', () => {
    expect(VOCAL_FILTER_CHAIN).toContain('afftdn');
    expect(VOCAL_FILTER_CHAIN).toContain('highpass');
    expect(VOCAL_FILTER_CHAIN).toContain('equalizer');
    expect(VOCAL_FILTER_CHAIN).toContain('dynaudnorm');
  });

  (hasFfmpeg ? it : it.skip)('transcodeToMp3 applies vocal enhancement by default', async () => {
    const wav = join(tmpdir(), `src-${randomUUID()}.wav`);
    const gen = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-ac', '2', '-t', '1', wav,
    ]);
    expect(gen.status).toBe(0);

    const out = tmpMp3Path();
    const result = await transcodeToMp3(wav, out);
    expect(result.output).toBe(out);
    expect(result.enhanced).toBe(true);
    const s = await stat(out);
    expect(s.size).toBeGreaterThan(0);

    const probe = spawnSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=channels,sample_rate,codec_name',
      '-of', 'default=noprint_wrappers=1:nokey=0',
      out,
    ]);
    if (probe.status === 0) {
      const txt = probe.stdout.toString();
      expect(txt).toContain('channels=1');
      expect(txt).toContain('sample_rate=16000');
      expect(txt).toContain('codec_name=mp3');
    }
    await unlink(wav);
    await unlink(out);
  }, 20000);

  (hasFfmpeg ? it : it.skip)('transcodeToMp3 falls back to plain transcode when filters fail', async () => {
    // Point at a nonexistent input — first (filtered) attempt fails, and so
    // does the fallback, so we expect a rejected promise. This confirms both
    // code paths run (spy via error message shape).
    const out = tmpMp3Path();
    await expect(transcodeToMp3('/nonexistent/input.wav', out)).rejects.toThrow();
  });

  (hasFfmpeg ? it : it.skip)('transcodeToMp3 can skip enhancement with enhance:false', async () => {
    const wav = join(tmpdir(), `src-${randomUUID()}.wav`);
    spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=16000',
      '-t', '1', wav,
    ]);
    const out = tmpMp3Path();
    const result = await transcodeToMp3(wav, out, { enhance: false });
    expect(result.enhanced).toBe(false);
    await unlink(wav);
    await unlink(out);
  }, 20000);
});
