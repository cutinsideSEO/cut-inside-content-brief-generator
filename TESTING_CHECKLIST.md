# Cut Inside - Content Brief Generator
# Manual Testing Checklist

This document provides a comprehensive testing checklist for QA validation of all features.

---

## Pre-requisites

- [ ] Valid DataForSEO API credentials (login + password)
- [ ] Valid Gemini API key in `.env.local` (GEMINI_API_KEY=...)
- [ ] Node.js installed (v20.19+ recommended)
- [ ] Run `npm install` to install dependencies
- [ ] Run `npm run dev` to start the development server

---

## 1. Initial Input Screen

### 1.1 Keyword Input
- [ ] Enter keywords manually (comma-separated)
- [ ] Verify keywords are displayed correctly
- [ ] Test with special characters in keywords
- [ ] Test with very long keyword phrases

### 1.2 DataForSEO API Credentials
- [ ] Enter valid credentials → proceed to next step
- [ ] Enter invalid credentials → show error message
- [ ] Verify credentials are not stored in local storage (security)

### 1.3 Model Selector
- [ ] Default model is "Gemini 3 Pro"
- [ ] Can switch to "Gemini 3 Flash"
- [ ] Can switch to "Gemini 2.5 Pro"
- [ ] Thinking Level dropdown appears for Gemini 3 models
- [ ] Thinking Level dropdown is hidden for Gemini 2.5 Pro
- [ ] All thinking levels work: High, Medium, Low, Minimal

### 1.4 Word Count Settings
- [ ] Preset buttons work: Short (800), Medium (1500), Long (2500), Comprehensive (4000)
- [ ] Custom word count input accepts numeric values
- [ ] Custom word count clears presets
- [ ] Strict mode toggle works

### 1.5 Template-from-URL Import
- [ ] Can enter a URL for template extraction
- [ ] Template extraction shows loading state
- [ ] Successfully extracts heading structure from URL
- [ ] Shows error for invalid/unreachable URLs

### 1.6 Country & Language Selection
- [ ] Country dropdown works
- [ ] Language dropdown works
- [ ] Output language dropdown works (11 languages)

---

## 2. SERP Analysis (DataForSEO Integration)

### 2.1 API Syntax Verification
- [ ] Endpoint: `serp/google/organic/live/regular` (correct)
- [ ] Payload includes: `keyword`, `language_name`, `location_name`, `depth: 20`
- [ ] Auth header: Basic auth with base64 encoded credentials

### 2.2 Results Processing
- [ ] Organic results extracted (max 10)
- [ ] **PAA Questions extracted** from `people_also_ask` items
- [ ] URLs with valid `rank_absolute` are included
- [ ] Invalid URLs are filtered out
- [ ] Analysis log shows progress

### 2.3 Error Handling
- [ ] Invalid credentials show meaningful error
- [ ] Network errors show retry option
- [ ] Rate limiting is handled gracefully

---

## 3. Context Input Screen

### 3.1 Subject Matter Context
- [ ] Text area accepts free-form input
- [ ] No character limit issues

### 3.2 Brand Information
- [ ] Text area works correctly
- [ ] Input is passed to brief generation

### 3.3 File Upload
- [ ] PDF files upload and parse correctly
- [ ] DOCX files upload and parse correctly
- [ ] File size limit enforced (10MB)
- [ ] Invalid file types show error
- [ ] Multiple files can be uploaded

### 3.4 URL Scraping
- [ ] Can add URLs for scraping
- [ ] URLs are fetched and content extracted
- [ ] Invalid URLs show error status
- [ ] Content is combined with other context

---

## 4. Competitor Visualization Screen

### 4.1 Competitor Display
- [ ] Top 10 competitors shown sorted by Weighted_Score
- [ ] Each competitor shows: URL, score, rankings, H1s, H2s, word count
- [ ] Visualization chart renders correctly

### 4.2 Starring Feature
- [ ] Can star/unstar competitors
- [ ] Starred competitors marked as "ground truth"
- [ ] Up to 3 starred competitors used for full text context

### 4.3 Navigation
- [ ] "Continue to Briefing" button works
- [ ] Can go back to context input

---

## 5. Brief Generation (7 Steps)

### 5.1 Step 1: Page Goal & Audience (+ Search Intent)
- [ ] Goal and audience generated
- [ ] **NEW: Search Intent Classification included**
  - [ ] `search_intent.type` is one of: informational, transactional, navigational, commercial_investigation
  - [ ] `search_intent.preferred_format` populated
  - [ ] `search_intent.serp_features` is array
  - [ ] `search_intent.reasoning` explains the choice
- [ ] Reasoning displayed for each field
- [ ] Fields are editable

### 5.2 Step 2: Keyword Strategy
- [ ] Primary keywords selected from available list
- [ ] Secondary keywords populated
- [ ] Keyword notes/intent shown
- [ ] Reasoning explains keyword choices

### 5.3 Step 3: Competitive Analysis
- [ ] Competitor breakdown for each URL
- [ ] Good points and bad points listed
- [ ] Differentiation summary generated
- [ ] Competitors linked to URLs

### 5.4 Step 4: Content Gap Analysis
- [ ] Table Stakes (must-have topics) populated
- [ ] Strategic Opportunities (content gaps) populated
- [ ] Reasoning for each item
- [ ] Can remove items

### 5.5 Step 5: Article Structure (+ Featured Snippets + Word Count)
- [ ] Hierarchical outline generated (H2s with nested H3s)
- [ ] Word count target recommended
- [ ] Guidelines for each section
- [ ] Targeted keywords assigned
- [ ] Competitor coverage links
- [ ] **NEW: Featured Snippet Target field**
  - [ ] At least one section may have `featured_snippet_target`
  - [ ] Format: paragraph, list, or table
  - [ ] Target query specified
