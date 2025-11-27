import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { BookOpen, DollarSign, Users, Clock, Info, AlertCircle } from "lucide-react"

interface KPICardsProps {
    stats: {
        totalProjects: number;
        totalBudget: number;
        totalWorkload: number;
        projectsWithoutCost: number;
        projectsWithBudget: number;
        averageWorkloadPerProject: string;
    };
    anoReferencia: number;
}

export function KPICards({ stats, anoReferencia }: KPICardsProps) {
    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">Total de Projetos</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Total de projetos cadastrados no Plano de Gestão Anual deste período</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-gray-900">{stats.totalProjects}</span>
                            <BookOpen className="w-8 h-8 text-blue-500 opacity-80" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Plano de Gestão Anual {anoReferencia || 'N/A'}</p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${stats.totalWorkload === 0 ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-green-500'} hover:shadow-md transition-shadow`}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">CH/sem Total Alocada</CardTitle>
                            <div className="flex items-center gap-1">
                                {stats.totalWorkload === 0 && (
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">
                                            {stats.totalWorkload === 0
                                                ? 'Carga horária semanal total alocada nos projetos. Valor zerado pode indicar falta de dados de equipe.'
                                                : 'Soma de todas as horas semanais alocadas nos projetos do PGA'}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-3xl font-bold text-gray-900">{stats.totalWorkload}h</span>
                                {stats.totalWorkload === 0 && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                        Sem dados
                                    </Badge>
                                )}
                            </div>
                            <Clock className={`w-8 h-8 ${stats.totalWorkload === 0 ? 'text-yellow-500' : 'text-green-500'} opacity-80`} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Horas semanais totais alocadas</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">Status Orçamentário</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">Valor total estimado para os projetos com orçamento definido</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-gray-900">R$ {(stats.totalBudget / 1000000).toFixed(1)}M</span>
                            <DollarSign className="w-8 h-8 text-purple-500 opacity-80" />
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className={`px-2 py-0.5 rounded ${stats.projectsWithoutCost > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                {stats.projectsWithoutCost} sem custos
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                                {stats.projectsWithBudget} definidos
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${parseFloat(stats.averageWorkloadPerProject) === 0 ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-orange-500'} hover:shadow-md transition-shadow`}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">Média por Projeto</CardTitle>
                            <div className="flex items-center gap-1">
                                {parseFloat(stats.averageWorkloadPerProject) === 0 && (
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">
                                            {parseFloat(stats.averageWorkloadPerProject) === 0
                                                ? 'Carga horária média semanal por projeto. Valor zerado indica falta de dados de equipe.'
                                                : 'Média de horas semanais alocadas por projeto no PGA'}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-3xl font-bold text-gray-900">{stats.averageWorkloadPerProject}h</span>
                                {parseFloat(stats.averageWorkloadPerProject) === 0 && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                        Sem dados
                                    </Badge>
                                )}
                            </div>
                            <Users className={`w-8 h-8 ${parseFloat(stats.averageWorkloadPerProject) === 0 ? 'text-yellow-500' : 'text-orange-500'} opacity-80`} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Carga horária média semanal</p>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    )
}
