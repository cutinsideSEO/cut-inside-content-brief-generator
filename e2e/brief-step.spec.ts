import { test, expect } from '@playwright/test';
import {
  findCompletedCIBrief,
  fetchBriefData,
  patchBriefData,
  callCreateGenerationJob,
  waitForJobsToComplete,
  cancelStaleJobs,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from './helpers';

test.describe('Brief Step (API-level)', () => {
  test('generate a single brief step via direct API call', async () => {
    // ============================================
    // STEP 1: Cancel any stale jobs
    // ============================================
    const cancelledCount = await cancelStaleJobs();
    if (cancelledCount > 0) {
      console.log(`Cancelled ${cancelledCount} stale jobs before starting.`);
    }

    // ============================================
    // STEP 2: Find a completed CI brief with all 7 steps
    // ============================================
    const brief = await findCompletedCIBrief();
    if (!brief) {
      throw new Error('No completed CI brief found. Run the single-brief test first.');
    }
    console.log(`Target brief: "${brief.name}" (${brief.id})`);

    // ============================================
    // STEP 3: Fetch current brief data and save original FAQs
    // ============================================
    const briefRow = await fetchBriefData(brief.id);
    expect(briefRow).toBeTruthy();
    expect(briefRow.brief_data).toBeTruthy();

    const originalFaqs = briefRow.brief_data.faqs;
    console.log(`Original FAQs present: ${!!originalFaqs}`);
    if (!originalFaqs) {
      throw new Error('Brief does not have FAQs data — cannot test brief_step regeneration.');
    }

    // ============================================
    // STEP 4: Clear FAQs from the brief (simulate missing step 6)
    // ============================================
    const modifiedBriefData = { ...briefRow.brief_data };
    delete modifiedBriefData.faqs;

    await patchBriefData(brief.id, modifiedBriefData);
    console.log('Cleared FAQs from brief_data. Verifying...');

    // Verify FAQs were cleared
    const clearedBrief = await fetchBriefData(brief.id);
    expect(clearedBrief.brief_data.faqs).toBeFalsy();
    console.log('FAQs confirmed cleared.');

    // Also clear active_job_id to prevent 409 conflicts
    await fetch(
      `${SUPABASE_URL}/rest/v1/briefs?id=eq.${brief.id}`,
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

    // ============================================
    // STEP 5: Create a brief_step job via Edge Function
    // ============================================
    console.log('Creating brief_step job for step 6 (FAQs)...');
    const { job_id } = await callCreateGenerationJob({
      brief_id: brief.id,
      job_type: 'brief_step',
      step_number: 6,
    });
    console.log(`Job created: ${job_id}`);
    expect(job_id).toBeTruthy();

    // ============================================
    // STEP 6: Wait for job to complete
    // ============================================
    console.log('Waiting for brief_step job to complete...');
    await waitForJobsToComplete(300_000);
    console.log('Job processing finished.');

    // ============================================
    // STEP 7: Verify the job completed successfully
    // ============================================
    const jobRes = await fetch(
      `${SUPABASE_URL}/rest/v1/generation_jobs?id=eq.${job_id}&select=id,status,job_type,error_message`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    expect(jobRes.ok).toBeTruthy();
    const jobs = await jobRes.json();
    const job = jobs?.[0];
    expect(job).toBeTruthy();
    console.log(`Job status: ${job.status}, error: ${job.error_message || 'none'}`);
    expect(job.status).toBe('completed');

    // ============================================
    // STEP 8: Verify FAQs were written back to the brief
    // ============================================
    const updatedBrief = await fetchBriefData(brief.id);
    expect(updatedBrief.brief_data.faqs).toBeTruthy();
    console.log(`FAQs restored. Type: ${typeof updatedBrief.brief_data.faqs}`);

    // If faqs is an array, check it has items
    if (Array.isArray(updatedBrief.brief_data.faqs)) {
      expect(updatedBrief.brief_data.faqs.length).toBeGreaterThan(0);
      console.log(`FAQs count: ${updatedBrief.brief_data.faqs.length}`);
    }

    // ============================================
    // STEP 9: Restore original FAQs (cleanup)
    // ============================================
    const restoredBriefData = { ...updatedBrief.brief_data, faqs: originalFaqs };
    await patchBriefData(brief.id, restoredBriefData);
    console.log('Restored original FAQs. Cleanup complete.');

    console.log('Brief step (API-level) E2E test PASSED');
  });
});
