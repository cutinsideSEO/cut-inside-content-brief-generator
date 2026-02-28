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

// Find CI client
const clientRes = await fetch(`${url}/rest/v1/clients?select=id,name&limit=10`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const clients = await clientRes.json();
const ci = clients.find(c => c.name === 'CI');
if (!ci) { console.log('No CI client'); process.exit(1); }
console.log('CI client:', ci.id);

// Find ALL CI briefs
const briefRes = await fetch(
  `${url}/rest/v1/briefs?client_id=eq.${ci.id}&select=id,name,status,current_view&order=updated_at.desc&limit=20`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const briefs = await briefRes.json();
console.log(`\nAll CI briefs (${briefs.length}):`);
briefs.forEach(b => console.log(`  ${b.id.substring(0,8)} | status=${b.status.padEnd(12)} | view=${(b.current_view||'null').padEnd(15)} | ${b.name}`));

// Fix the first completed one to have dashboard view
const completed = briefs.filter(b => b.status === 'complete');
console.log(`\n${completed.length} completed briefs found.`);
if (completed.length > 0) {
  const target = completed[0];
  await fetch(`${url}/rest/v1/briefs?id=eq.${target.id}`, {
    method: 'PATCH',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ current_view: 'dashboard' })
  });
  console.log(`Set "${target.name}" to dashboard view.`);
}
