"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/lib/authContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts"
import { BookOpen, DollarSign, Users, Clock, Info, PieChart, Loader2, AlertCircle, Building, Download, ArrowRightLeft, ExternalLink, TrendingUp, AlertTriangle } from "lucide-react"
import {
    InstitutionalData,
    getAvailableInstitutions,
    loadInstitutionData,
    calculateProjectStats,
    Institution
} from "@/lib/dataService"
import ProtectedRoute from "@/components/ProtectedRoute"
import { AlertsCenter } from "@/components/dashboard/AlertsCenter"
import { StatsOverview } from "@/components/dashboard/StatsOverview"
import { NetworkCharts } from "@/components/dashboard/NetworkCharts"

export default function AggregatedDashboard() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedYear, setSelectedYear] = useState<string>("2025")
    const [availableYears, setAvailableYears] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState("visao-geral")

    // Comparison state
    const [unitA, setUnitA] = useState<string>("")
    const [unitB, setUnitB] = useState<string>("")

    const [allInstitutionsData, setAllInstitutionsData] = useState<InstitutionalData[]>([])
    const [aggregatedStats, setAggregatedStats] = useState({
        totalProjects: 0,
        totalBudget: 0,
        totalWorkload: 0,
        averageWorkloadPerProject: "0",
        projectsWithoutCost: 0,
        projectsWithBudget: 0,
        institutionCount: 0,
        criticalAlertsCount: 0
    })
    const [institutionsStats, setInstitutionsStats] = useState<{ name: string, id: string, stats: any }[]>([])

    useEffect(() => {
        const loadAllData = async () => {
            if (authLoading) return

            setLoading(true)
            setError(null)
            try {
                const institutions = await getAvailableInstitutions()
                let validInstitutions = institutions.filter(inst => inst && inst.id)

                // Filter by user access
                if (user && user.role !== 'admin' && user.accessLevel === 'specific') {
                    const allowed = user.allowedInstitutions || []
                    validInstitutions = validInstitutions.filter(inst => allowed.includes(inst.id))
                }

                const uniqueInstitutions = Array.from(new Map(validInstitutions.map(inst => [inst.id, inst])).values())

                const promises = uniqueInstitutions.map(inst => loadInstitutionData(inst.id))
                const results = await Promise.all(promises)

                const validResults = results.filter((data): data is InstitutionalData => data !== null)
                setAllInstitutionsData(validResults)

                // Extract available years
                const years = Array.from(new Set(validResults.map(d => d.ano_referencia.toString()))).sort().reverse()
                setAvailableYears(years)
                if (years.length > 0 && !years.includes(selectedYear)) {
                    setSelectedYear(years[0])
                }

            } catch (err) {
                console.error("Erro ao carregar dados agregados:", err)
                setError("Não foi possível carregar os dados agregados.")
            } finally {
                setLoading(false)
            }
        }

        loadAllData()
    }, [authLoading, user])

    // Recalculate stats when year or data changes
    useEffect(() => {
        if (allInstitutionsData.length === 0) return

        const filteredData = allInstitutionsData.filter(d => d.ano_referencia.toString() === selectedYear)

        let totalProjects = 0
        let totalBudget = 0
        let totalWorkload = 0
        let projectsWithoutCost = 0
        let projectsWithBudget = 0

        const instStats = filteredData.map(data => {
            const stats = calculateProjectStats(data.acoes_projetos, data)

            totalProjects += stats.totalProjects
            totalBudget += stats.totalBudget
            totalWorkload += stats.totalWorkload
            projectsWithoutCost += stats.projectsWithoutCost
            projectsWithBudget += stats.projectsWithBudget

            return {
                name: data.identificacao_unidade.nome,
                id: data.identificacao_unidade.codigo, // Assuming code is unique enough or use _id
                stats
            }
        })

        setAggregatedStats({
            totalProjects,
            totalBudget,
            totalWorkload,
            averageWorkloadPerProject: totalProjects > 0 ? (totalWorkload / totalProjects).toFixed(1) : "0",
            projectsWithoutCost,
            projectsWithBudget,
            institutionCount: filteredData.length,
            criticalAlertsCount: projectsWithoutCost // Using projects without cost as a proxy for critical alerts
        })

        setInstitutionsStats(instStats)
    }, [allInstitutionsData, selectedYear])

    const chartData = useMemo(() => {
        return institutionsStats.map(inst => ({
            name: inst.name.replace("Fatec ", ""),
            id: inst.id,
            projects: inst.stats.totalProjects,
            budget: inst.stats.totalBudget,
            workload: inst.stats.totalWorkload
        })).sort((a, b) => b.projects - a.projects)
    }, [institutionsStats])

    const handleInstitutionClick = (id: string) => {
        router.push(`/institution?id=${id}&tab=resumo`)
    }

    const handleExportCSV = () => {
        const headers = ["Unidade", "Total Projetos", "Orçamento Total", "Carga Horária Total", "Média CH/Projeto"]
        const rows = institutionsStats.map(inst => [
            inst.name,
            inst.stats.totalProjects,
            inst.stats.totalBudget,
            inst.stats.totalWorkload,
            inst.stats.averageWorkloadPerProject
        ])

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `pga_agregado_${selectedYear}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const getComparisonData = () => {
        if (!unitA || !unitB) return null

        const dataA = institutionsStats.find(i => i.name === unitA)
        const dataB = institutionsStats.find(i => i.name === unitB)

        if (!dataA || !dataB) return null

        return { unitA: dataA, unitB: dataB }
    }

    const comparisonData = getComparisonData()

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Carregando dados agregados...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-6 h-6" />
                    <span>{error}</span>
                </div>
            </div>
        )
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50/50">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                                <PieChart className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Visão Agregada</h1>
                                <p className="text-xs text-gray-500 font-medium">
                                    Consolidado de {aggregatedStats.institutionCount} Instituições
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
                                <Button
                                    variant={activeTab === "visao-geral" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setActiveTab("visao-geral")}
                                    className={activeTab === "visao-geral" ? "shadow-sm bg-white" : ""}
                                >
                                    Dashboard
                                </Button>
                                <Button
                                    variant={activeTab === "inteligencia" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setActiveTab("inteligencia")}
                                    className={activeTab === "inteligencia" ? "shadow-sm bg-white" : ""}
                                >
                                    Inteligência
                                </Button>
                            </div>

                            <div className="h-6 w-px bg-gray-200 mx-2" />

                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-[100px] h-9 bg-white border-gray-200">
                                    <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9">
                                <Download className="w-4 h-4 mr-2" />
                                CSV
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                    {activeTab === "visao-geral" ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Stats Overview */}
                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Indicadores Chave
                                </h2>
                                <StatsOverview stats={aggregatedStats} />
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Main Content - Charts */}
                                <div className="lg:col-span-2 space-y-8">
                                    <section>
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <PieChart className="w-5 h-5 text-blue-600" />
                                            Distribuição da Rede
                                        </h2>
                                        <NetworkCharts
                                            chartData={chartData}
                                            onInstitutionClick={handleInstitutionClick}
                                        />
                                    </section>
                                </div>

                                {/* Sidebar - Insights */}
                                <div className="space-y-8">
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                Alertas Recentes
                                            </h2>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                Prioridade Alta
                                            </Badge>
                                        </div>

                                        <Card className="border-l-4 border-l-amber-500 shadow-sm">
                                            <CardHeader className="pb-3 bg-amber-50/50">
                                                <CardTitle className="text-sm font-medium text-amber-900">
                                                    Atenção Necessária
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                                                <div className="divide-y divide-gray-100">
                                                    {allInstitutionsData
                                                        .filter(d => d.ano_referencia.toString() === selectedYear)
                                                        .slice(0, 5) // Show top 5 institutions with alerts
                                                        .map((institutionData, idx) => (
                                                            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                                        {institutionData.identificacao_unidade.nome}
                                                                    </h3>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => handleInstitutionClick(institutionData.identificacao_unidade.codigo)}
                                                                    >
                                                                        <ExternalLink className="w-3 h-3 text-gray-400" />
                                                                    </Button>
                                                                </div>
                                                                {/* Simplified Alerts Display */}
                                                                <div className="space-y-2">
                                                                    {calculateProjectStats(institutionData.acoes_projetos, institutionData).projectsWithoutCost > 0 && (
                                                                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                            <AlertCircle className="w-3 h-3" />
                                                                            <span>{calculateProjectStats(institutionData.acoes_projetos, institutionData).projectsWithoutCost} projetos sem orçamento</span>
                                                                        </div>
                                                                    )}
                                                                    {/* Add more alert types here if needed */}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </section>

                                    <section>
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <Building className="w-5 h-5 text-blue-600" />
                                            Top Unidades (Orçamento)
                                        </h2>
                                        <Card className="shadow-sm">
                                            <CardContent className="p-0">
                                                <div className="divide-y divide-gray-100">
                                                    {institutionsStats
                                                        .sort((a, b) => b.stats.totalBudget - a.stats.totalBudget)
                                                        .slice(0, 5)
                                                        .map((inst, i) => (
                                                            <div
                                                                key={inst.id}
                                                                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                                                                onClick={() => handleInstitutionClick(inst.id)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`
                                                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                                                        ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                            i === 1 ? 'bg-gray-100 text-gray-700' :
                                                                                i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}
                                                                    `}>
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                                                                        {inst.name.replace("Fatec ", "")}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-semibold text-gray-900">
                                                                    R$ {(inst.stats.totalBudget / 1000).toFixed(0)}k
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </section>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Top Projects by Budget */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="w-5 h-5 text-purple-600" />
                                            Top 5 Projetos (Maior Orçamento)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {allInstitutionsData
                                                .filter(d => d.ano_referencia.toString() === selectedYear)
                                                .flatMap(inst => inst.acoes_projetos.map(proj => ({
                                                    ...proj,
                                                    institutionName: inst.identificacao_unidade.nome
                                                })))
                                                .sort((a, b) => (b.custo_estimado || 0) - (a.custo_estimado || 0))
                                                .slice(0, 5)
                                                .map((proj, i) => (
                                                    <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900 line-clamp-1">{proj.titulo}</p>
                                                            <p className="text-xs text-gray-500">{proj.institutionName}</p>
                                                        </div>
                                                        <span className="font-bold text-sm text-purple-700 whitespace-nowrap">
                                                            R$ {((proj.custo_estimado || 0) / 1000).toFixed(1)}k
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Top Projects by Workload */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-green-600" />
                                            Top 5 Projetos (Maior Carga Horária)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {allInstitutionsData
                                                .filter(d => d.ano_referencia.toString() === selectedYear)
                                                .flatMap(inst => inst.acoes_projetos.map(proj => ({
                                                    ...proj,
                                                    institutionName: inst.identificacao_unidade.nome,
                                                    totalWorkload: proj.equipe.reduce((sum, m) => sum + (typeof m.carga_horaria_semanal === 'number' ? m.carga_horaria_semanal : parseFloat(m.carga_horaria_semanal.toString().replace(',', '.') || '0')), 0)
                                                })))
                                                .sort((a, b) => b.totalWorkload - a.totalWorkload)
                                                .slice(0, 5)
                                                .map((proj, i) => (
                                                    <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900 line-clamp-1">{proj.titulo}</p>
                                                            <p className="text-xs text-gray-500">{proj.institutionName}</p>
                                                        </div>
                                                        <span className="font-bold text-sm text-green-700 whitespace-nowrap">
                                                            {proj.totalWorkload.toFixed(1)}h
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </ProtectedRoute>
    )
}
