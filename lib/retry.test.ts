import { describe, it, expect, vi } from 'vitest'
import { withRetry } from "./retry";

// Mock do logger para evitar dependências de Node.js (winston, path, etc)
vi.mock('./logger', () => ({
    default: {
        warn: vi.fn(),
        error: vi.fn()
    }
}))

describe('Retry Logic', () => {
    it('should return result immediately if successful', async () => {
        const mockFn = vi.fn().mockResolvedValue('success')

        const result = await withRetry(mockFn, { maxRetries: 3 })

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
        const mockFn = vi.fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success')

        const result = await withRetry(mockFn, { maxRetries: 3, initialDelay: 10 })

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries exceeded', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('always fail'))

        await expect(withRetry(mockFn, { maxRetries: 2, initialDelay: 10 }))
            .rejects.toThrow('always fail')

        expect(mockFn).toHaveBeenCalledTimes(2) // Total attempts (initial + 1 retry if maxRetries=2 means 2 attempts)
    })
})

