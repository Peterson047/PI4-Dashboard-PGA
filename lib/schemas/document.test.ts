import { describe, it, expect } from 'vitest'
import { documentUploadSchema, acaoProjetoSchema, anexoAquisicaoSchema } from './document'

describe('Document Schemas', () => {
    describe('documentUploadSchema', () => {
        it('should validate a correct upload payload', () => {
            const validData = {
                file: new File(['dummy content'], 'test.pdf', { type: 'application/pdf' }),
                institutionName: 'FATEC Votorantim',
                year: '2024'
            }

            const result = documentUploadSchema.safeParse(validData)
            expect(result.success).toBe(true)
        })

        it('should reject invalid file types', () => {
            const invalidData = {
                file: new File(['dummy content'], 'test.txt', { type: 'text/plain' }),
                institutionName: 'FATEC Votorantim',
                year: '2024'
            }

            const result = documentUploadSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Apenas arquivos PDF')
            }
        })

        it('should reject empty institution name', () => {
            const invalidData = {
                file: new File(['dummy content'], 'test.pdf', { type: 'application/pdf' }),
                institutionName: '',
                year: '2024'
            }

            const result = documentUploadSchema.safeParse(invalidData)
            expect(result.success).toBe(false)
        })
    })

    describe('acaoProjetoSchema', () => {
        it('should validate a correct project', () => {
            const validProject = {
                codigo_acao: 'PROJ-001',
                titulo: 'Projeto Teste',
                origem_prioridade: 'PDI',
                o_que_sera_feito: 'Implementação de sistema',
                por_que_sera_feito: 'Melhoria de processos',
                custo_estimado: 10000,
                fonte_recursos: 'Próprio',
                periodo_execucao: {
                    data_inicial: '2024-01-01',
                    data_final: '2024-12-31'
                },
                equipe: [
                    {
                        funcao: 'Coordenador',
                        nome: 'João Silva',
                        carga_horaria_semanal: 20,
                        tipo_hora: 'Atividade'
                    }
                ]
            }

            const result = acaoProjetoSchema.safeParse(validProject)
            if (!result.success) {
                console.error(result.error)
            }
            expect(result.success).toBe(true)
        })
    })
})
