#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { setLocale, t } from '../lib/i18n.js';

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')
);
import { registerTranscribe } from '../lib/commands/transcribe.js';
import { registerTasks } from '../lib/commands/tasks.js';
import { registerTask } from '../lib/commands/task.js';
import { registerResult } from '../lib/commands/result.js';
import { registerDelete } from '../lib/commands/delete.js';
import { registerEvents } from '../lib/commands/events.js';

// Parse --locale early before command registration so descriptions use correct language
const localeIdx = process.argv.indexOf('--locale');
if (localeIdx !== -1 && process.argv[localeIdx + 1]) {
  setLocale(process.argv[localeIdx + 1]);
}

const program = new Command();

program
  .name('auralwise')
  .description(t('descMain'))
  .version(pkg.version)
  .option('--api-key <key>', t('optApiKey'))
  .option('--base-url <url>', t('optBaseUrl'), 'https://api.auralwise.cn/v1')
  .option('--locale <locale>', t('optLocale'));

registerTranscribe(program);
registerTasks(program);
registerTask(program);
registerResult(program);
registerDelete(program);
registerEvents(program);

program.parse();
