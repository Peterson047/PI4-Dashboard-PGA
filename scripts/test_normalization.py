import pytest
from normalization import parse_currency, parse_workload, get_value_from_table, get_multiline_value, normalize_data

# --- Testes Unitários para Funções Auxiliares ---

def test_parse_currency():
    assert parse_currency("R$ 1.234,56") == 1234.56
    assert parse_currency("100,00") == 100.00
    assert parse_currency("R$ 0,50") == 0.50
    assert parse_currency("invalid") is None
    assert parse_currency(None) is None
    assert parse_currency("Custos a definir") is None

def test_parse_workload():
    assert parse_workload("05 horas") == 5
    assert parse_workload("10") == 10
    assert parse_workload("Carga: 20h") == 20
    assert parse_workload("invalid") == 0
    assert parse_workload(None) == 0

def test_get_value_from_table():
    table = [
        ["Campo A", "Valor A"],
        ["Campo B", "Valor B"],
        ["Campo C", "Valor C"]
    ]
    assert get_value_from_table(table, "Campo A") == "Valor A"
    assert get_value_from_table(table, "Campo B") == "Valor B"
    assert get_value_from_table(table, "Campo X") == ""
    assert get_value_from_table([], "Campo A") == ""

def test_get_multiline_value():
    table = [
        ["Start Label", ""],
        ["", "Line 1"],
        ["", "Line 2"],
        ["Stop Label", ""]
    ]
    # A função get_multiline_value é um pouco complexa, vamos testar o comportamento básico
    # Baseado na implementação:
    # Se encontrar start_label, ativa captura.
    # Se encontrar stop_label, para.
    # Se capturando, pega o texto.
    
    # Mocking a simpler table structure that matches the logic better
    table_simple = [
        ["Start Label", "Content Inline"],
        ["Other Row", "Content Line 2"],
        ["Stop Label", "End"]
    ]
    # Na implementação atual:
    # Row 0: startswith("Start Label") -> capturing=True. append("Content Inline")
    # Row 1: capturing=True. append("Start Label" not matched, "Stop Label" not matched). append("Start Label" checked? no).
    # Wait, logic is:
    # if startswith(start): capturing=True; if col[1]: append(col[1]); continue
    # if capturing and startswith(stop): break
    # if capturing: append(first_non_empty_cell)
    
    assert get_multiline_value(table_simple, "Start Label", "Stop Label") == "Content Inline\nOther Row"

# --- Teste de Integração (Mockado) para normalize_data ---

def test_normalize_data_structure():
    # Mock de dados extraídos (estrutura simplificada)
    extracted_data = [
        {
            "texto": "Texto da página 1",
            "tabelas": [
                [
                    ["IDENTIFICAÇÃO DA UNIDADE", ""],
                    ["Unidade", "001 - Fatec Teste"],
                    ["Diretor(a)", "Diretor Teste"]
                ],
                [
                    ["ANÁLISE DO CENÁRIO", ""],
                    ["", "Cenário de teste"],
                    ["APONTAMENTO DE SITUAÇÕES-PROBLEMA", ""]
                ]
            ]
        }
    ]
    
    file_path = "/tmp/test.pdf"
    institution_name = "Fatec Teste"
    year = "2024"
    
    result = normalize_data(extracted_data, file_path, institution_name, year)
    
    assert result is not None
    assert result["instituicao_nome"] == "Fatec Teste"
    assert result["ano_referencia"] == 2024
    assert result["identificacao_unidade"]["codigo"] == "001"
    assert result["identificacao_unidade"]["nome"] == "Fatec Teste"
    assert result["analise_cenario"] == "Cenário de teste"
    assert result["metadados_extracao"]["nome_arquivo_original"] == "test.pdf"
