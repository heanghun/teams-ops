import { readFile, writeFile } from 'node:fs/promises';

const databaseId = process.env.TEAMS_D1_DATABASE_ID?.trim() || '';
if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(databaseId) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(databaseId)) {
  throw new Error('Set TEAMS_D1_DATABASE_ID to the UUID of the separate production database.');
}
const template = new URL('../wrangler.jsonc', import.meta.url);
const config = JSON.parse(await readFile(template, 'utf8'));
const db = config.d1_databases[0];
const bucket = config.r2_buckets[0];
db.database_id = databaseId;
db.database_name = process.env.TEAMS_D1_DATABASE_NAME?.trim() || db.database_name;
bucket.bucket_name = process.env.TEAMS_R2_BUCKET_NAME?.trim() || bucket.bucket_name;
await writeFile(new URL('./wrangler.production.json', template), JSON.stringify(config, null, 2)+'\n', {mode:0o600});
console.log('Generated wrangler.production.json for '+config.vars.TEAMS_APP_HOST);
