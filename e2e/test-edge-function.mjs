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
const briefId = '66f77d61-c4a8-4a7a-bf09-ad942f76191b';

console.log('Testing create-generation-job Edge Function...');
console.log(`URL: ${url}/functions/v1/create-generation-job`);
console.log(`Brief: ${briefId}`);

try {
  const res = await fetch(`${url}/functions/v1/create-generation-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'apikey': key,
    },
    body: JSON.stringify({
      brief_id: briefId,
      job_type: 'article',
    }),
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  console.log(`Response: ${text}`);
} catch (err) {
  console.error('Fetch error:', err.message);
}
