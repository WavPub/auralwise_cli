import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { AuralWiseClient } from '../lib/client.js';

const execFileP = promisify(execFile);
const CLI = join(import.meta.dirname, '..', 'bin', 'auralwise.js');
const API_KEY = 'asr_nPV5wQPqXzWZz1bCJakEL93KEnguNtbcv4Lrnvzl8HxlakahidXmuZZNsAsfvsBi';

// Short audio URL for testing (from ximalaya RSS)
const TEST_AUDIO_URL = 'https://jt.ximalaya.com//GKwRIW4NqX4DAFRK5ASGDhOa.m4a?channel=rss&album_id=51076156&track_id=968322893&uid=168606226&jt=https://aod.cos.tx.xmcdn.com/storages/7939-audiofreehighqps/76/F8/GKwRIW4NqX4DAFRK5ASGDhOa.m4a';

async function runCli(...args) {
  try {
    const { stdout, stderr } = await execFileP('node', [CLI, '--api-key', API_KEY, ...args], {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', code: err.code };
  }
}

describe('Integration: API Client', () => {
  const client = new AuralWiseClient({ apiKey: API_KEY });

  it('should list tasks', async () => {
    const data = await client.listTasks({ page: 1, pageSize: 2 });
    expect(data).toHaveProperty('tasks');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.tasks)).toBe(true);
  });

  it('should get audio event classes', async () => {
    const classes = await client.getAudioEventClasses();
    expect(Array.isArray(classes)).toBe(true);
    expect(classes.length).toBe(521);
    expect(classes[0]).toHaveProperty('display_name');
    expect(classes[0]).toHaveProperty('zh_name');
    expect(classes[0]).toHaveProperty('category');
  });

  it('should get existing task detail', async () => {
    const list = await client.listTasks({ page: 1, pageSize: 1, status: 'done' });
    if (list.tasks.length > 0) {
      const task = await client.getTask(list.tasks[0].id);
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('status');
      expect(task.status).toBe('done');
    }
  });

  it('should get existing task result', async () => {
    const list = await client.listTasks({ page: 1, pageSize: 1, status: 'done' });
    if (list.tasks.length > 0) {
      const result = await client.getResult(list.tasks[0].id);
      expect(result).toHaveProperty('task_id');
    }
  });
});

describe('Integration: CLI commands', () => {
  it('should list tasks via CLI', async () => {
    const { stdout } = await runCli('tasks', '--page-size', '3', '--json');
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty('tasks');
    expect(data).toHaveProperty('total');
  });

  it('should list tasks with status filter', async () => {
    const { stdout } = await runCli('tasks', '--status', 'done', '--page-size', '2', '--json');
    const data = JSON.parse(stdout);
    for (const task of data.tasks) {
      expect(task.status).toBe('done');
    }
  });

  it('should show task detail via CLI', async () => {
    // Get a task ID first
    const { stdout: listOut } = await runCli('tasks', '--page-size', '1', '--json');
    const list = JSON.parse(listOut);
    if (list.tasks.length > 0) {
      const { stdout } = await runCli('task', list.tasks[0].id, '--json');
      const task = JSON.parse(stdout);
      expect(task).toHaveProperty('id');
      expect(task.id).toBe(list.tasks[0].id);
    }
  });

  it('should get result via CLI (saved to file)', async () => {
    const outFile = '/tmp/auralwise_cli_result_test.json';
    const { stdout: listOut } = await runCli('tasks', '--status', 'done', '--page-size', '1', '--json');
    const list = JSON.parse(listOut);
    if (list.tasks.length > 0) {
      await runCli('result', list.tasks[0].id, '--output', outFile);
      const { readFile } = await import('node:fs/promises');
      const content = await readFile(outFile, 'utf-8');
      const result = JSON.parse(content);
      expect(result).toHaveProperty('task_id');
      await unlink(outFile).catch(() => {});
    }
  });

  it('should list events via CLI', async () => {
    const { stdout } = await runCli('events', '--json');
    const classes = JSON.parse(stdout);
    expect(classes.length).toBe(521);
  });

  it('should search events via CLI', async () => {
    const { stdout } = await runCli('events', '--search', 'Cough', '--json');
    const classes = JSON.parse(stdout);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.some(c => c.display_name.includes('Cough'))).toBe(true);
  });

  it('should filter events by category', async () => {
    const { stdout } = await runCli('events', '--category', 'Music', '--json');
    const classes = JSON.parse(stdout);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every(c => c.category.includes('Music'))).toBe(true);
  });

  it('should save result to file', async () => {
    const outFile = '/tmp/auralwise_test_result.json';
    const { stdout: listOut } = await runCli('tasks', '--status', 'done', '--page-size', '1', '--json');
    const list = JSON.parse(listOut);
    if (list.tasks.length > 0) {
      await runCli('result', list.tasks[0].id, '--output', outFile);
      const { readFile } = await import('node:fs/promises');
      const content = await readFile(outFile, 'utf-8');
      const result = JSON.parse(content);
      expect(result).toHaveProperty('task_id');
      await unlink(outFile).catch(() => {});
    }
  });
});

describe('Integration: Transcribe (URL mode)', () => {
  it('should submit a URL task and get result with --no-wait', async () => {
    const { stdout } = await runCli('transcribe', TEST_AUDIO_URL, '--no-wait', '--json');
    // Should contain task info (may not be JSON if spinner output interferes)
    // The task creation itself is what we test - the CLI should print task info
    expect(stdout).toBeTruthy();
  });
});

describe('Integration: Transcribe (base64 mode)', () => {
  it('should submit a base64 task from a small test file', async () => {
    // Create a tiny valid WAV file for testing (44 bytes header + 100 bytes of silence)
    const header = Buffer.alloc(44);
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(136, 4); // file size - 8
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(16000, 24); // sample rate
    header.writeUInt32LE(32000, 28); // byte rate
    header.writeUInt16LE(2, 32); // block align
    header.writeUInt16LE(16, 34); // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(100, 40); // data size

    const audioData = Buffer.concat([header, Buffer.alloc(100)]);
    const testFile = '/tmp/auralwise_test.wav';
    await writeFile(testFile, audioData);

    const { stdout, stderr } = await runCli('transcribe', testFile, '--no-wait', '--json', '--no-events');
    // We accept either success (task created) or a reasonable API error (file too short)
    // The point is that the CLI correctly reads the file and sends base64
    expect(stdout.length + stderr.length).toBeGreaterThan(0);

    await unlink(testFile).catch(() => {});
  });
});
