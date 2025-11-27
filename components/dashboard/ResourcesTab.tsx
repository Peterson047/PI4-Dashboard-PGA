import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts"
import { Search, ShoppingCart, DollarSign, TrendingUp } from "lucide-react"

interface ResourcesTabProps {
    acquisitions: any[];
    chartData: any;
}

export function ResourcesTab({ acquisitions, chartData }: ResourcesTabProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [projectFilter, setProjectFilter] = useState("todos")
    const [sortBy, setSortBy] = useState("price-desc")

    // Calculate summary stats
    const stats = useMemo(() => {
        const total = acquisitions.length
        const totalValue = acquisitions.reduce((acc, item) => acc + (item.preco_total_estimado || 0), 0)
        const maxValue = Math.max(...acquisitions.map(i => i.preco_total_estimado || 0))

        return { total, totalValue, maxValue }
    }, [acquisitions])

    // Get unique projects
    const uniqueProjects = useMemo(() => {
        const projects = new Set(acquisitions.map(a => a.projeto_referencia).filter(Boolean))
        return Array.from(projects).sort()
    }, [acquisitions])

    // Filter and sort acquisitions
    const filteredAcquisitions = useMemo(() => {
        let filtered = acquisitions.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.denominacao?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesProject = projectFilter === 'todos' ||
                item.projeto_referencia === projectFilter

            return matchesSearch && matchesProject
        })

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-desc':
                    return (b.preco_total_estimado || 0) - (a.preco_total_estimado || 0)
                case 'price-asc':
                    return (a.preco_total_estimado || 0) - (b.preco_total_estimado || 0)
                case 'name-asc':
                    return (a.denominacao || '').localeCompare(b.denominacao || '')
                case 'name-desc':
                    return (b.denominacao || '').localeCompare(a.denominacao || '')
                default:
                    return 0
            }
        })

        return filtered
    }, [acquisitions, searchTerm, projectFilter, sortBy])

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Alocação de Recursos</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Total de Aquisições
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                        <p className="text-xs text-gray-500 mt-1">Itens planejados</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Valor Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">
                            R$ {(stats.totalValue / 1000).toFixed(0)}k
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Investimento estimado</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Maior Aquisição
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">
                            R$ {(stats.maxValue / 1000).toFixed(0)}k
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Item mais caro</p>
                    </CardContent>
                </Card>
            </div>

            {/* Budget Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>💰 Distribuição Orçamentária</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.budgetData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Valor']} />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por denominação..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full md:w-[250px]">
                        <SelectValue placeholder="Filtrar por projeto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos os projetos</SelectItem>
                        {uniqueProjects.map(project => (
                            <SelectItem key={project} value={project}>{project}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="price-desc">Maior preço</SelectItem>
                        <SelectItem value="price-asc">Menor preço</SelectItem>
                        <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-600">
                Mostrando {filteredAcquisitions.length} de {acquisitions.length} aquisições
            </div>

            {/* Acquisitions List */}
            <div className="grid gap-4">
                {filteredAcquisitions.length > 0 ? (
                    filteredAcquisitions.map((item, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{item.denominacao}</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Projeto: <span className="font-medium">{item.projeto_referencia}</span>
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Quantidade: <span className="font-medium">{item.quantidade}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-green-600">
                                            R$ {item.preco_total_estimado?.toLocaleString("pt-BR")}
                                        </div>
                                        <p className="text-sm text-gray-500">Preço total estimado</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <p className="text-gray-500">Nenhuma aquisição encontrada com os filtros aplicados.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
