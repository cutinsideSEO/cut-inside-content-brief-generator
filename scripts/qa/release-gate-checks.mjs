import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const REQUIRED_ENV_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const ALLOWED_JOB_STATUSES = new Set(['pending', 'running', 'completed', 'failed', 'cancelled']);
const ALLOWED_BATCH_STATUSES = new Set(['running', 'completed', 'partially_failed', 'cancelled']);
const TERMINAL_JOB_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const ACTIVE_JOB_STATUSES = new Set(['pending', 'running']);
const RUNTIME_SCAN_PATHS = ['App.tsx', 'AppWrapper.tsx', 'services', 'components', 'hooks', 'contexts'];

const summary = {
  passed: 0,
  warnings: 0,
  failed: 0,
};

function pass(name, details) {
  summary.passed += 1;
  console.log(`[PASS] ${name} - ${details}`);
}

function warn(name, details) {
  summary.warnings += 1;
  console.log(`[WARN] ${name} - ${details}`);
}

function fail(name, details) {
  summary.failed += 1;
  console.log(`[FAIL] ${name} - ${details}`);
}

function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing .env.local at ${envPath}`);
  }

  const out = {};
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

function buildHeaders(anonKey, contentType = false) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function apiFetch(baseUrl, anonKey, endpoint, init = {}) {
  const res = await fetch(`${baseUrl}${endpoint}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function fetchRows(baseUrl, anonKey, table, config = {}) {
  const params = new URLSearchParams();
  params.set('select', config.select || '*');
  if (config.order) params.set('order', config.order);
  if (typeof config.limit === 'number') params.set('limit', String(config.limit));
  if (config.filters) {
    for (const [key, value] of Object.entries(config.filters)) {
      params.set(key, value);
    }
  }

  const endpoint = `/rest/v1/${table}?${params.toString()}`;
  return apiFetch(baseUrl, anonKey, endpoint, {
    method: 'GET',
    headers: buildHeaders(anonKey),
  });
}

async function checkEdgeFunctionHealth(baseUrl, anonKey) {
  const checks = [
    { name: 'create-generation-job', expected: new Set([400, 401, 403, 409]) },
    { name: 'create-generation-batch', expected: new Set([400, 401, 403, 409]) },
    { name: 'dataforseo-proxy', expected: new Set([400, 401, 403]) },
    { name: 'process-generation-queue', expected: new Set([200, 401]) },
  ];

  for (const item of checks) {
    const { res, text } = await apiFetch(baseUrl, anonKey, `/functions/v1/${item.name}`, {
      method: 'POST',
      headers: buildHeaders(anonKey, true),
      body: JSON.stringify({}),
    });

    if (res.status === 404) {
      fail(`Edge Function ${item.name}`, 'Endpoint returned 404');
      continue;
    }

    if (!item.expected.has(res.status)) {
      fail(
        `Edge Function ${item.name}`,
        `Unexpected status ${res.status}. Expected one of ${[...item.expected].join(', ')}. Body: ${text.slice(0, 160)}`
      );
      continue;
    }

    pass(`Edge Function ${item.name}`, `Responded with expected status ${res.status}`);
  }
}

async function checkJobs(baseUrl, anonKey) {
  const rowsResponse = await fetchRows(baseUrl, anonKey, 'generation_jobs', {
    select: 'id,status,started_at,completed_at,updated_at,job_type,brief_id,batch_id',
    order: 'created_at.desc',
    limit: 300,
  });

  if (!rowsResponse.res.ok || !Array.isArray(rowsResponse.json)) {
    fail('generation_jobs query', `Failed with HTTP ${rowsResponse.res.status}`);
    return;
  }

  const jobs = rowsResponse.json;
  pass('generation_jobs query', `Fetched ${jobs.length} recent jobs`);

  const badStatus = jobs.filter((j) => !ALLOWED_JOB_STATUSES.has(j.status));
  if (badStatus.length > 0) {
    fail('Job status validity', `Found ${badStatus.length} job(s) with unknown status`);
  } else {
    pass('Job status validity', 'All sampled jobs have valid statuses');
  }

  const runningWithCompletedAt = jobs.filter((j) => j.status === 'running' && j.completed_at);
  if (runningWithCompletedAt.length > 0) {
    fail('Running jobs invariant', `Found ${runningWithCompletedAt.length} running job(s) with completed_at`);
  } else {
    pass('Running jobs invariant', 'No running jobs have completed_at set');
  }

  const terminalWithoutCompletedAt = jobs.filter(
    (j) => TERMINAL_JOB_STATUSES.has(j.status) && !j.completed_at
  );
  if (terminalWithoutCompletedAt.length > 0) {
    warn(
      'Terminal jobs timestamp completeness',
      `${terminalWithoutCompletedAt.length} terminal job(s) missing completed_at`
    );
  } else {
    pass('Terminal jobs timestamp completeness', 'All sampled terminal jobs have completed_at');
  }

  const staleCutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString();
  const staleRunningResponse = await fetchRows(baseUrl, anonKey, 'generation_jobs', {
    select: 'id,status,updated_at,job_type',
    filters: {
      status: 'eq.running',
      updated_at: `lt.${staleCutoff}`,
    },
    limit: 50,
  });

  if (staleRunningResponse.res.ok && Array.isArray(staleRunningResponse.json)) {
    const staleRunning = staleRunningResponse.json;
    if (staleRunning.length > 0) {
      warn(
        'Stale running jobs',
        `${staleRunning.length} running job(s) older than 4 minutes were found`
      );
    } else {
      pass('Stale running jobs', 'No stale running jobs older than 4 minutes found');
    }
  } else {
    warn('Stale running jobs', `Could not query stale jobs (HTTP ${staleRunningResponse.res.status})`);
  }
}

