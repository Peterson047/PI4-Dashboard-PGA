import re
import logging
from datetime import datetime
import os

# --- Funções Auxiliares de Extração e Limpeza ---

def parse_currency(value_str: str) -> float | None:
    """Converte uma string de moeda (ex: 'R$ 1.234,56') para um float."""
    if not value_str or not isinstance(value_str, str):
        return None
    
    # Remove "R$", espaços em branco, e pontos de milhar. Troca vírgula por ponto decimal.
    try:
        # Ignora textos como "Não haverá custos" ou "A ser definido"
        if any(term in value_str.lower() for term in ['custos', 'definido', 'haverá']):
            return None
        
        cleaned_str = value_str.replace("R$", "").strip().replace(".", "").replace(",", ".")
        return float(cleaned_str)
    except (ValueError, TypeError):
        return None

def parse_workload(value_str: str) -> int:
    """Extrai um número inteiro de uma string de carga horária (ex: '05')."""
    if not value_str or not isinstance(value_str, str):
        return 0
    try:
        # Encontra o primeiro conjunto de dígitos na string
        match = re.search(r'\d+', value_str)
        return int(match.group(0)) if match else 0
    except (ValueError, TypeError):
        return 0

def find_table_by_header(page, header_text):
    """Encontra uma tabela em uma página com base no texto do seu cabeçalho."""
    for table in page.get('tabelas', []):
        if table and table[0] and header_text in str(table[0][0]):
            return table
    return []

def get_value_from_table(table, label):
    """Extrai um valor de uma tabela procurando por um rótulo na primeira coluna."""
    if not table:
        return ""
    for row in table:
        if row and row[0] and label in row[0]:
            # Encontra a primeira célula não vazia após o rótulo
            for cell in row[1:]:
                if cell:
                    return cell.strip()
    return ""

def get_multiline_value(table, start_label, stop_label):
    """Extrai um valor de múltiplas linhas entre um rótulo inicial e final."""
    if not table:
        return ""
    capturing = False
    text_lines = []
    for row in table:
        # Se a primeira célula estiver vazia, só continuamos se já estivermos capturando
        if not row:
            continue
        if not row[0] and not capturing:
            continue
        
        # Usa startswith para evitar correspondências parciais
        if row[0].strip().startswith(start_label):
            capturing = True
            # Captura conteúdo na mesma linha
            if len(row) > 1 and row[1]:
                text_lines.append(row[1].strip())
            continue
        
        if capturing and row[0].strip().startswith(stop_label):
            break
            
        if capturing:
            # Adiciona o conteúdo da primeira célula não vazia da linha
            for cell in row:
                if cell:
                    text_lines.append(cell.strip())
                    break
                    
    return "\n".join(text_lines)

def extract_institution_from_text(pages):
    """
    Tenta extrair o nome da instituição do texto das primeiras páginas do PDF.
    """
    known_institutions = ["Fatec Votorantim", "Fatec Sorocaba"]
    # Limita a busca às 3 primeiras páginas por eficiência
    search_pages = pages[:3]
    
    for page in search_pages:
        text = page.get('texto', '')
        if not text:
            continue
        
        for institution in known_institutions:
            # Busca case-insensitive
            if institution.lower() in text.lower():
                logging.info(f"Instituição detectada no texto do PDF: {institution}")
                return institution
                
    logging.warning("Nenhuma instituição conhecida foi detectada no texto do PDF.")
    return None

# --- Funções de Extração de Seções ---

