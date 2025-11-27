#!/bin/bash

# Script para inicializar o projeto PGA Dashboard

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

# Modo Docker: ./init.sh docker
if [ "${1-}" = "docker" ]; then
    DC=$(dc_cmd)
    if [ -z "$DC" ]; then
        echo -e "${YELLOW}Docker / docker-compose não encontrado. Instale Docker e docker-compose (ou use 'docker compose').${NC}"
        exit 1
    fi
    echo_message "Modo Docker: construindo e subindo containers via docker-compose"
    # build & start mongo first
    $DC -f docker-compose.yml up -d --build mongo
    echo_message "Executando restauração do dump (mongo-restore)..."
    # run the restore job (will exit when done)
    $DC -f docker-compose.yml run --rm mongo-restore
    echo_message "Subindo o serviço da aplicação..."
    $DC -f docker-compose.yml up -d --build app
    echo_message "Pipeline Docker concluído. Mongo disponível em localhost:27018"
    exit 0
fi

# Modo run-app: usado quando o container app executa init.sh run-app
if [ "${1-}" = "run-app" ]; then
    echo_message "Modo run-app: iniciando rotinas dentro do container"
fi

# 1. Instalar dependências do Node.js
echo_message "Instalando dependências do Node.js..."
npm install --legacy-peer-deps

# 2. Instalar dependências do Python
echo_message "Instalando dependências do Python..."
# Se estivermos no modo run-app (ex: dentro do container), crie um venv e instale requirements.txt da raiz
if [ "${1-}" = "run-app" ]; then
    if [ -f "/app/requirements.txt" ]; then
        python3 -m venv /opt/venv || true
        . /opt/venv/bin/activate
        pip install --upgrade pip
        pip install -r /app/requirements.txt
    else
        echo -e "${YELLOW}requirements.txt não encontrado em /app. Pulando instalação de Python.${NC}"
    fi
else
    if [ -d "env" ]; then
        source env/bin/activate
        if [ -f "requirements-python.txt" ]; then
            pip install -r requirements-python.txt
        elif [ -f "requirements.txt" ]; then
            pip install -r requirements.txt
        else
            echo -e "${YELLOW}Nenhum arquivo de requirements local encontrado (requirements-python.txt ou requirements.txt).${NC}"
        fi
    else
        echo -e "${YELLOW}AVISO: Ambiente virtual 'env' não encontrado. Pulando a instalação das dependências do Python.${NC}"
        echo -e "${YELLOW}Se quiser usar Docker execute: ./init.sh docker${NC}"
    fi
fi

# 3. Configurar variáveis de ambiente
echo_message "Configurando variáveis de ambiente..."
if [ ! -f ".env.local" ]; then
    echo_message "Arquivo .env.local não encontrado. Criando a partir de .env.local.example..."
    cp .env.local.example .env.local
    echo_message "Arquivo .env.local criado. Por favor, edite-o com suas configurações de banco de dados e JWT_SECRET."
else
    echo_message "Arquivo .env.local já existe. Pulando a criação."
fi

# 4. Inicializar o banco de dados
echo_message "Inicializando o banco de dados..."
npm run init-db

# 5. Iniciar o servidor de desenvolvimento
echo_message "Iniciando o servidor de desenvolvimento..."
echo -e "${YELLOW}Acesse a aplicação em http://localhost:3000${NC}"
npm run dev
