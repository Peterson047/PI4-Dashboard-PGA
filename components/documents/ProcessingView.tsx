'use client'

import { useMemo } from 'react'
import { CheckCircle, AlertTriangle, FileClock, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

type Status = 'idle' | 'processing' | 'success' | 'error'

interface ProcessingViewProps {
    logs: string[]
    status: Status
}

const pipelineSteps = [
    { name: 'Extraindo Dados', keyword: 'Iniciando a extração' },
    { name: 'Normalizando Dados', keyword: 'Iniciando a normalização' },
    { name: 'Salvando no Banco', keyword: 'Inserindo dados no banco' },
    { name: 'Concluído', keyword: 'Dados inseridos com sucesso' },
]

export function ProcessingView({ logs, status }: ProcessingViewProps) {
    // Extrair estatísticas dos logs
    const stats = useMemo(() => {
        const logText = logs.join('\n')

        // Páginas processadas
        const pageMatches = logText.match(/Processando página (\d+) de (\d+)/g)
        const lastPageMatch = pageMatches?.[pageMatches.length - 1]
        const pageNumbers = lastPageMatch?.match(/\d+/g)
        const pagesProcessed = pageNumbers ? parseInt(pageNumbers[0]) : 0
        const totalPages = pageNumbers ? parseInt(pageNumbers[1]) : 0

        // Tabelas encontradas
        const tableMatches = logText.match(/(\d+) tabelas encontradas/g)
        const tablesFound = tableMatches?.reduce((sum, match) => {
            const num = match.match(/\d+/)
            return sum + (num ? parseInt(num[0]) : 0)
        }, 0) || 0

        // Projetos extraídos
        const projectMatch = logText.match(/(\d+) projetos/)
        const projectsExtracted = projectMatch ? parseInt(projectMatch[1]) : 0

        // Aquisições
        const acquisitionMatch = logText.match(/(\d+) aquisições/)
        const acquisitionsFound = acquisitionMatch ? parseInt(acquisitionMatch[1]) : 0

        return {
            pagesProcessed,
            totalPages,
            tablesFound,
            projectsExtracted,
            acquisitionsFound
        }
    }, [logs])

    // Determinar etapa atual
    const currentStep = useMemo(() => {
        if (status !== 'processing') return -1
        const logText = logs.join('\n')
        for (let i = pipelineSteps.length - 1; i >= 0; i--) {
            if (logText.includes(pipelineSteps[i].keyword)) {
                return i
            }
        }
        return 0
    }, [logs, status])

    const progress = stats.totalPages > 0
        ? (stats.pagesProcessed / stats.totalPages) * 100
        : 0

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            {status === 'processing' && stats.totalPages > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Progresso</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Páginas</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {stats.pagesProcessed}
                        {stats.totalPages > 0 && <span className="text-sm text-gray-500">/{stats.totalPages}</span>}
                    </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Tabelas</p>
                    <p className="text-2xl font-bold text-green-600">{stats.tablesFound}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Projetos</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.projectsExtracted}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Aquisições</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.acquisitionsFound}</p>
                </div>
            </div>

            {/* Pipeline Stepper */}
            <div>
                <h3 className="font-semibold mb-4 text-gray-800">Etapas do Processo</h3>
                <ol className="relative text-gray-500 border-s border-gray-200 ml-3">
                    {pipelineSteps.map((step, index) => {
                        const isCompleted = index < currentStep || status === 'success'
                        const isActive = index === currentStep && status === 'processing'
                        const isFailed = index === currentStep && status === 'error'

                        return (
                            <li key={step.name} className="mb-7 ms-6">
                                <span
                                    className={`absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-4 ring-white ${isCompleted
                                            ? 'bg-green-100'
                                            : isFailed
                                                ? 'bg-red-100'
                                                : isActive
                                                    ? 'bg-blue-100'
                                                    : 'bg-gray-100'
                                        }`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : isFailed ? (
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                    ) : isActive ? (
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    ) : (
                                        <FileClock className="w-4 h-4 text-gray-500" />
                                    )}
                                </span>
                                <h4
                                    className={`font-medium ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                                        }`}
                                >
                                    {step.name}
                                </h4>
                                {isActive && (
                                    <p className="text-sm text-blue-600 animate-pulse">Em andamento...</p>
                                )}
                                {isCompleted && (
                                    <p className="text-sm text-green-600">Concluído</p>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </div>

            {/* Logs colapsáveis (opcional) */}
            <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Ver logs detalhados ({logs.length} linhas)
                </summary>
                <div className="mt-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                        {logs.join('\n')}
                    </pre>
                </div>
            </details>
        </div>
    )
}
