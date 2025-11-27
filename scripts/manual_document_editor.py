#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para edição manual de documentos processados e inserção de novos documentos
no formato esperado pelo sistema PGA Dashboard Database.

Permite:
1. Editar documentos já processados salvos no MongoDB
2. Inserir novos documentos manualmente seguindo a mesma estrutura
"""

import json
import sys
import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv
from datetime import datetime
import base64

# Adiciona o diretório do script ao path do Python para importar módulos locais
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Carregar as variáveis de ambiente do arquivo .env
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(root_dir, '.env.local')
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Estrutura base para um novo documento
BASE_DOCUMENT_STRUCTURE = {
    "ano_referencia": 2025,
    "versao_documento": "V04",
    "instituicao_nome": "Nova Instituição",
    "identificacao_unidade": {
        "codigo": "nova-instituicao",
        "nome": "Nova Instituição",
        "diretor": "Nome do Diretor"
    },
    "analise_cenario": "Descrição do cenário...",
    "metadados_extracao": {
        "nome_arquivo_original": "documento_manual.json",
        "data_extracao": datetime.now().isoformat()
    },
    "situacoes_problema_gerais": [
        "Situação problema 1",
        "Situação problema 2"
    ],
    "acoes_projetos": [
        {
            "codigo_acao": "01",
            "titulo": "Título do Projeto",
            "origem_prioridade": "Prioridade 1",
            "o_que_sera_feito": "Descrição do que será feito...",
            "por_que_sera_feito": "Justificativa...",
            "custo_estimado": 1000.0,
            "fonte_recursos": "Fonte dos recursos",
            "periodo_execucao": {
                "data_inicial": "01/01/2025",
                "data_final": "31/12/2025"
            },
            "equipe": [
                {
                    "funcao": "Responsável",
                    "nome": "Nome do Responsável",
                    "carga_horaria_semanal": 10,
                    "tipo_hora": "hora/aula"
                }
            ],
            "etapas_processo": []
        }
    ],
    "anexo1_aquisicoes": [
        {
            "item": 1,
            "projeto_referencia": "01",
            "denominacao": "Descrição do item",
            "quantidade": 1,
            "preco_total_estimado": 500.0
        }
    ]
}

def get_mongodb_connection():
    """Estabelece conexão com o MongoDB."""
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        logging.error("A variável de ambiente MONGODB_URI não foi encontrada.")
        sys.exit(1)
    
    try:
        client = MongoClient(mongodb_uri)
        db = client.get_database()
        collection = db.projetos
        logging.info(f"Conectado ao banco '{db.name}', collection '{collection.name}'")
        return client, collection
    except ConnectionFailure as e:
        logging.error(f"Não foi possível conectar ao MongoDB: {e}")
        sys.exit(1)

def list_documents():
    """Lista todos os documentos disponíveis no MongoDB."""
    client, collection = get_mongodb_connection()
    
    try:
        documents = list(collection.find({}, {
            "identificacao_unidade.nome": 1,
            "ano_referencia": 1,
            "metadados_extracao.data_extracao": 1
        }))
        
        if not documents:
            logging.info("Nenhum documento encontrado.")
            return
        
        print("\nDocumentos disponíveis:")
        print("-" * 80)
        for i, doc in enumerate(documents):
            nome = doc.get('identificacao_unidade', {}).get('nome', 'N/A')
            ano = doc.get('ano_referencia', 'N/A')
            data = doc.get('metadados_extracao', {}).get('data_extracao', 'N/A')
            print(f"{i+1}. {nome} ({ano}) - {data}")
        
        return documents
    finally:
        client.close()

def get_document_by_id(doc_id):
    """Obtém um documento específico pelo ID."""
    client, collection = get_mongodb_connection()
    
    try:
        from bson import ObjectId
        document = collection.find_one({"_id": ObjectId(doc_id)})
        return document
    finally:
        client.close()

def save_document(document):
    """Salva um documento no MongoDB."""
    client, collection = get_mongodb_connection()
    
    try:
        # Se o documento já tem _id, faz update, senão insere
        if "_id" in document:
            from bson import ObjectId
            doc_id = document["_id"]
            del document["_id"]  # Remove _id para evitar erro no update
            result = collection.replace_one({"_id": ObjectId(doc_id)}, document)
            logging.info(f"Documento atualizado com sucesso! ID: {doc_id}")
        else:
            result = collection.insert_one(document)
            logging.info(f"Documento inserido com sucesso! ID: {result.inserted_id}")
    finally:
        client.close()

def load_json_file(file_path):
    """Carrega um arquivo JSON."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Erro ao carregar arquivo JSON: {e}")
        sys.exit(1)

def save_json_file(data, file_path):
    """Salva dados em um arquivo JSON."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logging.info(f"Arquivo salvo com sucesso: {file_path}")
    except Exception as e:
        logging.error(f"Erro ao salvar arquivo JSON: {e}")
        sys.exit(1)

def create_new_document():
    """Cria um novo documento com a estrutura base."""
    new_doc = BASE_DOCUMENT_STRUCTURE.copy()
    new_doc["metadados_extracao"]["data_extracao"] = datetime.now().isoformat()
    return new_doc

def main():
    """Função principal para interação com o usuário."""
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python manual_document_editor.py list")
        print("  python manual_document_editor.py edit <document_id>")
        print("  python manual_document_editor.py new")
        print("  python manual_document_editor.py save <json_file>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        list_documents()
    
    elif command == "edit":
        if len(sys.argv) < 3:
            logging.error("ID do documento não fornecido.")
            sys.exit(1)
        
        doc_id = sys.argv[2]
        document = get_document_by_id(doc_id)
        
        if not document:
            logging.error(f"Documento com ID {doc_id} não encontrado.")
            sys.exit(1)
        
        # Salva o documento em um arquivo temporário para edição
        temp_file = f"temp_edit_{doc_id}.json"
        save_json_file(document, temp_file)
        print(f"Documento salvo em {temp_file} para edição.")
        print("Edite o arquivo e depois use o comando 'save' para salvar as alterações.")
    
    elif command == "new":
        new_doc = create_new_document()
        temp_file = f"new_document_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        save_json_file(new_doc, temp_file)
        print(f"Novo documento base criado em {temp_file}.")
        print("Edite o arquivo conforme necessário e use o comando 'save' para salvar.")
    
    elif command == "save":
        if len(sys.argv) < 3:
            logging.error("Caminho do arquivo JSON não fornecido.")
            sys.exit(1)
        
        file_path = sys.argv[2]
        document = load_json_file(file_path)
        save_document(document)
        print(f"Documento salvo com sucesso no MongoDB a partir de {file_path}")
    
    else:
        logging.error(f"Comando desconhecido: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()