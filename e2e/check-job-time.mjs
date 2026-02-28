import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '.env.local');
const content = fs.readFileSync(envPath, 'utf-8');
const vars = {};
for (const line of content.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  vars[t.slice(0, eq)] = t.slice(eq + 1);
}

const url = vars.VITE_SUPABASE_URL;
const key = vars.VITE_SUPABASE_ANON_KEY;

const res = await fetch(
  `${url}/rest/v1/generation_jobs?brief_id=eq.66f77d61-c4a8-4a7a-bf09-ad942f76191b&order=created_at.desc&limit=3&select=id,status,created_at,updated_at,progress`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const jobs = await res.json();
for (const j of jobs) {
  console.log(`${j.id.substring(0,8)} | status=${j.status} | created=${j.created_at} | updated=${j.updated_at}`);
  if (j.progress) console.log(`  progress: ${JSON.stringify(j.progress).substring(0, 200)}`);
}
