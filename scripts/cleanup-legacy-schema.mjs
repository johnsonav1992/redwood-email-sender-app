import { createClient } from '@libsql/client';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const dryRun = !process.argv.includes('--execute');
const includeCampaignImages = process.argv.includes('--drop-campaign-images');
const tables = ['users', 'email_templates', 'daily_quota'];

if (includeCampaignImages) {
  tables.push('campaign_images');
}

async function getCount(table) {
  const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
  return Number(result.rows[0].count) || 0;
}

async function main() {
  const counts = new Map();

  for (const table of tables) {
    const count = await getCount(table);
    counts.set(table, count);
    console.log(`${table}\t${count}`);
  }

  const nonEmptyTables = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([table]) => table);

  if (nonEmptyTables.length > 0) {
    console.error(
      `Refusing to drop non-empty tables: ${nonEmptyTables.join(', ')}`
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log('Dry run only. Re-run with --execute to drop the empty tables.');
    return;
  }

  for (const table of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${table}`);
    console.log(`dropped\t${table}`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
