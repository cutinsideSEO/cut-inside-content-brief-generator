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

// Check the brief that was previously complete
const briefId = 'bd20f4be-0c3d-4de3-8d5d-11da0e22f496';
const res = await fetch(
  `${url}/rest/v1/briefs?id=eq.${briefId}&select=id,name,status,current_view,brief_data`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const briefs = await res.json();
const brief = briefs[0];
if (!brief) { console.log('Brief not found'); process.exit(1); }

console.log('Brief:', brief.name);
console.log('Status:', brief.status);
console.log('View:', brief.current_view);
console.log('Has brief_data:', brief.brief_data ? Object.keys(brief.brief_data).length + ' keys' : 'EMPTY/NULL');
if (brief.brief_data) {
  console.log('Brief data keys:', Object.keys(brief.brief_data).join(', '));
  console.log('Has on_page_seo:', !!brief.brief_data.on_page_seo);
}

// Restore to complete + dashboard if brief_data has content
if (brief.brief_data && Object.keys(brief.brief_data).length > 3) {
  await fetch(`${url}/rest/v1/briefs?id=eq.${briefId}`, {
    method: 'PATCH',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'complete', current_view: 'dashboard' })
  });
  console.log('\nRestored to status=complete, current_view=dashboard');
} else {
  console.log('\nBrief data is empty/corrupted. Cannot restore.');
  console.log('Need to run single-brief test first to create a new completed brief.');
}