def extract_project_data(pages):
    """Extrai todos os dados de projetos das tabelas encontradas."""
    projetos = []
    for page in pages:
        for table in page.get('tabelas', []):
            if table and table[0] and "AÇÃO/PROJETO (Tema)" in str(table[0]):
                try:
                    # Extração do Título e Código
                    title_cell = " ".join(filter(None, table[0]))
                    codigo_match = re.search(r'(\d+)', title_cell)
                    codigo_acao = codigo_match.group(1) if codigo_match else ""
                    titulo = re.sub(r'^AÇÃO/PROJETO \(Tema\)\s*' + re.escape(codigo_acao), '', title_cell, 1).strip()

                    # Extração da Equipe
                    equipe = []
                    is_capturing_team = False
                    for row in table:
                        if not row or not row[0]: continue
                        
                        label = row[0].strip()
                        if label.startswith("Responsável:"):
                            is_capturing_team = True
                        
                        if is_capturing_team:
                            if label.startswith(("Responsável:", "Colaborador(a):")):
                                nome = row[1].replace("<nome>", "").strip() if len(row) > 1 and row[1] else ""
                                carga_horaria = parse_workload(row[6]) if len(row) > 6 else 0
                                tipo_hora = row[8] if len(row) > 8 else ""
                                
                                if nome and nome.lower() != 'nn':
                                    equipe.append({
                                        "funcao": "Responsável" if label.startswith("Responsável") else "Colaborador",
                                        "nome": nome,
                                        "carga_horaria_semanal": carga_horaria,
                                        "tipo_hora": tipo_hora.strip()
                                    })
                        
                        if label.startswith("Período de execução:"):
                            is_capturing_team = False

                    # Extração do Período
                    periodo_execucao = {}
                    for row in table:
                        if row and row[0] and "Período de execução:" in row[0]:
                            datas = re.findall(r'\d{2}/\d{2}/\d{4}', " ".join(filter(None, row)))
                            if len(datas) >= 2:
                                periodo_execucao = {"data_inicial": datas[0], "data_final": datas[1]}
                            break

                    projeto = {
                        "codigo_acao": codigo_acao,
                        "titulo": titulo,
                        "origem_prioridade": get_value_from_table(table, "Origem (prioridade):"),
                        "o_que_sera_feito": get_multiline_value(table, "O que será feito:", "Por que será feito:"),
                        "por_que_sera_feito": get_multiline_value(table, "Por que será feito:", "Responsável:"),
                        "custo_estimado": parse_currency(get_value_from_table(table, "Custo R$ (se houver):")),
                        "fonte_recursos": get_value_from_table(table, "Fonte(s) dos recursos:"),
                        "periodo_execucao": periodo_execucao,
                        "equipe": equipe,
                        "etapas_processo": [], # Lógica de etapas pode ser adicionada aqui se necessário
                    }
                    projetos.append(projeto)
                except Exception as e:
                    logging.warning(f"Falha ao extrair um projeto da tabela: {e}", exc_info=True)
                    continue
    return projetos

def extract_acquisitions(pages):
    """Extrai a lista de aquisições do Anexo 1."""
    aquisicoes = []
    for page in pages:
        if page.get('texto') and "Anexo 1 – Lista de aquisições" in page['texto']:
            for table in page.get('tabelas', []):
                if table and table[0] and "Item" in table[0][0] and "Projeto" in str(table[0][1]):
                    # Pula cabeçalhos que podem ter múltiplas linhas
                    data_rows = [row for row in table if row and row[0] and row[0].isdigit()]
                    for row in data_rows:
                        try:
                            aquisicoes.append({
                                "item": int(row[0]),
                                "projeto_referencia": str(row[1]).strip().replace('\n', ' '),
                                "denominacao": str(row[2]).strip(),
                                "quantidade": int(row[3]) if row[3] and row[3].isdigit() else 0,
                                "preco_total_estimado": parse_currency(row[4])
                            })
                        except (IndexError, TypeError, ValueError) as e:
                            logging.warning(f"Falha ao processar linha de aquisição: {row}. Erro: {e}")
                            continue
    return aquisicoes

# --- Função Principal de Normalização ---

