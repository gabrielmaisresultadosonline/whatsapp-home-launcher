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
echo
echo "Últimos eventos OAuth/Sync (30 min):"
docker logs --since 30m "$FN_CONTAINER" 2>&1 \
  | grep -aiE '\[OAUTH|\[SYNC|exchangeGoogleCode|syncGoogleContacts|unique or exclusion constraint|crm_google_accounts|People API' \
  | tail -n 100 || true

echo
echo "Escuta OAuth/Sync por ${SEGUNDOS}s — conecte ou sincronize a conta Google agora:"
timeout "$SEGUNDOS" docker logs -f --since 2s "$FN_CONTAINER" 2>&1 \
  | grep -aiE '\[OAUTH|\[SYNC|exchangeGoogleCode|syncGoogleContacts|unique or exclusion constraint|crm_google_accounts|People API' \
  || true