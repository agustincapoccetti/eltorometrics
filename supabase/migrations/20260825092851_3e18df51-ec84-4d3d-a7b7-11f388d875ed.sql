ALTER TABLE public.weekly_votes
  ADD CONSTRAINT weekly_votes_no_self_vote CHECK (voter_id <> nominee_id);

DROP FUNCTION IF EXISTS public.gamification_leaderboard(date, date);

CREATE OR REPLACE FUNCTION public.gamification_leaderboard(_from date, _to date)
 RETURNS TABLE(user_id uuid, full_name text, last_name text, photo_url text, "position" text, present_days integer, forms_count integer, streak_weeks integer, convocations integer, test_top5_count integer, test_pos_top3_count integer, vote_wins integer, votes_cast integer, points integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
),
cast_votes AS (
  SELECT v.voter_id AS user_id, COUNT(DISTINCT v.week_start)::int AS c
  FROM public.weekly_votes v
  WHERE v.week_start BETWEEN _from AND _to
  GROUP BY v.voter_id
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
       COALESCE(cast_votes.c, 0),
       (COALESCE(att.c, 0) * 3
        + COALESCE(forms.c, 0)
        + COALESCE(streak.c, 0) * 2
        + COALESCE(convo.c, 0) * 4
        + COALESCE(top5.c, 0) * 5
        + COALESCE(top3pos.c, 0) * 3
        + COALESCE(wins.c, 0) * 7
        + COALESCE(cast_votes.c, 0) * 1)
FROM athletes a
LEFT JOIN att ON att.user_id = a.id
LEFT JOIN forms ON forms.user_id = a.id
LEFT JOIN streak ON streak.user_id = a.id
LEFT JOIN convo ON convo.user_id = a.id
LEFT JOIN top5 ON top5.user_id = a.id
LEFT JOIN top3pos ON top3pos.user_id = a.id
LEFT JOIN wins ON wins.user_id = a.id
LEFT JOIN cast_votes ON cast_votes.user_id = a.id
ORDER BY 14 DESC, a.last_name NULLS LAST, a.full_name;
$function$;

REVOKE ALL ON FUNCTION public.gamification_leaderboard(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gamification_leaderboard(date, date) TO authenticated, service_role;