import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_caption text;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS document_asset_id uuid;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS document_caption text;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS document_delay_seconds integer DEFAULT 5;`;
  console.log('✅ Altered campaigns table successfully via neon HTTP!');
}
migrate().catch(console.error);

