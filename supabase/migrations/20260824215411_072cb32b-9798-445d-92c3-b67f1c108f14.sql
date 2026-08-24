REVOKE EXECUTE ON FUNCTION public.gamification_leaderboard(date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.weekly_vote_winners(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.attendance_leaderboard(integer) FROM anon;