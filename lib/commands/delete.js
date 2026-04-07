import chalk from 'chalk';
import { t } from '../i18n.js';
import { createClient } from '../utils.js';

export function registerDelete(program) {
  program
    .command('delete')
    .description(t('descDelete'))
    .argument('<id>', t('argTaskId'))
    .option('--force', t('optForce'))
    .action(async (id, opts) => {
      try {
        if (!opts.force) {
          const readline = await import('node:readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise(resolve => {
            rl.question(t('confirmDelete', { id: id.substring(0, 8) }) + ' (y/N) ', resolve);
          });
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log(t('deleteCancelled'));
            return;
          }
        }

        const client = createClient(program);
        await client.deleteTask(id);
        console.log(chalk.green(t('taskDeleted', { id: id.substring(0, 8) })));
      } catch (err) {
        console.error(chalk.red(`${t('error')}: ${err.message}`));
        process.exit(1);
      }
    });
}
