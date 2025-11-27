#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para processar PDFs PGA usando pdfplumber
Baseado no notebook PGA_extração.ipynb
Usa o ambiente virtual configurado
"""

import pdfplumber
import json
import sys
import os
import subprocess
from pathlib import Path
from datetime import datetime
import logging

# Adiciona o diretório do script ao path do Python para importar módulos locais
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from normalization import normalize_data

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def extract_pdf_data(pdf_path):
    """
    Extrai dados de um PDF usando pdfplumber
    """
    dados_extraidos = []
    logging.info(f"Iniciando a extração do arquivo: {pdf_path}")
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            logging.info(f"PDF aberto com sucesso. Total de páginas: {len(pdf.pages)}")
            for i, page in enumerate(pdf.pages):
                logging.info(f"Processando página {i + 1} de {len(pdf.pages)}...")
                text = page.extract_text()
                logging.info(f"Texto extraído da página {i + 1}: {text[:100]}...")
                tables = page.extract_tables()
                logging.info(f"Tabelas extraídas da página {i + 1}: {len(tables)} tabelas encontradas.")
                dados_pagina = {
                    "numero_pagina": i + 1,
                    "texto": text,
                    "tabelas": tables
                }
                dados_extraidos.append(dados_pagina)
        logging.info("Extração finalizada.")
        return dados_extraidos
    except Exception as e:
        logging.error(f"Erro ao processar PDF: {e}")
        return None

def main():
    """
    Função principal para processar PDF e enviar para o MongoDB.
    """
    if len(sys.argv) != 4:
        logging.error("Uso: python process_pdf.py <caminho_pdf> <nome_instituicao> <ano>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    institution_name = sys.argv[2]
    year = sys.argv[3]
    
    if not os.path.exists(pdf_path):
        logging.error(f"Arquivo não encontrado: {pdf_path}")
        sys.exit(1)

    logging.info("Iniciando a extração de dados do PDF...")
    extracted_data = extract_pdf_data(pdf_path)
    if not extracted_data:
        logging.error("Falha na extração dos dados do PDF.")
        sys.exit(1)
    logging.info("Extração de dados do PDF concluída.")

    logging.info("Iniciando a normalização dos dados...")
    normalized_data = normalize_data(extracted_data, pdf_path, institution_name, year)
    if not normalized_data:
        logging.error("Falha na normalização dos dados.")
        sys.exit(1)
    logging.info("Normalização dos dados concluída.")

    result = {
        "success": True,
        "extractedData": extracted_data,
        "normalizedData": normalized_data
    }
    
    # Caminho para o script send_to_mongo.py
    send_to_mongo_script_path = os.path.join(os.path.dirname(__file__), 'send_to_mongo.py')

    logging.info(f"Executando {send_to_mongo_script_path} para enviar os dados...")
    try:
        # Serializa o resultado para uma string JSON
        json_output_string = json.dumps(result, ensure_ascii=False)

        # Executa o script send_to_mongo.py, passando o caminho do PDF como argumento
        # e o JSON via stdin
        process = subprocess.run(
            [sys.executable, send_to_mongo_script_path, pdf_path],
            input=json_output_string,
            text=True,
            capture_output=True,
            check=True
        )
        
        
        # Log da saída do script filho para depuração
        logging.info("Saída do send_to_mongo.py:")
        logging.info(process.stdout)
        if process.stderr:
            # stderr do Python pode conter logs INFO, não apenas erros
            # Apenas logar como erro se realmente contiver ERROR ou CRITICAL
            if '- ERROR -' in process.stderr or '- CRITICAL -' in process.stderr:
                logging.error("Erro do send_to_mongo.py:")
                logging.error(process.stderr)
            else:
                logging.info("Logs do send_to_mongo.py:")
                logging.info(process.stderr)
        
        logging.info("Processo concluído com sucesso.")

    except subprocess.CalledProcessError as e:
        logging.error(f"O script send_to_mongo.py falhou com código de saída {e.returncode}")
        logging.error(f"Stdout: {e.stdout}")
        logging.error(f"Stderr: {e.stderr}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Erro ao executar o subprocesso: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
