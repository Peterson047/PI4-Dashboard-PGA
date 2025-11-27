# Guia de Uso do Editor Manual de Documentos

Este guia explica como usar o novo sistema de edição manual de documentos, tanto através da interface web quanto via linha de comando.

## Interface Web

1. Acesse a aplicação e faça login como administrador
2. No menu lateral, clique em "Documentos Manuais"
3. Você poderá:
   - Selecionar um documento existente para editar
   - Criar um novo documento usando o botão "Criar Novo Documento"
   - Salvar as alterações feitas

## Linha de Comando (Docker)

Para usar os comandos via linha de comando no container Docker:

```bash
# Listar todos os documentos disponíveis
docker compose exec pga-dashboard python3 scripts/manual_document_editor.py list

# Criar um novo documento base
docker compose exec pga-dashboard python3 scripts/manual_document_editor.py new

# Editar um documento específico (substitua <document_id> pelo ID real)
docker compose exec pga-dashboard python3 scripts/manual_document_editor.py edit <document_id>

# Salvar um documento a partir de um arquivo JSON (substitua <arquivo.json> pelo caminho real)
docker compose exec pga-dashboard python3 scripts/manual_document_editor.py save <arquivo.json>
```

## Exemplo de Uso

1. Crie um novo documento:
```bash
docker compose exec pga-dashboard python3 scripts/manual_document_editor.py new
```

2. Isso criará um arquivo JSON com a estrutura base. Edite esse arquivo conforme necessário.

3. Salve o documento:
```bash
docker compose exec pga-dashboard python3 scripts/manual_document_editor.py save novo_documento.json
```

## Permissões

Apenas usuários com papel de administrador podem acessar a funcionalidade de edição manual de documentos, tanto pela interface web quanto pela API.