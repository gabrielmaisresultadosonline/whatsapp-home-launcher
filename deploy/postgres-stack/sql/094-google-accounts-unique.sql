-- ============================================================
-- 094 - UNIQUE(user_id, email) em public.crm_google_accounts
-- ------------------------------------------------------------
-- Motivo: a ação exchangeGoogleCode (Edge Function meta-whatsapp-crm) faz
--   upsert(..., { onConflict: 'user_id, email' })
-- Sem a constraint o Postgres devolve:
--   "there is no unique or exclusion constraint matching the
--    ON CONFLICT specification"
-- e a conexão da conta Google falha no /google-callback.
-- Idempotente: pode rodar quantas vezes precisar.
-- ============================================================

-- 1) Remove duplicados (user_id, email) mantendo o registro mais recente
--    e com refresh_token preenchido.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, email
      ORDER BY
        (refresh_token IS NOT NULL)::int DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) AS rn
  FROM public.crm_google_accounts
)
DELETE FROM public.crm_google_accounts g
USING ranked r
WHERE g.id = r.id
  AND r.rn > 1;

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
