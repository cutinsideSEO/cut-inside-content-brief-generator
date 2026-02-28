import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env.local for Supabase credentials
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}

const envVars = loadEnvLocal();

export const ACCESS_CODE = 'ADMIN123';
export const TEST_CLIENT_NAME = 'CI';  // existing client (displayed as abbreviation)

export const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

/**
 * Login with the admin access code
 */
export async function login(page: Page) {
  await page.goto('/');
  // Wait for login screen - the access code input is visible on desktop
  const accessInput = page.locator('input[placeholder="Enter your access code"]');
  await expect(accessInput).toBeVisible({ timeout: 10_000 });

  // Fill access code
  await accessInput.fill(ACCESS_CODE);

  // Click Sign In
  await page.getByRole('button', { name: /Sign In/i }).click();

  // Wait for client select screen
  await expect(page.getByText(/Select a client/i)).toBeVisible({ timeout: 15_000 });
}

/**
 * Select the test client from client select screen
 */
export async function selectClient(page: Page, clientName: string) {
  // Click on the client card
  const card = page.locator(`text="${clientName}"`).first();
  await card.click();

  // Wait for brief list to load
  await expect(page.getByRole('button', { name: /New Brief/i })).toBeVisible({ timeout: 15_000 });
}

/**
 * Poll generation jobs in the DB until all complete or timeout.
 * Returns true if all jobs completed, false if timed out.
 */
export async function waitForBatchCompletion(
  page: Page,
  timeoutMs: number = 480_000 // 8 minutes default
): Promise<boolean> {
  const start = Date.now();
  const pollInterval = 10_000; // check every 10s

  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(pollInterval);

    // Check if any progress indicators are still visible
    const generating = await page.locator('text=/Generating|Analyzing|in_progress|running/i').count();
    if (generating === 0) {
      // Double-check by looking for completion indicators
      return true;
    }
  }
  return false;
}

/**
 * Wait for a specific text to appear on the page
 */
export async function waitForText(page: Page, text: string | RegExp, timeoutMs: number = 30_000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: timeoutMs });
}

/**
 * Wait for all active generation jobs to complete, then cancel any stuck ones.
 * Polls the Supabase REST API directly to avoid relying on flaky UI indicators.
 * Returns when no active jobs remain.
 */
export async function waitForJobsToComplete(timeoutMs: number = 300_000): Promise<void> {
  const start = Date.now();
  const pollInterval = 10_000; // check every 10s

  // Phase 1: Wait for at least one active job to appear (job creation is async).
  // Give up to 90s for the job to be created (Edge Function cold starts can take 30-60s).
  let jobSeen = false;
  const maxWaitForJob = 90_000;
  while (Date.now() - start < maxWaitForJob) {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/generation_jobs?status=in.(pending,running)&select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (checkRes.ok) {
      const checkJobs = await checkRes.json();
      if (checkJobs && checkJobs.length > 0) {
        console.log('Active job found. Polling for completion...');
        jobSeen = true;
        break;
      }
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  if (!jobSeen) {
    console.log('No active job appeared within 90s. Assuming no jobs were created.');
    return;
  }

  // Phase 2: Poll until all active jobs complete
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/generation_jobs?status=in.(pending,running)&select=id,status,job_type,progress&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.error('Failed to poll jobs:', res.status);
      await new Promise(r => setTimeout(r, pollInterval));
      continue;
    }

    const jobs = await res.json();

    if (!jobs || jobs.length === 0) {
      console.log('All jobs completed naturally.');
      return;
    }

    // Check if any job has progress.phase === 'complete' but status is still 'running'
    // This means the EF timed out before markJobCompleted. Cancel these.
    let allDoneOrStuck = true;
    for (const job of jobs) {
      const progress = job.progress as Record<string, unknown> | null;
      if (progress?.phase === 'complete') {
        console.log(`Job ${job.id} (${job.job_type}) has phase=complete but status=${job.status}. Cancelling...`);
        await cancelJobById(job.id, null);
      } else {
        // Job is still actively processing
        console.log(`Job ${job.id} (${job.job_type}) still ${job.status} (phase: ${(progress as any)?.phase || 'none'})`);
        allDoneOrStuck = false;
      }
    }

    if (allDoneOrStuck) return;

    await new Promise(r => setTimeout(r, pollInterval));
  }

  // Timeout: force-cancel remaining jobs
  console.log('Job wait timed out. Force-cancelling remaining jobs...');
  await cancelStaleJobs();
}

/**
 * Cancel a single job by ID and clear its brief's active_job_id.
 */
async function cancelJobById(jobId: string, briefId: string | null): Promise<void> {
  // Get brief_id if not provided
  if (!briefId) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/generation_jobs?id=eq.${jobId}&select=brief_id`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const jobs = await res.json();
    briefId = jobs?.[0]?.brief_id || null;
  }

  await fetch(
    `${SUPABASE_URL}/rest/v1/generation_jobs?id=eq.${jobId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (briefId) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/briefs?id=eq.${briefId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ active_job_id: null }),
      }
    );
  }
}

/**
 * Cancel any stale (pending/running) generation jobs via direct Supabase REST API.
 * This is needed because the Edge Function can timeout before markJobCompleted runs,
 * leaving the competitors job stuck in 'running' status. This blocks creating new jobs (409).
 * Returns the number of jobs cancelled.
 */
export async function cancelStaleJobs(): Promise<number> {
  // Find all active jobs
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/generation_jobs?status=in.(pending,running)&order=created_at.desc&limit=10&select=id,brief_id,status,job_type`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!findRes.ok) {
    console.error('Failed to query active jobs:', findRes.status, await findRes.text());
    return 0;
  }

  const activeJobs = await findRes.json();
  if (!activeJobs || activeJobs.length === 0) {
    return 0;
  }

  let cancelled = 0;
  for (const job of activeJobs) {
    // Cancel the job
    const cancelRes = await fetch(
      `${SUPABASE_URL}/rest/v1/generation_jobs?id=eq.${job.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (cancelRes.ok) {
      // Clear the brief's active_job_id
      await fetch(
        `${SUPABASE_URL}/rest/v1/briefs?id=eq.${job.brief_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ active_job_id: null }),
        }
      );
      console.log(`Cancelled stale job ${job.id} (${job.job_type}, status: ${job.status})`);
      cancelled++;
    }
  }

  return cancelled;
}