- [ ] **NEW: Per-section word count**
  - [ ] `target_word_count` may be present on sections
- [ ] Template headings applied if imported

### 5.6 Step 6: FAQ Generation (+ PAA Integration)
- [ ] FAQs generated with questions
- [ ] Guidelines for answering each question
- [ ] **NEW: PAA Questions Integration**
  - [ ] If PAA questions were collected from SERPs, they should be prioritized
  - [ ] Verify FAQ questions match or relate to PAA questions
- [ ] Reasoning explains FAQ selection

### 5.7 Step 7: On-Page SEO
- [ ] Title tag generated (50-60 chars)
- [ ] Meta description (150-160 chars)
- [ ] H1 recommendation
- [ ] URL slug recommendation
- [ ] OG title and description
- [ ] Reasoning for each element

---

## 6. Dashboard Screen

### 6.1 Brief Overview
- [ ] All 7 sections displayed
- [ ] Brief Strength meter calculated
- [ ] Primary keyword shown
- [ ] Word count shown
- [ ] H2 count shown
- [ ] FAQ count shown

### 6.2 Stale Step Tracking
- [ ] Regenerating Step 1 marks Steps 2-7 as stale
- [ ] Regenerating Step 4 marks Steps 5-7 as stale
- [ ] Stale indicator (yellow triangle) appears
- [ ] Regenerating clears stale state for that step

### 6.3 Section Editing
- [ ] Each section has edit interface
- [ ] Changes are saved to brief data
- [ ] Feedback textarea available

### 6.4 Regeneration
- [ ] "Regenerate" button works for each section
- [ ] Feedback is incorporated into regeneration
- [ ] Loading state shown during regeneration
- [ ] Error handled if regeneration fails

### 6.5 "I'm Feeling Lucky"
- [ ] Auto-generates all 7 steps sequentially
- [ ] Stops on error
- [ ] Can be interrupted (?)

---

## 7. Content Generation Screen

### 7.1 Article Generation
- [ ] Full article generated from brief
- [ ] Progress indicator shows current section
- [ ] Article renders in preview pane
- [ ] Title editable
- [ ] Content editable in markdown editor

### 7.2 Paragraph-Level Feedback (F2)
- [ ] **Interactive preview mode enabled**
- [ ] Hover over paragraph shows "Click to edit"
- [ ] Click paragraph opens feedback textarea
- [ ] Enter feedback → "Regenerate" button works
- [ ] Paragraph regenerates with context awareness
- [ ] Surrounding content unaffected
- [ ] Loading indicator during regeneration
- [ ] Can cancel feedback

### 7.3 Export
- [ ] "Download .md" button works
- [ ] File downloads with correct name
- [ ] Markdown format correct

---

## 8. Brief Export/Import

### 8.1 Export to Markdown
- [ ] Full brief exports all sections
- [ ] Concise brief omits reasoning
- [ ] File downloads correctly
- [ ] Anchors and TOC work

### 8.2 Import from Markdown
- [ ] Can upload .md file
- [ ] Brief parsed correctly
- [ ] All sections populated
- [ ] Error shown for invalid format

### 8.3 Brief as Template
- [ ] Can use imported brief as template
- [ ] Heading structure extracted
- [ ] Template applied to Step 5

---

## 9. Multi-Language Support

Test output language for each:
- [ ] English
- [ ] Spanish
- [ ] French
- [ ] German
- [ ] Italian
- [ ] Portuguese
- [ ] Dutch
- [ ] Polish
- [ ] Russian
- [ ] Japanese
- [ ] Chinese

For each language:
- [ ] Brief sections generated in target language
- [ ] Article generated in target language
- [ ] No mixed language issues

---

## 10. Error Handling

### 10.1 API Errors
- [ ] Gemini API timeout → retry or error message
- [ ] Gemini API rate limit → queue or error
- [ ] DataForSEO API error → meaningful message
- [ ] Network disconnection → graceful handling

### 10.2 Data Errors
- [ ] Empty keyword input → validation message
- [ ] No competitors found → informative message
- [ ] Parsing error → recovery option

---

## 11. New Features Verification

### N1: Search Intent Classification
- [ ] Present in Step 1 output
- [ ] Type is valid enum value
- [ ] Format matches ranking content

### N2: Featured Snippet Targeting
- [ ] Field available in outline items
- [ ] At least one item may be targeted
- [ ] Format specified correctly

### N3: Brief Validation (if implemented)
- [ ] `validateBrief()` function callable
- [ ] Returns scores and improvements

### N4: E-E-A-T Signals (if implemented)
- [ ] `generateEEATSignals()` function callable
- [ ] Returns experience, expertise, authority, trust arrays

### N5: Per-Section Word Count
- [ ] `target_word_count` field in outline items
- [ ] Values are reasonable

---

## Test Completion Sign-off

| Section | Tested By | Date | Pass/Fail | Notes |
|---------|-----------|------|-----------|-------|
| 1. Initial Input | | | | |
| 2. SERP Analysis | | | | |
| 3. Context Input | | | | |
| 4. Competitor Viz | | | | |
| 5. Brief Generation | | | | |
| 6. Dashboard | | | | |
| 7. Content Gen | | | | |
| 8. Export/Import | | | | |
| 9. Multi-Language | | | | |
| 10. Error Handling | | | | |
| 11. New Features | | | | |

---

## Running Automated Tests

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

---

*Last Updated: January 2026*
