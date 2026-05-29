-- =============================================================
-- Migration: 003_expand_workflow_artifact_types
-- Purpose:   Add planning-stage artifact types for the expanded
--            multi-agent website planning workflow.
-- Idempotent: safe if values already exist.
-- =============================================================

alter type public.website_artifact_type add value if not exists 'strategy';
alter type public.website_artifact_type add value if not exists 'site_architecture';
alter type public.website_artifact_type add value if not exists 'feature_planning';
alter type public.website_artifact_type add value if not exists 'ux_flow';

-- The existing artifact values remain available for backward compatibility:
-- benchmark, seo, design, brand, site_structure, landing_page, review.
