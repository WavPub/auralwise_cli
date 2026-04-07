import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTime, formatDuration, formatFileSize } from '../lib/utils.js';
import { setLocale, t, getLocale } from '../lib/i18n.js';

describe('formatTime', () => {
  it('should format seconds < 60', () => {
    expect(formatTime(5.5)).toBe('0:05.5');
  });

  it('should format minutes', () => {
    expect(formatTime(65.3)).toBe('1:05.3');
  });

  it('should format hours', () => {
    expect(formatTime(3661.2)).toBe('1:01:01.2');
  });

  it('should handle zero', () => {
    expect(formatTime(0)).toBe('0:00.0');
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(30)).toBe('30.0s');
  });

  it('should format minutes', () => {
    expect(formatDuration(150)).toBe('2.5min');
  });

  it('should format hours', () => {
    expect(formatDuration(7200)).toBe('2.0h');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('should format MB', () => {
    expect(formatFileSize(5242880)).toBe('5.0 MB');
  });
});

describe('i18n', () => {
  afterEach(() => setLocale('en'));

  it('should default to en', () => {
    expect(getLocale()).toBe('en');
  });

  it('should return English messages', () => {
    setLocale('en');
    expect(t('taskCompleted')).toBe('Task completed!');
  });

  it('should return Chinese messages', () => {
    setLocale('zh');
    expect(t('taskCompleted')).toBe('任务完成！');
  });

  it('should accept cn as zh alias', () => {
    setLocale('cn');
    expect(getLocale()).toBe('zh');
  });

  it('should substitute params', () => {
    expect(t('resultSaved', { file: 'out.json' })).toBe('Result saved to out.json');
  });

  it('should substitute params in zh', () => {
    setLocale('zh');
    expect(t('taskDeleted', { id: 'abc123' })).toBe('任务 abc123 已删除。');
  });

  it('should fallback to key if not found', () => {
    expect(t('nonExistentKey')).toBe('nonExistentKey');
  });
});
