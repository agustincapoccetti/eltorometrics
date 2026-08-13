CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  eval_date date NOT NULL DEFAULT current_date,
  unit text NOT NULL DEFAULT '',
  higher_is_better boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos los autenticados ven evaluaciones" ON public.evaluations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches crean evaluaciones" ON public.evaluations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches editan evaluaciones" ON public.evaluations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches borran evaluaciones" ON public.evaluations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER trg_evaluations_updated BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.evaluation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value numeric NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_results TO authenticated;
GRANT ALL ON public.evaluation_results TO service_role;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atleta ve sus resultados y coach todos" ON public.evaluation_results
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches cargan resultados" ON public.evaluation_results
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches editan resultados" ON public.evaluation_results
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches borran resultados" ON public.evaluation_results
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER trg_evaluation_results_updated BEFORE UPDATE ON public.evaluation_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_eval_results_user ON public.evaluation_results(user_id);
CREATE INDEX idx_eval_results_eval ON public.evaluation_results(evaluation_id);