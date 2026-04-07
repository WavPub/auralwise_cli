import chalk from 'chalk';
import { t } from './i18n.js';
import { AuralWiseClient } from './client.js';

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(1);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s.padStart(4, '0')}`;
  return `${m}:${s.padStart(4, '0')}`;
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatStatus(status) {
  const map = {
    pending: chalk.yellow('pending'),
    preprocessing: chalk.cyan('preprocessing'),
    processing: chalk.blue('processing'),
    proofreading: chalk.magenta('proofreading'),
    done: chalk.green('done'),
    failed: chalk.red('failed'),
    abandoned: chalk.gray('abandoned'),
  };
  return map[status] || status;
}

export function formatTaskRow(task) {
  const id = task.id.substring(0, 8);
  const status = formatStatus(task.status);
  const filename = (task.audio_filename || '-').substring(0, 38);
  const created = new Date(task.created_at).toLocaleString();
  return `${id}  ${status.padEnd(20)}  ${filename.padEnd(40)}  ${created}`;
}

export function printResult(result) {
  if (result.audio_duration != null) {
    console.log(chalk.bold(`${t('audioDuration')}:`), formatDuration(result.audio_duration));
  }
  if (result.language) {
    const prob = result.language_probability != null ? ` (${(result.language_probability * 100).toFixed(0)}%)` : '';
    console.log(chalk.bold(`${t('language')}:`), result.language + prob);
  }
  if (result.num_speakers != null) {
    console.log(chalk.bold(`${t('speakers')}:`), result.num_speakers);
  }

  if (result.segments && result.segments.length > 0) {
    console.log();
    console.log(chalk.bold.underline(t('transcription')));
    console.log();
    for (const seg of result.segments) {
      const time = `[${formatTime(seg.start)} - ${formatTime(seg.end)}]`;
      const speaker = seg.speaker ? chalk.cyan(`${seg.speaker}: `) : '';
      console.log(`${chalk.gray(time)} ${speaker}${seg.text}`);
    }
  }

  if (result.audio_events && result.audio_events.length > 0) {
    console.log();
    console.log(chalk.bold.underline(t('audioEvents')));
    console.log();
    for (const ev of result.audio_events) {
      const time = `[${formatTime(ev.start)} - ${formatTime(ev.end)}]`;
      const conf = `${(ev.confidence * 100).toFixed(0)}%`;
      console.log(`${chalk.gray(time)} ${ev.class} ${chalk.dim(`(${conf})`)}`);
    }
  }

  if (result.speaker_embeddings && result.speaker_embeddings.length > 0) {
    console.log();
    console.log(chalk.bold.underline(t('speakerEmbeddings')));
    console.log();
    for (const spk of result.speaker_embeddings) {
      console.log(`  ${chalk.cyan(spk.speaker_id)}: ${spk.segment_count} ${t('segments')}, ${spk.embedding.length}${t('dimVector')}`);
    }
  }

  if (result.vad_segments && result.vad_segments.length > 0) {
    console.log();
    console.log(chalk.bold.underline(`${t('vadSegments')} (${result.vad_segments.length})`));
    console.log();
    for (const seg of result.vad_segments.slice(0, 20)) {
      const dur = (seg.end - seg.start).toFixed(1);
      console.log(`  [${formatTime(seg.start)} - ${formatTime(seg.end)}] ${chalk.dim(`${dur}s`)}`);
    }
    if (result.vad_segments.length > 20) {
      console.log(chalk.dim(`  ... +${result.vad_segments.length - 20} more`));
    }
  }

  if (result.diarize_segments && result.diarize_segments.length > 0) {
    console.log();
    console.log(chalk.bold.underline(`${t('diarizeSegments')} (${result.diarize_segments.length})`));
    console.log();
    for (const seg of result.diarize_segments.slice(0, 20)) {
      const dur = (seg.end - seg.start).toFixed(1);
      console.log(`  [${formatTime(seg.start)} - ${formatTime(seg.end)}] ${chalk.cyan(seg.speaker)} ${chalk.dim(`${dur}s`)}`);
    }
    if (result.diarize_segments.length > 20) {
      console.log(chalk.dim(`  ... +${result.diarize_segments.length - 20} more`));
    }
  }
}

export function printTaskDetail(task) {
  console.log(chalk.bold(`${t('taskId')}:`), task.id);
  console.log(chalk.bold(`${t('status')}:`), formatStatus(task.status));
  console.log(chalk.bold(`${t('source')}:`), task.audio_source_type || '-');
  console.log(chalk.bold(`${t('filename')}:`), task.audio_filename || '-');
  if (task.audio_size) console.log(chalk.bold(`${t('size')}:`), formatFileSize(task.audio_size));
  console.log(chalk.bold(`${t('created')}:`), new Date(task.created_at).toLocaleString());
  if (task.started_at) console.log(chalk.bold(`${t('started')}:`), new Date(task.started_at).toLocaleString());
  if (task.finished_at) console.log(chalk.bold(`${t('finished')}:`), new Date(task.finished_at).toLocaleString());
  if (task.current_stage) console.log(chalk.bold(`${t('stage')}:`), task.current_stage);
  if (task.progress != null) console.log(chalk.bold(`${t('progress')}:`), `${task.progress}%`);
  if (task.error_message) console.log(chalk.bold.red(`${t('error')}:`), task.error_message);

  if (task.options) {
    console.log(chalk.bold(`${t('options')}:`));
    const opts = task.options;
    const lines = [];
    if (opts.enable_asr != null) lines.push(`  ASR: ${opts.enable_asr}`);
    if (opts.enable_diarize != null) lines.push(`  Diarize: ${opts.enable_diarize}`);
    if (opts.enable_audio_events != null) lines.push(`  Audio Events: ${opts.enable_audio_events}`);
    if (opts.asr_language) lines.push(`  Language: ${opts.asr_language}`);
    if (opts.optimize_zh) lines.push(`  Optimize ZH: ${opts.optimize_zh}`);
    if (lines.length > 0) console.log(lines.join('\n'));
  }
}

export function resolveApiKey(cmdOpts) {
  const key = cmdOpts?.apiKey || process.env.AURALWISE_API_KEY;
  if (!key) {
    console.error(chalk.red(t('apiKeyRequired')));
    process.exit(1);
  }
  return key;
}

export function createClient(program) {
  const opts = program.opts();
  const apiKey = resolveApiKey(opts);
  const baseUrl = opts.baseUrl;
  return new AuralWiseClient({ apiKey, baseUrl });
}
