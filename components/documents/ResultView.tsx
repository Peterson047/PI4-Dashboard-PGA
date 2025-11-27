'use client'

import { CheckCircle, RotateCcw, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResultViewProps {
    type: 'success' | 'error'
    logs: string[]
    onReset: () => void
}

export function ResultView({ type, logs, onReset }: ResultViewProps) {
    const isSuccess = type === 'success'

    // Extrair informações úteis dos logs
    const documentId = logs.find(log => log.includes('ID do documento:'))?.match(/[a-f0-9]{24}/)?.[0]
    const projectCount = logs.find(log => log.includes('projetos'))?.match(/(\d+) projetos/)?.[1]
    const acquisitionCount = logs.find(log => log.includes('aquisições'))?.match(/(\d+) aquisições/)?.[1]

    return (
        <div className="text-center space-y-6">
            {/* Icon */}
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-100' : 'bg-red-100'
                }`}>
                {isSuccess ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                    <FileCheck className="w-10 h-10 text-red-600" />
                )}
            </div>

            {/* Message */}
            <div>
                <h3 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {isSuccess ? 'Processamento Concluído!' : 'Erro no Processamento'}
                </h3>
                <p className="text-gray-600">
                    {isSuccess
                        ? 'O documento foi processado e salvo com sucesso no banco de dados.'
                        : 'Ocorreu um erro durante o processamento. Verifique os logs abaixo.'}
                </p>
            </div>

            {/* Success Stats */}
            {isSuccess && (projectCount || acquisitionCount || documentId) && (
                <div className="bg-green-50 rounded-lg p-6 space-y-3">
                    <h4 className="font-semibold text-gray-800">Resumo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {projectCount && (
                            <div>
                                <p className="text-gray-600">Projetos Extraídos</p>
                                <p className="text-2xl font-bold text-green-600">{projectCount}</p>
                            </div>
                        )}
                        {acquisitionCount && (
                            <div>
                                <p className="text-gray-600">Aquisições</p>
                                <p className="text-2xl font-bold text-green-600">{acquisitionCount}</p>
                            </div>
                        )}
                        {documentId && (
                            <div className="md:col-span-3">
                                <p className="text-gray-600">ID do Documento</p>
                                <p className="text-sm font-mono text-gray-800 bg-white px-3 py-2 rounded mt-1">
                                    {documentId}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error Logs */}
            {!isSuccess && (
                <div className="bg-red-50 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-gray-800 mb-2">Detalhes do Erro</h4>
                    <div className="max-h-48 overflow-y-auto">
                        <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">
                            {logs.filter(log =>
                                log.includes('ERROR') ||
                                log.includes('erro') ||
                                log.includes('falhou')
                            ).join('\n')}
                        </pre>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
                <Button onClick={onReset} variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Processar Outro Documento
                </Button>
                {isSuccess && (
                    <Button asChild>
                        <a href="/">
                            Ver no Dashboard
                        </a>
                    </Button>
                )}
            </div>

            {/* Full Logs (collapsible) */}
            <details className="bg-gray-50 rounded-lg p-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Ver todos os logs ({logs.length} linhas)
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
