/**
 * Fix CI test briefs by copying brief_data (including faqs) from a donor
 * brief that has all 7 steps. Updates existing CI E2E test briefs in-place.
 */
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

// Step 1: Find CI client
const clientRes = await fetch(`${url}/rest/v1/clients?select=id,name&limit=10`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const clients = await clientRes.json();
const ci = clients.find(c => c.name === 'CI');
if (!ci) { console.log('No CI client'); process.exit(1); }
console.log(`CI client: ${ci.id}`);

// Step 2: Find a donor brief from ANY client that has all 7 steps INCLUDING faqs
// Fetch more briefs to find one with faqs
const donorRes = await fetch(
  `${url}/rest/v1/briefs?status=eq.complete&select=id,name,client_id,brief_data&order=updated_at.desc&limit=50`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const donors = await donorRes.json();

// Find a non-CI donor with faqs + on_page_seo
const donor = donors.find(b =>
  b.client_id !== ci.id &&
  b.brief_data &&
  b.brief_data.faqs &&
  b.brief_data.on_page_seo
);

if (!donor) {
  console.log('No suitable donor brief found (need faqs + on_page_seo, non-CI)');
  console.log('Available donors:', donors.slice(0, 5).map(b => `${b.name} (keys: ${b.brief_data ? Object.keys(b.brief_data).join(',') : 'none'})`));
  process.exit(1);
}
console.log(`Donor: "${donor.name}" (${donor.id.substring(0,8)}) — keys: ${Object.keys(donor.brief_data).join(', ')}`);

// Step 3: Find CI E2E test briefs to update
const briefsRes = await fetch(
  `${url}/rest/v1/briefs?client_id=eq.${ci.id}&status=eq.complete&select=id,name&order=updated_at.desc&limit=5`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const ciBriefs = await briefsRes.json();
const testBriefs = ciBriefs.filter(b => b.name.startsWith('E2E Test Brief'));

if (testBriefs.length === 0) {
  console.log('No E2E Test Briefs found in CI client. Run create-test-brief.mjs first.');
  process.exit(1);
}

// Step 4: Update the most recent E2E test brief with the donor's brief_data
const target = testBriefs[0];
console.log(`\nUpdating: "${target.name}" (${target.id.substring(0,8)}) with donor brief_data...`);

const patchRes = await fetch(
  `${url}/rest/v1/briefs?id=eq.${target.id}`,
  {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      brief_data: donor.brief_data,
      status: 'complete',
      current_view: 'dashboard',
      active_job_id: null,
    }),
  }
);

if (!patchRes.ok) {
  console.error('Failed to patch:', patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log(`Updated! Brief "${target.name}" now has keys: ${Object.keys(donor.brief_data).join(', ')}`);
console.log(`\nCI test brief is ready: ${target.id}`);
