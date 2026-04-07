import chalk from 'chalk';
import { t } from '../i18n.js';
import { createClient, formatTaskRow } from '../utils.js';

export function registerTasks(program) {
  program
    .command('tasks')
    .description(t('descTasks'))
    .option('--status <status>', t('optStatus'))
    .option('--page <n>', t('optPage'), parseInt, 1)
    .option('--page-size <n>', t('optPageSize'), parseInt, 20)
    .option('--json', t('optJson'))
    .action(async (opts) => {
      try {
        const client = createClient(program);
        const data = await client.listTasks({
          page: opts.page,
          pageSize: opts.pageSize,
          status: opts.status,
        });

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        const tasks = data.tasks || [];
        if (tasks.length === 0) {
          console.log(t('noTasks'));
          return;
        }

        console.log(chalk.bold(`${t('tableHeaderId').padEnd(10)}${t('tableHeaderStatus').padEnd(20)}${t('tableHeaderFilename').padEnd(42)}${t('tableHeaderCreated')}`));
        console.log('─'.repeat(100));
        for (const task of tasks) {
          console.log(formatTaskRow(task));
        }
        console.log('─'.repeat(100));
        console.log(`${t('total')}: ${data.total || tasks.length}  ${t('page')}: ${data.page || 1}/${Math.ceil((data.total || tasks.length) / (data.page_size || 20))}`);
      } catch (err) {
        console.error(chalk.red(`${t('error')}: ${err.message}`));
        process.exit(1);
      }
    });
}
