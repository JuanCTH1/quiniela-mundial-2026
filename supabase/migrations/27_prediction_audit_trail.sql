-- ── AUDITORÍA DE PREDICCIONES ────────────────────────────────────────────────
-- Motivo: submitted_at NO se actualiza en un UPDATE (el upsert del cliente no
-- lo toca), así que hoy no hay forma de saber cuándo se editó un pronóstico
-- ni de distinguir un guardado real de un intento rechazado. Esto añade:
--   1. Trigger que registra en audit_log cada INSERT/UPDATE exitoso.
--   2. RPC para que el cliente registre intentos rechazados (bloqueo/RLS),
--      ya que un intento rechazado nunca llega a tocar la fila.

CREATE OR REPLACE FUNCTION public.log_prediction_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action_type, match_id, old_value, new_value)
  VALUES (
    NEW.user_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'PREDICTION_CREATED' ELSE 'PREDICTION_EDITED' END,
    NEW.match_id,
    CASE WHEN TG_OP = 'UPDATE'
      THEN jsonb_build_object('home_score', OLD.home_score, 'away_score', OLD.away_score)
      ELSE NULL
    END,
    jsonb_build_object('home_score', NEW.home_score, 'away_score', NEW.away_score)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_prediction_change ON public.predictions;
CREATE TRIGGER trg_log_prediction_change
  AFTER INSERT OR UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.log_prediction_change();

-- RPC para registrar intentos rechazados (bloqueo o RLS). SECURITY DEFINER
-- porque el usuario normal no tiene INSERT en system_logs; se limita a
-- escribir su propio user_id (auth.uid()) y datos de solo lectura del intento.
CREATE OR REPLACE FUNCTION public.log_prediction_rejected(
  p_match_id uuid,
  p_attempted_home integer,
  p_attempted_away integer,
  p_reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.system_logs (log_type, match_id, message, details, is_error)
  VALUES (
    'PREDICTION_REJECTED',
    p_match_id,
    format('Intento rechazado (%s) — usuario %s quiso %s-%s', p_reason, auth.uid(), p_attempted_home, p_attempted_away),
    jsonb_build_object(
      'user_id', auth.uid(),
      'attempted_home', p_attempted_home,
      'attempted_away', p_attempted_away,
      'reason', p_reason
    ),
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_prediction_rejected(uuid, integer, integer, text) TO authenticated;
