import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');
    const projetosCollection = db.collection('projetos');

    // Buscar o documento
    const document = await documentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    if (document.status !== 'processed') {
      return NextResponse.json(
        { success: false, message: 'Documento deve estar processado para ser salvo' },
        { status: 400 }
      );
    }

    const approvedData = await request.json();

    if (!approvedData) {
      return NextResponse.json(
        { success: false, message: 'Dados aprovados não fornecidos' },
        { status: 400 }
      );
    }

    // Verificar se já existe um projeto para esta instituição e ano
    const existingProject = await projetosCollection.findOne({
      "identificacao_unidade.nome": approvedData.identificacao_unidade.nome,
      "ano_referencia": approvedData.ano_referencia,
      "_id": { $ne: document.projectId } // Excluir o próprio projeto se já foi salvo antes
    });

    if (existingProject) {
      return NextResponse.json(
        { success: false, message: 'Já existe um projeto para esta instituição e ano' },
        { status: 400 }
      );
    }

    // Salvar no banco de projetos
    const projectData = {
      ...approvedData,
      metadados_extracao: {
        ...approvedData.metadados_extracao,
        documento_origem: document._id,
        processado_por: user._id,
        data_processamento: new Date().toISOString()
      }
    };

    // Upsert para criar ou atualizar o projeto
    const result = await projetosCollection.updateOne(
      { _id: document.projectId || new ObjectId() },
      { $set: projectData },
      { upsert: true }
    );

    const projectId = result.upsertedId ? result.upsertedId : document.projectId;

    // Atualizar status do documento
    await documentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'saved',
          savedAt: new Date(),
          normalizedData: approvedData, // Salva a versão final aprovada
          projectId: projectId
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Dados salvos com sucesso no banco de projetos',
      projectId: result.insertedId
    });

  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 