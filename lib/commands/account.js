import chalk from 'chalk';
import { t } from '../i18n.js';
import { createClient, printAccount, formatApiError } from '../utils.js';

export function registerAccount(program) {
  program
    .command('account')
    .description(t('descAccount'))
    .option('--json', t('optJson'))
    .action(async (opts) => {
      try {
        const client = createClient(program);
        const account = await client.getAccount();

        if (opts.json) {
          console.log(JSON.stringify(account, null, 2));
        } else {
          printAccount(account);
        }
      } catch (err) {
        console.error(chalk.red(formatApiError(err)));
        process.exit(1);
      }
    });
}
