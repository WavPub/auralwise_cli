# AuralWise CLI

[English](./README.md)

[AuralWise](https://auralwise.cn) 语音智能 API 的命令行工具。

一次调用，同时返回转写、说话人分离、声纹向量、词级时间戳和 521 类声音事件 —— 花接近基础转写的钱，拿到完整可用的结构化结果。

## 核心能力

- **语音转写** — 支持 99 种语言，中文场景使用专用引擎（`optimize_zh`），速度更快、准确率更高
- **说话人分离** — 自动检测说话人数量，为每段文本标注说话人标签
- **说话人声纹向量** — 192 维声纹向量，可用于跨录音比对同一说话人
- **精准时间戳** — 词级（~10ms）或段级（~100ms）精度
- **声音事件检测** — 521 类 AudioSet 声音事件（掌声、咳嗽、音乐、键盘声等）
- **语音活动检测** — VAD 语音段识别
- **批量模式** — 使用闲时 GPU 算力，价格直接五折，24 小时内交付

## 安装

```bash
npm install -g auralwise_cli
```

需要 Node.js >= 18。

## 快速上手

```bash
# 设置 API Key（在 https://auralwise.cn 获取）
export AURALWISE_API_KEY=asr_xxxxxxxxxxxxxxxxxxxx

# URL 模式转写 — 等待完成并输出结果
auralwise transcribe https://example.com/meeting.mp3

# 本地文件转写（自动 base64 上传）
auralwise transcribe ./recording.wav

# 中文精简模式（更快、更便宜）
auralwise transcribe ./meeting.mp3 --optimize-zh --language zh

# 提交后立即返回，不等待完成
auralwise transcribe https://example.com/audio.mp3 --no-wait

# JSON 输出并保存到文件
auralwise transcribe ./audio.mp3 --json --output result.json

# 使用中文界面
auralwise --locale zh transcribe --help
```

## 命令列表

### `auralwise transcribe <source>`

提交音频进行处理。`<source>` 可以是 HTTP(S) URL 或本地文件路径。

**输入方式：**
- **URL 模式** — 传入 `https://...` URL，GPU 节点直接下载
- **文件模式** — 传入本地文件路径，CLI 读取文件并以 base64 上传

**常用选项：**

| 选项 | 说明 |
|------|------|
| `--language <lang>` | ASR 识别语言（`zh`、`en`、`ja` 等），不指定则自动检测 |
| `--optimize-zh` | 使用中文专用引擎（更快、更便宜，段级时间戳） |
| `--no-asr` | 禁用语音转写 |
| `--no-diarize` | 禁用说话人分离 |
| `--no-events` | 禁用声音事件检测 |
| `--hotwords <words>` | 热词列表（逗号分隔），提升专有名词识别率 |
| `--num-speakers <n>` | 指定固定说话人数 |
| `--max-speakers <n>` | 自动检测时最大说话人数（默认 10） |
| `--batch` | 批量模式（五折价格，24 小时内完成） |
| `--no-wait` | 提交后立即返回，不轮询等待 |
| `--json` | 以 JSON 格式输出 |
| `--output <file>` | 将结果保存到文件 |
| `--callback-url <url>` | Webhook 回调 URL，任务完成后通知 |

**高级 ASR 选项：**

| 选项 | 说明 |
|------|------|
| `--beam-size <n>` | Beam Search 宽度（默认 5） |
| `--temperature <n>` | 解码温度（默认 0.0） |
| `--initial-prompt <text>` | 初始提示文本，引导转写风格 |
| `--vad-threshold <n>` | VAD 语音检测阈值 0-1（默认 0.35） |
| `--events-threshold <n>` | 声音事件置信度阈值（默认 0.3） |
| `--events-classes <list>` | 仅检测指定的事件类别 |

### `auralwise tasks`

查看任务列表，支持按状态过滤和分页。

```bash
auralwise tasks                          # 列出所有任务
auralwise tasks --status done            # 仅已完成的任务
auralwise tasks --page 2 --page-size 50  # 分页
auralwise tasks --json                   # JSON 输出
```

### `auralwise task <id>`

查看单个任务的详细信息。

```bash
auralwise task 550e8400-e29b-41d4-a716-446655440000
auralwise task 550e8400-e29b-41d4-a716-446655440000 --json
```

### `auralwise result <id>`

获取已完成任务的完整转写结果。

```bash
auralwise result <task-id>                       # 格式化输出
auralwise result <task-id> --json                # JSON 输出
auralwise result <task-id> --output result.json  # 保存到文件
```

### `auralwise delete <id>`

删除任务及其关联的音频文件和结果。

```bash
auralwise delete <task-id>           # 删除前确认
auralwise delete <task-id> --force   # 跳过确认
```

### `auralwise events`

浏览 521 类 AudioSet 声音事件。

```bash
auralwise events                       # 列出全部 521 类
auralwise events --search 咳嗽         # 按名称搜索
auralwise events --category Music      # 按类别过滤
auralwise events --json                # JSON 输出
```

## 配置

### API Key

通过 `--api-key` 参数或环境变量设置：

```bash
# 环境变量（推荐）
export AURALWISE_API_KEY=asr_xxxxxxxxxxxxxxxxxxxx

# 或直接传入
auralwise --api-key asr_xxxx transcribe ./audio.mp3
```

### 自定义 API 地址

私有化部署时可修改 API 地址（默认 `https://api.auralwise.cn/v1`）：

```bash
auralwise --base-url https://your-private-instance.com/v1 transcribe ./audio.mp3
```

### 界面语言

CLI 支持中英文界面切换：

```bash
auralwise --locale zh --help             # 中文界面
auralwise --locale en transcribe --help  # 英文界面（默认）
```

## 使用示例

### 会议录音转写 + 说话人分离

```bash
auralwise transcribe ./meeting.mp3 \
  --optimize-zh \
  --language zh \
  --max-speakers 5 \
  --output meeting_result.json
```

### 批量处理（五折价格）

```bash
# 批量模式 — 利用闲时算力处理，价格直接五折
auralwise transcribe https://storage.example.com/archive.mp3 \
  --batch \
  --no-wait \
  --callback-url https://your-server.com/webhook
```

### 仅声音事件检测

```bash
auralwise transcribe ./audio.mp3 \
  --no-asr \
  --no-diarize \
  --events-classes "Cough,Music,Applause" \
  --json
```

### 仅转写（不需要说话人分离和事件检测）

```bash
auralwise transcribe ./podcast.mp3 \
  --no-diarize \
  --no-events \
  --hotwords "AuralWise,PGPU" \
  --output transcript.json
```

## 输出格式

### 格式化输出（默认）

```
Audio Duration: 5.3min
Language: zh (99%)
Speakers: 2

Transcription

[0:00.5 - 0:02.3] SPEAKER_0: 好的，我们先来看第一个议题
[0:02.5 - 0:04.1] SPEAKER_1: 没问题，请继续

Audio Events

[0:45.0 - 0:45.9] Cough (87%)
[1:20.0 - 1:25.0] Music (92%)

Speaker Embeddings

  SPEAKER_0: 25 segments, 192-dim vector
  SPEAKER_1: 18 segments, 192-dim vector
```

### JSON 输出（`--json`）

返回完整的 API 响应，详见 [API 文档](https://auralwise.cn/api-docs)。

## 定价

| 能力 | 标准价格 | 批量模式（五折） |
|------|---------|----------------|
| 中文转写 | ¥0.27/小时 | ¥0.14/小时 |
| 通用转写（含词级时间戳） | ¥1.20/小时 | ¥0.60/小时 |
| 说话人分离（标签 + 声纹向量） | +¥0.40/小时 | +¥0.20/小时 |
| 声音事件检测（521 类） | +¥0.10/小时 | +¥0.05/小时 |

**示例：100 小时中文会议录音（全功能）= 批量模式仅需 ¥39。**

## 适用场景

- **会议纪要与知识库** — 自动识别每位发言人，生成结构化会议记录
- **客服录音质检** — 多角色对话分析，配合声音事件检测辅助质检
- **访谈 / 播客整理** — 批量转写，按说话人切分段落，快速生成字幕
- **法务 / 合规留档** — 支持私有化部署，数据不出域，方便检索和证据提取
- **课程 / 教育内容** — 课堂录音批量处理，生成带时间戳的字幕
- **影视 / 字幕制作** — 词级时间戳直接生成时间轴字幕
- **历史档案数字化** — 批量模式低成本处理历史录音

## API 文档

完整 API 参考：https://auralwise.cn/api-docs

## 许可证

MIT
