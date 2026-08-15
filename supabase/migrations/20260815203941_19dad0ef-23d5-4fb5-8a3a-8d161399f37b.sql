CREATE POLICY "Coach deletes recovery" ON public.recovery_entries FOR DELETE TO authenticated USING (has_role(auth.uid(), 'coach'::app_role));
CREATE POLICY "Coach updates recovery" ON public.recovery_entries FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'coach'::app_role)) WITH CHECK (has_role(auth.uid(), 'coach'::app_role));
CREATE POLICY "Coach deletes recovery items" ON public.recovery_entry_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'coach'::app_role));
CREATE POLICY "Coach deletes weight" ON public.weight_history FOR DELETE TO authenticated USING (has_role(auth.uid(), 'coach'::app_role));
CREATE POLICY "Coach updates weight" ON public.weight_history FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'coach'::app_role)) WITH CHECK (has_role(auth.uid(), 'coach'::app_role));
CREATE POLICY "Coach inserts weight" ON public.weight_history FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'coach'::app_role));