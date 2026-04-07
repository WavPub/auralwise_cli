import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { t } from '../i18n.js';
import { createClient, printResult, formatStatus } from '../utils.js';

export function registerTranscribe(program) {
  program
    .command('transcribe')
    .description(t('descTranscribe'))
    .argument('<source>', t('argSource'))
    .option('--base64', t('optBase64'))
    .option('--language <lang>', t('optLanguage'))
    .option('--no-asr', t('optNoAsr'))
    .option('--no-diarize', t('optNoDiarize'))
    .option('--no-events', t('optNoEvents'))
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
      try {
        const client = createClient(program);
        const isUrl = /^https?:\/\//i.test(source);

        // Build options
        const options = {};
        if (opts.asr === false) options.enable_asr = false;
        if (opts.diarize === false) options.enable_diarize = false;
        if (opts.events === false) options.enable_audio_events = false;
        if (opts.optimizeZh) options.optimize_zh = true;
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

        if (isUrl) {
          taskParams.audioUrl = source;
        } else {
          const fileData = await readFile(source);
          taskParams.audioBase64 = fileData.toString('base64');
          taskParams.audioFilename = basename(source);
        }

        const spinner = ora(t('submittingTask')).start();
        const task = await client.createTask(taskParams);
        spinner.succeed(`${t('taskCreated')}: ${task.id}`);

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
      }
    });
}
