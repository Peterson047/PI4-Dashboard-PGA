import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { verifyToken } from '@/lib/authService';
import { documentUploadSchema } from '@/lib/schemas/document';
import { getInstitutionCode } from '@/lib/dataService';
import { withRetry, isRetryableError } from '@/lib/retry';
import logger, { logProcessingMetrics, logAccessControl } from '@/lib/logger';
import sanitize from 'sanitize-filename';
// Importar file-type (versão 16.5.4 usa CommonJS)
import fileType from 'file-type';

// Garante que o diretório de uploads exista
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info('Created uploads directory', { path: UPLOAD_DIR });
  }
}

// Rate limiting simples (em memória)
const uploadAttempts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_UPLOADS_PER_WINDOW = 15;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const attempts = uploadAttempts.get(userId) || [];

  // Remover tentativas antigas
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW_MS);

  if (recentAttempts.length >= MAX_UPLOADS_PER_WINDOW) {
    return false;
  }

  recentAttempts.push(now);
  uploadAttempts.set(userId, recentAttempts);
  return true;
}

export async function POST(request: NextRequest) {
  await ensureUploadDirExists();

  const startTime = new Date();
  let tempFilePath: string | null = null;
  let userId: string | undefined;

  try {
    // 1. Verificar autenticação
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      logger.warn('Unauthorized upload attempt');
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      logger.warn('Invalid token');
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    userId = user._id;

    // 2. Rate limiting
    if (!checkRateLimit(userId || '')) {
      logger.warn('Rate limit exceeded', { userId });
      return NextResponse.json(
        { success: false, message: 'Muitos uploads. Tente novamente em 15 minutos.' },
        { status: 429 }
      );
    }

    // 3. Extrair e validar dados do formulário
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const institutionName = formData.get('institutionName') as string | null;
    const year = formData.get('year') as string | null;

    // Validar com Zod
    const validation = documentUploadSchema.safeParse({
      institutionName,
      year,
      file: file ? {
        name: file.name,
        size: file.size,
        type: file.type
      } : null
    });

    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.warn('Validation failed', { errors, userId });
      return NextResponse.json(
        { success: false, message: `Validação falhou: ${errors}` },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // 4. Verificar controle de acesso por instituição
    const institutionCode = getInstitutionCode(institutionName || '');

    if (user.role !== 'admin' && user.accessLevel === 'specific') {
      const allowed = user.allowedInstitutions || [];
      if (!allowed.includes(institutionCode)) {
        logAccessControl('document_upload', userId || '', institutionCode, false, 'Institution not in allowed list');
        return NextResponse.json(
          { success: false, message: 'Você não tem permissão para processar documentos desta instituição' },
          { status: 403 }
        );
      }
    }

    logAccessControl('document_upload', userId || '', institutionCode, true);

    // 5. Validar magic bytes (verificar se é realmente um PDF)
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileTypeResult = await fileType.fromBuffer(buffer);

    if (!fileTypeResult || fileTypeResult.mime !== 'application/pdf') {
      logger.warn('Invalid file type', {
        detectedType: fileTypeResult?.mime,
        fileName: file.name,
        userId
      });
      return NextResponse.json(
        { success: false, message: 'Arquivo não é um PDF válido' },
        { status: 400 }
      );
    }

    // 6. Sanitizar nome do arquivo
    const sanitizedFileName = sanitize(file.name);
    tempFilePath = path.join(UPLOAD_DIR, `${Date.now()}_${sanitizedFileName}`);
    await fs.writeFile(tempFilePath, buffer);

    logger.info('File uploaded', {
      fileName: sanitizedFileName,
      fileSize: file.size,
      institution: institutionName || '',
      year: year || '',
      userId
    });

    const pythonScriptPath = path.join(process.cwd(), 'scripts', 'run_pipeline.py');

    // 7. Processar com retry logic
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        send({ status: 'starting', message: 'Iniciando o pipeline...' });

        try {
          await withRetry(
            () => new Promise<void>((resolve, reject) => {
              const pythonProcess = spawn('python3', [
                pythonScriptPath,
                tempFilePath!,
                institutionName || '',
                year || '',
              ]);

              let hasError = false;

              pythonProcess.stdout.on('data', (data) => {
                const logLine = data.toString();
                send({ status: 'processing', log: logLine });
              });

              pythonProcess.stderr.on('data', (data) => {
                const logLine = data.toString();

                // Apenas marcar como erro se for realmente um erro (ERROR ou CRITICAL)
                // Logs INFO/WARNING do Python vão para stderr mas não são erros
                if (logLine.includes('- ERROR -') || logLine.includes('- CRITICAL -')) {
                  hasError = true;
                  send({ status: 'error', log: logLine });
                  logger.error('Python process error', { error: logLine });
                } else {
                  // É apenas um log informativo (INFO/WARNING)
                  send({ status: 'processing', log: logLine });
                }
              });

              pythonProcess.on('close', async (code) => {
                // Limpar arquivo temporário
                if (tempFilePath) {
                  try {
                    await fs.unlink(tempFilePath);
                  } catch (err) {
                    logger.error('Failed to delete temp file', { tempFilePath, error: err });
                  }
                }

                if (code === 0 && !hasError) {
                  send({ status: 'success', message: 'Processo concluído com sucesso!' });

                  logProcessingMetrics({
                    filename: sanitizedFileName,
                    fileSize: file.size,
                    institution: institutionName!,
                    startTime,
                    endTime: new Date(),
                    success: true,
                    userId
                  });

                  resolve();
                } else {
                  const error = new Error(`Processo falhou com código ${code}`);
                  send({ status: 'failure', message: error.message });

                  logProcessingMetrics({
                    filename: sanitizedFileName,
                    fileSize: file.size,
                    institution: institutionName!,
                    startTime,
                    endTime: new Date(),
                    success: false,
                    error: error.message,
                    userId
                  });

                  reject(error);
                }
                controller.close();
              });

              pythonProcess.on('error', async (err) => {
                if (tempFilePath) {
                  try {
                    await fs.unlink(tempFilePath);
                  } catch { }
                }
                send({ status: 'failure', message: `Falha ao iniciar o processo: ${err.message}` });
                logger.error('Failed to start Python process', { error: err.message });
                reject(err);
                controller.close();
              });
            }),
            {
              maxRetries: 3,
              initialDelay: 1000,
              onRetry: (attempt, error) => {
                send({
                  status: 'retrying',
                  message: `Tentativa ${attempt}/3 após erro: ${error.message}`
                });
              }
            }
          );
        } catch (error) {
          send({
            status: 'failure',
            message: `Falha após 3 tentativas: ${error instanceof Error ? error.message : String(error)}`
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('Upload processing error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId
    });

    // Limpar arquivo temporário em caso de erro
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch { }
    }

    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
