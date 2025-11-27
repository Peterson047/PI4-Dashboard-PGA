#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script orquestrador para executar o pipeline de processamento de PDF.
"""

import argparse
import subprocess
import sys
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    """Função principal que analisa os argumentos e executa o pipeline."""
    parser = argparse.ArgumentParser(
        description="Executa o pipeline de processamento de PDF para o banco de dados PGA.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument(
        "pdf_path", 
        help="O caminho completo para o arquivo PDF a ser processado."
    )
    parser.add_argument(
        "institution_name", 
        help="O nome da instituição (ex: 'fatec-votorantim')."
    )
    parser.add_argument(
        "year", 
        type=int,
        help="O ano de referência do documento."
    )

    args = parser.parse_args()

    # --- CORREÇÃO AQUI ---
    # O script_dir é a pasta atual (/app/scripts)
    # process_pdf.py está na MESMA pasta.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    process_script_path = os.path.join(script_dir, "process_pdf.py") # Removida a sub-pasta "python"

    if not os.path.isfile(process_script_path):
        logging.error(f"Erro: O script de processamento não foi encontrado em '{process_script_path}'")
        sys.exit(1)

    command = [
        sys.executable,  # Usa o mesmo interpretador Python que está executando este script
        process_script_path,
        args.pdf_path,
        args.institution_name,
        str(args.year)
    ]

    try:
        logging.info(f"Iniciando o pipeline... Executando: {' '.join(command)}")
        
        # O subprocesso herdará o stdout/stderr, então os logs aparecerão normalmente
        subprocess.run(command, check=True)
        
        logging.info("Pipeline executado com sucesso!")

    except FileNotFoundError:
        logging.error(f"Erro: O arquivo PDF '{args.pdf_path}' não foi encontrado.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        logging.error(f"Ocorreu um erro durante a execução do pipeline (código de saída: {e.returncode}).")
        # A saída de erro do subprocesso já foi para o terminal
        sys.exit(1)
    except Exception as e:
        logging.error(f"Um erro inesperado ocorreu: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()