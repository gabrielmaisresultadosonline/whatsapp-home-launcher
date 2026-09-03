-- ============================================================
-- 095 - Preferências do Agente IA e número WhatsApp principal
-- Idempotente: pode ser executada repetidamente.
-- ============================================================

ALTER TABLE public.crm_whatsapp_numbers
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

ALTER TABLE public.crm_settings
  ADD COLUMN IF NOT EXISTS ai_kanban_auto_organizer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_send_bundled boolean NOT NULL DEFAULT false;

-- Para cadastros antigos, escolhe de forma determinística um único número.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY is_active DESC, created_at ASC, id ASC
         ) AS position
    FROM public.crm_whatsapp_numbers
)
UPDATE public.crm_whatsapp_numbers AS numbers
   SET is_primary = (ranked.position = 1)
  FROM ranked
 WHERE numbers.id = ranked.id
   AND numbers.is_primary IS DISTINCT FROM (ranked.position = 1);

CREATE UNIQUE INDEX IF NOT EXISTS crm_whatsapp_numbers_one_primary_per_user_idx
  ON public.crm_whatsapp_numbers (user_id)
  WHERE is_primary = true;

-- A versão da migration 089 já ordenava por is_primary. Recriamos a função
-- após a coluna existir para garantir uma definição válida em toda instalação.
CREATE OR REPLACE FUNCTION public.crm_fill_contact_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  numero_id uuid;
BEGIN
  IF NEW.whatsapp_number_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT n.id INTO numero_id
    FROM public.crm_whatsapp_numbers n
    LEFT JOIN public.crm_settings s ON s.user_id = n.user_id
   WHERE n.user_id = NEW.user_id
   ORDER BY
     (n.meta_phone_number_id IS NOT NULL
       AND n.meta_phone_number_id = s.meta_phone_number_id) DESC,
     n.is_active DESC,
     n.is_primary DESC,
     n.created_at ASC
   LIMIT 1;

  IF numero_id IS NOT NULL THEN
    NEW.whatsapp_number_id := numero_id;
  END IF;

  RETURN NEW;
END $$;
