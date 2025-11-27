// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanupOldFiles } from './fileCleanup';
import path from 'path';

// Define mocks using vi.hoisted to handle hoisting
const {
    mockAccess, mockReaddir, mockStat, mockUnlink, mockJoin,
    mockLoggerInfo, mockLoggerWarn, mockLoggerError
} = vi.hoisted(() => {
    return {
        mockAccess: vi.fn(),
        mockReaddir: vi.fn(),
        mockStat: vi.fn(),
        mockUnlink: vi.fn(),
        mockJoin: vi.fn((...args: string[]) => args.join('/')),
        mockLoggerInfo: vi.fn(),
        mockLoggerWarn: vi.fn(),
        mockLoggerError: vi.fn()
    }
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
    __esModule: true,
    access: mockAccess,
    readdir: mockReaddir,
    stat: mockStat,
    unlink: mockUnlink,
    default: {
        access: mockAccess,
        readdir: mockReaddir,
        stat: mockStat,
        unlink: mockUnlink
    }
}));

// Mock path
vi.mock('path', () => ({
    __esModule: true,
    join: mockJoin,
    default: {
        join: mockJoin
    }
}));

// Mock logger
vi.mock('./logger', () => ({
    __esModule: true,
    default: {
        info: mockLoggerInfo,
        warn: mockLoggerWarn,
        error: mockLoggerError
    }
}));

describe('File Cleanup Logic', () => {
    const mockDir = '/tmp/uploads';
    const now = 1700000000000; // Fixed timestamp

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
        vi.clearAllMocks();

        // Reset mock implementations
        mockAccess.mockReset();
        mockReaddir.mockReset();
        mockStat.mockReset();
        mockUnlink.mockReset();
        mockJoin.mockImplementation((...args: string[]) => args.join('/'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should delete files older than maxAge', async () => {
        // Setup mocks
        mockAccess.mockResolvedValue(undefined);
        mockReaddir.mockResolvedValue(['old.pdf', 'new.pdf']);

        // old.pdf: 25 hours old
        // new.pdf: 1 hour old
        mockStat.mockImplementation(async (filePath: string) => {
            if (filePath.includes('old.pdf')) {
                return {
                    isDirectory: () => false,
                    mtimeMs: now - (25 * 60 * 60 * 1000), // 25 hours ago
                    size: 1024
                };
            } else {
                return {
                    isDirectory: () => false,
                    mtimeMs: now - (1 * 60 * 60 * 1000), // 1 hour ago
                    size: 2048
                };
            }
        });

        const result = await cleanupOldFiles(mockDir, { maxAgeHours: 24 });

        expect(result.filesScanned).toBe(2);
        expect(result.filesDeleted).toBe(1);
        expect(mockUnlink).toHaveBeenCalledTimes(1);
        expect(mockUnlink).toHaveBeenCalledWith(`${mockDir}/old.pdf`);
    });

    it('should not delete files in dry run mode', async () => {
        mockAccess.mockResolvedValue(undefined);
        mockReaddir.mockResolvedValue(['old.pdf']);
        mockStat.mockResolvedValue({
            isDirectory: () => false,
            mtimeMs: now - (25 * 60 * 60 * 1000),
            size: 1024
        });

        const result = await cleanupOldFiles(mockDir, { maxAgeHours: 24, dryRun: true });

        expect(result.filesScanned).toBe(1);
        expect(result.filesDeleted).toBe(0);
        expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should handle directory access errors gracefully', async () => {
        mockAccess.mockRejectedValue(new Error('ENOENT'));

        const result = await cleanupOldFiles(mockDir);

        expect(result.filesScanned).toBe(0);
        expect(result.errors).toHaveLength(0);
    });
});