async function checkBriefActiveJobPointers(baseUrl, anonKey) {
  const briefsResponse = await fetchRows(baseUrl, anonKey, 'briefs', {
    select: 'id,active_job_id',
    filters: {
      active_job_id: 'not.is.null',
    },
    limit: 500,
  });

  if (!briefsResponse.res.ok || !Array.isArray(briefsResponse.json)) {
    fail('briefs active_job_id query', `Failed with HTTP ${briefsResponse.res.status}`);
    return;
  }

  const briefs = briefsResponse.json;
  if (briefs.length === 0) {
    pass('briefs.active_job_id consistency', 'No briefs currently have active_job_id set');
    return;
  }

  const ids = [...new Set(briefs.map((b) => b.active_job_id).filter(Boolean))];
  const chunks = [];
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }

  const jobsById = new Map();
  for (const chunk of chunks) {
    const inExpr = `in.(${chunk.join(',')})`;
    const jobsResponse = await fetchRows(baseUrl, anonKey, 'generation_jobs', {
      select: 'id,status',
      filters: { id: inExpr },
      limit: 500,
    });

    if (!jobsResponse.res.ok || !Array.isArray(jobsResponse.json)) {
      fail('generation_jobs lookup by active_job_id', `Failed with HTTP ${jobsResponse.res.status}`);
      return;
    }

    for (const row of jobsResponse.json) {
      jobsById.set(row.id, row.status);
    }
  }

  const missingJobs = briefs.filter((b) => !jobsById.has(b.active_job_id));
  if (missingJobs.length > 0) {
    fail(
      'briefs.active_job_id references',
      `${missingJobs.length} brief(s) point to missing generation_jobs rows`
    );
  } else {
    pass('briefs.active_job_id references', 'All active_job_id values reference existing jobs');
  }

  const terminalRefs = briefs.filter((b) => {
    const status = jobsById.get(b.active_job_id);
    return status && !ACTIVE_JOB_STATUSES.has(status);
  });
  if (terminalRefs.length > 0) {
    fail(
      'briefs.active_job_id terminal state',
      `${terminalRefs.length} brief(s) point to non-active jobs`
    );
  } else {
    pass('briefs.active_job_id terminal state', 'All active_job_id values point to pending/running jobs');
  }
}

async function checkBatches(baseUrl, anonKey) {
  const batchesResponse = await fetchRows(baseUrl, anonKey, 'generation_batches', {
    select: 'id,status,total_jobs,completed_jobs,failed_jobs',
    order: 'created_at.desc',
    limit: 200,
  });

  if (!batchesResponse.res.ok || !Array.isArray(batchesResponse.json)) {
    fail('generation_batches query', `Failed with HTTP ${batchesResponse.res.status}`);
    return;
  }

  const batches = batchesResponse.json;
  pass('generation_batches query', `Fetched ${batches.length} recent batches`);

  const invalidStatus = batches.filter((b) => !ALLOWED_BATCH_STATUSES.has(b.status));
  if (invalidStatus.length > 0) {
    fail('Batch status validity', `Found ${invalidStatus.length} batch(es) with unknown status`);
  } else {
    pass('Batch status validity', 'All sampled batches have valid statuses');
  }

  const badCounters = batches.filter((b) => {
    const completed = Number(b.completed_jobs || 0);
    const failed = Number(b.failed_jobs || 0);
    const total = Number(b.total_jobs || 0);
    return completed < 0 || failed < 0 || total < 0 || completed + failed > total;
  });

  if (badCounters.length > 0) {
    fail('Batch counter bounds', `Found ${badCounters.length} batch(es) with invalid counters`);
  } else {
    pass('Batch counter bounds', 'All sampled batches have valid counter bounds');
  }

  const logicallyInconsistent = batches.filter((b) => {
    const completed = Number(b.completed_jobs || 0);
    const failed = Number(b.failed_jobs || 0);
    const total = Number(b.total_jobs || 0);
    const totalDone = completed + failed;
    if (b.status === 'completed') return !(failed === 0 && completed === total);
    if (b.status === 'partially_failed') return !(failed > 0 && completed > 0 && totalDone === total);
    if (b.status === 'cancelled') return !(completed === 0 && failed === total);
    if (b.status === 'running') return totalDone >= total;
    return false;
  });

  if (logicallyInconsistent.length > 0) {
    warn(
      'Batch status/counter coherence',
      `${logicallyInconsistent.length} batch(es) have status/counter combinations that look inconsistent`
    );
  } else {
    pass('Batch status/counter coherence', 'Sampled batches have coherent status/counter combinations');
  }
}

