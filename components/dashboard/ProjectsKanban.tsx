import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Calendar, Users, DollarSign, Clock, AlertCircle } from "lucide-react"

interface ProjectsKanbanProps {
    projects: any[];
}

export function ProjectsKanban({ projects }: ProjectsKanbanProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("todas")
    const [selectedProject, setSelectedProject] = useState<any | null>(null)

    // Infer project status from dates
    const getProjectStatus = (project: any) => {
        const now = new Date()
        const startDate = project.periodo_execucao?.data_inicial
            ? new Date(project.periodo_execucao.data_inicial.split('/').reverse().join('-'))
            : null
        const endDate = project.periodo_execucao?.data_final
            ? new Date(project.periodo_execucao.data_final.split('/').reverse().join('-'))
            : null

        if (!startDate || !endDate) return 'sem-datas'
        if (now < startDate) return 'planejado'
        if (now > endDate) return 'concluido'
        return 'em-andamento'
    }

    // Filter projects
    const filteredProjects = projects.filter(p => {
        const matchesSearch = searchTerm === '' ||
            p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo_acao?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCategory = categoryFilter === 'todas' || p.categoria === categoryFilter

        return matchesSearch && matchesCategory
    })

    // Group by status
    const projectsByStatus = {
        'planejado': filteredProjects.filter(p => getProjectStatus(p) === 'planejado'),
        'em-andamento': filteredProjects.filter(p => getProjectStatus(p) === 'em-andamento'),
        'concluido': filteredProjects.filter(p => getProjectStatus(p) === 'concluido'),
        'sem-datas': filteredProjects.filter(p => getProjectStatus(p) === 'sem-datas'),
    }

    const columns = [
        { id: 'planejado', title: 'Planejado', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-700', icon: Calendar },
        { id: 'em-andamento', title: 'Em Andamento', color: 'bg-green-100 border-green-300', textColor: 'text-green-700', icon: Clock },
        { id: 'concluido', title: 'Concluído', color: 'bg-gray-100 border-gray-300', textColor: 'text-gray-700', icon: Users },
        { id: 'sem-datas', title: 'Sem Datas', color: 'bg-amber-100 border-amber-300', textColor: 'text-amber-700', icon: AlertCircle },
    ]

    const ProjectCard = ({ project }: { project: any }) => {
        const workload = project.equipe?.reduce((acc: number, member: any) => {
            const hours = typeof member.carga_horaria_semanal === 'string'
                ? parseInt(member.carga_horaria_semanal) || 0
                : member.carga_horaria_semanal || 0
            return acc + hours
        }, 0) || 0

        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow mb-3">
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-sm line-clamp-2">{project.titulo}</h4>
                                    <Badge variant="outline" className="text-[10px] shrink-0">{project.codigo_acao}</Badge>
                                </div>

                                {project.origem_prioridade && (
                                    <Badge variant="secondary" className="text-[10px]">
                                        {project.origem_prioridade.split('-')[0]}
                                    </Badge>
                                )}

                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    {project.equipe?.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            <span>{project.equipe.length}</span>
                                        </div>
                                    )}
                                    {workload > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{workload}h</span>
                                        </div>
                                    )}
                                    {project.custo_estimado && (
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            <span>R$ {(project.custo_estimado / 1000).toFixed(0)}k</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{project.titulo}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Badge variant="outline">{project.codigo_acao}</Badge>
                            {project.origem_prioridade && (
                                <Badge variant="secondary">{project.origem_prioridade}</Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">O que será feito:</h4>
                                <p className="text-sm text-gray-600">{project.o_que_sera_feito || 'Não especificado'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Por que será feito:</h4>
                                <p className="text-sm text-gray-600">{project.por_que_sera_feito || 'Não especificado'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Fonte de recursos:</h4>
                                <p className="text-sm text-gray-600">{project.fonte_recursos || 'Não especificado'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Período de execução:</h4>
                                <p className="text-sm text-gray-600">
                                    {project.periodo_execucao?.data_inicial && project.periodo_execucao?.data_final
                                        ? `${project.periodo_execucao.data_inicial} - ${project.periodo_execucao.data_final}`
                                        : 'Não especificado'}
                                </p>
                            </div>
                        </div>

                        {project.equipe?.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Equipe:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.equipe.map((membro: any, idx: number) => (
                                        <Badge key={idx} variant="secondary">
                                            {membro.nome} ({membro.funcao})
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {project.etapas_processo?.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Etapas do Processo:</h4>
                                <div className="space-y-2">
                                    {project.etapas_processo.map((etapa: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-sm">{etapa.descricao}</span>
                                            <span className="text-xs text-gray-500">{etapa.inicio} - {etapa.fim}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por título ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
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

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {columns.map(column => {
                    const Icon = column.icon
                    const projectsInColumn = projectsByStatus[column.id as keyof typeof projectsByStatus]

                    return (
                        <div key={column.id} className="flex flex-col">
                            <div className={`${column.color} border-2 rounded-t-lg p-3 flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${column.textColor}`} />
                                    <h3 className={`font-semibold text-sm ${column.textColor}`}>{column.title}</h3>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {projectsInColumn.length}
                                </Badge>
                            </div>
                            <div className="bg-gray-50 border-2 border-t-0 border-gray-200 rounded-b-lg p-3 min-h-[400px] max-h-[600px] overflow-y-auto">
                                {projectsInColumn.length > 0 ? (
                                    projectsInColumn.map((project, idx) => (
                                        <ProjectCard key={idx} project={project} />
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Nenhum projeto
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
