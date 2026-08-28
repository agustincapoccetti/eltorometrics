DELETE FROM public.calendar_events
WHERE id = '6f0dbb2c-d80f-4f7f-b6de-0e48dfaa07b5'
  AND event_date = DATE '2026-10-31'
  AND name = 'VS PONENT'
  AND type = 'match'
  AND EXISTS (
    SELECT 1
    FROM public.calendar_events original
    WHERE original.id = '33182ba0-043d-49d2-a666-62740316a1da'
      AND original.event_date = DATE '2026-10-31'
      AND original.name = 'VS PONENT'
      AND original.type = 'match'
  );