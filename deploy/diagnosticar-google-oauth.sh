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

echo "contas cadastradas: $(q "select count(*) from public.crm_google_accounts" || echo '?')"
echo
echo "Últimos eventos OAuth (30 min):"
docker logs --since 30m "$FN_CONTAINER" 2>&1 \
  | grep -aiE '\[OAUTH|exchangeGoogleCode|unique or exclusion constraint|crm_google_accounts' \
  | tail -n 100 || true

echo
echo "Escuta OAuth por ${SEGUNDOS}s — conecte a conta Google agora:"
timeout "$SEGUNDOS" docker logs -f --since 2s "$FN_CONTAINER" 2>&1 \
  | grep -aiE '\[OAUTH|exchangeGoogleCode|unique or exclusion constraint|crm_google_accounts' \
  || true