const DEFAULT_BASE_URL = 'https://auralwise.cn/api/v1';

export class AuralWiseClient {
  constructor({ apiKey, baseUrl } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async _request(method, path, { body, query, headers: extraHeaders, timeout } = {}) {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v != null) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers = { 'X-API-Key': this.apiKey, ...extraHeaders };
    const fetchOpts = { method, headers };

    if (body !== undefined) {
      if (typeof body === 'string' || body instanceof Buffer || body instanceof ArrayBuffer) {
        fetchOpts.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        fetchOpts.body = JSON.stringify(body);
      }
    }

    if (timeout) {
      fetchOpts.signal = AbortSignal.timeout(timeout);
    }

    const resp = await fetch(url, fetchOpts);
    if (!resp.ok) {
      let errMsg;
      try {
        const errBody = await resp.json();
        errMsg = errBody.error || errBody.message || JSON.stringify(errBody);
      } catch {
        errMsg = await resp.text();
      }
      throw new Error(`API error ${resp.status}: ${errMsg}`);
    }

    if (resp.status === 204) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return resp.json();
    }
    return resp.text();
  }

  async createTask({ audioUrl, audioBase64, audioFilename, options, batchMode, priority, callbackUrl, callbackSecret }) {
    const body = {};
    if (audioUrl) {
      body.audio_url = audioUrl;
    } else if (audioBase64) {
      body.audio_base64 = audioBase64;
    }
    if (audioFilename) body.audio_filename = audioFilename;
    if (options) body.options = options;
    if (batchMode) body.batch_mode = true;
    if (priority != null) body.priority = priority;
    if (callbackUrl) body.callback_url = callbackUrl;
    if (callbackSecret) body.callback_secret = callbackSecret;

    return this._request('POST', '/tasks', { body, timeout: 300000 });
  }

  async listTasks({ page, pageSize, status } = {}) {
    return this._request('GET', '/tasks', {
      query: { page, page_size: pageSize, status },
    });
  }

  async getTask(taskId) {
    return this._request('GET', `/tasks/${taskId}`);
  }

  async getResult(taskId) {
    return this._request('GET', `/tasks/${taskId}/result`);
  }

  async deleteTask(taskId) {
    return this._request('DELETE', `/tasks/${taskId}`);
  }

  async getAudioEventClasses() {
    return this._request('GET', '/audio-event-classes');
  }

  async pollTask(taskId, { interval = 5000, onStatus } = {}) {
    while (true) {
      const task = await this.getTask(taskId);
      if (onStatus) onStatus(task);
      if (task.status === 'done' || task.status === 'failed' || task.status === 'abandoned') {
        return task;
      }
      await new Promise(r => setTimeout(r, interval));
    }
  }
}
