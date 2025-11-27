// Serviço para simular carregamento de dados do MongoDB
// Em produção, isso seria substituído por chamadas para API

export interface InstitutionalData {
  _id: { $oid: string };
  ano_referencia: number;
  versao_documento: string;
  instituicao_nome?: string;
  identificacao_unidade: {
    codigo: string;
    nome: string;
    diretor: string;
  };
  analise_cenario: string;
  metadados_extracao: {
    nome_arquivo_original: string;
    data_extracao: string;
    metodo_extracao?: string;
  };
  situacoes_problema_gerais: string[];
  acoes_projetos: Array<{
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
    equipe: Array<{
      funcao: string;
      nome: string;
      carga_horaria_semanal: number | string;
      tipo_hora: string;
    }>;
    etapas_processo?: Array<{
      descricao: string;
      inicio: string;
      fim: string;
    }>;
  }>;
  anexo1_aquisicoes: Array<{
    item: number;
    projeto_referencia: string;
    denominacao: string;
    quantidade: number;
    preco_total_estimado: number;
  }>;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
}

// Função para carregar lista de instituições disponíveis
export async function getAvailableInstitutions(): Promise<Institution[]> {
  const response = await fetch('/api/institutions');
  if (!response.ok) {
    throw new Error('Failed to load institutions');
  }
  return await response.json();
}

