# AuralWise CLI

[中文文档](./README_CN.md)

Command-line interface for [AuralWise](https://auralwise.cn) Speech Intelligence API.

One API call returns transcription, speaker diarization, speaker embeddings, word-level timestamps, and 521-class audio event detection — all at once.

## Features

- **Speech Transcription** — 99 languages, with a dedicated Chinese engine (`optimize_zh`) for faster speed and higher accuracy
- **Speaker Diarization** — Automatic speaker count detection, per-segment speaker labels
- **Speaker Embeddings** — 192-dim voice print vectors for cross-recording speaker matching
- **Timestamps** — Word-level (~10ms) or segment-level (~100ms) precision
- **Audio Event Detection** — 521 AudioSet sound event classes (applause, cough, music, keyboard, etc.)
- **VAD** — Voice Activity Detection segments
- **Batch Mode** — Half-price processing using off-peak GPU capacity, delivered within 24h
- **Local Transcoding + Vocal Enhancement** — Automatically transcodes audio to mono 16kHz 32kbps MP3 and applies a vocal enhancement filter chain (denoise, highpass, EQ, loudness normalization) before upload, cutting upload size dramatically and improving ASR accuracy on noisy recordings

## Installation

```bash
npm install -g auralwise_cli
```

Requires Node.js >= 18.

## Quick Start

```bash
# Set your API key (get one at https://auralwise.cn)
export AURALWISE_API_KEY=asr_xxxxxxxxxxxxxxxxxxxx

# Transcribe from URL — waits for completion and prints results
auralwise transcribe https://example.com/meeting.mp3

# Transcribe a local file (auto base64 upload)
auralwise transcribe ./recording.wav

# Chinese optimization mode (faster, cheaper for Chinese audio)
auralwise transcribe ./meeting.mp3 --optimize-zh --language zh

# Submit without waiting
auralwise transcribe https://example.com/audio.mp3 --no-wait

# Get JSON output
auralwise transcribe ./audio.mp3 --json --output result.json
```

## Commands

### `auralwise transcribe <source>`

Submit an audio file for processing. `<source>` can be an HTTP(S) URL or a local file path.

**Input modes:**
- **URL mode** — Pass an `https://...` URL. By default the CLI downloads and transcodes the audio locally before upload; if ffmpeg is missing or transcoding is disabled, the URL is submitted directly to the API.
- **File mode** — Pass a local file path; the CLI reads, transcodes, and uploads as base64.

**Local transcoding pipeline (default ON):**

When ffmpeg is available on your `PATH`, the CLI first converts your audio to mono 16kHz 32kbps MP3 with a vocal enhancement filter chain (afftdn denoise → 80Hz highpass → two-band EQ → dynaudnorm loudness). This typically shrinks uploads by 10-20× and yields cleaner ASR on noisy recordings. Temp files are deleted immediately after the upload succeeds.

- If ffmpeg isn't installed, the CLI prints a one-time warning and submits the original file/URL unchanged.
- If the filter chain is incompatible with a particular source, it falls back to a plain transcode (same format, no filters).
- Upload size is capped at **150 MB**. A local file exceeding the limit aborts with an error; a URL source that exceeds the limit after transcoding falls back to submitting the URL directly.
- Pass `--no-transcode` to skip transcoding entirely and upload the file as-is.

**Common options:**

| Option | Description |
|--------|-------------|
| `--language <lang>` | ASR language code (`zh`, `en`, `ja`, ...) or auto-detect if omitted |
| `--optimize-zh` | Use dedicated Chinese engine (faster, cheaper, segment-level timestamps) |
| `--no-asr` | Disable transcription |
| `--no-diarize` | Disable speaker diarization |
| `--no-events` | Disable audio event detection |
| `--no-transcode` | Skip local transcoding; upload the original file as-is |
| `--hotwords <words>` | Boost recognition of specific words (comma-separated) |
| `--num-speakers <n>` | Set fixed number of speakers |
| `--max-speakers <n>` | Max speakers for auto-detection (default: 10) |
| `--batch` | Use batch mode (half-price, 24h delivery) |
| `--no-wait` | Return immediately after task creation |
| `--json` | Output result as JSON |
| `--output <file>` | Save result to file |
| `--callback-url <url>` | Webhook URL for completion notification |

**Advanced ASR options:**

| Option | Description |
|--------|-------------|
| `--beam-size <n>` | Beam search width (default: 5) |
| `--temperature <n>` | Decoding temperature (default: 0.0) |
| `--initial-prompt <text>` | Guide transcription style |
| `--vad-threshold <n>` | VAD sensitivity 0-1 (default: 0.35) |
| `--events-threshold <n>` | Audio event confidence threshold (default: 0.3) |
| `--events-classes <list>` | Only detect specific event classes |

### `auralwise tasks`

List your tasks with optional filtering.

```bash
auralwise tasks                          # List all tasks
auralwise tasks --status done            # Only completed tasks
auralwise tasks --page 2 --page-size 50  # Pagination
auralwise tasks --json                   # JSON output
```

### `auralwise task <id>`

Get details of a specific task.

```bash
auralwise task 550e8400-e29b-41d4-a716-446655440000
auralwise task 550e8400-e29b-41d4-a716-446655440000 --json
```

### `auralwise result <id>`

Retrieve the full result of a completed task.

```bash
auralwise result <task-id>                     # Pretty-printed output
auralwise result <task-id> --json              # JSON output
auralwise result <task-id> --output result.json  # Save to file
```

### `auralwise delete <id>`

Delete a task and its associated files.

```bash
auralwise delete <task-id>           # With confirmation prompt
auralwise delete <task-id> --force   # Skip confirmation
```

### `auralwise events`

Browse the 521 AudioSet sound event classes.

```bash
auralwise events                       # List all 521 classes
auralwise events --search Cough        # Search by name
auralwise events --category Music      # Filter by category
auralwise events --json                # JSON output
```

## Configuration

### API Key

Set your API key via `--api-key` flag or environment variable:

```bash
# Environment variable (recommended)
export AURALWISE_API_KEY=asr_xxxxxxxxxxxxxxxxxxxx

# Or pass directly
auralwise --api-key asr_xxxx transcribe ./audio.mp3
```

### Base URL

Override the API endpoint (default: `https://api.auralwise.cn/v1`):

```bash
auralwise --base-url https://your-private-instance.com/v1 transcribe ./audio.mp3
```

### Language

The CLI supports English and Chinese interfaces:

```bash
auralwise --locale zh --help           # Chinese interface
auralwise --locale en transcribe --help  # English interface (default)
```

## Examples

### Meeting transcription with speaker diarization

```bash
auralwise transcribe ./meeting.mp3 \
  --optimize-zh \
  --language zh \
  --max-speakers 5 \
  --output meeting_result.json
```

### Batch processing (half-price)

```bash
# Submit in batch mode — processed during off-peak hours, 50% discount
auralwise transcribe https://storage.example.com/archive.mp3 \
  --batch \
  --no-wait \
  --callback-url https://your-server.com/webhook
```

### Audio event detection only

```bash
auralwise transcribe ./audio.mp3 \
  --no-asr \
  --no-diarize \
  --events-classes "Cough,Music,Applause" \
  --json
```

### Transcription only (no diarization, no events)

```bash
auralwise transcribe ./podcast.mp3 \
  --no-diarize \
  --no-events \
  --hotwords "AuralWise,PGPU" \
  --output transcript.json
```

## Output Format

### Pretty-printed (default)

```
Audio Duration: 5.3min
Language: zh (99%)
Speakers: 2

Transcription

[0:00.5 - 0:02.3] SPEAKER_0: This is the first sentence
[0:02.5 - 0:04.1] SPEAKER_1: And this is the reply

Audio Events

[0:45.0 - 0:45.9] Cough (87%)
[1:20.0 - 1:25.0] Music (92%)

Speaker Embeddings

  SPEAKER_0: 25 segments, 192-dim vector
  SPEAKER_1: 18 segments, 192-dim vector
```

### JSON (`--json`)

Returns the full API response. See [API documentation](https://auralwise.cn/api-docs) for the complete schema.

## Pricing

| Capability | Standard | Batch (50% off) |
|-----------|----------|-----------------|
| Chinese transcription | ¥0.27/hr | ¥0.14/hr |
| General transcription (with word timestamps) | ¥1.20/hr | ¥0.60/hr |
| Speaker diarization (labels + embeddings) | +¥0.40/hr | +¥0.20/hr |
| Audio event detection (521 classes) | +¥0.10/hr | +¥0.05/hr |

**Example: 100 hours of Chinese meetings (full features) = ¥39 in batch mode.**

## API Documentation

Full API reference: https://auralwise.cn/api-docs

## License

MIT
