import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { verifyToken } from '@/lib/authService';
import { cleanupOldFiles, getDirectoryStats } from '@/lib/fileCleanup';
import logger from '@/lib/logger';

/**
 * GET /api/cleanup
 * Remove arquivos temporários antigos (apenas admin)
 */
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
        if (!user || user.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Apenas administradores podem executar limpeza' },
                { status: 403 }
            );
        }

        const uploadsDir = join(process.cwd(), 'uploads');
        const { searchParams } = new URL(request.url);
        const dryRun = searchParams.get('dryRun') === 'true';
        const maxAgeHours = parseInt(searchParams.get('maxAgeHours') || '24');

        logger.info('Cleanup requested', {
            userId: user._id,
            dryRun,
            maxAgeHours
        });

        // Obter estatísticas antes da limpeza
        const statsBefore = await getDirectoryStats(uploadsDir);

        // Executar limpeza
        const result = await cleanupOldFiles(uploadsDir, {
            maxAgeHours,
            dryRun
        });

        // Obter estatísticas depois da limpeza
        const statsAfter = await getDirectoryStats(uploadsDir);

        return NextResponse.json({
            success: true,
            cleanup: result,
            stats: {
                before: statsBefore,
                after: statsAfter
            }
        });

    } catch (error) {
        logger.error('Cleanup failed', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json(
            { success: false, message: 'Erro ao executar limpeza' },
            { status: 500 }
        );
    }
}
