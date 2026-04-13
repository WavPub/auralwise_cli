import { readFile, writeFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { t } from '../i18n.js';
import { createClient, printResult, formatStatus } from '../utils.js';
import {
  MAX_UPLOAD_BYTES,
  MIN_FILE_BYTES,
  MAX_FILE_BYTES,
  MAX_DURATION_SECONDS,
  isFfmpegAvailable,
  tmpMp3Path,
  downloadToTemp,
  transcodeToMp3,
  probeDurationSeconds,
  safeUnlink,
  fileSize,
} from '../transcode.js';

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatHms(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

export function registerTranscribe(program) {
  program
    .command('transcribe')
    .description(t('descTranscribe'))
    .argument('<source>', t('argSource'))
    .option('--language <lang>', t('optLanguage'))
    .option('--no-asr', t('optNoAsr'))
    .option('--no-diarize', t('optNoDiarize'))
    .option('--no-events', t('optNoEvents'))
    .option('--no-transcode', t('optNoTranscode'))
    .option('--optimize-zh', t('optOptimizeZh'))
    .option('--beam-size <n>', t('optBeamSize'), parseInt)
    .option('--temperature <n>', t('optTemperature'), parseFloat)
    .option('--hotwords <words>', t('optHotwords'))
    .option('--initial-prompt <text>', t('optInitialPrompt'))
    .option('--vad-threshold <n>', t('optVadThreshold'), parseFloat)
    .option('--vad-min-speech <ms>', t('optVadMinSpeech'), parseInt)
    .option('--vad-min-silence <ms>', t('optVadMinSilence'), parseInt)
    .option('--no-speech-threshold <n>', t('optNoSpeechThreshold'), parseFloat)
    .option('--num-speakers <n>', t('optNumSpeakers'), parseInt)
    .option('--min-speakers <n>', t('optMinSpeakers'), parseInt)
    .option('--max-speakers <n>', t('optMaxSpeakers'), parseInt)
    .option('--events-threshold <n>', t('optEventsThreshold'), parseFloat)
    .option('--events-classes <classes>', t('optEventsClasses'))
    .option('--batch', t('optBatch'))
    .option('--callback-url <url>', t('optCallbackUrl'))
    .option('--callback-secret <secret>', t('optCallbackSecret'))
    .option('--no-wait', t('optNoWait'))
    .option('--poll-interval <seconds>', t('optPollInterval'), parseFloat, 5)
    .option('--json', t('optJson'))
    .option('--output <file>', t('optOutput'))
    .action(async (source, opts) => {
      const tempFiles = [];
      try {
        const client = createClient(program);
        const isUrl = /^https?:\/\//i.test(source);

        const options = {};
        if (opts.asr === false) options.enable_asr = false;
        if (opts.diarize === false) options.enable_diarize = false;
        if (opts.events === false) options.enable_audio_events = false;
        // Server default is `true`, so we must send this explicitly — otherwise
        // omitting the flag would silently enable Chinese optimization mode.
        options.optimize_zh = opts.optimizeZh === true;
        if (opts.language) options.asr_language = opts.language;
        if (opts.beamSize != null) options.asr_beam_size = opts.beamSize;
        if (opts.temperature != null) options.asr_temperature = opts.temperature;
        if (opts.hotwords) options.hotwords = opts.hotwords.split(',').map(s => s.trim());
        if (opts.initialPrompt) options.initial_prompt = opts.initialPrompt;
        if (opts.vadThreshold != null) options.vad_threshold = opts.vadThreshold;
        if (opts.vadMinSpeech != null) options.vad_min_speech_ms = opts.vadMinSpeech;
        if (opts.vadMinSilence != null) options.vad_min_silence_ms = opts.vadMinSilence;
        if (opts.noSpeechThreshold != null) options.no_speech_threshold = opts.noSpeechThreshold;
        if (opts.numSpeakers != null) options.num_speakers = opts.numSpeakers;
        if (opts.minSpeakers != null) options.min_speakers = opts.minSpeakers;
        if (opts.maxSpeakers != null) options.max_speakers = opts.maxSpeakers;
        if (opts.eventsThreshold != null) options.audio_events_threshold = opts.eventsThreshold;
        if (opts.eventsClasses) options.audio_events_classes = opts.eventsClasses.split(',').map(s => s.trim());

        const taskParams = {
          options: Object.keys(options).length > 0 ? options : undefined,
          batchMode: opts.batch || false,
          callbackUrl: opts.callbackUrl,
          callbackSecret: opts.callbackSecret,
        };

        const transcodeEnabled = opts.transcode !== false;
        const hasFfmpeg = transcodeEnabled ? isFfmpegAvailable() : false;
        if (transcodeEnabled && !hasFfmpeg) {
          console.log(chalk.yellow(t('ffmpegNotFound')));
        }

        let localPath = null;
        let submitAsUrl = false;

        if (isUrl) {
          if (transcodeEnabled && hasFfmpeg) {
            const dlSpinner = ora(t('downloadingUrl')).start();
            try {
              localPath = await downloadToTemp(source);
              tempFiles.push(localPath);
              dlSpinner.succeed(t('downloadedUrl', { size: formatMb(await fileSize(localPath)) }));
            } catch (err) {
              dlSpinner.warn(t('downloadFailed', { error: err.message }));
              submitAsUrl = true;
            }
          } else {
            submitAsUrl = true;
          }
        } else {
          localPath = source;
        }

        // Validate original file against upstream asr-service limits
        // (size 1KB-2GB, duration ≤5h). This catches problems locally before
        // spending an API call. For URL sources submitted directly (no
        // transcoding / no download), the server still enforces these limits.
        if (localPath) {
          const sz = await fileSize(localPath);
          if (sz < MIN_FILE_BYTES) {
            throw new Error(t('fileTooSmall', { size: formatBytes(sz), min: formatBytes(MIN_FILE_BYTES) }));
          }
          if (sz > MAX_FILE_BYTES) {
            throw new Error(t('fileExceedsServerLimit', { size: formatBytes(sz), max: formatBytes(MAX_FILE_BYTES) }));
          }
          if (hasFfmpeg) {
            const duration = await probeDurationSeconds(localPath);
            if (duration != null && duration > MAX_DURATION_SECONDS) {
              throw new Error(t('durationExceedsLimit', { duration: formatHms(duration), max: formatHms(MAX_DURATION_SECONDS) }));
            }
          }
        }

        if (localPath && transcodeEnabled && hasFfmpeg) {
          const transcodeSpinner = ora(t('transcoding')).start();
          const outPath = tmpMp3Path();
          tempFiles.push(outPath);
          try {
            const { enhanced } = await transcodeToMp3(localPath, outPath);
            const sz = await fileSize(outPath);
            const msgKey = enhanced ? 'transcodedEnhanced' : 'transcodedPlain';
            transcodeSpinner.succeed(t(msgKey, { size: formatMb(sz) }));
            localPath = outPath;
          } catch (err) {
            transcodeSpinner.fail(t('transcodeFailed', { error: err.message }));
            throw err;
          }
        }

        if (!submitAsUrl && localPath) {
          const sz = await fileSize(localPath);
          if (sz > MAX_UPLOAD_BYTES) {
            if (isUrl) {
              console.log(chalk.yellow(t('tooLargeFallbackUrl', { size: formatMb(sz) })));
              submitAsUrl = true;
            } else {
              throw new Error(t('fileTooLarge', { size: formatMb(sz), max: formatMb(MAX_UPLOAD_BYTES) }));
            }
          }
        }

        if (submitAsUrl) {
          taskParams.audioUrl = source;
        } else {
          const fileData = await readFile(localPath);
          taskParams.audioBase64 = fileData.toString('base64');
          taskParams.audioFilename = isUrl
            ? basename(new URL(source).pathname) || 'audio.mp3'
            : basename(source);
          if (transcodeEnabled && hasFfmpeg) {
            taskParams.audioFilename = taskParams.audioFilename.replace(/\.[^.]+$/, '') + '.mp3';
          }
        }

        const spinner = ora(t('submittingTask')).start();
        const task = await client.createTask(taskParams);
        spinner.succeed(`${t('taskCreated')}: ${task.id}`);

        // Upload done — drop temp files immediately rather than holding them
        // through polling.
        while (tempFiles.length > 0) await safeUnlink(tempFiles.pop());

        if (opts.wait === false) {
          if (opts.json) {
            console.log(JSON.stringify(task, null, 2));
          } else {
            console.log(chalk.bold(`${t('status')}:`), formatStatus(task.status));
          }
          return;
        }

        const pollSpinner = ora(t('waitingTask')).start();
        const completed = await client.pollTask(task.id, {
          interval: (opts.pollInterval || 5) * 1000,
          onStatus: (tsk) => {
            const stage = tsk.current_stage ? ` (${tsk.current_stage})` : '';
            const progress = tsk.progress != null ? ` ${tsk.progress}%` : '';
            pollSpinner.text = `${tsk.status}${stage}${progress}`;
          },
        });

        if (completed.status === 'done') {
          pollSpinner.succeed(t('taskCompleted'));
          const result = await client.getResult(task.id);

          if (opts.output) {
            await writeFile(opts.output, JSON.stringify(result, null, 2));
            console.log(chalk.green(t('resultSaved', { file: opts.output })));
          } else if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            printResult(result);
          }
        } else {
          pollSpinner.fail(t('taskFailed', { status: completed.status, error: completed.error_message || 'unknown' }));
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red(`${t('error')}: ${err.message}`));
        process.exit(1);
      } finally {
        for (const f of tempFiles) await safeUnlink(f);
      }
    });
}
