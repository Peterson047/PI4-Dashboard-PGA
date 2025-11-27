import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';
import { ObjectId } from 'mongodb';
import { fullDocumentSchema } from '@/lib/schemas/document';
import { getInstitutionCode } from '@/lib/dataService';
import logger, { logAccessControl } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    // Removido: Verificação de papel de administrador
    // Agora qualquer usuário autenticado pode acessar

    const db = await getDatabase();
    const documentsCollection = db.collection('projetos');

    // Buscar todos os documentos ordenados por data de extração (mais recentes primeiro)
    const documents = await documentsCollection
      .find({}, {
        projection: {
          identificacao_unidade: 1,
          ano_referencia: 1,
          metadados_extracao: 1
        }
      })
      .sort({ 'metadados_extracao.data_extracao': -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        _id: doc._id,
        nome_instituicao: doc.identificacao_unidade?.nome || 'N/A',
        ano_referencia: doc.ano_referencia || null,
        data_extracao: doc.metadados_extracao?.data_extracao || null
      }))
    });

  } catch (error) {
    console.error('Erro ao listar documentos para edição manual:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    // Removido: Verificação de papel de administrador
    // Agora qualquer usuário autenticado pode acessar

    const body = await request.json();
    const { action, documentId, documentData } = body;

    const db = await getDatabase();
    const documentsCollection = db.collection('projetos');

    if (action === 'get') {
      // Obter documento específico para edição
      if (!documentId) {
        return NextResponse.json(
          { success: false, message: 'ID do documento não fornecido' },
          { status: 400 }
        );
      }

      const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) });

      if (!document) {
        return NextResponse.json(
          { success: false, message: 'Documento não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        document
      });

    } else if (action === 'save') {
      // Salvar documento editado ou novo
      if (!documentData) {
        return NextResponse.json(
          { success: false, message: 'Dados do documento não fornecidos' },
          { status: 400 }
        );
      }

      // Se tem ID, é uma atualização, senão é uma inserção
      if (documentData._id) {
        const { _id, ...updateData } = documentData;
        const result = await documentsCollection.replaceOne(
          { _id: new ObjectId(_id) },
          updateData
        );

        if (result.matchedCount === 0) {
          return NextResponse.json(
            { success: false, message: 'Documento não encontrado para atualização' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Documento atualizado com sucesso',
          documentId: _id
        });
      } else {
        // Inserção de novo documento
        // Adicionar metadados de criação manual
        documentData.metadados_extracao = {
          ...documentData.metadados_extracao,
          data_extracao: new Date().toISOString(),
          metodo_extracao: 'manual'
        };

        // Garantir que o código da instituição seja consistente com o nome
        if (documentData.identificacao_unidade) {
          // Se o código não estiver definido ou for o código padrão, gerar um código baseado no nome
          if (!documentData.identificacao_unidade.codigo || documentData.identificacao_unidade.codigo === "nova-instituicao") {
            // Criar um código baseado no nome da instituição, removendo caracteres especiais e espaços
            const codigoBase = documentData.identificacao_unidade.nome
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remover acentos
              .replace(/[^a-z0-9]/g, '-') // Substituir caracteres não alfanuméricos por hífen
              .replace(/^-+|-+$/g, '') // Remover hífens do início e fim
              .replace(/-+/g, '-') // Substituir múltiplos hífens por um único
              || 'instituicao-sem-nome';

            documentData.identificacao_unidade.codigo = codigoBase;
          }
        }

        const result = await documentsCollection.insertOne(documentData);

        return NextResponse.json({
          success: true,
          message: 'Documento criado com sucesso',
          documentId: result.insertedId
        });
      }

    } else if (action === 'create') {
      // Criar novo documento com estrutura base
      const baseDocument = {
        "ano_referencia": new Date().getFullYear(),
        "versao_documento": "V04",
        "instituicao_nome": "Nova Instituição",
        "identificacao_unidade": {
          "codigo": "nova-instituicao", // Este código será atualizado quando o documento for salvo
          "nome": "Nova Instituição",
          "diretor": "Nome do Diretor"
        },
        "analise_cenario": "Descrição do cenário institucional, análise SWOT, tendências educacionais relevantes e contexto local que justificam o PGA.",
        "metadados_extracao": {
          "nome_arquivo_original": "documento_manual.json",
          "data_extracao": new Date().toISOString(),
          "metodo_extracao": "manual"
        },
        "situacoes_problema_gerais": [
          "Identificação das principais situações-problema que orientam o planejamento estratégico da instituição",
          "Priorização dos desafios institucionais com base em evidências e diagnóstico"
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
      };

      return NextResponse.json({
        success: true,
        document: baseDocument
      });

    } else {
      return NextResponse.json(
        { success: false, message: 'Ação não reconhecida' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erro na rota de documentos manuais:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}