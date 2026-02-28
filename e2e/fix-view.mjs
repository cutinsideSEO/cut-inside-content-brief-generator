import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env.local
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

// Find completed briefs
const briefRes = await fetch(
  `${url}/rest/v1/briefs?client_id=eq.${ci.id}&status=eq.complete&select=id,name,current_view&order=updated_at.desc&limit=5`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const briefs = await briefRes.json();
console.log('Completed CI briefs:');
briefs.forEach(b => console.log(`  ${b.id.substring(0,8)} | view=${b.current_view} | ${b.name}`));

// Set ALL to dashboard
for (const b of briefs) {
  await fetch(`${url}/rest/v1/briefs?id=eq.${b.id}`, {
    method: 'PATCH',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ current_view: 'dashboard' })
  });
  console.log(`Set ${b.name} to dashboard`);
}
