#!/bin/sh
set -eu

log() {
  printf '[f1db-loader] %s\n' "$*"
}

: "${PGHOST:?PGHOST is required}"
PGPORT="${PGPORT:-5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${F1DB_VERSION:?F1DB_VERSION is required}"
: "${F1DB_SHA256:?F1DB_SHA256 is required}"
ALTERF1_RO_USER="${ALTERF1_RO_USER:-alterf1_ro}"
: "${ALTERF1_RO_PASSWORD:?ALTERF1_RO_PASSWORD is required}"
F1DB_CACHE_DIR="${F1DB_CACHE_DIR:-/cache}"
# busybox sha256sum -c only accepts lowercase hex.
F1DB_SHA256=$(printf '%s' "$F1DB_SHA256" | tr 'A-F' 'a-f')

# psql reads the role name and password with \getenv, so the password never
# appears on a command line (ps / /proc/<pid>/cmdline).
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE ALTERF1_RO_USER ALTERF1_RO_PASSWORD

# a. Wait until PostgreSQL is ready (max 60 tries, 1s apart).
attempt=0
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    log "ERROR: PostgreSQL not ready after 60 attempts" >&2
    exit 1
  fi
  sleep 1
done

# b. Read the installed F1DB version. pg_isready does not authenticate, so a wrong
#    password or database surfaces here, before anything is downloaded.
has_meta=$(psql -X -v ON_ERROR_STOP=1 -tAc "SELECT to_regclass('f1db.f1db_meta') IS NOT NULL") || {
  log "ERROR: cannot query database $PGDATABASE as $PGUSER" >&2
  exit 1
}
installed=""
if [ "$has_meta" = "t" ]; then
  installed=$(psql -X -v ON_ERROR_STOP=1 -tAc "SELECT version FROM f1db.f1db_meta LIMIT 1")
fi

# c. Skip download/load if already at target version.
if [ "$installed" = "$F1DB_VERSION" ]; then
  log "already at $F1DB_VERSION"
else
  # d. Ensure cached zip matches expected SHA-256.
  mkdir -p "$F1DB_CACHE_DIR"
  zip="$F1DB_CACHE_DIR/f1db-$F1DB_VERSION-sql-postgresql.zip"
  if [ ! -f "$zip" ] || ! printf '%s  %s\n' "$F1DB_SHA256" "$zip" | sha256sum -c - >/dev/null 2>&1; then
    url="https://github.com/f1db/f1db/releases/download/$F1DB_VERSION/f1db-sql-postgresql.zip"
    part="$zip.part"
    rm -f "$part"
    log "downloading $url"
    if ! wget -q -T 60 -O "$part" "$url"; then
      log "ERROR: failed to download $url" >&2
      rm -f "$part"
      exit 1
    fi
    if ! printf '%s  %s\n' "$F1DB_SHA256" "$part" | sha256sum -c - >/dev/null 2>&1; then
      log "ERROR: sha256 mismatch for $part (expected $F1DB_SHA256)" >&2
      rm -f "$part"
      exit 1
    fi
    mv "$part" "$zip"
    log "verified $zip"
  else
    log "using cached $zip"
  fi

  # e. Load dump into f1db schema in a single transaction.
  log "loading $F1DB_VERSION into schema f1db"
  start_ts=$(date +%s)
  {
    printf '%s\n' \
      'BEGIN;' \
      'DROP SCHEMA IF EXISTS f1db CASCADE;' \
      'CREATE SCHEMA f1db;' \
      'SET LOCAL search_path TO f1db;'
    if ! unzip -p "$zip" f1db-sql-postgresql.sql; then
      printf '\n%s\n' "ROLLBACK; DO \$\$ BEGIN RAISE EXCEPTION 'unzip failed for f1db-sql-postgresql.sql'; END \$\$;"
      exit 1
    fi
    printf '\n%s\n' \
      'CREATE TABLE f1db.f1db_meta (version text NOT NULL, loaded_at timestamptz NOT NULL DEFAULT now());' \
      "INSERT INTO f1db.f1db_meta(version) VALUES (:'f1db_version');" \
      'COMMIT;'
  } | PGOPTIONS='-c client_min_messages=warning' psql -q -v ON_ERROR_STOP=1 -X -v f1db_version="$F1DB_VERSION"
  elapsed=$(($(date +%s) - start_ts))
  log "loaded $F1DB_VERSION in ${elapsed}s"
fi

# f. Read-only role, schema and grants (idempotent, always run; never print the password).
#    Grants on the alterf1 views are given by Flyway's afterMigrate callback, which
#    (re)creates them.
PGOPTIONS='-c client_min_messages=warning' psql -q -v ON_ERROR_STOP=1 -X <<'SQL'
\getenv ro_user ALTERF1_RO_USER
\getenv ro_password ALTERF1_RO_PASSWORD

SELECT format(
  CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ro_user')
    THEN 'ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L'
    ELSE 'CREATE ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L'
  END, :'ro_user', :'ro_password')
\gexec

-- Defence in depth: even a wrong GRANT cannot let this role write.
SELECT format('ALTER ROLE %I SET default_transaction_read_only = on', :'ro_user')
\gexec

CREATE SCHEMA IF NOT EXISTS alterf1 AUTHORIZATION CURRENT_USER;

SELECT format('GRANT USAGE ON SCHEMA f1db, alterf1 TO %I', :'ro_user')
\gexec

-- The alterf1 views run with the caller's rights (security_invoker), so the role reads f1db directly.
SELECT format('GRANT SELECT ON ALL TABLES IN SCHEMA f1db TO %I', :'ro_user')
\gexec
SQL

# g. Done.
log "done"
