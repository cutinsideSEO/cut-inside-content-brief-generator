/**
 * Inspect brief_data keys for completed CI briefs to check which fields are present.
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

// Fetch completed CI briefs with their brief_data
const res = await fetch(
  `${url}/rest/v1/briefs?status=eq.complete&select=id,name,brief_data&order=updated_at.desc&limit=10`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const briefs = await res.json();
console.log(`Found ${briefs.length} completed briefs:\n`);
for (const b of briefs) {
  const keys = b.brief_data ? Object.keys(b.brief_data) : [];
  const hasFaqs = keys.includes('faqs');
  const hasAll7 = ['page_goal', 'keyword_strategy', 'competitor_insights', 'content_gap_analysis', 'article_structure', 'faqs', 'on_page_seo'].every(k => keys.includes(k));
  console.log(`  ${b.id.substring(0,8)} | ${b.name}`);
  console.log(`    keys: ${keys.join(', ')}`);
  console.log(`    hasFaqs=${hasFaqs} | hasAll7=${hasAll7}`);
}
