import chalk from 'chalk';
import { t } from '../i18n.js';
import { createClient, printTaskDetail } from '../utils.js';

export function registerTask(program) {
  program
    .command('task')
    .description(t('descTask'))
    .argument('<id>', t('argTaskId'))
    .option('--json', t('optJson'))
    .action(async (id, opts) => {
      try {
        const client = createClient(program);
        const task = await client.getTask(id);

        if (opts.json) {
          console.log(JSON.stringify(task, null, 2));
        } else {
          printTaskDetail(task);
        }
      } catch (err) {
        console.error(chalk.red(`${t('error')}: ${err.message}`));
        process.exit(1);
      }
    });
}
