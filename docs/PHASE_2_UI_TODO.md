# Phase 2 UI TODO

This file tracks the next UI refactor after the Phase 1 workflow foundation.
The current landing page generator must remain available until these items are
implemented and verified.

## Workflow UI

- Replace optimistic generation timers with persisted `generation_runs` status.
- Add a project-level run summary card showing current status, active step, and errors.
- Add a stepper for benchmark, SEO, design, brand, site structure, landing page, and review.
- Poll run status while a run is queued or running.
- Show retry actions for failed runs and failed steps.
- Show a read-only artifact panel for completed steps.

## Project Detail Page

- Keep the existing landing page preview and export actions visible for legacy generated content.
- Add a new workflow section below the current project info card.
- Load the latest generation run for the current project.
- Display empty state copy when no workflow run exists.
- Add a "Start workflow" action after the backend runner exists.

## Artifact Review

- Render benchmark, SEO, design, brand, site structure, landing page, and review artifacts with typed components.
- Add approve/reject controls after artifact approval rules are defined.
- Preserve artifact version history in the UI.
- Add a simple JSON fallback viewer for unknown or partial artifacts.

## API Integration

- Add client helpers for run, step, and artifact endpoints.
- Avoid changing the existing `/api/projects/[id]/generate` flow until the workflow path can fully replace it.
- Add loading, empty, failed, and completed states for each workflow route response.

## Preview Integration

- Keep the current `LandingPagePreview` wired to legacy `generatedContent`.
- Add a new preview adapter for `LandingPageArtifact`.
- Do not remove HTML/WordPress export until the new artifact renderer reaches parity.
