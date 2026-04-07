import { writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import { t } from '../i18n.js';
import { createClient, printResult } from '../utils.js';

export function registerResult(program) {
  program
    .command('result')
    .description(t('descResult'))
    .argument('<id>', t('argTaskId'))
    .option('--json', t('optJson'))
    .option('--output <file>', t('optOutput'))
    .action(async (id, opts) => {
      try {
        const client = createClient(program);
        const result = await client.getResult(id);

        if (opts.output) {
          await writeFile(opts.output, JSON.stringify(result, null, 2));
          console.log(chalk.green(t('resultSaved', { file: opts.output })));
        } else if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printResult(result);
        }
      } catch (err) {
        console.error(chalk.red(`${t('error')}: ${err.message}`));
        process.exit(1);
      }
    });
}
