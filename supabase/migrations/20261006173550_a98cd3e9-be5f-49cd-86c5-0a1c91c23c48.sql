ALTER TABLE public.matches ADD COLUMN tournament text NOT NULL DEFAULT 'regional';
ALTER TABLE public.matches ADD CONSTRAINT matches_tournament_check CHECK (tournament IN ('dhb','regional'));