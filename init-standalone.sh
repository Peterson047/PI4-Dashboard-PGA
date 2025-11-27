#!/bin/bash

# Script para inicializar o projeto PGA Dashboard em modo standalone (sem bind mounts)

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
echo_message() {
    echo -e "${GREEN}==> $1${NC}"
}

# Função auxiliar para invocar docker compose conforme disponível
dc_cmd() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    elif command -v docker >/dev/null 2>&1; then
        echo "docker compose"
    else
        echo ""
    fi
}

# Verificar se o docker-compose-standalone.yml existe
if [ ! -f "docker-compose-standalone.yml" ]; then
    echo -e "${YELLOW}Arquivo docker-compose-standalone.yml não encontrado.${NC}"
    exit 1
fi

# Verificar se o Dockerfile.standalone existe
if [ ! -f "Dockerfile.standalone" ]; then
    echo -e "${YELLOW}Arquivo Dockerfile.standalone não encontrado.${NC}"
    exit 1
fi

echo_message "Iniciando modo standalone do PGA Dashboard..."

# Usar docker-compose-standalone.yml
DC=$(dc_cmd)
if [ -z "$DC" ]; then
    echo -e "${YELLOW}Docker / docker-compose não encontrado. Instale Docker e docker-compose (ou use 'docker compose').${NC}"
    exit 1
fi

echo_message "Construindo e iniciando containers..."
$DC -f docker-compose-standalone.yml up -d --build

echo_message "Aguardando serviços iniciarem..."
sleep 10

echo_message "Serviços iniciados:"
echo "  - MongoDB: mongodb://localhost:27018"
echo "  - Aplicação: http://localhost:3000"

echo_message "Para verificar os logs, execute: docker logs pga-dashboard"
echo_message "Para parar os serviços, execute: docker-compose -f docker-compose-standalone.yml down"