import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';
import { ObjectId } from 'mongodb';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const documentsCollection = db.collection('projetos');

    const document = await documentsCollection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document });

  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const documentsCollection = db.collection('projetos');

    // Buscar o documento antes de deletar
    const document = await documentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Tentar deletar arquivo físico se existir na pasta uploads
    const fileName = document.metadados_extracao?.nome_arquivo_original;
    if (fileName) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const possiblePaths = [
        path.join(uploadsDir, fileName),
        path.join(uploadsDir, `${id}_${fileName}`),
        path.join(uploadsDir, fileName.replace(/\.pdf$/i, '')),
      ];

      for (const filePath of possiblePaths) {
        if (existsSync(filePath)) {
          try {
            await unlink(filePath);
            console.log(`Arquivo físico deletado: ${filePath}`);
          } catch (fileError) {
            console.warn(`Erro ao deletar arquivo físico ${filePath}:`, fileError);
            // Continua mesmo se não conseguir deletar o arquivo
          }
        }
      }
    }

    // Deletar do MongoDB
    const deleteResult = await documentsCollection.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Documento não foi deletado' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Documento deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 