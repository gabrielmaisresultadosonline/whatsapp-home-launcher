#!/usr/bin/env bash
# Diagnóstico seguro da conexão Google: não imprime tokens, códigos ou segredos.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK="$ROOT/deploy/postgres-stack"
SEGUNDOS="${1:-120}"

set -a
[ -f "$STACK/.env" ] && source "$STACK/.env"
set +a

PGPASS="${POSTGRES_PASSWORD:-}"
PGDB="${POSTGRES_DB:-postgres}"
PGUSER_="${POSTGRES_USER:-postgres}"
DB_CONTAINER="${DB_CONTAINER:-zapmro-db}"
FN_CONTAINER="${FN_CONTAINER:-zapmro-functions}"

q() {
  docker exec -e PGPASSWORD="$PGPASS" "$DB_CONTAINER" \
    psql -U "$PGUSER_" -d "$PGDB" -X -tA -P pager=off -c "$1" 2>/dev/null
}

echo "========================================================"
echo " GOOGLE OAUTH — BANCO E CÓDIGO EM EXECUÇÃO"
echo "========================================================"
echo "commit: $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo desconhecido)"

constraint_count="$(q "select count(*) from pg_constraint where conrelid='public.crm_google_accounts'::regclass and contype in ('u','p') and conkey=ARRAY[(select attnum from pg_attribute where attrelid='public.crm_google_accounts'::regclass and attname='user_id'),(select attnum from pg_attribute where attrelid='public.crm_google_accounts'::regclass and attname='email')]::smallint[]" || echo 0)"
if [ "$constraint_count" = "1" ]; then
  echo "constraint UNIQUE(user_id,email): OK"
else
  echo "constraint UNIQUE(user_id,email): AUSENTE"
fi

if grep -q "Sem depender da UNIQUE(user_id,email)" "$ROOT/supabase/functions/meta-whatsapp-crm/index.ts"; then
  echo "callback Google sem ON CONFLICT: OK"
else
  echo "callback Google sem ON CONFLICT: CÓDIGO ANTIGO"
fi

if grep -q "Não usar upsert ON CONFLICT (wa_id,user_id)" "$ROOT/supabase/functions/meta-whatsapp-crm/index.ts" \
  && ! grep -q "upsert(upsertBatch, { onConflict: 'wa_id,user_id' })" "$ROOT/supabase/functions/meta-whatsapp-crm/index.ts"; then
  echo "importação Google sem conflito legado: OK"
else
  echo "importação Google sem conflito legado: CÓDIGO ANTIGO"
fi

echo "contas cadastradas: $(q "select count(*) from public.crm_google_accounts" || echo '?')"
echo "contatos vinculados ao Google: $(q "select count(*) from public.crm_contacts where google_sync_account_id is not null" || echo '?')"
echo "contatos CRM pendentes para exportação (todos os cadastros): $(q "select count(*) from public.crm_contacts where google_sync_account_id is null or metadata->>'google_dirty' = 'true'" || echo '?')"
echo "pendentes por cadastro (sufixo do user_id | total | com nome válido | reservados <10min | contas Google):"
q "select right(c.user_id::text, 8) || ' | ' || count(*) || ' | ' || count(*) filter (where nullif(btrim(c.name), '') is not null and btrim(c.name) <> btrim(c.wa_id)) || ' | ' || count(*) filter (where c.google_sync_claimed_at >= now() - interval '10 minutes') || ' | ' || (select count(*) from public.crm_google_accounts ga where ga.user_id = c.user_id) from public.crm_contacts c where c.google_sync_account_id is null or c.metadata->>'google_dirty' = 'true' group by c.user_id order by count(*) desc" || echo "?"
echo
echo "Últimos eventos OAuth/Sync (30 min):"
docker logs --since 30m "$FN_CONTAINER" 2>&1 \
  | grep -aiE '\[OAUTH|\[SYNC|\[GOOGLE-SYNC|exchangeGoogleCode|syncGoogleContacts|syncPendingToGoogle|unique or exclusion constraint|crm_google_accounts|People API' \
  | tail -n 100 || true

echo
echo "Escuta OAuth/Sync por ${SEGUNDOS}s — use IMPORTAR para Google → CRM ou EXPORTAR para CRM → Google:"
timeout "$SEGUNDOS" docker logs -f --since 2s "$FN_CONTAINER" 2>&1 \
  | grep -aiE '\[OAUTH|\[SYNC|\[GOOGLE-SYNC|exchangeGoogleCode|syncGoogleContacts|syncPendingToGoogle|unique or exclusion constraint|crm_google_accounts|People API' \
  || true