function listRuntimeFiles() {
  const files = [];

  function walk(absPath) {
    if (!fs.existsSync(absPath)) return;
    const stat = fs.statSync(absPath);
    if (stat.isFile()) {
      files.push(absPath);
      return;
    }
    for (const name of fs.readdirSync(absPath)) {
      const next = path.join(absPath, name);
      const nextStat = fs.statSync(next);
      if (nextStat.isDirectory()) {
        walk(next);
      } else if (/\.(ts|tsx|js|jsx|mjs)$/i.test(name)) {
        files.push(next);
      }
    }
  }

  for (const rel of RUNTIME_SCAN_PATHS) {
    walk(path.join(repoRoot, rel));
  }

  return files;
}

function checkClientSecurityRegression(envVars) {
  const files = listRuntimeFiles();
  let directApiHits = 0;
  let viteCredHits = 0;

  for (const absFile of files) {
    const content = fs.readFileSync(absFile, 'utf-8');
    if (content.includes('api.dataforseo.com')) {
      directApiHits += 1;
      fail('Client-side DataForSEO endpoint usage', `Found direct API URL in ${path.relative(repoRoot, absFile)}`);
    }
    if (/VITE_DATAFORSEO_[A-Z_]+/.test(content)) {
      viteCredHits += 1;
      fail(
        'Client-side DataForSEO credential reference',
        `Found VITE_DATAFORSEO reference in ${path.relative(repoRoot, absFile)}`
      );
    }
  }

  if (directApiHits === 0) {
    pass('Client-side DataForSEO endpoint usage', 'No runtime files reference api.dataforseo.com');
  }
  if (viteCredHits === 0) {
    pass('Client-side DataForSEO credential reference', 'No runtime files reference VITE_DATAFORSEO_*');
  }

  const hasLegacyEnvKey = Object.keys(envVars).some((k) => k.startsWith('VITE_DATAFORSEO_'));
  if (hasLegacyEnvKey) {
    warn('.env.local DataForSEO vars', 'Legacy VITE_DATAFORSEO_* keys are present in .env.local');
  } else {
    pass('.env.local DataForSEO vars', 'No VITE_DATAFORSEO_* keys found in .env.local');
  }
}

async function main() {
  console.log('=== Backend Migration Release-Gate Checks ===');

  let envVars;
  try {
    envVars = loadEnvLocal();
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }

  for (const key of REQUIRED_ENV_KEYS) {
    if (!envVars[key]) {
      fail('Environment configuration', `Missing required key: ${key}`);
    }
  }
  if (summary.failed > 0) {
    console.log('\nOne or more required env vars are missing. Aborting checks.');
    process.exit(1);
  }
  pass('Environment configuration', `Required keys present: ${REQUIRED_ENV_KEYS.join(', ')}`);

  const baseUrl = envVars.VITE_SUPABASE_URL.replace(/\/+$/, '');
  const anonKey = envVars.VITE_SUPABASE_ANON_KEY;

  await checkEdgeFunctionHealth(baseUrl, anonKey);
  await checkJobs(baseUrl, anonKey);
  await checkBriefActiveJobPointers(baseUrl, anonKey);
  await checkBatches(baseUrl, anonKey);
  checkClientSecurityRegression(envVars);

  console.log('\n=== Summary ===');
  console.log(`Passed: ${summary.passed}`);
  console.log(`Warnings: ${summary.warnings}`);
  console.log(`Failed: ${summary.failed}`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running release-gate checks:', err);
  process.exit(1);
});
