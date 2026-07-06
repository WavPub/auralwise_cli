const DEFAULT_BASE_URL = 'https://api.auralwise.cn/v1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Client-side token bucket that mirrors the server's per-user rate-limit model
// (rate = tps, capacity = burst). Used to proactively pace requests so the CLI
// stays under the account's tps_limit (see `auralwise account`). Disabled when
// rate <= 0, in which case take() is a no-op.
class TokenBucket {
  constructor(rate, burst) {
    this.rate = rate > 0 ? rate : 0;
    this.capacity = burst > 0 ? burst : 1;
    this.tokens = this.capacity;
    this.last = Date.now();
  }

  async take() {
    if (this.rate <= 0) return; // disabled
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.rate);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil(((1 - this.tokens) / this.rate) * 1000);
      await sleep(waitMs);
    }
  }
}

// Error carrying the upstream HTTP status + error_code so callers can branch on
// the exact failure (402 insufficient_balance vs 429 rate_limited vs
// concurrency_limit_exceeded). retryAfter is the server-advised wait in seconds.
export class ApiError extends Error {
  constructor(status, message, { errorCode = null, retryAfter = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.retryAfter = retryAfter;
  }
}

export class AuralWiseClient {
  constructor({ apiKey, baseUrl, tps = 0, burst = 5, maxRetries = 5, retryBaseMs = 500, onRetry } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxRetries = Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 5;
    this.retryBaseMs = retryBaseMs > 0 ? retryBaseMs : 500;
    this.onRetry = onRetry;
    this.throttle = new TokenBucket(tps, burst);
  }

  // Backoff for a rate-limit retry: honor the server's Retry-After (seconds) as a
  // floor, then add exponential backoff with full jitter, capped at 60s.
  _rateLimitDelayMs(attempt, retryAfterSec) {
    const exp = Math.min(60000, this.retryBaseMs * 2 ** (attempt - 1));
    const jittered = Math.random() * exp;
    const floor = retryAfterSec != null && retryAfterSec > 0 ? retryAfterSec * 1000 : 0;
    return Math.max(floor, jittered);
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

    for (let attempt = 1; ; attempt++) {
      await this.throttle.take();
      const resp = await fetch(url, fetchOpts);

      if (resp.ok) {
        if (resp.status === 204) return null;
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) return resp.json();
        return resp.text();
      }

      // Read the error body once, pulling out error_code / retry_after_seconds.
      let errMsg;
      let errorCode = null;
      let retryAfter = null;
      try {
        const errBody = await resp.json();
        errMsg = errBody.error || errBody.message || JSON.stringify(errBody);
        errorCode = errBody.error_code || null;
        if (errBody.retry_after_seconds != null) retryAfter = Number(errBody.retry_after_seconds);
      } catch {
        errMsg = await resp.text();
      }
      // Retry-After response header takes precedence over the body field.
      const raHeader = resp.headers.get('retry-after');
      if (raHeader != null) {
        const n = parseInt(raHeader, 10);
        if (Number.isFinite(n)) retryAfter = n;
      }

      // Only a rate-limit 429 is safe to auto-retry: the request was rejected
      // before any side effect and the server explicitly tells us to slow down.
      // Concurrency 429 needs task slots to free up (surface it so the user can
      // act); 402 is a balance problem (retrying won't help); 5xx is not retried
      // because createTask is non-idempotent and could be duplicated.
      const isRateLimited = resp.status === 429 && errorCode === 'rate_limited';
      if (isRateLimited && attempt <= this.maxRetries) {
        const waitMs = this._rateLimitDelayMs(attempt, retryAfter);
        if (this.onRetry) this.onRetry({ attempt, waitMs, retryAfter, errorCode, status: resp.status });
        await sleep(waitMs);
        continue;
      }

      throw new ApiError(resp.status, `API error ${resp.status}: ${errMsg}`, { errorCode, retryAfter });
    }
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

  async getAccount() {
    return this._request('GET', '/account');
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
