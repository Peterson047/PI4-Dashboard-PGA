import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';

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

    const db = await getDatabase();
    const documentsCollection = db.collection('projetos');

    // Buscar todos os documentos ordenados por data de extração (mais recentes primeiro)
    // Excluir o PDF em base64 para reduzir o tamanho da resposta
    const documents = await documentsCollection
      .find({}, { 
        projection: { 
          pdf_original_arquivo: 0, // Excluir o PDF em base64
          acoes_projetos: 0, // Excluir projetos para reduzir tamanho
          anexo1_aquisicoes: 0 // Excluir aquisições para reduzir tamanho
        } 
      })
      .sort({ 'metadados_extracao.data_extracao': -1 })
      .toArray();

    // Formatar documentos para retorno
    const formattedDocuments = documents.map(doc => ({
      _id: doc._id,
      nome_arquivo_original: doc.metadados_extracao?.nome_arquivo_original || 'N/A',
      data_extracao: doc.metadados_extracao?.data_extracao || null,
      ano_referencia: doc.ano_referencia || null,
      instituicao_nome: doc.instituicao_nome || doc.identificacao_unidade?.nome || 'N/A',
      identificacao_unidade: doc.identificacao_unidade || null,
      versao_documento: doc.versao_documento || null,
      tem_pdf: !!doc.pdf_original_arquivo
    }));

    return NextResponse.json({
      success: true,
      documents: formattedDocuments
    });

  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 