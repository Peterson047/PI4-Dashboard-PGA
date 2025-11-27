#!/bin/bash

# Script para executar o editor manual de documentos
# Uso: ./scripts/run_manual_editor.sh [comando] [argumentos]

# Verificar se o ambiente virtual está ativado
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "Ativando ambiente virtual..."
    # Procurar ambiente virtual
    if [ -d "venv" ]; then
        source venv/bin/activate
    elif [ -d ".venv" ]; then
        source .venv/bin/activate
    else
        echo "Ambiente virtual não encontrado. Criando um novo..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    fi
fi

# Verificar se o script Python existe
SCRIPT_PATH="scripts/manual_document_editor.py"
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script $SCRIPT_PATH não encontrado!"
    exit 1
fi

# Executar o script com os argumentos fornecidos
python3 "$SCRIPT_PATH" "$@"

echo "Editor manual de documentos executado com sucesso!"