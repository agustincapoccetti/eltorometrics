ALTER TABLE public.availability_polls ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.availability_responses ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.availability_polls.questions IS 'Custom survey questions; empty array uses legacy options and multi fields.';
COMMENT ON COLUMN public.availability_responses.answers IS 'Answers keyed by question id; legacy answers remain in selected.';
CREATE OR REPLACE FUNCTION public.validate_survey_response() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p public.availability_polls; q jsonb; a jsonb; k text;
BEGIN
SELECT * INTO p FROM public.availability_polls WHERE id = NEW.poll_id;
IF NOT FOUND OR NOT p.active OR (p.closes_at IS NOT NULL AND p.closes_at <= now()) THEN RAISE EXCEPTION 'La encuesta está cerrada'; END IF;
IF jsonb_array_length(p.questions) > 0 THEN
FOR q IN SELECT value FROM jsonb_array_elements(p.questions) LOOP
k := q->>'id'; a := NEW.answers->k;
IF q->>'type' = 'text' THEN
IF a IS NOT NULL AND jsonb_typeof(a) <> 'string' THEN RAISE EXCEPTION 'Respuesta de texto inválida'; END IF;
IF coalesce((q->>'required')::boolean, true) AND coalesce(length(trim(NEW.answers->>k)),0) = 0 THEN RAISE EXCEPTION 'Completa las preguntas obligatorias'; END IF;
ELSE
IF a IS NOT NULL AND jsonb_typeof(a) <> 'array' THEN RAISE EXCEPTION 'Opciones inválidas'; END IF;
IF coalesce((q->>'required')::boolean,true) AND (a IS NULL OR jsonb_array_length(a)=0) THEN RAISE EXCEPTION 'Completa las preguntas obligatorias'; END IF;
IF a IS NOT NULL THEN
IF q->>'type' = 'single' AND jsonb_array_length(a)>1 THEN RAISE EXCEPTION 'Elige una sola opción'; END IF;
IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(a) v WHERE NOT (q->'options' ? v)) THEN RAISE EXCEPTION 'Opción inválida'; END IF;
END IF;
END IF;
END LOOP;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER validate_custom_survey_response BEFORE INSERT OR UPDATE ON public.availability_responses FOR EACH ROW EXECUTE FUNCTION public.validate_survey_response();