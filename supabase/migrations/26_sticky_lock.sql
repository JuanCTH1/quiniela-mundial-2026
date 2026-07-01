-- ── CANDADO DE UNA SOLA VÍA (sticky lock) ────────────────────────────────────
-- Principio: una vez que un partido se bloquea (y las predicciones se revelan a
-- los 6), NUNCA debe volver a abrirse. Antes, el bloqueo dependía solo de la
-- hora programada: si esa hora cambiaba (retraso, corrección de la API, o una
-- edición manual), el bloqueo podía "destrabarse" y reabrir predicciones ya
-- vistas por todos. Esto lo hace irreversible.

-- Marca permanente del momento en que se selló el bloqueo.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- is_match_locked ahora es "pegajoso": locked_at, un status distinto de
-- SCHEDULED (en juego / terminado / aplazado), o una liberación anticipada
-- lo vuelven irreversible. La hora sigue siendo el disparador inicial.
CREATE OR REPLACE FUNCTION public.is_match_locked(p_match_id uuid)
RETURNS boolean LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
           (SELECT locked_at IS NOT NULL
                   OR status <> 'SCHEDULED'
                   OR early_unlock_at IS NOT NULL
              FROM public.matches WHERE id = p_match_id),
           false)
         OR now() >= public.get_lock_time(p_match_id);
$$;

-- Trigger de sellado: al escribir cualquier partido que YA está bloqueado,
-- estampa locked_at y congela scheduled_time. Así, ni el cron ni una edición
-- manual pueden mover la hora para reabrir un partido bloqueado.
-- Los placeholders (rondas por definir) se excluyen: su hora todavía puede
-- actualizarse legítimamente hasta que se confirman los clasificados.
CREATE OR REPLACE FUNCTION public.freeze_locked_match()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(OLD.is_placeholder, false) = false
     AND (OLD.locked_at IS NOT NULL
          OR OLD.status <> 'SCHEDULED'
          OR OLD.early_unlock_at IS NOT NULL
          OR now() >= public.get_lock_time(OLD.id)) THEN
    NEW.locked_at := COALESCE(OLD.locked_at, now());
    NEW.scheduled_time := OLD.scheduled_time;  -- hora inmovible una vez bloqueado
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_locked_match ON public.matches;
CREATE TRIGGER trg_freeze_locked_match
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.freeze_locked_match();

-- Backfill: sellar todos los partidos que ya están bloqueados a día de hoy
-- (en curso, terminados y los SCHEDULED que ya pasaron su hora de corte).
UPDATE public.matches
SET locked_at = public.get_lock_time(id)
WHERE locked_at IS NULL
  AND COALESCE(is_placeholder, false) = false
  AND (status <> 'SCHEDULED'
       OR early_unlock_at IS NOT NULL
       OR now() >= public.get_lock_time(id));
