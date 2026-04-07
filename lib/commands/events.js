import chalk from 'chalk';
import { t, getLocale } from '../i18n.js';
import { createClient } from '../utils.js';

export function registerEvents(program) {
  program
    .command('events')
    .description(t('descEvents'))
    .option('--category <cat>', t('optCategory'))
    .option('--search <keyword>', t('optSearch'))
    .option('--json', t('optJson'))
    .action(async (opts) => {
      try {
        const client = createClient(program);
        let classes = await client.getAudioEventClasses();

        if (opts.category) {
          const cat = opts.category.toLowerCase();
          classes = classes.filter(c =>
            (c.category || '').toLowerCase().includes(cat) ||
            (c.category_zh || '').toLowerCase().includes(cat)
          );
        }

        if (opts.search) {
          const kw = opts.search.toLowerCase();
          classes = classes.filter(c =>
            (c.display_name || '').toLowerCase().includes(kw) ||
            (c.zh_name || '').toLowerCase().includes(kw)
          );
        }

        if (opts.json) {
          console.log(JSON.stringify(classes, null, 2));
          return;
        }

        if (classes.length === 0) {
          console.log(t('noEventsFound'));
          return;
        }

        const isZh = getLocale() === 'zh';
        console.log(chalk.bold(`${t('totalClasses')}: ${classes.length}`));
        console.log();
        console.log(chalk.bold(`${t('tableHeaderIndex').padStart(5)}  ${t('tableHeaderName').padEnd(40)}  ${t('category')}`));
        console.log('─'.repeat(80));
        for (const c of classes) {
          const name = isZh ? (c.zh_name || c.display_name) : c.display_name;
          const cat = isZh ? (c.category_zh || c.category) : c.category;
          console.log(`${String(c.index).padStart(5)}  ${name.padEnd(40)}  ${cat}`);
        }
      } catch (err) {
        console.error(chalk.red(`${t('error')}: ${err.message}`));
        process.exit(1);
      }
    });
}
