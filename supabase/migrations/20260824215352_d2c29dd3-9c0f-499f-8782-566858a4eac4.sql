CREATE TABLE public.weekly_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nominee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_votes_no_self CHECK (voter_id <> nominee_id),
  CONSTRAINT weekly_votes_comment_len CHECK (char_length(btrim(comment)) >= 10),
  CONSTRAINT weekly_votes_unique UNIQUE (voter_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_votes TO authenticated;
GRANT ALL ON public.weekly_votes TO service_role;

ALTER TABLE public.weekly_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atletas ven sus propios votos"
  ON public.weekly_votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid() OR public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Atletas crean su voto de la semana"
  ON public.weekly_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND week_start = date_trunc('week', CURRENT_DATE)::date);

CREATE POLICY "Atletas editan su voto de la semana"
  ON public.weekly_votes FOR UPDATE TO authenticated
  USING (voter_id = auth.uid() AND week_start = date_trunc('week', CURRENT_DATE)::date)
  WITH CHECK (voter_id = auth.uid() AND week_start = date_trunc('week', CURRENT_DATE)::date);

CREATE POLICY "Atletas o coach borran votos"
  ON public.weekly_votes FOR DELETE TO authenticated
  USING ((voter_id = auth.uid() AND week_start = date_trunc('week', CURRENT_DATE)::date) OR public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER trg_weekly_votes_updated
  BEFORE UPDATE ON public.weekly_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_weekly_votes_week ON public.weekly_votes (week_start);
CREATE INDEX idx_weekly_votes_nominee ON public.weekly_votes (nominee_id, week_start);

-- Ganador de la votación de una semana (empates: varios ganadores)
CREATE OR REPLACE FUNCTION public.weekly_vote_winners(_week_start date DEFAULT (date_trunc('week', CURRENT_DATE)::date))
RETURNS TABLE(nominee_id uuid, full_name text, last_name text, photo_url text, votes integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH tally AS (
    SELECT v.nominee_id, COUNT(*)::int AS votes
    FROM public.weekly_votes v
    WHERE v.week_start = _week_start
    GROUP BY v.nominee_id
  )
  SELECT t.nominee_id, p.full_name, p.last_name, p.photo_url, t.votes
  FROM tally t
  JOIN public.profiles p ON p.id = t.nominee_id
  WHERE t.votes = (SELECT MAX(votes) FROM tally)
  ORDER BY p.last_name NULLS LAST, p.full_name;
$$;

REVOKE ALL ON FUNCTION public.weekly_vote_winners(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.weekly_vote_winners(date) TO authenticated;

-- Ranking de gamificación por rango de fechas (mensual o temporada), con bonus de votación
CREATE OR REPLACE FUNCTION public.gamification_leaderboard(_from date, _to date)
RETURNS TABLE(user_id uuid, full_name text, last_name text, photo_url text, "position" text, present_days integer, forms_count integer, streak_weeks integer, convocations integer, test_top5_count integer, test_pos_top3_count integer, vote_wins integer, points integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH athletes AS (
  SELECT p.id, p.full_name, p.last_name, p.photo_url, p.position
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'atleta'
),
att AS (
  SELECT a.user_id, COUNT(*)::int AS c
  FROM public.attendance a
  WHERE a.present AND a.attendance_date BETWEEN _from AND _to
  GROUP BY a.user_id
),
forms AS (
  SELECT x.user_id, COUNT(*)::int AS c
  FROM (
    SELECT w.user_id FROM public.wellness_entries w WHERE w.entry_date BETWEEN _from AND _to
    UNION ALL
    SELECT r.user_id FROM public.rpe_entries r WHERE r.session_date BETWEEN _from AND _to
    UNION ALL
    SELECT rc.user_id FROM public.recovery_entries rc WHERE rc.entry_date BETWEEN _from AND _to
  ) x
  GROUP BY x.user_id
),
weeks AS (
  SELECT a.user_id, date_trunc('week', a.attendance_date)::date AS wk
  FROM public.attendance a
  WHERE a.present AND a.attendance_date BETWEEN _from AND _to
  GROUP BY 1, 2
),
streak AS (
  SELECT t.user_id, COUNT(*)::int AS c
  FROM (
    SELECT w.user_id, w.wk,
           row_number() OVER (PARTITION BY w.user_id ORDER BY w.wk DESC) AS rn,
           max(w.wk) OVER (PARTITION BY w.user_id) AS mx
    FROM weeks w
  ) t
  WHERE t.mx >= date_trunc('week', CURRENT_DATE)::date - 7
    AND t.wk = t.mx - (((t.rn - 1) * 7)::int)
  GROUP BY t.user_id
),
convo AS (
  SELECT mp.user_id, COUNT(*)::int AS c
  FROM public.match_participations mp
  JOIN public.matches m ON m.id = mp.match_id
  WHERE mp.convoked AND m.match_date BETWEEN _from AND _to
  GROUP BY mp.user_id
),
results AS (
  SELECT er.user_id, er.evaluation_id, er.value, e.higher_is_better, p.position
  FROM public.evaluation_results er
  JOIN public.evaluations e ON e.id = er.evaluation_id
  JOIN public.profiles p ON p.id = er.user_id
  WHERE e.eval_date BETWEEN _from AND _to
),
ranked_global AS (
  SELECT r.user_id,
         row_number() OVER (
           PARTITION BY r.evaluation_id
           ORDER BY CASE WHEN r.higher_is_better THEN r.value END DESC NULLS LAST,
                    CASE WHEN NOT r.higher_is_better THEN r.value END ASC NULLS LAST
         ) AS rn
  FROM results r
),
top5 AS (
  SELECT rg.user_id, COUNT(*)::int AS c FROM ranked_global rg WHERE rg.rn <= 5 GROUP BY rg.user_id
),
ranked_pos AS (
  SELECT r.user_id,
         row_number() OVER (
           PARTITION BY r.evaluation_id, r.position
           ORDER BY CASE WHEN r.higher_is_better THEN r.value END DESC NULLS LAST,
                    CASE WHEN NOT r.higher_is_better THEN r.value END ASC NULLS LAST
         ) AS rn
  FROM results r
  WHERE r.position IS NOT NULL
),
top3pos AS (
  SELECT rp.user_id, COUNT(*)::int AS c FROM ranked_pos rp WHERE rp.rn <= 3 GROUP BY rp.user_id
),
tally AS (
  SELECT v.week_start, v.nominee_id, COUNT(*)::int AS votes
  FROM public.weekly_votes v
  WHERE v.week_start BETWEEN _from AND _to
  GROUP BY 1, 2
),
wins AS (
  SELECT t.nominee_id AS user_id, COUNT(*)::int AS c
  FROM tally t
  WHERE t.votes = (SELECT MAX(t2.votes) FROM tally t2 WHERE t2.week_start = t.week_start)
  GROUP BY t.nominee_id
)
SELECT a.id,
       a.full_name,
       a.last_name,
       a.photo_url,
       a.position,
       COALESCE(att.c, 0),
       COALESCE(forms.c, 0),
       COALESCE(streak.c, 0),
       COALESCE(convo.c, 0),
       COALESCE(top5.c, 0),
       COALESCE(top3pos.c, 0),
       COALESCE(wins.c, 0),
       (COALESCE(att.c, 0) * 3
        + COALESCE(forms.c, 0)
        + COALESCE(streak.c, 0) * 2
        + COALESCE(convo.c, 0) * 4
        + COALESCE(top5.c, 0) * 5
        + COALESCE(top3pos.c, 0) * 3
        + COALESCE(wins.c, 0) * 7)
FROM athletes a
LEFT JOIN att ON att.user_id = a.id
LEFT JOIN forms ON forms.user_id = a.id
LEFT JOIN streak ON streak.user_id = a.id
LEFT JOIN convo ON convo.user_id = a.id
LEFT JOIN top5 ON top5.user_id = a.id
LEFT JOIN top3pos ON top3pos.user_id = a.id
LEFT JOIN wins ON wins.user_id = a.id
ORDER BY 13 DESC, a.last_name NULLS LAST, a.full_name;
$$;

REVOKE ALL ON FUNCTION public.gamification_leaderboard(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gamification_leaderboard(date, date) TO authenticated;