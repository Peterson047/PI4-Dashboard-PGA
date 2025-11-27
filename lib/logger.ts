import winston from 'winston';
import path from 'path';

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'pga-dashboard' },
    transports: [
        // Erros em arquivo separado
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Todos os logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// Se não estiver em produção, também logar no console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Funções auxiliares para logging de métricas
export const logProcessingMetrics = (metrics: {
    documentId?: string;
    filename: string;
    fileSize: number;
    institution: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    success: boolean;
    error?: string;
    userId?: string;
}) => {
    const duration = metrics.endTime
        ? metrics.endTime.getTime() - metrics.startTime.getTime()
        : metrics.duration || 0;

    logger.info('Document processing metrics', {
        ...metrics,
        duration,
        timestamp: new Date().toISOString()
    });
};

export const logAccessControl = (action: string, userId: string, resource: string, allowed: boolean, reason?: string) => {
    logger.info('Access control check', {
        action,
        userId,
        resource,
        allowed,
        reason,
        timestamp: new Date().toISOString()
    });
};

export default logger;
