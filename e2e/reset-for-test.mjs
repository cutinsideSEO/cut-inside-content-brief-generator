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

// Cancel ALL running/pending jobs
const findRes = await fetch(
  `${url}/rest/v1/generation_jobs?status=in.(pending,running)&select=id,brief_id,status,job_type&limit=10`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const activeJobs = await findRes.json();
console.log(`Active jobs: ${activeJobs.length}`);

for (const job of activeJobs) {
  await fetch(`${url}/rest/v1/generation_jobs?id=eq.${job.id}`, {
    method: 'PATCH',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'cancelled', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  });
  if (job.brief_id) {
    await fetch(`${url}/rest/v1/briefs?id=eq.${job.brief_id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ active_job_id: null })
    });
  }
  console.log(`  Cancelled ${job.id.substring(0, 8)} (${job.job_type})`);
}

// Find CI client
const clientRes = await fetch(`${url}/rest/v1/clients?select=id,name&limit=10`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const clients = await clientRes.json();
const ci = clients.find(c => c.name === 'CI');
if (!ci) { console.log('No CI client'); process.exit(1); }

// Find all CI briefs and reset completed ones to dashboard view
const briefRes = await fetch(
  `${url}/rest/v1/briefs?client_id=eq.${ci.id}&select=id,name,status,current_view,active_job_id,brief_data&order=updated_at.desc&limit=10`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const briefs = await briefRes.json();
console.log(`\nCI briefs: ${briefs.length}`);

for (const b of briefs) {
  const hasData = b.brief_data && b.brief_data.on_page_seo;
  console.log(`  ${b.id.substring(0, 8)} | "${b.name}" | status=${b.status} | view=${b.current_view} | active_job=${b.active_job_id || 'null'} | has_seo=${!!hasData}`);

  // Reset briefs that have full data but wrong status/view
  if (hasData && (b.status !== 'complete' || b.current_view !== 'dashboard' || b.active_job_id)) {
    await fetch(`${url}/rest/v1/briefs?id=eq.${b.id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'complete', current_view: 'dashboard', active_job_id: null })
    });
    console.log(`    -> Reset to complete/dashboard`);
  }
}

// Delete any existing articles for CI briefs (clean slate)
for (const b of briefs) {
  const artRes = await fetch(
    `${url}/rest/v1/brief_articles?brief_id=eq.${b.id}&select=id&limit=5`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const articles = await artRes.json();
  if (articles.length > 0) {
    for (const a of articles) {
      await fetch(`${url}/rest/v1/brief_articles?id=eq.${a.id}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' }
      });
    }
    console.log(`  Deleted ${articles.length} articles for brief ${b.id.substring(0, 8)}`);
  }
}

console.log('\nReady for test.');
