import { loadConfig } from './config.js';
import { createPool, runMigrations } from './db.js';

const main = async () => {
  const pool = createPool(loadConfig());
  try {
    await runMigrations(pool);
    console.log('数据库结构已就绪。');
  } finally {
    await pool.end();
  }
};

main().catch((error) => { console.error(error); process.exit(1); });
