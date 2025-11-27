"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts"
import { Search, Filter, Users, BookOpen, Target, DollarSign, TrendingUp, Building, Clock, AlertCircle, Loader2, LogOut, User, FileText, Hash, RefreshCw, Bell, Info } from "lucide-react"
import {
  InstitutionalData,
  getAvailableInstitutions,
  loadInstitutionData,
  calculateProjectStats,
  processChartData,
  filterProjectsByCategory,
  calculateTeamSummary,
  calculateHourTypeDistribution,
  Institution
} from "@/lib/dataService"
import { useAuth } from "@/lib/authContext"
import { useTab } from "@/lib/tabContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { KPICards } from "@/components/dashboard/KPICards"
import { ChartsSection } from "@/components/dashboard/ChartsSection"
import { TeamSummary } from "@/components/dashboard/TeamSummary"
import { AlertsCenter } from "@/components/dashboard/AlertsCenter"
import { TrendsTab } from "@/components/dashboard/TrendsTab"
import { ProjectsTab } from "@/components/dashboard/ProjectsTab"
import { ProjectsKanban } from "@/components/dashboard/ProjectsKanban"
import { ResourcesTab } from "@/components/dashboard/ResourcesTab"

export default function Dashboard() {
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const { activeTab, setActiveTab } = useTab()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("2025")
  const [selectedCategory, setSelectedCategory] = useState("todas")
  const [selectedInstitution, setSelectedInstitution] = useState("")
  const [institutionalData, setInstitutionalData] = useState<InstitutionalData | null>(null)
  const [availableInstitutions, setAvailableInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState("resumo")
  const [sortConfig, setSortConfig] = useState<{ key: keyof InstitutionalData['acoes_projetos'][0]; direction: string } | null>({ key: 'codigo_acao', direction: 'ascending' });

  const loadData = useCallback(async () => {
    if (!selectedInstitution) return

    // Check if user has access to this institution
    if (user && user.role !== 'admin' && user.accessLevel === 'specific') {
      const allowed = user.allowedInstitutions || []
      if (!allowed.includes(selectedInstitution)) {
        setError("Você não tem permissão para acessar esta instituição")
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const data = await loadInstitutionData(selectedInstitution)
      if (data) {
        setInstitutionalData(data)
        // Verificar se ano_referencia existe antes de converter para string
        if (data.ano_referencia !== undefined && data.ano_referencia !== null) {
          setSelectedYear(data.ano_referencia.toString())
        } else {
          // Usar o ano atual como fallback
          setSelectedYear(new Date().getFullYear().toString())
        }
      } else {
        setError("Não foi possível carregar os dados da instituição")
      }
    } catch (err) {
      setError("Erro ao carregar dados da instituição")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedInstitution, user]);

  // Adicionar useEffect para ouvir atualizações de documentos
  useEffect(() => {
    const handleDocumentsUpdated = () => {
      // Recarregar dados da instituição selecionada
      if (selectedInstitution) {
        loadData();
      }
    };

    window.addEventListener('documentsUpdated', handleDocumentsUpdated);

    return () => {
      window.removeEventListener('documentsUpdated', handleDocumentsUpdated);
    };
  }, [selectedInstitution, loadData]);

  // Carregar lista de instituições disponíveis
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const institutions = await getAvailableInstitutions()

        // FIX 1: Filtra instituições que são nulas/undefined ou não possuem um ID.
        let validInstitutions = institutions.filter(inst => inst && inst.id);

        // Filter by user access
        if (user && user.role !== 'admin' && user.accessLevel === 'specific') {
          const allowed = user.allowedInstitutions || []
          validInstitutions = validInstitutions.filter(inst => allowed.includes(inst.id))
        }

        // FIX 2: Remove duplicatas com base no ID da instituição.
        const uniqueInstitutions = Array.from(new Map(validInstitutions.map(inst => [inst.id, inst])).values());

        setAvailableInstitutions(uniqueInstitutions)

        // Check localStorage for saved selection
        const savedInstitutionId = localStorage.getItem('selectedInstitutionId');

        if (savedInstitutionId && uniqueInstitutions.some(i => i.id === savedInstitutionId)) {
          setSelectedInstitution(savedInstitutionId);
        } else if (uniqueInstitutions.length > 0 && !selectedInstitution) {
          setSelectedInstitution(uniqueInstitutions[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar instituições:', err)
      }
    }

    loadInstitutions()
  }, [user])

  // Read tab from query params
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [searchParams, setActiveTab])

  // Read institution ID from query params
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam && availableInstitutions.length > 0) {
      // Check if user has access to this institution
      if (user && user.role !== 'admin' && user.accessLevel === 'specific') {
        const allowed = user.allowedInstitutions || []
        if (!allowed.includes(idParam)) {
          setError("Você não tem permissão para acessar esta instituição")
          return
        }
      }

      // Check if institution exists in available list
      if (availableInstitutions.some(i => i.id === idParam)) {
        setSelectedInstitution(idParam)
        localStorage.setItem('selectedInstitutionId', idParam)
      }
    }
  }, [searchParams, availableInstitutions, user])

  // Carregar dados da instituição selecionada
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lógica de filtragem e ordenação que depende do estado, mas não são hooks
  const filteredProjects = useMemo(() => {
    if (!institutionalData) return [];

    let projects = filterProjectsByCategory(institutionalData, selectedCategory);

    // Filter by year
    projects = projects.filter(projeto => {
      // Assuming projeto.ano_referencia exists and is a number
      return projeto.periodo_execucao?.data_inicial?.includes(selectedYear) ||
        projeto.periodo_execucao?.data_final?.includes(selectedYear);
    });

    return projects.filter(projeto =>
      projeto.titulo &&
      projeto.titulo !== 'Didático-pedagógico' &&
      (searchTerm === '' || projeto.titulo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [institutionalData, selectedCategory, selectedYear, searchTerm]);

  const sortedProjects = useMemo(() => {
    let sortableItems = [...filteredProjects];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key] || 0;
        const valB = b[sortConfig.key] || 0;
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProjects, sortConfig]);

  const dataQualityStats = useMemo(() => {
    if (!filteredProjects || filteredProjects.length === 0) return { overallScore: 0, projectsWithMissingInfo: [] };

    const total = filteredProjects.length;
    if (total === 0) return { overallScore: 100, projectsWithMissingInfo: [] };

    let totalScore = 0;
    const projectsWithMissingInfo: Array<{ title: string; missing: string[] }> = [];

    filteredProjects.forEach(p => {
      let projectScore = 100;
      const missing: string[] = [];

      if (!p.equipe || p.equipe.length === 0) {
        projectScore -= 25;
        missing.push("Equipe");
      }
      if (!p.custo_estimado && p.custo_estimado !== 0) {
        projectScore -= 25;
        missing.push("Custo");
      }
      if (!p.periodo_execucao || !p.periodo_execucao.data_inicial) {
        projectScore -= 25;
        missing.push("Datas");
      }
      if (!p.o_que_sera_feito || !p.por_que_sera_feito) {
        projectScore -= 25;
        missing.push("Descrição");
      }

      if (missing.length > 0) {
        projectsWithMissingInfo.push({ title: p.titulo, missing });
      }
      totalScore += projectScore;
    });

    return {
      overallScore: Math.round(totalScore / total),
      projectsWithMissingInfo,
    };
  }, [filteredProjects]);

  const evolutionData = useMemo(() => {
    if (!filteredProjects || filteredProjects.length === 0) return [];

    const categories: Record<string, { name: string; budget: number; workload: number; count: number }> = {
      "Didático-Pedagógico": { name: "Didático-Pedagógico", budget: 0, workload: 0, count: 0 },
      "Infraestrutura": { name: "Infraestrutura", budget: 0, workload: 0, count: 0 },
      "Pesquisa": { name: "Pesquisa", budget: 0, workload: 0, count: 0 },
      "Extensão": { name: "Extensão", budget: 0, workload: 0, count: 0 },
      "Outros": { name: "Outros", budget: 0, workload: 0, count: 0 },
    };

    filteredProjects.forEach(p => {
      const title = p.titulo.toLowerCase();
      let categoryKey = "Outros";

      if (title.includes('didático') || title.includes('ensino') || title.includes('biblioteca') || title.includes('pedagógic')) {
        categoryKey = "Didático-Pedagógico";
      } else if (title.includes('laboratório') || title.includes('infraestrutura') || title.includes('equipamento')) {
        categoryKey = "Infraestrutura";
      } else if (title.includes('pesquisa') || title.includes('ic')) {
        categoryKey = "Pesquisa";
      } else if (title.includes('extensão') || title.includes('comunidade')) {
        categoryKey = "Extensão";
      }

      // Corrigir o cálculo da carga horária para lidar com string | number
      const projectWorkload = p.equipe.reduce((acc, member) => {
        const workload = typeof member.carga_horaria_semanal === 'string'
          ? parseInt(member.carga_horaria_semanal) || 0
          : member.carga_horaria_semanal || 0;
        return acc + workload;
      }, 0);

      categories[categoryKey].workload += projectWorkload;
      categories[categoryKey].budget += p.custo_estimado || 0;
      categories[categoryKey].count += 1;
    });

    // Filtra categorias que não possuem projetos para não poluir o gráfico
    return Object.values(categories).filter(c => c.count > 0);
  }, [filteredProjects]);

  const handleLogout = async () => {
    await logout()
  }

  const requestSort = (key: keyof InstitutionalData['acoes_projetos'][0]) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando dados da instituição...</span>
        </div>
      </div>
    )
  }

  if (error || !institutionalData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <span>{error || "Dados não encontrados"}</span>
        </div>
      </div>
    )
  }

  // Calcular estatísticas
  const stats = calculateProjectStats(filteredProjects, institutionalData)
  const chartData = processChartData(filteredProjects, institutionalData)
  const teamSummary = calculateTeamSummary(filteredProjects)
  const hourTypeDistribution = calculateHourTypeDistribution(filteredProjects)
  const top5Busiest = teamSummary.slice(0, 5)
  const workloadAlerts = teamSummary.filter(m => m.workload > 20)

  // Função para obter as funções mais comuns na equipe
  const getTopRoles = (projects: InstitutionalData['acoes_projetos']) => {
    if (!projects) return [] as { name: string; count: number }[]

    const roleCount: Record<string, number> = {}

    projects.forEach(project => {
      project.equipe.forEach(member => {
        const role = member.funcao || 'Não especificado'
        roleCount[role] = (roleCount[role] || 0) + 1
      })
    })

    return Object.entries(roleCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const projectsWithNoTeam = filteredProjects.filter(p => !p.equipe || p.equipe.length === 0);
  const projectsWithNoCost = filteredProjects.filter(p => p.custo_estimado === null || p.custo_estimado === 0);
  const totalAlerts = workloadAlerts.length + projectsWithNoTeam.length + projectsWithNoCost.length;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658"]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">{institutionalData ? institutionalData.identificacao_unidade.nome : "Dashboard PGA"}</h1>
                    {institutionalData && <p className="text-sm text-gray-500">PGA {institutionalData.ano_referencia}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">

                <Button variant="outline" size="icon" onClick={loadData} title="Atualizar Dados">
                  <RefreshCw className="w-4 h-4" />
                </Button>

                <button
                  onClick={() => {
                    setActiveTab("visao-geral");
                    setActiveSubTab("alertas");
                  }}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Ver Alertas"
                >
                  <Bell className="w-5 h-5" />
                  {totalAlerts > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">
                        {totalAlerts}
                      </span>
                    </span>
                  )}
                </button>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{user?.name || 'Usuário'}</span>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-tabs Navigation - Apenas para Visão Geral */}
          {activeTab === "visao-geral" && (
            <div className="border-t border-gray-200 px-6">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="w-full justify-start bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="resumo"
                    className="border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
                  >
                    Resumo
                  </TabsTrigger>
                  <TabsTrigger
                    value="carga_horaria"
                    className="border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
                  >
                    Carga Horária
                  </TabsTrigger>
                  <TabsTrigger
                    value="alertas"
                    className="border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
                  >
                    Alertas
                  </TabsTrigger>
                  <TabsTrigger
                    value="evolucao"
                    className="border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
                  >
                    Evolução
                  </TabsTrigger>
                  <TabsTrigger
                    value="qualidade"
                    className="border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
                  >
                    Qualidade
                  </TabsTrigger>
                  <TabsTrigger
                    value="projetos"
                    className="border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
                  >
                    Projetos
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="px-6 py-6">
          {!selectedInstitution ? (
            <div className="text-center py-20">
              <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800">Bem-vindo ao Dashboard PGA</h2>
              <p className="text-gray-600 mt-2">Selecione uma instituição no menu acima para começar a visualizar os dados.</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="visao-geral" className="space-y-6">
                {/* Page Header - Simplified */}
                <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Plano de Gestão Anual {institutionalData.ano_referencia || 'N/A'}</h2>
                    <p className="text-sm text-gray-500">Análise Abrangente dos Projetos e Recursos</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {institutionalData.identificacao_unidade?.diretor && (
                      <div className="text-right">
                        <span className="font-medium">Diretor:</span> {institutionalData.identificacao_unidade.diretor}
                      </div>
                    )}
                    {institutionalData.metadados_extracao?.data_extracao && (
                      <div className="text-right">
                        <span className="font-medium">Atualizado:</span> {new Date(institutionalData.metadados_extracao.data_extracao).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 inline-flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Online
                    </Badge>
                  </div>
                </div>

                {/* Filters - Compact Version */}
                <div className="flex items-center gap-3 flex-wrap py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Filter className="w-4 h-4" />
                    <span className="font-medium">Filtros:</span>
                  </div>
                  <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInstitutions.map(institution => (
                        <SelectItem key={institution.id} value={institution.id}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!selectedInstitution}>
                    <SelectTrigger className="w-24 h-8 text-sm">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutionalData && institutionalData.ano_referencia !== undefined && institutionalData.ano_referencia !== null && (
                        <>
                          <SelectItem value={institutionalData.ano_referencia.toString()}>{institutionalData.ano_referencia}</SelectItem>
                          <SelectItem value={(institutionalData.ano_referencia - 1).toString()}>{institutionalData.ano_referencia - 1}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!selectedInstitution}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="didatico">Didático-pedagógico</SelectItem>
                      <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                      <SelectItem value="pesquisa">Pesquisa</SelectItem>
                      <SelectItem value="extensao">Extensão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                  <TabsContent value="resumo" className="mt-6 space-y-6">
                    {/* KPI Cards */}
                    <KPICards stats={stats} anoReferencia={institutionalData.ano_referencia} />

                    {/* Charts */}
                    <ChartsSection chartData={chartData} COLORS={COLORS} />

                    {/* Team Summary */}
                    <TeamSummary
                      teamSummary={teamSummary}
                      filteredProjects={filteredProjects}
                      hourTypeDistribution={hourTypeDistribution}
                    />

                    {/* Estatísticas gerais da equipe */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Total de Membros</p>
                          <p className="font-bold text-lg">{teamSummary.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Média de Projetos</p>
                          <p className="font-bold text-lg">
                            {teamSummary.length > 0
                              ? (teamSummary.reduce((acc, curr) => acc + curr.projects, 0) / teamSummary.length).toFixed(1)
                              : '0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Média de Carga Horária</p>
                          <p className="font-bold text-lg">
                            {teamSummary.length > 0
                              ? (teamSummary.reduce((acc, curr) => acc + curr.workload, 0) / teamSummary.length).toFixed(1)
                              : '0'}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Other tabs content would go here */}

                  <TabsContent value="carga_horaria" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Card for Busiest Person */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Profissional Mais Ocupado</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{teamSummary[0]?.name || 'N/A'}</p>
                          <p className="text-gray-500">{teamSummary[0]?.workload || 0}h em {teamSummary[0]?.projects || 0} projetos</p>
                        </CardContent>
                      </Card>
                      {/* Card for Total Workload */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Carga Horária Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{stats.totalWorkload}h</p>
                          <p className="text-gray-500">distribuídas na equipe</p>
                        </CardContent>
                      </Card>
                      {/* Card for Capacity Available */}
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Capacidade Disponível
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-green-600">
                            {Math.max(0, (teamSummary.length * 40) - stats.totalWorkload)}h
                          </p>
                          <p className="text-gray-500">
                            {teamSummary.length} membros × 40h = {teamSummary.length * 40}h total
                          </p>
                        </CardContent>
                      </Card>
                      {/* Card for Alerts */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Alertas de Carga Horária</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{workloadAlerts.length}</p>
                          <p className="text-gray-500">profissionais com mais de 20h/semana</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Bar Chart for Top 5 Busiest */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Top 5 Profissionais Mais Ocupados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={top5Busiest} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="name" width={150} />
                              <RechartsTooltip />
                              <Bar dataKey="workload" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      {/* Pie Chart for Hour Type Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Distribuição por Tipo de Hora</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={hourTypeDistribution} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="name" width={120} />
                              <RechartsTooltip />
                              <Bar dataKey="value" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="alertas" className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Central de Alertas</h2>
                    <AlertsCenter institutionalData={institutionalData} />
                  </TabsContent>
                  <TabsContent value="evolucao" className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Análise de Esforço vs. Custo por Categoria</h2>
                    <Card>
                      <CardHeader>
                        <CardTitle>Carga Horária e Orçamento por Categoria de Projeto</CardTitle>
                        <p className="text-sm text-gray-500 pt-2">
                          Este gráfico compara o total de horas de trabalho semanais com o custo estimado para cada categoria.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Carga Horária (h/sem)', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Custo (R$)', angle: 90, position: 'insideRight' }} tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`} />
                            <RechartsTooltip formatter={(value, name) => {
                              const nameStr = String(name);
                              return nameStr.includes('Custo') ? `R$ ${Number(value).toLocaleString('pt-BR')}` : `${value}h`;
                            }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="workload" fill="#8884d8" name="Carga Horária (h/sem)" />
                            <Bar yAxisId="right" dataKey="budget" fill="#82ca9d" name="Custo Estimado (R$)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="qualidade" className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Painel de Qualidade dos Dados</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-1">
                        <CardHeader>
                          <CardTitle>Pontuação Geral de Qualidade</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center">
                          <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                className="text-gray-200"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                className={dataQualityStats.overallScore > 80 ? "text-green-500" : dataQualityStats.overallScore > 50 ? "text-yellow-500" : "text-red-500"}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={`${dataQualityStats.overallScore}, 100`}
                              />
                            </svg>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold">
                              {dataQualityStats.overallScore}%
                            </div>
                          </div>
                          <p className="mt-4 text-center text-gray-600">Pontuação baseada na completude dos dados dos projetos.</p>
                        </CardContent>
                      </Card>
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle>Projetos com Informações Incompletas ({dataQualityStats.projectsWithMissingInfo.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {dataQualityStats.projectsWithMissingInfo.length > 0 ? (
                              dataQualityStats.projectsWithMissingInfo.map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <span className="font-medium text-sm truncate">{p.title}</span>
                                  <div className="flex items-center gap-2">
                                    {p.missing.map(m => <Badge key={m} variant="outline">{m}</Badge>)}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">Todos os projetos estão com os dados completos.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quality Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Detalhamento da Qualidade por Critério</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Dates Completeness */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Completude de Datas</span>
                              <span className="text-sm font-bold">
                                {Math.round((filteredProjects.filter(p => p.periodo_execucao?.data_inicial && p.periodo_execucao?.data_final).length / Math.max(1, filteredProjects.length)) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.round((filteredProjects.filter(p => p.periodo_execucao?.data_inicial && p.periodo_execucao?.data_final).length / Math.max(1, filteredProjects.length)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Team Completeness */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Completude de Equipe</span>
                              <span className="text-sm font-bold">
                                {Math.round((filteredProjects.filter(p => p.equipe && p.equipe.length > 0).length / Math.max(1, filteredProjects.length)) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${Math.round((filteredProjects.filter(p => p.equipe && p.equipe.length > 0).length / Math.max(1, filteredProjects.length)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Description Completeness */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Completude de Descrição</span>
                              <span className="text-sm font-bold">
                                {Math.round((filteredProjects.filter(p => p.o_que_sera_feito && p.o_que_sera_feito.length > 20).length / Math.max(1, filteredProjects.length)) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${Math.round((filteredProjects.filter(p => p.o_que_sera_feito && p.o_que_sera_feito.length > 20).length / Math.max(1, filteredProjects.length)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Budget Completeness */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Completude de Orçamento</span>
                              <span className="text-sm font-bold">
                                {Math.round((filteredProjects.filter(p => p.custo_estimado && p.custo_estimado > 0).length / Math.max(1, filteredProjects.length)) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-amber-500 h-2 rounded-full"
                                style={{ width: `${Math.round((filteredProjects.filter(p => p.custo_estimado && p.custo_estimado > 0).length / Math.max(1, filteredProjects.length)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="projetos" className="space-y-6">
                    <ProjectsTab projects={filteredProjects} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="detalhes" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Visão Kanban dos Projetos</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Visualize o status dos projetos organizados por fase de execução
                  </p>
                  <ProjectsKanban projects={filteredProjects} />
                </div>
              </TabsContent>

              <TabsContent value="recursos" className="space-y-6">
                <ResourcesTab
                  acquisitions={institutionalData.anexo1_aquisicoes}
                  chartData={chartData}
                />
              </TabsContent>

              <TabsContent value="alertas" className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Central de Alertas</h2>
                <AlertsCenter institutionalData={institutionalData} />
              </TabsContent>

              <TabsContent value="tendencias" className="space-y-6">
                <TrendsTab institutionalData={institutionalData} selectedYear={selectedYear} />
              </TabsContent>

              <TabsContent value="documentos" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Gerenciamento de Documentos</h2>
                  <p className="text-gray-600 mb-6">
                    Faça upload de documentos PDF PGA, processe e salve no banco de dados.
                  </p>

                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Acesse a página de documentos
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Para gerenciar documentos PDF, acesse a página dedicada de gerenciamento.
                    </p>
                    <Button
                      onClick={() => window.location.href = '/documents'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ir para Documentos
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div >
    </ProtectedRoute >
  )
}

