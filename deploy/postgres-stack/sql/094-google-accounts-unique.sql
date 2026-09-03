-- ============================================================
-- 094 - UNIQUE(user_id, email) em public.crm_google_accounts
-- ------------------------------------------------------------
-- Motivo: versões anteriores da ação exchangeGoogleCode faziam
--   upsert(..., { onConflict: 'user_id, email' }).
-- Sem a constraint essas versões devolvem:
--   "there is no unique or exclusion constraint matching the
--    ON CONFLICT specification"
-- e a conexão da conta Google falha no /google-callback.
-- Idempotente: pode rodar quantas vezes precisar.
-- ============================================================

-- 1) Consolida duplicados mantendo o registro mais recente e com
--    refresh_token. Antes de excluir, move os contatos que referenciam uma
--    duplicata para o registro preservado, evitando violação da FK.
DO $$
DECLARE
  duplicate_record record;
BEGIN
  FOR duplicate_record IN
    SELECT id, keeper_id
    FROM (
      SELECT
        id,
        FIRST_VALUE(id) OVER (
          PARTITION BY user_id, email
          ORDER BY
            (refresh_token IS NOT NULL)::int DESC,
            updated_at DESC NULLS LAST,
            created_at DESC NULLS LAST,
            id
        ) AS keeper_id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, email
          ORDER BY
            (refresh_token IS NOT NULL)::int DESC,
            updated_at DESC NULLS LAST,
            created_at DESC NULLS LAST,
            id
        ) AS row_number
      FROM public.crm_google_accounts
    ) ranked
    WHERE row_number > 1
  LOOP
    UPDATE public.crm_contacts
       SET google_sync_account_id = duplicate_record.keeper_id
     WHERE google_sync_account_id = duplicate_record.id;

    DELETE FROM public.crm_google_accounts
     WHERE id = duplicate_record.id;
  END LOOP;
END $$;

-- 2) Cria a constraint única (só se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.crm_google_accounts'::regclass
      AND contype IN ('u', 'p')
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.crm_google_accounts'::regclass AND attname = 'user_id'),
        (SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.crm_google_accounts'::regclass AND attname = 'email')
      ]::smallint[]
  ) THEN
    ALTER TABLE public.crm_google_accounts
      ADD CONSTRAINT crm_google_accounts_user_id_email_key UNIQUE (user_id, email);
  END IF;
END $$;
