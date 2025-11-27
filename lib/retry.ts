import logger from './logger';

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Executa uma função com retry automático e backoff exponencial
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        onRetry
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                logger.error('Max retries reached', {
                    attempts: maxRetries,
                    error: lastError.message,
                    stack: lastError.stack
                });
                throw lastError;
            }

            const delay = Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt - 1),
                maxDelay
            );

            logger.warn('Retry attempt', {
                attempt,
                maxRetries,
                delay,
                error: lastError.message
            });

            if (onRetry) {
                onRetry(attempt, lastError);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Verifica se um erro é recuperável (vale a pena tentar novamente)
 */
export function isRetryableError(error: any): boolean {
    // Erros de rede são recuperáveis
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return true;
    }

    // Erros 5xx do servidor são recuperáveis
    if (error.response?.status >= 500 && error.response?.status < 600) {
        return true;
    }

    // Erros 429 (Too Many Requests) são recuperáveis
    if (error.response?.status === 429) {
        return true;
    }

    return false;
}
