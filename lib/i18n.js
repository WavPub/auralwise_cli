const messages = {
  en: {
    // General
    apiKeyRequired: 'Error: API key required. Use --api-key or set AURALWISE_API_KEY environment variable.',
    // Global options
    optApiKey: 'API key (or set AURALWISE_API_KEY env)',
    optBaseUrl: 'API base URL',
    optLocale: 'UI language: en or zh (default: en)',

    // Transcribe command
    submittingTask: 'Submitting task...',
    taskCreated: 'Task created',
    waitingTask: 'Waiting for task to complete...',
    taskCompleted: 'Task completed!',
    taskFailed: 'Task {status}: {error}',
    resultSaved: 'Result saved to {file}',
    optLanguage: 'ASR language (zh/en/ja/... or null for auto)',
    optNoAsr: 'Disable ASR',
    optNoDiarize: 'Disable speaker diarization',
    optNoEvents: 'Disable audio event detection',
    optNoTranscode: 'Disable local transcoding (upload original file as-is)',
    ffmpegNotFound: 'Warning: ffmpeg not found, skipping local transcoding. Install ffmpeg for smaller uploads.',
    downloadingUrl: 'Downloading audio from URL...',
    downloadedUrl: 'Downloaded ({size})',
    downloadFailed: 'Download failed, falling back to submitting URL directly: {error}',
    transcoding: 'Transcoding to mono 16kHz 32kbps MP3 with vocal enhancement...',
    transcodedEnhanced: 'Transcoded with vocal enhancement ({size})',
    transcodedPlain: 'Transcoded without vocal enhancement — filters unsupported, fell back to plain transcode ({size})',
    transcodeFailed: 'Transcoding failed: {error}',
    tooLargeFallbackUrl: 'File too large ({size}), falling back to submitting the original URL.',
    fileTooLarge: 'File too large: {size} exceeds the {max} upload limit. Try enabling transcoding or provide a URL instead.',
    fileTooSmall: 'File too small: {size} is below the {min} minimum — not a valid audio file.',
    fileExceedsServerLimit: 'File size {size} exceeds the upstream service limit of {max}.',
    durationExceedsLimit: 'Audio duration {duration} exceeds the upstream service limit of {max}.',
    optOptimizeZh: 'Enable Chinese optimization mode',
    optBeamSize: 'Beam search width',
    optTemperature: 'Decoding temperature',
    optHotwords: 'Hotwords (comma-separated)',
    optInitialPrompt: 'Initial prompt text',
    optVadThreshold: 'VAD threshold (0-1)',
    optVadMinSpeech: 'Min speech duration in ms',
    optVadMinSilence: 'Min silence duration in ms',
    optNoSpeechThreshold: 'No-speech probability threshold',
    optNumSpeakers: 'Fixed number of speakers',
    optMinSpeakers: 'Minimum speakers for auto-detection',
    optMaxSpeakers: 'Maximum speakers for auto-detection',
    optEventsThreshold: 'Audio event confidence threshold',
    optEventsClasses: 'Specific event classes (comma-separated)',
    optBatch: 'Enable batch mode (lower priority)',
    optCallbackUrl: 'Webhook callback URL',
    optCallbackSecret: 'Webhook HMAC secret',
    optNoWait: 'Submit and return immediately without polling',
    optPollInterval: 'Polling interval in seconds',
    optJson: 'Output as JSON',
    optOutput: 'Save result to file',

    // Tasks command
    optStatus: 'Filter by status (pending/processing/done/failed/abandoned)',
    optPage: 'Page number',
    optPageSize: 'Items per page',
    tableHeaderId: 'ID',
    tableHeaderStatus: 'Status',
    tableHeaderFilename: 'Filename',
    tableHeaderCreated: 'Created',

    // Delete command
    optForce: 'Skip confirmation',

    // Events command
    optCategory: 'Filter by category',
    optSearch: 'Search event name',
    tableHeaderIndex: 'Index',
    tableHeaderName: 'Name',

    // Result display
    audioDuration: 'Audio Duration',
    language: 'Language',
    speakers: 'Speakers',
    transcription: 'Transcription',
    audioEvents: 'Audio Events',
    speakerEmbeddings: 'Speaker Embeddings',
    segments: 'segments',
    dimVector: '-dim vector',

    // Task detail
    taskId: 'Task ID',
    status: 'Status',
    source: 'Source',
    filename: 'Filename',
    size: 'Size',
    created: 'Created',
    started: 'Started',
    finished: 'Finished',
    stage: 'Stage',
    progress: 'Progress',
    error: 'Error',
    options: 'Options',

    // Tasks list
    noTasks: 'No tasks found.',
    total: 'Total',
    page: 'Page',

    // Delete
    taskDeleted: 'Task {id} deleted.',
    confirmDelete: 'Are you sure you want to delete task {id}?',
    deleteCancelled: 'Delete cancelled.',

    // Events
    totalClasses: 'Total event classes',
    category: 'Category',
    noEventsFound: 'No matching events found.',

    // Result display - additional
    vadSegments: 'VAD Segments',
    diarizeSegments: 'Diarize Segments',
    langProb: 'Language Probability',

    // Command descriptions
    descMain: 'AuralWise Speech Intelligence API CLI\n\n  Transcription, speaker diarization, speaker embeddings,\n  word-level timestamps, and 521-class audio event detection\n  — all in one API call.',
    descTranscribe: 'Submit an audio transcription task (URL or local file)',
    descTasks: 'List tasks',
    descTask: 'Get task details',
    descResult: 'Get task result',
    descDelete: 'Delete a task',
    descEvents: 'List all 521 AudioSet sound event classes',
    argSource: 'Audio URL or local file path',
    argTaskId: 'Task ID',
  },
  zh: {
    // General
    apiKeyRequired: '错误：需要 API Key。请使用 --api-key 参数或设置 AURALWISE_API_KEY 环境变量。',
    // Global options
    optApiKey: 'API 密钥（或设置 AURALWISE_API_KEY 环境变量）',
    optBaseUrl: 'API 基础 URL',
    optLocale: '界面语言：en 或 zh（默认 en）',

    // Transcribe command
    submittingTask: '提交任务中...',
    taskCreated: '任务已创建',
    waitingTask: '等待任务完成...',
    taskCompleted: '任务完成！',
    taskFailed: '任务{status}：{error}',
    resultSaved: '结果已保存到 {file}',
    optLanguage: 'ASR 识别语言（zh/en/ja/... 或留空自动检测）',
    optNoAsr: '禁用语音转写',
    optNoDiarize: '禁用说话人分离',
    optNoEvents: '禁用声音事件检测',
    optNoTranscode: '禁用本地转码（按原样上传文件）',
    ffmpegNotFound: '警告：未检测到 ffmpeg，将跳过本地转码。建议安装 ffmpeg 以减小上传体积。',
    downloadingUrl: '从 URL 下载音频中...',
    downloadedUrl: '已下载（{size}）',
    downloadFailed: '下载失败，改为直接提交 URL：{error}',
    transcoding: '正在转码为单声道 16kHz 32kbps MP3（含人声增强）...',
    transcodedEnhanced: '转码完成，已启用人声增强（{size}）',
    transcodedPlain: '转码完成，滤镜不支持已回退为普通转码（{size}）',
    transcodeFailed: '转码失败：{error}',
    tooLargeFallbackUrl: '文件过大（{size}），将改为直接提交原始 URL。',
    fileTooLarge: '文件过大：{size}，超过 {max} 上传限制。请启用本地转码或改用 URL 提交。',
    fileTooSmall: '文件过小：{size}，低于 {min} 最小限制 —— 不是有效的音频文件。',
    fileExceedsServerLimit: '文件大小 {size} 超过上层服务 {max} 限制。',
    durationExceedsLimit: '音频时长 {duration} 超过上层服务 {max} 限制。',
    optOptimizeZh: '启用中文精简模式',
    optBeamSize: 'Beam Search 宽度',
    optTemperature: '解码温度',
    optHotwords: '热词（逗号分隔）',
    optInitialPrompt: '初始提示文本',
    optVadThreshold: 'VAD 语音检测阈值（0-1）',
    optVadMinSpeech: '最短语音段时长（毫秒）',
    optVadMinSilence: '最短静音间隔（毫秒）',
    optNoSpeechThreshold: '无语音概率阈值',
    optNumSpeakers: '固定说话人数',
    optMinSpeakers: '自动检测最少说话人数',
    optMaxSpeakers: '自动检测最多说话人数',
    optEventsThreshold: '声音事件置信度阈值',
    optEventsClasses: '指定事件类别（逗号分隔）',
    optBatch: '启用批量模式（低优先级）',
    optCallbackUrl: 'Webhook 回调 URL',
    optCallbackSecret: 'Webhook HMAC 签名密钥',
    optNoWait: '提交后立即返回，不等待完成',
    optPollInterval: '轮询间隔（秒）',
    optJson: '以 JSON 格式输出',
    optOutput: '将结果保存到文件',

    // Tasks command
    optStatus: '按状态过滤（pending/processing/done/failed/abandoned）',
    optPage: '页码',
    optPageSize: '每页数量',
    tableHeaderId: 'ID',
    tableHeaderStatus: '状态',
    tableHeaderFilename: '文件名',
    tableHeaderCreated: '创建时间',

    // Delete command
    optForce: '跳过确认',

    // Events command
    optCategory: '按类别过滤',
    optSearch: '搜索事件名称',
    tableHeaderIndex: '序号',
    tableHeaderName: '名称',

    // Result display
    audioDuration: '音频时长',
    language: '语言',
    speakers: '说话人数',
    transcription: '转写结果',
    audioEvents: '声音事件',
    speakerEmbeddings: '声纹向量',
    segments: '段',
    dimVector: '维向量',

    // Task detail
    taskId: '任务 ID',
    status: '状态',
    source: '来源',
    filename: '文件名',
    size: '大小',
    created: '创建时间',
    started: '开始时间',
    finished: '完成时间',
    stage: '阶段',
    progress: '进度',
    error: '错误',
    options: '选项',

    // Tasks list
    noTasks: '没有找到任务。',
    total: '总计',
    page: '页',

    // Delete
    taskDeleted: '任务 {id} 已删除。',
    confirmDelete: '确定要删除任务 {id} 吗？',
    deleteCancelled: '已取消删除。',

    // Events
    totalClasses: '事件类别总数',
    category: '类别',
    noEventsFound: '未找到匹配的事件。',

    // Result display - additional
    vadSegments: 'VAD 语音段',
    diarizeSegments: '说话人分离段',
    langProb: '语言置信度',

    // Command descriptions
    descMain: 'AuralWise 语音智能 API 命令行工具\n\n  转写、说话人分离、声纹向量、词级时间戳、521 类声音事件检测\n  —— 一次调用，全部返回。',
    descTranscribe: '提交音频转写任务（URL 或本地文件）',
    descTasks: '列出任务',
    descTask: '查看任务详情',
    descResult: '获取任务结果',
    descDelete: '删除任务',
    descEvents: '列出全部 521 类 AudioSet 声音事件',
    argSource: '音频 URL 或本地文件路径',
    argTaskId: '任务 ID',
  },
};

let currentLocale = 'en';

export function setLocale(locale) {
  currentLocale = (locale === 'zh' || locale === 'cn') ? 'zh' : 'en';
}

export function getLocale() {
  return currentLocale;
}

export function t(key, params) {
  let msg = messages[currentLocale]?.[key] || messages.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, v);
    }
  }
  return msg;
}