def normalize_data(extracted_data, file_path, institution_name_from_user, year):
    """Normaliza os dados extraídos para o formato final do JSON."""
    try:
        logging.info("Iniciando normalização...")
        
        # Lógica de Prioridade Invertida: Prioriza a entrada do usuário.
        # 1. Usa o nome fornecido pelo usuário como primário.
        # 2. Se o usuário não forneceu um nome, tenta detectar no PDF como fallback.
        detected_institution = extract_institution_from_text(extracted_data)
        
        final_institution_name = institution_name_from_user or detected_institution
        
        if not final_institution_name:
            final_institution_name = "Instituição Desconhecida"
            logging.error("Nome da instituição não foi fornecido pelo usuário nem detectado no PDF.")
        elif institution_name_from_user and detected_institution and institution_name_from_user.lower() != detected_institution.lower():
            logging.warning(
                f"Conflito de instituição: Usuário forneceu '{institution_name_from_user}', "
                f"mas o texto do PDF parece ser da '{detected_institution}'. "
                f"Priorizando o nome fornecido pelo usuário, conforme solicitado."
            )

        first_page = extracted_data[0]
        
        # Extração da Identificação da Unidade
        identificacao_table = find_table_by_header(first_page, "IDENTIFICAÇÃO DA UNIDADE")
        identificacao_unidade = {}
        if identificacao_table:
            unidade_raw = get_value_from_table(identificacao_table, "Unidade")
            unidade_parts = unidade_raw.split(' ', 1)
            codigo = unidade_parts[0] if unidade_parts else ""
            
            # Usa o nome final determinado, que agora prioriza a entrada do usuário
            identificacao_unidade = {
                "codigo": codigo,
                "nome": final_institution_name,
                "diretor": get_value_from_table(identificacao_table, "Diretor(a)")
            }
        else:
            # Fallback se a tabela de identificação não for encontrada
            logging.warning("Tabela 'IDENTIFICAÇÃO DA UNIDADE' não encontrada. Criando identificação com base nos dados disponíveis.")
            fallback_code = final_institution_name.lower().replace(' ', '-').replace('ç', 'c').replace('ã', 'a').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
            identificacao_unidade = {"codigo": fallback_code, "nome": final_institution_name, "diretor": ""}

        # Extração das outras seções
        analise_cenario = get_multiline_value(find_table_by_header(first_page, "ANÁLISE DO CENÁRIO"), "ANÁLISE DO CENÁRIO", "APONTAMENTO DE SITUAÇÕES-PROBLEMA")
        
        situacoes_problema_table = find_table_by_header(first_page, "APONTAMENTO DE SITUAÇÕES-PROBLEMA")
        situacoes_problema_gerais = []
        if situacoes_problema_table:
            for row in situacoes_problema_table[1:]:
                for cell in row:
                    if cell and "cat" in cell:
                        situacoes_problema_gerais.append(cell.strip().replace('\n', ' '))

        acoes_projetos = extract_project_data(extracted_data)
        anexo1_aquisicoes = extract_acquisitions(extracted_data)

        normalized_data = {
            "ano_referencia": int(year),
            "versao_documento": "V04",
            "instituicao_nome": final_institution_name, # Usa o nome final
            "identificacao_unidade": identificacao_unidade,
            "analise_cenario": analise_cenario,
            "metadados_extracao": {
                "nome_arquivo_original": os.path.basename(file_path),
                "data_extracao": datetime.now().isoformat()
            },
            "situacoes_problema_gerais": list(set(situacoes_problema_gerais)), # Remove duplicatas
            "acoes_projetos": acoes_projetos,
            "anexo1_aquisicoes": anexo1_aquisicoes
        }
        
        logging.info(f"Normalização concluída para '{final_institution_name}'. {len(acoes_projetos)} projetos e {len(anexo1_aquisicoes)} aquisições encontradas.")
        return normalized_data
        
    except Exception as e:
        logging.error(f"Erro catastrófico ao normalizar dados: {e}", exc_info=True)
        return None
