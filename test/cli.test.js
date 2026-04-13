import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileP = promisify(execFile);
const CLI = join(import.meta.dirname, '..', 'bin', 'auralwise.js');

async function run(...args) {
  try {
    const { stdout, stderr } = await execFileP('node', [CLI, ...args], {
      timeout: 10000,
      env: { ...process.env, AURALWISE_API_KEY: '' },
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', code: err.code };
  }
}

describe('CLI entry', () => {
  it('should show help with --help', async () => {
    const { stdout } = await run('--help');
    expect(stdout).toContain('auralwise');
    expect(stdout).toContain('transcribe');
    expect(stdout).toContain('tasks');
    expect(stdout).toContain('task');
    expect(stdout).toContain('result');
    expect(stdout).toContain('delete');
    expect(stdout).toContain('events');
  });

  it('should show version with --version', async () => {
    const { stdout } = await run('--version');
    expect(stdout.trim()).toBe('1.0.6');
  });

  it('should show Chinese UI with --locale zh', async () => {
    const { stdout } = await run('--locale', 'zh', '--help');
    expect(stdout).toContain('语音智能');
    expect(stdout).toContain('提交音频转写任务');
    expect(stdout).toContain('列出任务');
  });

  it('should show transcribe subcommand help', async () => {
    const { stdout } = await run('transcribe', '--help');
    expect(stdout).toContain('--language');
    expect(stdout).toContain('--no-asr');
    expect(stdout).toContain('--no-diarize');
    expect(stdout).toContain('--no-transcode');
    expect(stdout).toContain('--optimize-zh');
    expect(stdout).toContain('--beam-size');
    expect(stdout).toContain('--hotwords');
    expect(stdout).toContain('--num-speakers');
    expect(stdout).toContain('--events-threshold');
    expect(stdout).toContain('--batch');
    expect(stdout).toContain('--callback-url');
    expect(stdout).toContain('--json');
    expect(stdout).toContain('--output');
  });

  it('should show tasks subcommand help', async () => {
    const { stdout } = await run('tasks', '--help');
    expect(stdout).toContain('--status');
    expect(stdout).toContain('--page');
    expect(stdout).toContain('--page-size');
    expect(stdout).toContain('--json');
  });

  it('should show task subcommand help', async () => {
    const { stdout } = await run('task', '--help');
    expect(stdout).toContain('<id>');
    expect(stdout).toContain('--json');
  });

  it('should show result subcommand help', async () => {
    const { stdout } = await run('result', '--help');
    expect(stdout).toContain('<id>');
    expect(stdout).toContain('--output');
    expect(stdout).toContain('--json');
  });

  it('should show delete subcommand help', async () => {
    const { stdout } = await run('delete', '--help');
    expect(stdout).toContain('<id>');
    expect(stdout).toContain('--force');
  });

  it('should show events subcommand help', async () => {
    const { stdout } = await run('events', '--help');
    expect(stdout).toContain('--category');
    expect(stdout).toContain('--search');
    expect(stdout).toContain('--json');
  });

  it('should error without api key for tasks command', async () => {
    const { stderr, code } = await run('tasks');
    expect(stderr).toContain('API key');
    expect(code).not.toBe(0);
  });

  it('should show Chinese option descriptions with --locale zh for transcribe', async () => {
    const { stdout } = await run('--locale', 'zh', 'transcribe', '--help');
    expect(stdout).toContain('禁用本地转码');
    expect(stdout).toContain('禁用语音转写');
    expect(stdout).toContain('禁用说话人分离');
    expect(stdout).toContain('启用中文精简模式');
    expect(stdout).toContain('以 JSON 格式输出');
    expect(stdout).toContain('将结果保存到文件');
  });

  it('should show Chinese option descriptions with --locale zh for tasks', async () => {
    const { stdout } = await run('--locale', 'zh', 'tasks', '--help');
    expect(stdout).toContain('按状态过滤');
    expect(stdout).toContain('页码');
    expect(stdout).toContain('每页数量');
  });

  it('should show Chinese option descriptions with --locale zh for events', async () => {
    const { stdout } = await run('--locale', 'zh', 'events', '--help');
    expect(stdout).toContain('按类别过滤');
    expect(stdout).toContain('搜索事件名称');
  });

  it('should show Chinese global options with --locale zh', async () => {
    const { stdout } = await run('--locale', 'zh', '--help');
    expect(stdout).toContain('API 密钥');
    expect(stdout).toContain('界面语言');
  });

  it('should show Chinese error without api key', async () => {
    const { stderr, code } = await run('--locale', 'zh', 'tasks');
    expect(stderr).toContain('API Key');
    expect(code).not.toBe(0);
  });
});
