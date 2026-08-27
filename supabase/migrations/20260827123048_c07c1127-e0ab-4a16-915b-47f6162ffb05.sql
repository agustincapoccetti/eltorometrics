INSERT INTO public.calendar_events (event_date, event_time, duration_minutes, name, type, created_by)
SELECT g::date, rs.start_time, rs.duration_minutes, rs.name, COALESCE(rs.event_type,'training'), rs.created_by
FROM public.recurring_schedules rs
CROSS JOIN LATERAL generate_series(rs.start_date::timestamp, COALESCE(rs.end_date, CURRENT_DATE + 365)::timestamp, interval '1 day') g
WHERE rs.kind = 'training' AND rs.active
  AND EXTRACT(DOW FROM g)::int = ANY (rs.weekdays)
  AND NOT EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.event_date = g::date AND ce.name = rs.name AND ce.event_time = rs.start_time
  );