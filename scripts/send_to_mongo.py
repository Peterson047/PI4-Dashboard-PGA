#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para receber um JSON normalizado via stdin, ler o arquivo PDF original,
e enviar ambos para o MongoDB.
"""

import sys
import os
import json
import logging
import base64
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

# Carregar as variáveis de ambiente do arquivo .env
# Tenta carregar a partir do diretório raiz do projeto (pai do scripts/)
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(root_dir, '.env.local')
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    # O primeiro argumento da linha de comando será o caminho para o arquivo PDF
    if len(sys.argv) < 2:
        logging.error("Uso: python send_to_mongo.py <caminho_do_pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]

    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        logging.error("A variável de ambiente MONGODB_URI não foi encontrada.")
        sys.exit(1)

    logging.info("Lendo dados JSON da entrada padrão (stdin)...")
    try:
        json_input_string = sys.stdin.read()
        if not json_input_string:
            logging.warning("Nenhum dado JSON recebido da entrada padrão.")
            sys.exit(0)
        
        data = json.loads(json_input_string)
        data_to_insert = data.get("normalizedData")

        if not data_to_insert:
            logging.error("O JSON recebido não contém a chave 'normalizedData' ou ela está vazia.")
            sys.exit(1)

    except json.JSONDecodeError:
        logging.error("Erro: A entrada recebida não é um JSON válido.")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Erro ao processar a entrada JSON: {e}")
        sys.exit(1)

    # Ler e codificar o arquivo PDF em base64
    try:
        logging.info(f"Lendo o arquivo PDF de: {pdf_path}")
        with open(pdf_path, "rb") as pdf_file:
            pdf_binary_content = pdf_file.read()
            pdf_base64_encoded = base64.b64encode(pdf_binary_content).decode('utf-8')
        
        # Adicionar o conteúdo codificado ao dicionário para inserção
        data_to_insert['pdf_original_arquivo'] = pdf_base64_encoded
        logging.info("Arquivo PDF codificado e adicionado ao documento.")

    except FileNotFoundError:
        logging.error(f"Erro: Arquivo PDF não encontrado em '{pdf_path}'")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Erro ao ler ou codificar o arquivo PDF: {e}")
        sys.exit(1)

    logging.info("Conectando ao MongoDB...")
    client = None  # Inicializa client como None
    try:
        client = MongoClient(mongodb_uri)
        db = client.get_database()
        collection = db.projetos

        logging.info(f"Inserindo dados no banco '{db.name}', collection '{collection.name}'...")
        result = collection.insert_one(data_to_insert)
        
        logging.info(f"Dados inseridos com sucesso! ID do documento: {result.inserted_id}")

    except ConnectionFailure as e:
        logging.error(f"Não foi possível conectar ao MongoDB: {e}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Ocorreu um erro durante a operação com o MongoDB: {e}")
        sys.exit(1)
    finally:
        if client:
            client.close()
            logging.info("Conexão com o MongoDB fechada.")

if __name__ == "__main__":
    main()
