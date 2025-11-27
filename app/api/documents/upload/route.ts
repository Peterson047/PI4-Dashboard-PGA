import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const institutionName = formData.get('institutionName') as string;
    const year = formData.get('year') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    if (!institutionName || !year) {
      return NextResponse.json(
        { success: false, message: 'Nome da instituição e ano são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se é um PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Apenas arquivos PDF são aceitos' },
        { status: 400 }
      );
    }

    // Verificar tamanho do arquivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    // Criar diretório de uploads se não existir
    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = join(uploadsDir, fileName);

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Salvar informações no banco de dados
    const db = await getDatabase();
    const documentsCollection = db.collection('documents');

    const document = {
      originalName: file.name,
      fileName: fileName,
      filePath: filePath,
      institutionName: institutionName,
      year: parseInt(year),
      status: 'uploaded', // uploaded, processing, processed, error
      uploadedBy: user._id,
      uploadedAt: new Date(),
      processedAt: null,
      error: null,
      extractedData: null,
      normalizedData: null
    };

    const result = await documentsCollection.insertOne(document);

    return NextResponse.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      documentId: result.insertedId,
      fileName: fileName
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 