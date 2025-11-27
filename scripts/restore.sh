#!/bin/bash
set -e
set -x # Print commands and their arguments as they are executed.

echo "=== MongoDB Restore Script ==="
echo "Aguardando MongoDB ficar totalmente pronto..."

# Aguardar o mongo responder
# Increased timeout to 120 seconds (2 minutes)
for i in {1..120}; do
  if mongosh --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1; then
    echo "✓ MongoDB respondendo ao ping"
    break
  fi
  if [ "$i" -eq 120 ]; then
    echo "✗ MongoDB não respondeu após 120 segundos. Abortando."
    exit 1
  fi
  echo "  Tentativa $i/120 - aguardando..."
  sleep 1
done

BACKUP_DIR="/backup"
if [ ! -d "$BACKUP_DIR" ]; then
  echo "⚠ Diretório $BACKUP_DIR não encontrado. Pulando restauração."
  exit 0
fi

echo "✓ Iniciando restauração dos dados de $BACKUP_DIR..."
cd "$BACKUP_DIR"

echo "Arquivos BSON encontrados:"
ls -1 *.bson

# Restaurar cada coleção individualmente
for bson_file in *.bson; do
  if [ ! -e "$bson_file" ]; then
    echo "Nenhum arquivo .bson encontrado. Pulando."
    continue
  fi
  coll_name="${bson_file%.bson}"
  echo "---------------------------------"
  echo "  → Restaurando coleção: $coll_name a partir de $bson_file"
  mongorestore \
    --db db_pga \
    --collection "$coll_name" \
    "$bson_file"
  
  if [ $? -eq 0 ]; then
    echo "  ✓ Sucesso ao restaurar $coll_name"
  else
    echo "  ✗ Falha ao restaurar $coll_name"
    # We don't exit, to see if other collections can be restored
  fi
done

echo "---------------------------------"
echo "✓ Restauração concluída!"
echo "Verificando coleções no banco de dados db_pga:"
mongosh --db db_pga --eval 'db.getCollectionNames()'

exit 0


