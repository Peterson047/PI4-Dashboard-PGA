'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { documentUploadSchema } from '@/lib/schemas/document'
import { z } from 'zod'

interface UploadFormProps {
    onSubmit: (file: File, institutionName: string, year: string) => void
    isProcessing: boolean
}

export function UploadForm({ onSubmit, isProcessing }: UploadFormProps) {
    const { toast } = useToast()
    const [file, setFile] = useState<File | null>(null)
    const [institutionName, setInstitutionName] = useState('')
    const [year, setYear] = useState<string>(new Date().getFullYear().toString())
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isDragging, setIsDragging] = useState(false)

    // Validação em tempo real
    const validateField = (field: string, value: any) => {
        try {
            if (field === 'file' && value) {
                documentUploadSchema.shape.file.parse({
                    name: value.name,
                    size: value.size,
                    type: value.type
                })
            } else if (field === 'institutionName') {
                documentUploadSchema.shape.institutionName.parse(value)
            } else if (field === 'year') {
                documentUploadSchema.shape.year.parse(value)
            }
            setErrors(prev => ({ ...prev, [field]: '' }))
            return true
        } catch (err) {
            if (err instanceof z.ZodError) {
                setErrors(prev => ({ ...prev, [field]: err.errors[0].message }))
                return false
            }
            return false
        }
    }

    // Drag & Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            handleFileSelect(droppedFile)
        }
    }

    const handleFileSelect = (selectedFile: File) => {
        if (validateField('file', selectedFile)) {
            setFile(selectedFile)
        } else {
            toast({
                title: "Arquivo inválido",
                description: errors.file || "Por favor, selecione um PDF válido (máximo 10MB)",
                variant: "destructive"
            })
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validar todos os campos
        const fileValid = file && validateField('file', file)
        const institutionValid = validateField('institutionName', institutionName)
        const yearValid = validateField('year', year)

        if (!fileValid || !institutionValid || !yearValid) {
            toast({
                title: "Campos inválidos",
                description: "Por favor, corrija os erros antes de enviar.",
                variant: "destructive"
            })
            return
        }

        onSubmit(file!, institutionName, year)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag & Drop Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : errors.file
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
            >
                <input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                        const selectedFile = e.target.files?.[0]
                        if (selectedFile) handleFileSelect(selectedFile)
                    }}
                    className="hidden"
                />

                {!file ? (
                    <label htmlFor="file" className="cursor-pointer block">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm text-gray-600 mb-1">
                            {isDragging ? 'Solte o arquivo aqui...' : 'Arraste um PDF ou clique para selecionar'}
                        </p>
                        <p className="text-xs text-gray-500">Máximo 10MB</p>
                    </label>
                ) : (
                    <div className="flex items-center justify-center gap-3 p-3 bg-blue-50 rounded-md">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFile(null)}
                            className="flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {errors.file && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">{errors.file}</p>
                    </div>
                )}
            </div>

            {/* Instituição */}
            <div className="space-y-2">
                <Label htmlFor="institution">Nome da Instituição</Label>
                <Input
                    id="institution"
                    placeholder="Ex: FATEC Votorantim"
                    value={institutionName}
                    onChange={(e) => {
                        setInstitutionName(e.target.value)
                        validateField('institutionName', e.target.value)
                    }}
                    className={errors.institutionName ? 'border-red-500' : ''}
                />
                {errors.institutionName && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.institutionName}
                    </p>
                )}
            </div>

            {/* Ano */}
            <div className="space-y-2">
                <Label htmlFor="year">Ano de Referência</Label>
                <Input
                    id="year"
                    type="number"
                    placeholder="Ex: 2025"
                    value={year}
                    onChange={(e) => {
                        setYear(e.target.value)
                        validateField('year', e.target.value)
                    }}
                    className={errors.year ? 'border-red-500' : ''}
                />
                {errors.year && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.year}
                    </p>
                )}
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                disabled={isProcessing || !file || !institutionName || !year}
            >
                <Upload className="mr-2 h-4 w-4" />
                {isProcessing ? 'Processando...' : 'Enviar e Processar'}
            </Button>
        </form>
    )
}
