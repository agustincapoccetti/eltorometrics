-- Free physio slot when appointment is deleted or marked cancelled
CREATE OR REPLACE FUNCTION public.free_physio_slot_on_appt_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.physio_slots
      SET reserved_by = NULL, reserved_at = NULL
      WHERE reserved_by = OLD.user_id
        AND slot_date = OLD.appointment_date
        AND start_time = OLD.appointment_time
        AND appointment_type = OLD.appointment_type;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
      UPDATE public.physio_slots
        SET reserved_by = NULL, reserved_at = NULL
        WHERE reserved_by = OLD.user_id
          AND slot_date = OLD.appointment_date
          AND start_time = OLD.appointment_time
          AND appointment_type = OLD.appointment_type;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_free_physio_slot_del ON public.physio_appointments;
CREATE TRIGGER trg_free_physio_slot_del
AFTER DELETE ON public.physio_appointments
FOR EACH ROW EXECUTE FUNCTION public.free_physio_slot_on_appt_change();

DROP TRIGGER IF EXISTS trg_free_physio_slot_upd ON public.physio_appointments;
CREATE TRIGGER trg_free_physio_slot_upd
AFTER UPDATE ON public.physio_appointments
FOR EACH ROW EXECUTE FUNCTION public.free_physio_slot_on_appt_change();

-- Add thumbnail column to library
ALTER TABLE public.library_items ADD COLUMN IF NOT EXISTS thumbnail_url text;