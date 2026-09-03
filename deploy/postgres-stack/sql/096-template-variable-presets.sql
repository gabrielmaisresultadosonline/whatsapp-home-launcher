-- ============================================================
-- 096 - Configurações salvas de variáveis de templates Meta
-- Idempotente: pode ser executada repetidamente.
--
-- Separa a CONFIGURAÇÃO DO TEMPLATE (crm_templates, estrutura aprovada) dos
-- DADOS DO ENVIO (mídia do cabeçalho, variáveis do corpo, parâmetros de URL),
-- permitindo reutilizar o mesmo template aprovado com valores diferentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_template_variable_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  template_id text NOT NULL,
  template_name text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_template_variable_presets TO authenticated;
GRANT ALL ON public.crm_template_variable_presets TO service_role;

CREATE INDEX IF NOT EXISTS crm_template_variable_presets_user_template_idx
  ON public.crm_template_variable_presets (user_id, template_id);

-- Apenas um preset padrão por template e usuário.
CREATE UNIQUE INDEX IF NOT EXISTS crm_template_variable_presets_one_default_idx
  ON public.crm_template_variable_presets (user_id, template_id)
  WHERE is_default = true;

ALTER TABLE public.crm_template_variable_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own data" ON public.crm_template_variable_presets;
CREATE POLICY "Users can only access their own data" ON public.crm_template_variable_presets
  AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert their own data" ON public.crm_template_variable_presets;
CREATE POLICY "Users can only insert their own data" ON public.crm_template_variable_presets
  AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update their own data" ON public.crm_template_variable_presets;
CREATE POLICY "Users can only update their own data" ON public.crm_template_variable_presets
  AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only delete their own data" ON public.crm_template_variable_presets;
CREATE POLICY "Users can only delete their own data" ON public.crm_template_variable_presets
  AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);

-- updated_at automático (reaproveita a função genérica quando existir).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crm_template_variable_presets_updated_at') THEN
      CREATE TRIGGER crm_template_variable_presets_updated_at
        BEFORE UPDATE ON public.crm_template_variable_presets
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- Histórico: índice para localizar cliques em botões de template por conversa.
CREATE INDEX IF NOT EXISTS crm_messages_template_button_idx
  ON public.crm_messages ((metadata->>'template_button_payload'))
  WHERE metadata ? 'template_button_payload';
