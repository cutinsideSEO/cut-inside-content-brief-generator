-- Migration 009: Repair persisted brief state
-- Normalize already-generated briefs whose metadata drifted after bulk/server-side generation.
-- Scope:
-- - only briefs with no active job
-- - never rewrite archived status
-- - repair terminal rows to dashboard/complete
-- - repair partial rows with saved progress to briefing/in_progress

WITH analyzed_briefs AS (
  SELECT
    id,
    status,
    current_view,
    current_step,
    brief_data,
    (
      brief_data ? 'page_goal'
      AND brief_data ? 'target_audience'
      AND brief_data ? 'keyword_strategy'
      AND brief_data ? 'competitor_insights'
      AND brief_data ? 'content_gap_analysis'
      AND brief_data ? 'article_structure'
      AND brief_data ? 'faqs'
      AND brief_data ? 'on_page_seo'
    ) AS has_complete_data,
    (
      COALESCE(current_step, 0) > 1
      OR brief_data ?| ARRAY[
        'page_goal',
        'target_audience',
        'keyword_strategy',
        'competitor_insights',
        'content_gap_analysis',
        'article_structure',
        'faqs',
        'on_page_seo'
      ]
    ) AS has_started_progress
  FROM briefs
  WHERE active_job_id IS NULL
    AND status <> 'archived'
)
UPDATE briefs AS b
SET current_step = CASE
      WHEN a.has_complete_data THEN 7
      WHEN a.has_started_progress AND COALESCE(b.current_step, 0) < 1 THEN 1
      ELSE b.current_step
    END,
    current_view = CASE
      WHEN a.has_complete_data
        AND (
          b.current_view IS NULL
          OR b.current_view IN ('initial_input', 'context_input', 'visualization', 'briefing', 'brief_upload')
        )
        THEN 'dashboard'
      WHEN NOT a.has_complete_data
        AND a.has_started_progress
        AND (
          b.current_view IS NULL
          OR b.current_view IN ('initial_input', 'context_input', 'visualization', 'brief_upload')
        )
        THEN 'briefing'
      ELSE b.current_view
    END,
    status = CASE
      WHEN a.has_complete_data AND b.status IN ('draft', 'in_progress') THEN 'complete'
      WHEN NOT a.has_complete_data AND a.has_started_progress AND b.status = 'draft' THEN 'in_progress'
      ELSE b.status
    END,
    updated_at = NOW()
FROM analyzed_briefs AS a
WHERE b.id = a.id
  AND (
    (a.has_complete_data AND b.current_step IS DISTINCT FROM 7)
    OR (
      a.has_started_progress
      AND COALESCE(b.current_step, 0) < 1
    )
    OR (
      a.has_complete_data
      AND (
        b.current_view IS NULL
        OR b.current_view IN ('initial_input', 'context_input', 'visualization', 'briefing', 'brief_upload')
      )
    )
    OR (
      NOT a.has_complete_data
      AND a.has_started_progress
      AND (
        b.current_view IS NULL
        OR b.current_view IN ('initial_input', 'context_input', 'visualization', 'brief_upload')
      )
    )
    OR (a.has_complete_data AND b.status IN ('draft', 'in_progress'))
    OR (
      NOT a.has_complete_data
      AND a.has_started_progress
      AND b.status = 'draft'
    )
  );
