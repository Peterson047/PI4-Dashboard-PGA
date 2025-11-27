import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Download, Eye, Filter, Calendar, User, DollarSign, CheckCircle2 } from "lucide-react"
import { InstitutionalData } from "@/lib/dataService"

interface ProjectsTabProps {
    projects: InstitutionalData['acoes_projetos'];
}

export function ProjectsTab({ projects }: ProjectsTabProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("todos")
    const [priorityFilter, setPriorityFilter] = useState("todas")

    // Extract unique priorities
    const priorities = useMemo(() => {
        const unique = new Set<string>()
        projects.forEach(p => {
            if (p.origem_prioridade) {
                const priority = p.origem_prioridade.split("-")[1]?.trim() || p.origem_prioridade
                unique.add(priority)
            }
        })
        return Array.from(unique).sort()
    }, [projects])

    // Filter projects
    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const matchesSearch = (
                project.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.codigo_acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.o_que_sera_feito && project.o_que_sera_feito.toLowerCase().includes(searchTerm.toLowerCase()))
            )

            const matchesPriority = priorityFilter === "todas" ||
                (project.origem_prioridade && project.origem_prioridade.includes(priorityFilter))

            // Mock status logic since it's not in the data model explicitly
            // Assuming projects with budget are "Em andamento" and others "Planejado" for demo
            const status = project.custo_estimado && project.custo_estimado > 0 ? "em_andamento" : "planejado"
            const matchesStatus = statusFilter === "todos" || status === statusFilter

            return matchesSearch && matchesPriority && matchesStatus
        })
    }, [projects, searchTerm, priorityFilter, statusFilter])

    const handleExportCSV = () => {
        const headers = ["Código", "Título", "Prioridade", "Custo Estimado", "Início", "Fim", "Equipe (Qtd)"]
        const rows = filteredProjects.map(p => [
            p.codigo_acao,
            `"${p.titulo.replace(/"/g, '""')}"`, // Escape quotes
            p.origem_prioridade || "N/A",
            p.custo_estimado || 0,
            p.periodo_execucao.data_inicial || "",
            p.periodo_execucao.data_final || "",
            p.equipe.length
        ])

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", "projetos_pga.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Detalhes dos Projetos</h2>
                    <p className="text-sm text-gray-500">Gerencie e visualize todos os projetos do PGA</p>
                </div>
                <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Buscar por título, código ou descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                    <SelectValue placeholder="Filtrar por Prioridade" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas as Prioridades</SelectItem>
                                {priorities.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                                    <SelectValue placeholder="Status (Simulado)" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Status</SelectItem>
                                <SelectItem value="em_andamento">Com Orçamento (Em Andamento)</SelectItem>
                                <SelectItem value="planejado">Sem Custo (Planejado)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Projects Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Código</TableHead>
                                    <TableHead>Título do Projeto</TableHead>
                                    <TableHead>Prioridade</TableHead>
                                    <TableHead>Período</TableHead>
                                    <TableHead className="text-right">Orçamento</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProjects.map((projeto) => (
                                    <TableRow key={projeto.codigo_acao}>
                                        <TableCell className="font-medium">{projeto.codigo_acao}</TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <div className="truncate font-medium" title={projeto.titulo}>
                                                {projeto.titulo}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[300px]">
                                                {projeto.o_que_sera_feito || "Sem descrição"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {projeto.origem_prioridade ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    {projeto.origem_prioridade.split("-")[1]?.trim() || projeto.origem_prioridade}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-600">
                                            {projeto.periodo_execucao.data_inicial && projeto.periodo_execucao.data_final ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(projeto.periodo_execucao.data_inicial).toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-gray-400">até</span>
                                                    <span>{new Date(projeto.periodo_execucao.data_final).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            ) : (
                                                "Não definido"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {projeto.custo_estimado ? (
                                                `R$ ${projeto.custo_estimado.toLocaleString('pt-BR')}`
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2 text-xl">
                                                            <Badge variant="outline">{projeto.codigo_acao}</Badge>
                                                            {projeto.titulo}
                                                        </DialogTitle>
                                                    </DialogHeader>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                                                                    <CheckCircle2 className="w-4 h-4" /> O que será feito
                                                                </h4>
                                                                <p className="text-sm mt-1">{projeto.o_que_sera_feito || "Não especificado"}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                                                                    <CheckCircle2 className="w-4 h-4" /> Por que será feito
                                                                </h4>
                                                                <p className="text-sm mt-1">{projeto.por_que_sera_feito || "Não especificado"}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                                                                    <DollarSign className="w-4 h-4" /> Fonte de Recursos
                                                                </h4>
                                                                <p className="text-sm mt-1">{projeto.fonte_recursos || "Não especificado"}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-2">
                                                                    <Calendar className="w-4 h-4" /> Período
                                                                </h4>
                                                                <p className="text-sm mt-1">
                                                                    {projeto.periodo_execucao.data_inicial && projeto.periodo_execucao.data_final
                                                                        ? `${new Date(projeto.periodo_execucao.data_inicial).toLocaleDateString("pt-BR")} - ${new Date(projeto.periodo_execucao.data_final).toLocaleDateString("pt-BR")}`
                                                                        : 'Não especificado'
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {projeto.equipe.length > 0 && (
                                                        <div className="mt-6 pt-6 border-t">
                                                            <h4 className="font-semibold text-sm text-gray-500 mb-3 flex items-center gap-2">
                                                                <User className="w-4 h-4" /> Equipe do Projeto
                                                            </h4>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {projeto.equipe.map((membro, idx) => (
                                                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border text-sm">
                                                                        <p className="font-medium text-gray-900">{membro.nome}</p>
                                                                        <p className="text-gray-500 text-xs">{membro.funcao}</p>
                                                                        <div className="mt-2 flex items-center justify-between text-xs">
                                                                            <Badge variant="outline" className="bg-white">
                                                                                {membro.carga_horaria_semanal}h/sem
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {projeto.etapas_processo && projeto.etapas_processo.length > 0 && (
                                                        <div className="mt-6 pt-6 border-t">
                                                            <h4 className="font-semibold text-sm text-gray-500 mb-3">Etapas do Processo</h4>
                                                            <div className="space-y-2">
                                                                {projeto.etapas_processo.map((etapa, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                                                        <span className="text-sm">{etapa.descricao}</span>
                                                                        <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border">
                                                                            {etapa.inicio} - {etapa.fim}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredProjects.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                            Nenhum projeto encontrado com os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="text-sm text-gray-500 text-right">
                Total de {filteredProjects.length} projetos listados
            </div>
        </div>
    )
}
