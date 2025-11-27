#!/bin/bash
set -e

echo "=== MongoDB Restore Service ==="
echo "Aguardando Mongo estar 100% saudável..."

for i in {1..60}; do
  if mongosh --host mongo:27017 --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1; then
    echo "✓ Mongo respondendo ao ping"
    break
  fi
  echo "  Tentativa $i/60 - aguardando..."
  sleep 2
done

if [ ! -d "/dump" ]; then
  echo "⚠ Diretório /dump não encontrado. Pulando restauração."
  exit 0
fi

echo "✓ Iniciando restauração..."
cd /dump

# Restaurar cada coleção individualmente
for bson_file in *.bson; do
  [ -e "$bson_file" ] || continue
  coll_name="${bson_file%.bson}"
  echo "  → Restaurando coleção: $coll_name"
  mongorestore --host mongo:27017 --db db_pga --collection "$coll_name" "$bson_file" 2>&1 | grep -v "ns not found" || true
done

echo "✓ Restauração concluída com sucesso!"
sleep 2
