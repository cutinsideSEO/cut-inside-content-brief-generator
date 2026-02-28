/**
 * Creates a completed test brief in the CI client by copying brief_data
 * from an existing completed brief in any client.
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

// Step 1: Find any completed brief with on_page_seo (from any client)
const donorRes = await fetch(
  `${url}/rest/v1/briefs?status=eq.complete&select=id,name,client_id,brief_data,current_step,stale_steps,user_feedbacks,paa_questions,subject_info,brand_info,keywords,output_language,serp_language,serp_country,model_settings,length_constraints,extracted_template&order=updated_at.desc&limit=20`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
const donors = await donorRes.json();
const donor = donors.find(b => b.brief_data && b.brief_data.on_page_seo);
if (!donor) {
  console.log('No completed brief with on_page_seo found in any client.');
  console.log('Available completed briefs:', donors.map(b => `${b.name} (keys: ${b.brief_data ? Object.keys(b.brief_data).length : 0})`));
  process.exit(1);
}
console.log(`Donor brief: "${donor.name}" (${donor.id.substring(0,8)}), keys: ${Object.keys(donor.brief_data).join(', ')}`);

// Step 2: Find CI client
const clientRes = await fetch(`${url}/rest/v1/clients?select=id,name&limit=10`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const clients = await clientRes.json();
const ci = clients.find(c => c.name === 'CI');
if (!ci) { console.log('No CI client'); process.exit(1); }
console.log(`CI client: ${ci.id}`);

// Step 2b: Get user ID from access codes
const acRes = await fetch(`${url}/rest/v1/access_codes?select=id,code,role&limit=5`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const accessCodes = await acRes.json();
console.log('Access codes response:', JSON.stringify(accessCodes).substring(0, 200));
if (!Array.isArray(accessCodes) || accessCodes.length === 0) {
  // Get created_by from the donor brief instead
  const donorBriefRes = await fetch(`${url}/rest/v1/briefs?id=eq.${donor.id}&select=created_by`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const donorBriefs = await donorBriefRes.json();
  var userId = donorBriefs[0]?.created_by;
  console.log(`Using donor's created_by: ${userId}`);
} else {
  const adminCode = accessCodes.find(a => a.role === 'admin') || accessCodes[0];
  var userId = adminCode.id;
  console.log(`User ID: ${userId}`);
}

// Step 3: Create a new brief in CI client with the donor's data
const briefName = `E2E Test Brief ${Date.now()}`;
const createRes = await fetch(`${url}/rest/v1/briefs`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    client_id: ci.id,
    created_by: userId,
    name: briefName,
    status: 'complete',
    current_view: 'dashboard',
    current_step: donor.current_step || 7,
    brief_data: donor.brief_data,
    stale_steps: [],
    user_feedbacks: donor.user_feedbacks || {},
    paa_questions: donor.paa_questions || [],
    subject_info: donor.subject_info || '',
    brand_info: donor.brand_info || '',
    keywords: donor.keywords || [],
    output_language: donor.output_language || 'English',
    serp_language: donor.serp_language || 'English',
    serp_country: donor.serp_country || 'United States',
    model_settings: donor.model_settings || null,
    length_constraints: donor.length_constraints || null,
    extracted_template: donor.extracted_template || null,
  })
});

if (!createRes.ok) {
  console.error('Failed to create brief:', createRes.status, await createRes.text());
  process.exit(1);
}

const created = await createRes.json();
console.log(`\nCreated test brief: "${briefName}"`);
console.log(`  ID: ${created[0].id}`);
console.log(`  Status: ${created[0].status}`);
console.log(`  View: ${created[0].current_view}`);
console.log('\nReady for article generation test.');
