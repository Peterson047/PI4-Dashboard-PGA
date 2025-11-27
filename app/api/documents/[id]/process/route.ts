import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';
import { ObjectId } from 'mongodb';
import { spawn } from 'child_process';
import path from 'path';

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

    // Buscar o documento
    const document = await documentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    if (document.status !== 'uploaded') {
      return NextResponse.json(
        { success: false, message: 'Documento já foi processado ou está em processamento' },
        { status: 400 }
      );
    }

    // Atualizar status para processing
    await documentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'processing' } }
    );

    try {
      // Processar PDF usando script Python
      const pythonScript = path.join(process.cwd(), 'scripts', 'process_pdf.py');
      
      const result = await new Promise<any>((resolve, reject) => {
        const pythonProcess = spawn('python3', [
          pythonScript,
          document.filePath,
          document.institutionName,
          document.year.toString()
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code: number) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output);
              if (result.success) {
                resolve(result);
              } else {
                reject(new Error('Erro no processamento Python'));
              }
            } catch (parseError) {
              reject(new Error('Erro ao parsear resultado do Python'));
            }
          } else {
            reject(new Error(`Erro no script Python: ${errorOutput}`));
          }
        });
      });

      const extractedData = result.extractedData;
      const normalizedData = result.normalizedData;

      // Atualizar documento com dados processados
      await documentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'processed',
            processedAt: new Date(),
            extractedData: extractedData,
            normalizedData: normalizedData
          } 
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Documento processado com sucesso',
        extractedData: extractedData,
        normalizedData: normalizedData
      });

    } catch (processingError) {
      // Em caso de erro no processamento
      await documentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'error',
            error: processingError instanceof Error ? processingError.message : 'Erro desconhecido',
            processedAt: new Date()
          } 
        }
      );

      throw processingError;
    }

  } catch (error) {
    console.error('Erro no processamento:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 