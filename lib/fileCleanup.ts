import fs from 'fs/promises';
import path from 'path';
import logger from './logger';

export interface CleanupOptions {
    maxAgeHours?: number;
    dryRun?: boolean;
}

export interface CleanupResult {
    filesScanned: number;
    filesDeleted: number;
    bytesFreed: number;
    errors: string[];
}

/**
 * Remove arquivos temporários antigos do diretório de uploads
 */
export async function cleanupOldFiles(
    directory: string,
    options: CleanupOptions = {}
): Promise<CleanupResult> {
    const { maxAgeHours = 24, dryRun = false } = options;

    const result: CleanupResult = {
        filesScanned: 0,
        filesDeleted: 0,
        bytesFreed: 0,
        errors: []
    };

    try {
        // Verificar se o diretório existe
        try {
            await fs.access(directory);
        } catch {
            logger.warn('Upload directory does not exist', { directory });
            return result;
        }

        const files = await fs.readdir(directory);
        const now = Date.now();
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(directory, file);
            result.filesScanned++;

            try {
                const stats = await fs.stat(filePath);

                // Pular diretórios
                if (stats.isDirectory()) {
                    continue;
                }

                const ageMs = now - stats.mtimeMs;

                if (ageMs > maxAgeMs) {
                    if (dryRun) {
                        logger.info('Would delete file (dry run)', {
                            file,
                            ageHours: (ageMs / (1000 * 60 * 60)).toFixed(2),
                            sizeBytes: stats.size
                        });
                    } else {
                        await fs.unlink(filePath);
                        result.filesDeleted++;
                        result.bytesFreed += stats.size;

                        logger.info('Deleted old file', {
                            file,
                            ageHours: (ageMs / (1000 * 60 * 60)).toFixed(2),
                            sizeBytes: stats.size
                        });
                    }
                }
            } catch (error) {
                const errorMsg = `Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`;
                result.errors.push(errorMsg);
                logger.error('File cleanup error', { file, error: errorMsg });
            }
        }

        logger.info('Cleanup completed', {
            directory,
            ...result,
            dryRun
        });

        return result;
    } catch (error) {
        logger.error('Cleanup failed', {
            directory,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

/**
 * Obtém estatísticas do diretório de uploads
 */
export async function getDirectoryStats(directory: string) {
    try {
        const files = await fs.readdir(directory);
        let totalSize = 0;
        let fileCount = 0;

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stats = await fs.stat(filePath);

            if (stats.isFile()) {
                totalSize += stats.size;
                fileCount++;
            }
        }

        return {
            fileCount,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    } catch (error) {
        logger.error('Failed to get directory stats', {
            directory,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
