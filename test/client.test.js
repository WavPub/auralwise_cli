import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuralWiseClient } from '../lib/client.js';

// Mock fetch globally
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

// Make headers.get work
function makeResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => key === 'content-type' ? 'application/json' : null },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function makeEmptyResponse(status = 204) {
  return {
    ok: true,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(null),
    text: () => Promise.resolve(''),
  };
}

describe('AuralWiseClient', () => {
  const client = new AuralWiseClient({ apiKey: 'test_key', baseUrl: 'https://api.test.com/v1' });

  describe('constructor', () => {
    it('should use default base URL when not provided', () => {
      const c = new AuralWiseClient({ apiKey: 'k' });
      expect(c.baseUrl).toBe('https://api.auralwise.cn/v1');
    });

    it('should strip trailing slashes from base URL', () => {
      const c = new AuralWiseClient({ apiKey: 'k', baseUrl: 'https://api.test.com/v1/' });
      expect(c.baseUrl).toBe('https://api.test.com/v1');
    });
  });

  describe('createTask', () => {
    it('should create task with audio URL', async () => {
      const taskData = { id: 'task-123', status: 'processing' };
      mockFetch.mockResolvedValueOnce(makeResponse(taskData, 201));

      const result = await client.createTask({ audioUrl: 'https://example.com/audio.mp3' });
      expect(result).toEqual(taskData);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.test.com/v1/tasks');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-API-Key']).toBe('test_key');
      expect(opts.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(opts.body);
      expect(body.audio_url).toBe('https://example.com/audio.mp3');
    });

    it('should create task with base64 audio', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 'task-456', status: 'processing' }, 201));

      await client.createTask({
        audioBase64: 'dGVzdA==',
        audioFilename: 'test.mp3',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.audio_base64).toBe('dGVzdA==');
      expect(body.audio_filename).toBe('test.mp3');
    });

    it('should include all options when provided', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 'task-789' }, 201));

      await client.createTask({
        audioUrl: 'https://example.com/audio.mp3',
        options: {
          enable_asr: true,
          enable_diarize: true,
          enable_audio_events: false,
          asr_language: 'zh',
          optimize_zh: true,
          asr_beam_size: 10,
          num_speakers: 3,
        },
        batchMode: true,
        priority: 5,
        callbackUrl: 'https://webhook.test/cb',
        callbackSecret: 'secret123',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.audio_url).toBe('https://example.com/audio.mp3');
      expect(body.options.enable_asr).toBe(true);
      expect(body.options.asr_language).toBe('zh');
      expect(body.options.optimize_zh).toBe(true);
      expect(body.options.asr_beam_size).toBe(10);
      expect(body.options.num_speakers).toBe(3);
      expect(body.batch_mode).toBe(true);
      expect(body.priority).toBe(5);
      expect(body.callback_url).toBe('https://webhook.test/cb');
      expect(body.callback_secret).toBe('secret123');
    });
  });

  describe('listTasks', () => {
    it('should list tasks with default params', async () => {
      const data = { page: 1, page_size: 20, total: 1, tasks: [{ id: 'task-1' }] };
      mockFetch.mockResolvedValueOnce(makeResponse(data));

      const result = await client.listTasks();
      expect(result).toEqual(data);
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/v1/tasks');
    });

    it('should pass query params', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ tasks: [] }));

      await client.listTasks({ page: 2, pageSize: 10, status: 'done' });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('page=2');
      expect(url).toContain('page_size=10');
      expect(url).toContain('status=done');
    });
  });

  describe('getTask', () => {
    it('should get task by ID', async () => {
      const task = { id: 'task-123', status: 'done' };
      mockFetch.mockResolvedValueOnce(makeResponse(task));

      const result = await client.getTask('task-123');
      expect(result).toEqual(task);
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/v1/tasks/task-123');
    });
  });

  describe('getResult', () => {
    it('should get task result', async () => {
      const resultData = {
        task_id: 'task-123',
        audio_duration: 120.5,
        segments: [{ id: 0, start: 0, end: 2.3, text: 'Hello' }],
      };
      mockFetch.mockResolvedValueOnce(makeResponse(resultData));

      const result = await client.getResult('task-123');
      expect(result).toEqual(resultData);
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/v1/tasks/task-123/result');
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      mockFetch.mockResolvedValueOnce(makeEmptyResponse());

      const result = await client.deleteTask('task-123');
      expect(result).toBeNull();
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/v1/tasks/task-123');
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    });
  });

  describe('getAudioEventClasses', () => {
    it('should get event classes', async () => {
      const classes = [
        { index: 0, display_name: 'Speech', zh_name: '语音', category: 'Human sounds' },
      ];
      mockFetch.mockResolvedValueOnce(makeResponse(classes));

      const result = await client.getAudioEventClasses();
      expect(result).toEqual(classes);
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/v1/audio-event-classes');
    });
  });

  describe('error handling', () => {
    it('should throw on non-ok response with JSON error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ error: 'Invalid API key' }),
        text: () => Promise.resolve('{"error":"Invalid API key"}'),
      });

      await expect(client.getTask('x')).rejects.toThrow('API error 401: Invalid API key');
    });

    it('should throw on non-ok response with text error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => 'text/plain' },
        json: () => Promise.reject(new Error('not json')),
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(client.getTask('x')).rejects.toThrow('API error 500: Internal Server Error');
    });
  });

  describe('pollTask', () => {
    it('should poll until task is done', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse({ id: 't1', status: 'processing' }))
        .mockResolvedValueOnce(makeResponse({ id: 't1', status: 'processing', progress: 50 }))
        .mockResolvedValueOnce(makeResponse({ id: 't1', status: 'done', progress: 100 }));

      const statuses = [];
      const result = await client.pollTask('t1', {
        interval: 10,
        onStatus: (t) => statuses.push(t.status),
      });

      expect(result.status).toBe('done');
      expect(statuses).toEqual(['processing', 'processing', 'done']);
    });

    it('should return on failed status', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 't1', status: 'failed', error_message: 'oops' }));

      const result = await client.pollTask('t1', { interval: 10 });
      expect(result.status).toBe('failed');
    });

    it('should return on abandoned status', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 't1', status: 'abandoned' }));

      const result = await client.pollTask('t1', { interval: 10 });
      expect(result.status).toBe('abandoned');
    });
  });
});
