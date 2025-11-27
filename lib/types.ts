export interface CollectionData {
  _id: { $oid: string };
  ano_referencia: number;
  versao_documento: string;
  identificacao_unidade: {
    codigo: string;
    nome: string;
    diretor: string;
  };
  analise_cenario: string;
  metadados_extracao: {
    nome_arquivo_original: string;
    data_extracao: string;
  };
  situacoes_problema_gerais: string[];
  acoes_projetos: AcaoProjeto[];
  anexo1_aquisicoes: AnexoAquisicao[];
}

export interface AcaoProjeto {
  codigo_acao: string;
  titulo: string;
  origem_prioridade: string | null;
  o_que_sera_feito: string | null;
  por_que_sera_feito: string | null;
  custo_estimado: number | null;
  fonte_recursos: string | null;
  periodo_execucao: {
    data_inicial: string | null;
    data_final: string | null;
  };
  equipe: Equipe[];
  etapas_processo?: EtapaProcesso[];
}

export interface Equipe {
  funcao: string;
  nome: string;
  carga_horaria_semanal: number | string;
  tipo_hora: string;
}

export interface EtapaProcesso {
  descricao: string;
  inicio: string;
  fim: string;
}

export interface AnexoAquisicao {
  item: number;
  projeto_referencia: string;
  denominacao: string;
  quantidade: number;
  preco_total_estimado: number;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
}

export interface User {
  _id?: string;
  email: string;
  name: string;
  role: 'admin' | 'professor' | 'diretor';
  institution?: string; // Deprecated in favor of allowedInstitutions but kept for backward compatibility
  allowedInstitutions?: string[];
  accessLevel?: 'all' | 'specific';
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: Date;
}


