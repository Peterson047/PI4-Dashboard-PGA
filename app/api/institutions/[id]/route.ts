import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params no Next.js 15
    const db = await getDatabase();
    const collection = db.collection('projetos');

    // A busca agora é feita diretamente pelo código da unidade, que é mais confiável.
    const institutionData = await collection.findOne({
      "identificacao_unidade.codigo": id
    }, {
      sort: { 'metadados_extracao.data_extracao': -1 } // Pega o documento mais recente para esse código
    });

    if (!institutionData) {
      return NextResponse.json(
        { error: `Instituição com código '${id}' não encontrada` },
        { status: 404 }
      );
    }

    // Garantir que ano_referencia existe e é um número válido
    if (institutionData.ano_referencia === undefined || institutionData.ano_referencia === null) {
      console.warn(`Documento ${institutionData._id} não possui ano_referencia. Usando ano atual como fallback.`);
      institutionData.ano_referencia = new Date().getFullYear();
    }

    return NextResponse.json(institutionData);
  } catch (error) {
    console.error('Erro ao buscar dados da instituição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

