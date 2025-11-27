import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, AlertCircle, User, Grid, List } from "lucide-react"

interface TeamSummaryProps {
    teamSummary: {
        name: string;
        workload: number;
        projects: number;
    }[];
    filteredProjects: any[];
    hourTypeDistribution: { name: string; value: number }[];
}

export function TeamSummary({ teamSummary, filteredProjects, hourTypeDistribution }: TeamSummaryProps) {
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list')

    // Função para obter as funções mais comuns na equipe
    const getTopRoles = (projects: any[]) => {
        if (!projects) return [] as { name: string; count: number }[]

        const roleCount: Record<string, number> = {}

        projects.forEach(project => {
            project.equipe.forEach((member: any) => {
                const role = member.funcao || 'Não especificado'
                roleCount[role] = (roleCount[role] || 0) + 1
            })
        })

        return Object.entries(roleCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
    }

    // Prepare Matrix Data
    const matrixData = teamSummary.map(member => {
        const memberProjects = filteredProjects.filter(p =>
            p.equipe.some((e: any) => e.nome === member.name)
        ).map(p => ({
            title: p.titulo,
            code: p.codigo_acao,
            workload: p.equipe.find((e: any) => e.nome === member.name)?.carga_horaria_semanal || '0h'
        }));
        return { ...member, memberProjects };
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="w-5 h-5" />
                                <span>Resumo da Equipe</span>
                            </CardTitle>
                            <p className="text-sm text-gray-500">Distribuição de carga horária por membro da equipe</p>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
                            >
                                <List className="w-4 h-4 mr-2" /> Lista
                            </Button>
                            <Button
                                variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('matrix')}
                                className={viewMode === 'matrix' ? 'bg-white shadow-sm' : ''}
                            >
                                <Grid className="w-4 h-4 mr-2" /> Matriz
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {viewMode === 'list' ? (
                        <div className="space-y-4">
                            {teamSummary.map((member, index) => {
                                // Calcular porcentagem em relação a 40h em vez do membro mais ocupado
                                const percentage = Math.round((member.workload / 40) * 100);
                                const isHighWorkload = member.workload > 20;

                                return (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isHighWorkload ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    <span className="font-medium text-sm">
                                                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{member.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {member.projects} {member.projects === 1 ? 'projeto' : 'projetos'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${isHighWorkload ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {member.workload}h
                                                </p>
                                                <p className="text-xs text-gray-500">{percentage}% da jornada</p>
                                            </div>
                                        </div>

                                        {/* Barra de progresso mais detalhada */}
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                            <div
                                                className={`h-2 rounded-full ${isHighWorkload ? 'bg-red-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            ></div>
                                        </div>

                                        {/* Indicador visual de carga horária */}
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center space-x-1">
                                                {isHighWorkload && (
                                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                                )}
                                                <span className={isHighWorkload ? 'text-red-600' : 'text-gray-500'}>
                                                    {isHighWorkload ? 'Carga elevada' : 'Carga normal'}
                                                </span>
                                            </div>
                                            <span className="text-gray-400">
                                                {member.workload > 0 ?
                                                    `${percentage}% utilizado` :
                                                    'Sem alocação'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {teamSummary.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                    <p>Nenhum membro da equipe encontrado</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Membro</TableHead>
                                        <TableHead>Projetos Alocados</TableHead>
                                        <TableHead className="text-right">Total Horas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {matrixData.map((member, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium align-top">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                    </div>
                                                    {member.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {member.memberProjects.map((p, pIdx) => (
                                                        <div key={pIdx} className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded border border-blue-100 text-xs">
                                                            <span className="font-semibold text-blue-700">{p.code}</span>
                                                            <span className="text-gray-600 truncate max-w-[150px]" title={p.title}>{p.title}</span>
                                                            <Badge variant="secondary" className="h-5 px-1 text-[10px]">{p.workload}</Badge>
                                                        </div>
                                                    ))}
                                                    {member.memberProjects.length === 0 && (
                                                        <span className="text-gray-400 text-sm italic">Nenhum projeto vinculado</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold align-top">
                                                {member.workload}h
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Novo card com informações detalhadas da equipe */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <User className="w-5 h-5" />
                        <span>Detalhes da Equipe</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500">Funções e tipos de hora dos membros</p>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Funções mais comuns */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-sm mb-2 text-gray-700">Funções Principais</h4>
                            <div className="space-y-2">
                                {getTopRoles(filteredProjects).map((role, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm">{role.name}</span>
                                        <Badge variant="secondary">{role.count}</Badge>
                                    </div>
                                ))}
                                {getTopRoles(filteredProjects).length === 0 && (
                                    <p className="text-xs text-gray-500">Nenhuma função encontrada</p>
                                )}
                            </div>
                        </div>

                        {/* Tipos de hora */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-sm mb-2 text-gray-700">Tipos de Hora</h4>
                            <div className="space-y-2">
                                {hourTypeDistribution.slice(0, 5).map((type, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm">{type.name}</span>
                                        <Badge variant="outline">{type.value}h</Badge>
                                    </div>
                                ))}
                                {hourTypeDistribution.length === 0 && (
                                    <p className="text-xs text-gray-500">Nenhum tipo de hora encontrado</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
