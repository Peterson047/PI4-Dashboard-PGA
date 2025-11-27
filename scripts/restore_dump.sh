#!/usr/bin/env bash
# Script helper para restaurar o dump local para o container mongo via docker-compose
set -euo pipefail

SVC_MONGO_RESTORE="mongo-restore"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não está instalado ou não está no PATH." >&2
  exit 1
fi

DC="docker-compose"
if ! command -v docker-compose >/dev/null 2>&1 && command -v docker >/dev/null 2>&1; then
  DC="docker compose"
fi

echo "Executando restore usando compose service: $SVC_MONGO_RESTORE"
${DC} up -d mongo
# executa o job de restauração (vai subir, executar e sair)
${DC} run --rm $SVC_MONGO_RESTORE
echo "Restauração finalizada."
