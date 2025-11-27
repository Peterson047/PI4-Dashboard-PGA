import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const collection = db.collection('projetos');
    
    // Buscar todas as instituições únicas
    const institutions = await collection.aggregate([
      {
        // Garante que apenas documentos com código e nome de unidade válidos sejam processados
        $match: {
          "identificacao_unidade.codigo": { $exists: true, $ne: null, $ne: "" },
          "identificacao_unidade.nome": { $exists: true, $ne: null, $type: "string", $ne: "" }
        }
      },
      {
        $group: {
          _id: "$identificacao_unidade.codigo", // Agrupa pelo código, que é mais estável
          // Pega o primeiro nome encontrado para este código. A busca será feita pelo código.
          nome: { $first: "$identificacao_unidade.nome" }
        }
      },
      {
        $project: {
          _id: 0,
          id: "$_id", // O ID agora é o próprio código da unidade
          name: "$nome"
        }
      },
      {
        // Garante que a lista final não tenha nomes duplicados, caso códigos diferentes tenham o mesmo nome
        $group: {
          _id: "$name",
          id: { $first: "$id" }
        }
      },
      {
        $project: {
          _id: 0,
          id: "$id",
          name: "$_id"
        }
      }
    ]).toArray();

    if (institutions.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(institutions);
  } catch (error) {
    console.error('Erro ao buscar instituições:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

