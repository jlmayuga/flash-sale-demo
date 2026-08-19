#!/bin/sh

set -eu

export PGPASSWORD="$POSTGRES_PASSWORD"

database_exists="$({
  psql \
    --host=db \
    --username="$POSTGRES_USER" \
    --dbname=postgres \
    --tuples-only \
    --no-align \
    --command="SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'"
} | tr -d '[:space:]')"

if [ "$database_exists" != "1" ]; then
  createdb \
    --host=db \
    --username="$POSTGRES_USER" \
    "$POSTGRES_DB"
fi

psql \
  --host=db \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --file=/database/schema.sql

psql \
  --host=db \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --file=/database/seed.sql
