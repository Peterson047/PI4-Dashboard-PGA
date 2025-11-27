import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, DollarSign, Clock, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

interface StatsOverviewProps {
    stats: {
        totalProjects: number
        totalBudget: number
        totalWorkload: number
        averageWorkloadPerProject: string
        institutionCount: number
        criticalAlertsCount?: number
    }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Projects */}
            <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BookOpen className="w-24 h-24 text-blue-600" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Ativo
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total de Projetos</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalProjects}</h3>
                        <p className="text-xs text-gray-500 mt-2">
                            Em {stats.institutionCount} unidades monitoradas
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Budget */}
            <Card className="relative overflow-hidden border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <DollarSign className="w-24 h-24 text-purple-600" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-purple-600" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            Anual
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Orçamento Total</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                            R$ {(stats.totalBudget / 1000000).toFixed(1)}M
                        </h3>
                        <p className="text-xs text-gray-500 mt-2">
                            Investimento previsto consolidado
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Workload */}
            <Card className="relative overflow-hidden border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock className="w-24 h-24 text-green-600" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Clock className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            Semanal
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Carga Horária Total</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                            {stats.totalWorkload.toLocaleString()}h
                        </h3>
                        <p className="text-xs text-gray-500 mt-2">
                            Média de {stats.averageWorkloadPerProject}h por projeto
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Critical Alerts */}
            <Card className="relative overflow-hidden border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="w-24 h-24 text-red-600" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
                            Atenção
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Alertas Críticos</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">
                            {stats.criticalAlertsCount || 0}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2">
                            Requerem ação imediata
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
