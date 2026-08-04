-- Retire the legacy database-level smartscore trigger so the canonical calculation path is the only source of truth.
DROP TRIGGER IF EXISTS recalculate_smart_score ON public.profiles;
DROP FUNCTION IF EXISTS update_smart_score();
