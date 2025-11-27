![Header](./public/prints/header.png)
# Sistema de Dashboard para Análise de Planos de Gestão Anual (PGA)

## 1. Descrição Geral do Sistema

O Sistema de Dashboard para Análise de Planos de Gestão Anual (PGA) é uma aplicação web completa desenvolvida para processar, armazenar e visualizar dados de Planos de Gestão Anual de instituições de ensino. O sistema permite o upload de documentos PDF, extrai automaticamente os dados relevantes, armazena-os em um banco de dados MongoDB e apresenta visualizações interativas através de um dashboard.

### 1.1 Funcionalidades Principais

- Upload e processamento automático de PDFs de Planos de Gestão Anual
- Extração inteligente de dados estruturados a partir de documentos PDF
- Armazenamento em banco de dados MongoDB com backup automatizado
- Visualização de dados em dashboard com filtros por instituição e ano
- Edição manual de documentos via interface web ou scripts Python
- Autenticação de usuários com diferentes níveis de acesso
- Interface administrativa para gerenciamento de documentos

## 2. Arquitetura do Sistema

### 2.1 Tecnologias Utilizadas

- **Frontend:** Next.js 13+ (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Node.js, MongoDB, Python (para processamento de PDF)
- **Autenticação:** NextAuth.js com credenciais personalizadas
- **Containerização:** Docker e Docker Compose
- **UI Components:** Radix UI, Recharts, Lucide React
- **Processamento de PDF:** pdfplumber (Python)
- **Banco de Dados:** MongoDB

### 2.2 Estrutura de Diretórios

```
├── app/                    # Aplicação Next.js (App Router)
│   ├── api/               # Rotas da API
│   ├── documents/         # Página de gerenciamento de documentos
│   └── layout.tsx         # Layout raiz da aplicação
├── components/            # Componentes React reutilizáveis
├── lib/                   # Funções utilitárias e serviços
├── public/                # Arquivos estáticos
├── scripts/               # Scripts de processamento e utilitários
├── uploads/               # Diretório para uploads de arquivos
└── mongodb_backup/        # Backup do banco de dados
```

## 3. Processo ETL (Extração, Transformação e Carregamento)

### 3.1 Extração (E)

O processo de extração é realizado pelo script Python [process_pdf.py](./scripts/process_pdf.py) que utiliza a biblioteca `pdfplumber` para:

1. Ler o arquivo PDF enviado pelo usuário
2. Extrair texto de todas as páginas
3. Identificar e extrair tabelas estruturadas
4. Processar cada página individualmente para coletar dados

### 3.2 Transformação (T)

O script [normalization.py](./scripts/normalization.py) realiza a transformação dos dados brutos extraídos:

1. Normaliza os dados extraídos para um formato estruturado JSON
2. Extrai informações específicas como:
   - Identificação da unidade/instituição
   - Análise do cenário
   - Situações-problema identificadas
   - Ações/projetos com detalhes de equipe e cronograma
   - Lista de aquisições (Anexo 1)
3. Processa valores monetários e cargas horárias
4. Combina dados do PDF com informações fornecidas pelo usuário (nome da instituição, ano)

### 3.3 Carregamento (L)

O script [send_to_mongo.py](./scripts/send_to_mongo.py) é responsável por:

1. Receber os dados normalizados via stdin
2. Ler o arquivo PDF original e codificá-lo em base64
3. Conectar-se ao MongoDB usando as variáveis de ambiente
4. Inserir os dados estruturados na coleção `projetos`
5. Armazenar o PDF original codificado no mesmo documento

## 4. Instalação e Configuração

### 4.1 Pré-requisitos

- Docker e Docker Compose
- Node.js 18+
- Python 3.8+

### 4.2 Configuração das Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edite o arquivo [.env.local](./.env.local) com suas configurações:
   ```env
   MONGODB_URI=mongodb://localhost:27017/db_pga
   NODE_ENV=development
   ```

### 4.3 Instalação Automática via Docker (Modo Desenvolvimento com Bind Mount)

A maneira mais simples de executar o sistema é através do Docker Compose:

```bash
docker compose up -d --build
```

### 4.4 Instalação Automática via Docker (Modo Produção/Standalone - Sem Bind Mount)

Para executar o sistema 100% dentro dos containers, sem bind mounts:

```bash
docker-compose -f docker-compose-standalone.yml up -d --build
```

Ou usando o script de inicialização:

```bash
./init-standalone.sh
```

### 4.5 Instalação Manual (Desenvolvimento)

Se preferir executar a aplicação localmente sem Docker:

1. Instale as dependências do Node.js:
   ```bash
   npm install
   ```

2. Instale as dependências do Python:
   ```bash
   # Crie um ambiente virtual (opcional mas recomendado)
   python3 -m venv env
   source env/bin/activate
   
   # Instale as dependências
   pip install -r requirements.txt
   ```

3. Configure o MongoDB local ou remoto e atualize o [.env.local](./.env.local)

4. Inicialize o banco de dados:
   ```bash
   npm run init-db
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 5. Execução da Aplicação

### 5.1 Acesso via Docker

Após executar `docker compose up -d --build`:

- **Frontend:** http://localhost:3000
- **MongoDB:** mongodb://localhost:27018

### 5.2 Acesso Manual

Após iniciar com `npm run dev`:

- **Frontend:** http://localhost:3000
- **MongoDB:** conforme configurado no [.env.local](./.env.local)

### 5.3 Credenciais Padrão

Usuário administrador criado automaticamente:
- **Email:** juliana.mendes@fatec.sp.gov.br
- **Senha:** 123456
ou 

- **Email:** admin@fatec.sp.gov.br
- **Senha:** admin123
## 6. Uso do Sistema

### 6.1 Processando um Novo Documento

1. Acesse a página de documentos após fazer login
2. Na aba "Novo Upload", selecione um arquivo PDF do PGA
3. Digite o nome da instituição e selecione o ano de referência
4. Clique em "Enviar e Processar"

O sistema prioriza o nome da instituição fornecido pelo usuário, mas também tenta detectar automaticamente o nome no conteúdo do PDF como fallback.

![Tela de upload PDF](./public/prints/Tela%20de%20upload%20PDF.png)

### 6.2 Analisando os Dados

- Volte à página principal para ver o dashboard atualizado com os novos dados
- Use os menus de seleção para filtrar os dados por instituição ou ano
- A lista de instituições é populada dinamicamente com base nos documentos já processados

![Visão do dashboard](./public/prints/Visao%20do%20dashboard.png)

### 6.3 Edição Manual de Documentos

O sistema suporta edição manual de documentos processados:

#### Através da Interface Web:
1. Faça login como administrador
2. Navegue até "Documentos Manuais" no menu lateral
3. Selecione um documento existente para editar ou crie um novo documento
4. Utilize as abas para navegar entre diferentes seções do documento
5. Faça as alterações necessárias nos campos
6. Clique em "Salvar Documento" para persistir as alterações

![Adição manual de documentos](./public/prints/Adição%20manual%20de%20documentos.png)

#### Através do Script Python:
```bash
# Listar documentos disponíveis
./scripts/run_manual_editor.sh list

# Editar um documento específico
./scripts/run_manual_editor.sh edit <document_id>

# Criar um novo documento
./scripts/run_manual_editor.sh new

# Salvar um documento editado
./scripts/run_manual_editor.sh save <json_file>
```

## 7. Backup e Restauração do Banco de Dados

### 7.1 Backup Automático

O container do MongoDB está configurado para restaurar automaticamente um backup da pasta [mongodb_backup/db_pga](./mongodb_backup/db_pga) na inicialização.

### 7.2 Exportar (Backup Manual)

Use `mongodump` para criar um backup do banco de dados:

```bash
# Cria o dump dentro do container
docker compose exec pga_mongodb mongodump --db db_pga --out /backup_temp

# Copia o dump para o host
docker compose cp pga_mongodb:/backup_temp ./mongodb_backup
```

### 7.3 Importar (Restauração Manual)

```bash
# Copia o dump do host para o container
docker compose cp ./mongodb_backup/db_pga pga_mongodb:/backup_restore

# Restaura o dump dentro do container
docker compose exec pga_mongodb mongorestore --db db_pga --drop /backup_restore/db_pga
```

## 8. Estrutura do Banco de Dados

O sistema utiliza uma única base de dados `db_pga` com as seguintes coleções:

- **projetos:** Armazena os documentos PGA processados
- **users:** Armazena informações de usuários do sistema

### 8.1 Estrutura de um Documento PGA

Cada documento na coleção `projetos` contém:

- `ano_referencia`: Ano de referência do PGA
- `versao_documento`: Versão do documento
- `instituicao_nome`: Nome da instituição
- `identificacao_unidade`: Dados da unidade (código, nome, diretor)
- `analise_cenario`: Análise do cenário descrita no PGA
- `metadados_extracao`: Metadados da extração (nome do arquivo, data)
- `situacoes_problema_gerais`: Lista de situações-problema identificadas
- `acoes_projetos`: Lista de ações/projetos com detalhes completos
- `anexo1_aquisicoes`: Lista de aquisições do Anexo 1
- `pdf_original_arquivo`: Arquivo PDF original codificado em base64

## 9. Scripts Úteis

O sistema inclui diversos scripts utilitários na pasta [scripts/](./scripts/):

- **init-db.js:** Inicializa o banco de dados com usuário padrão
- **add-user.js:** Adiciona novos usuários ao sistema
- **list-users.js:** Lista todos os usuários cadastrados
- **process_pdf.py:** Processa PDFs e extrai dados
- **send_to_mongo.py:** Envia dados processados para o MongoDB
- **manual_document_editor.py:** Editor manual de documentos
- **run_manual_editor.sh:** Script wrapper para o editor manual

## 10. Considerações Finais

Este sistema foi desenvolvido para facilitar a análise e comparação de Planos de Gestão Anual de diferentes instituições de ensino. Ele automatiza o processo tedioso de extração manual de dados de documentos PDF, permitindo que os usuários foquem na análise e interpretação das informações ao invés de na coleta de dados.

A arquitetura baseada em containers Docker facilita a implantação e manutenção do sistema em diferentes ambientes, enquanto a separação clara entre frontend e backend permite evoluções independentes de cada componente.

## 11. Modos de Execução

### 11.1 Modo Desenvolvimento (com Bind Mount)

No modo de desenvolvimento, o código fonte é montado como um volume no container, permitindo hot-reload e desenvolvimento em tempo real:

```bash
docker compose up -d --build
```

### 11.2 Modo Produção/Standalone (sem Bind Mount)

No modo standalone, todo o código é copiado para dentro do container durante o processo de build, executando 100% dentro dos containers:

```bash
docker-compose -f docker-compose-standalone.yml up -d --build
```

Este modo é ideal para:
- Deploy em produção
- Ambientes onde não se deseja expor o código fonte
- Execução em servidores onde não há acesso ao sistema de arquivos do host
- Distribuição como imagem Docker pronta para uso

## 12. Capturas de Tela

A seguir estão algumas capturas de tela que ilustram o funcionamento do sistema:

### Tela de Processamento de Documentos
![Documento sendo processado](./public/prints/Documento%20sendo%20processado.png)

### Painel de Gerenciamento de Documentos
![Painel de gerenciamento documentos](./public/prints/Painel%20de%20gerenciamento%20documentos.png)

## 👥 Equipe

- Peterson Alves (Desenvolvedor Full Stack)
- Gabriel Yuji (Projeto)
- Bruno Henrique (Revisão)

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.