// Função para carregar dados de uma instituição específica do MongoDB
export async function loadInstitutionData(institutionId: string): Promise<InstitutionalData | null> {
  try {
    // Chamada para API que conecta com MongoDB
    const response = await fetch(`/api/institutions/${institutionId}`);
    if (!response.ok) {
      throw new Error(`Failed to load data for ${institutionId}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading data for institution ${institutionId}:`, error);
    return null;
  }
}

// Função para obter lista de anos disponíveis para uma instituição
export function getAvailableYears(data: InstitutionalData): number[] {
  // Por enquanto retornamos apenas o ano de referência
  // Em produção, isso poderia consultar histórico de anos
  return [data.ano_referencia, data.ano_referencia - 1];
}

/**
 * Converte nome de instituição para código
 * Ex: "FATEC Votorantim" -> "fatec-votorantim"
 */
export function getInstitutionCode(institutionName: string): string {
  return institutionName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-'); // Substitui espaços por hífens
}

// Função para filtrar projetos por categoria
export function filterProjectsByCategory(data: InstitutionalData, category: string): InstitutionalData['acoes_projetos'] {
  if (category === 'todas') {
    return data.acoes_projetos;
  }

  return data.acoes_projetos.filter(projeto => {
    const projectCategory = projeto.titulo.toLowerCase();
    switch (category) {
      case 'didatico':
        return projectCategory.includes('didático') || projectCategory.includes('ensino') || projectCategory.includes('biblioteca');
      case 'infraestrutura':
        return projectCategory.includes('laboratório') || projectCategory.includes('infraestrutura') || projectCategory.includes('equipamento');
      case 'pesquisa':
        return projectCategory.includes('pesquisa') || projectCategory.includes('ic') || projectCategory.includes('científica');
      case 'extensao':
        return projectCategory.includes('extensão') || projectCategory.includes('comunidade');
      default:
        return true;
    }
  });
}

// Função auxiliar para parsear carga horária (reutilizável)
function parseWorkloadValue(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase().replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Função para calcular estatísticas dos projetos
export function calculateProjectStats(projetos: InstitutionalData['acoes_projetos'], institutionalData: InstitutionalData) {
  if (!projetos || !institutionalData) {
    return {
      totalProjects: 0,
      totalBudget: 0,
      totalWorkload: 0,
      projectsWithoutCost: 0,
      projectsWithBudget: 0,
      averageWorkloadPerProject: '0'
    };
  }

  const totalProjects = projetos.length;
  const totalBudget = projetos.reduce((sum, projeto) => sum + (projeto.custo_estimado || 0), 0);

  // Calcular carga horária total usando função auxiliar
  const totalWorkload = projetos.reduce((sum, projeto) => {
    const equipeWorkload = projeto.equipe.reduce((teamSum, membro) => {
      const carga = parseWorkloadValue(membro.carga_horaria_semanal);
      return teamSum + carga;
    }, 0);
    return sum + equipeWorkload;
  }, 0);

  // Contar projetos sem custo
  const projectsWithoutCost = projetos.filter(p =>
    p.fonte_recursos?.toLowerCase().includes('não haverá custos') ||
    p.custo_estimado === null ||
    p.custo_estimado === 0
  ).length;

  // Contar projetos com orçamento definido
  const projectsWithBudget = projetos.filter(p =>
    p.custo_estimado !== null && p.custo_estimado > 0
  ).length;

  return {
    totalProjects,
    totalBudget,
    totalWorkload,
    projectsWithoutCost,
    projectsWithBudget,
    averageWorkloadPerProject: totalProjects > 0 ? (totalWorkload / totalProjects).toFixed(1) : '0'
  };
}

// Função para processar dados para gráficos
export function processChartData(projetos: InstitutionalData['acoes_projetos'], institutionalData: InstitutionalData) {
  if (!projetos || !institutionalData) {
    return {
      priorityChartData: [],
      categoryChartData: [],
      budgetData: []
    };
  }

  // Distribuição por prioridade
  const priorityData = projetos.reduce((acc, projeto) => {
    const priorityString = projeto.origem_prioridade || "Não definida";
    let priority = "Não definida";
    if (priorityString !== "Não definida") {
      const parts = priorityString.split("-");
      if (parts.length > 1) {
        priority = parts[1].trim();
      } else {
        priority = priorityString;
      }
    }
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityChartData = Object.entries(priorityData).map(([key, value]) => ({
    name: key,
    value: value,
  }));

  // Distribuição por categoria
  const categoryData = projetos.reduce((acc, projeto) => {
    let category = "Outros";
    const titulo = projeto.titulo.toLowerCase();

    if (titulo.includes("didático") || titulo.includes("ensino") || titulo.includes("biblioteca")) {
      category = "Didático-pedagógico";
    } else if (titulo.includes("laboratório") || titulo.includes("infraestrutura")) {
      category = "Infraestrutura";
    } else if (titulo.includes("pesquisa") || titulo.includes("ic")) {
      category = "Pesquisa";
    } else if (titulo.includes("extensão")) {
      category = "Extensão";
    }

    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([key, value]) => ({
    name: key,
    value: value,
  }));

  // Dados de orçamento por projeto
  const budgetData = institutionalData.anexo1_aquisicoes.map(item => ({
    name: item.denominacao.substring(0, 30) + "...",
    value: item.preco_total_estimado,
    quantidade: item.quantidade
  }));

  return {
    priorityChartData,
    categoryChartData,
    budgetData
  };
}

// Função para calcular o resumo da equipe
export function calculateTeamSummary(projetos: InstitutionalData['acoes_projetos']) {
  if (!projetos) return [];
  const teamSummary: Record<string, { workload: number; projects: number }> = {};

  projetos.forEach(projeto => {
    projeto.equipe.forEach(membro => {
      if (membro.nome && membro.nome !== 'nn') {
        const workload = parseWorkloadValue(membro.carga_horaria_semanal);
        if (teamSummary[membro.nome]) {
          teamSummary[membro.nome].workload += workload;
          teamSummary[membro.nome].projects += 1;
        } else {
          teamSummary[membro.nome] = { workload: workload, projects: 1 };
        }
      }
    });
  });

  return Object.entries(teamSummary)
    .map(([name, data]) => ({
      name,
      workload: data.workload,
      projects: data.projects,
    }))
    .sort((a, b) => b.workload - a.workload);
}

// Função para calcular a distribuição por tipo de hora
export function calculateHourTypeDistribution(projetos: InstitutionalData['acoes_projetos']) {
  if (!projetos) return [];
  const hourTypeDistribution: Record<string, number> = {};

  projetos.forEach(projeto => {
    projeto.equipe.forEach(membro => {
      if (membro.tipo_hora && membro.tipo_hora !== 'Escolher um item.') {
        const workload = parseWorkloadValue(membro.carga_horaria_semanal);
        hourTypeDistribution[membro.tipo_hora] = (hourTypeDistribution[membro.tipo_hora] || 0) + workload;
      }
    });
  });

  return Object.entries(hourTypeDistribution).map(([name, value]) => ({
    name,
    value,
  }));
}
