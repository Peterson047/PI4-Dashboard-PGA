#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de manutenção: atualiza documentos na coleção `projetos` onde
`identificacao_unidade.nome` está ausente ou vazio, usando `instituicao_nome`.

Roda dentro do ambiente (container ou host) e usa MONGODB_URI do arquivo
`.env.local` no diretório raiz do projeto. Se não encontrar, tenta uma URI
padrão para `mongodb://mongodb:27017/db_pga`.

Uso:
    python3 scripts/fix_missing_names.py

"""

import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# Carregar .env.local do diretório raiz do projeto
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT, '.env.local')
load_dotenv(ENV_PATH)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MONGODB_URI = os.getenv('MONGODB_URI') or 'mongodb://mongodb:27017/db_pga'


def normalize_code(text: str) -> str:
    if not text:
        return ''
    s = text.lower()
    for a, b in [(' ', '-'), ('ç', 'c'), ('ã', 'a'), ('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u')]:
        s = s.replace(a, b)
    return s


def main():
    logging.info(f'Conectando ao MongoDB: {MONGODB_URI}')
    client = MongoClient(MONGODB_URI)
    db = client.get_database()
    coll = db.projetos

    # Critérios: identificacao_unidade nao existente, ou nome vazio/nulo
    query = {
        '$or': [
            {'identificacao_unidade': {'$exists': False}},
            {'identificacao_unidade.nome': {'$in': [None, '']}},
            {'identificacao_unidade.nome': {'$exists': False}}
        ]
    }

    docs = list(coll.find(query))
    logging.info(f'Encontrados {len(docs)} documentos com nome de unidade ausente/ vazio.')

    updated = 0
    for doc in docs:
        instituicao_nome = doc.get('instituicao_nome') or ''
        if not instituicao_nome:
            logging.warning(f'Documento {doc.get("_id")} sem `instituicao_nome`, pulando.')
            continue

        new_codigo = normalize_code(instituicao_nome)
        new_nome = instituicao_nome

        new_ident = {
            'codigo': new_codigo,
            'nome': new_nome,
            'diretor': ''
        }

        result = coll.update_one({'_id': doc['_id']}, {'$set': {'identificacao_unidade': new_ident}})
        if result.modified_count > 0:
            updated += 1
            logging.info(f'Atualizado documento {_id_repr(doc)} -> nome="{new_nome}" codigo="{new_codigo}"')
        else:
            logging.info(f'Nenhuma alteração para documento {_id_repr(doc)}')

    logging.info(f'Atualização finalizada. Documentos atualizados: {updated}')
    client.close()


def _id_repr(d):
    return str(d.get('_id'))

if __name__ == '__main__':
    main()
