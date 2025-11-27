import { z } from 'zod';

// Schema para upload de documento
export const documentUploadSchema = z.object({
    institutionName: z.string()
        .min(3, 'Nome da instituição deve ter pelo menos 3 caracteres')
        .max(100, 'Nome da instituição muito longo'),
    year: z.string()
        .regex(/^\d{4}$/, 'Ano deve ter 4 dígitos')
        .refine((val) => {
            const year = parseInt(val);
            return year >= 2000 && year <= new Date().getFullYear() + 1;
        }, 'Ano inválido'),
    file: z.object({
        name: z.string(),
        size: z.number()
            .max(10 * 1024 * 1024, 'Arquivo muito grande. Máximo 10MB'),
        type: z.literal('application/pdf', {
            errorMap: () => ({ message: 'Apenas arquivos PDF são aceitos' })
        })
    })
});

// Schema para equipe de projeto
export const equipeSchema = z.object({
    funcao: z.string().min(1, 'Função é obrigatória'),
    nome: z.string().min(1, 'Nome é obrigatório'),
    carga_horaria_semanal: z.union([z.string(), z.number()]),
    tipo_hora: z.string()
});

// Schema para etapa de processo
export const etapaProcessoSchema = z.object({
    descricao: z.string(),
    inicio: z.string(),
    fim: z.string()
});

// Schema para projeto/ação
export const acaoProjetoSchema = z.object({
    codigo_acao: z.string().min(1, 'Código da ação é obrigatório'),
    titulo: z.string().min(1, 'Título é obrigatório'),
    origem_prioridade: z.string().nullable(),
    o_que_sera_feito: z.string().nullable(),
    por_que_sera_feito: z.string().nullable(),
    custo_estimado: z.number().nullable(),
    fonte_recursos: z.string().nullable(),
    periodo_execucao: z.object({
        data_inicial: z.string().nullable(),
        data_final: z.string().nullable()
    }),
    equipe: z.array(equipeSchema),
    etapas_processo: z.array(etapaProcessoSchema).optional()
});

// Schema para aquisição
export const anexoAquisicaoSchema = z.object({
    item: z.number(),
    projeto_referencia: z.string(),
    denominacao: z.string(),
    quantidade: z.number(),
    preco_total_estimado: z.number()
});

// Schema para documento completo
export const fullDocumentSchema = z.object({
    _id: z.string().optional(),
    ano_referencia: z.number()
        .min(2000, 'Ano de referência inválido')
        .max(new Date().getFullYear() + 1, 'Ano de referência inválido'),
    versao_documento: z.string(),
    instituicao_nome: z.string().min(1, 'Nome da instituição é obrigatório'),
    identificacao_unidade: z.object({
        codigo: z.string().min(1, 'Código da unidade é obrigatório'),
        nome: z.string().min(1, 'Nome da unidade é obrigatório'),
        diretor: z.string()
    }),
    analise_cenario: z.string(),
    metadados_extracao: z.object({
        nome_arquivo_original: z.string(),
        data_extracao: z.string(),
        metodo_extracao: z.string().optional()
    }),
    situacoes_problema_gerais: z.array(z.string()),
    acoes_projetos: z.array(acaoProjetoSchema),
    anexo1_aquisicoes: z.array(anexoAquisicaoSchema),
    version: z.number().optional(),
    history: z.array(z.any()).optional()
});

// Tipos TypeScript derivados dos schemas
export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type AcaoProjeto = z.infer<typeof acaoProjetoSchema>;
export type FullDocument = z.infer<typeof fullDocumentSchema>;
