-- Aprobar todos los facts existentes
UPDATE match_facts SET reviewed = true;

-- Default true para nuevos facts
ALTER TABLE match_facts ALTER COLUMN reviewed SET DEFAULT true;

-- Quitar filtro reviewed de RLS
DROP POLICY IF EXISTS match_facts_read ON match_facts;
CREATE POLICY match_facts_read ON match_facts FOR SELECT USING (true);
