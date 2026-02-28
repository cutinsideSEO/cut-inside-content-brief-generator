import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '.env.local');
const content = fs.readFileSync(envPath, 'utf-8');
const vars = {};
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const url = vars.VITE_SUPABASE_URL;
const key = vars.VITE_SUPABASE_ANON_KEY;

// Check recent generation jobs
const jobsRes = await fetch(
  `${url}/rest/v1/generation_jobs?order=created_at.desc&limit=5&select=id,brief_id,job_type,status,progress,created_at,completed_at`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const jobs = await jobsRes.json();
console.log('Recent generation jobs:', Array.isArray(jobs) ? `${jobs.length} found` : JSON.stringify(jobs).substring(0, 100));
if (!Array.isArray(jobs)) { console.log('Skipping jobs'); } else
for (const j of jobs) {
  console.log(`  ${j.id.substring(0,8)} | type=${j.job_type} | status=${j.status} | brief=${j.brief_id.substring(0,8)}`);
  if (j.progress) console.log(`    progress: ${JSON.stringify(j.progress).substring(0, 200)}`);
}

// Check if any articles were created for the test brief
const briefId = '66f77d61-c4a8-4a7a-bf09-ad942f76191b';
const articlesRes = await fetch(
  `${url}/rest/v1/brief_articles?brief_id=eq.${briefId}&select=id,title,version,is_current,created_at&order=created_at.desc&limit=5`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const articles = await articlesRes.json();
console.log(`\nArticles for test brief (${briefId.substring(0,8)}):`);
if (Array.isArray(articles) && articles.length > 0) {
  articles.forEach(a => console.log(`  ${a.id.substring(0,8)} | title="${a.title}" | v${a.version} | current=${a.is_current} | ${a.created_at}`));
} else {
  console.log('  No articles found');
}

// Check the brief's current state
const briefRes = await fetch(
  `${url}/rest/v1/briefs?id=eq.${briefId}&select=id,name,status,current_view,active_job_id`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const briefs = await briefRes.json();
if (briefs[0]) {
  const b = briefs[0];
  console.log(`\nBrief state: status=${b.status} view=${b.current_view} active_job=${b.active_job_id || 'null'}`);
}
