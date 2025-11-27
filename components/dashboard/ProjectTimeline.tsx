import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowRight } from "lucide-react"

interface ProjectTimelineProps {
    projects: any[];
    year: string;
}

export function ProjectTimeline({ projects, year }: ProjectTimelineProps) {
    // Filter projects that have valid dates
    const timelineProjects = projects.filter(p =>
        p.periodo_execucao?.data_inicial && p.periodo_execucao?.data_final
    ).sort((a, b) => {
        // Sort by start date
        const dateA = new Date(a.periodo_execucao.data_inicial.split('/').reverse().join('-'));
        const dateB = new Date(b.periodo_execucao.data_inicial.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
    });

    // Generate months for the header
    const months: Date[] = Array.from({ length: 12 }, (_, i) => new Date(parseInt(year), i, 1));

    const getMonthPosition = (dateStr: string) => {
        if (!dateStr) return 0;
        const [day, month, yearVal] = dateStr.split('/').map(Number);
        // If year is different from selected year, clamp it
        if (yearVal < parseInt(year)) return 0;
        if (yearVal > parseInt(year)) return 12;

        return (month - 1) + (day / 30);
    };

    const getDurationWidth = (startStr: string, endStr: string) => {
        const startPos = getMonthPosition(startStr);
        const endPos = getMonthPosition(endStr);
        return Math.max(0.5, endPos - startPos); // Minimum width 0.5 month
    };

    const parseDate = (dateStr: string) => {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}`);
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Cronograma de Projetos ({year})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <div className="w-[1200px]">
                        {/* Header - Months */}
                        <div className="flex border-b bg-gray-50 sticky top-0 z-10">
                            <div className="w-[300px] p-4 font-semibold text-sm text-gray-700 border-r bg-gray-50 sticky left-0 z-20">
                                Projeto
                            </div>
                            <div className="flex-1 grid grid-cols-12 divide-x">
                                {months.map((date, i) => (
                                    <div key={i} className="p-2 text-center text-sm font-medium text-gray-600">
                                        {date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body - Projects */}
                        <div className="divide-y">
                            {timelineProjects.map((project, idx) => {
                                const startPos = getMonthPosition(project.periodo_execucao.data_inicial);
                                const width = getDurationWidth(project.periodo_execucao.data_inicial, project.periodo_execucao.data_final);

                                // Calculate left offset percentage (0 to 12 months = 0 to 100%)
                                const leftPercent = (startPos / 12) * 100;
                                const widthPercent = (width / 12) * 100;

                                return (
                                    <div key={idx} className="flex hover:bg-gray-50 transition-colors group">
                                        <div className="w-[300px] p-3 border-r sticky left-0 bg-white group-hover:bg-gray-50 z-10 flex flex-col justify-center">
                                            <div className="font-medium text-sm truncate" title={project.titulo}>
                                                {project.titulo}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1">
                                                    {project.codigo_acao}
                                                </Badge>
                                                <span>
                                                    {project.periodo_execucao.data_inicial} <ArrowRight className="w-3 h-3 inline" /> {project.periodo_execucao.data_final}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 relative h-16 bg-white/50">
                                            {/* Grid lines background */}
                                            <div className="absolute inset-0 grid grid-cols-12 divide-x pointer-events-none">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <div key={i} className="h-full border-gray-100"></div>
                                                ))}
                                            </div>

                                            {/* Timeline Bar */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 h-8 rounded-md bg-blue-500/90 border border-blue-600 shadow-sm flex items-center px-2 text-white text-xs font-medium overflow-hidden whitespace-nowrap transition-all hover:bg-blue-600 hover:h-10 hover:z-10 cursor-pointer"
                                                style={{
                                                    left: `${leftPercent}%`,
                                                    width: `${widthPercent}%`,
                                                    minWidth: '4px'
                                                }}
                                                title={`${project.titulo} (${project.periodo_execucao.data_inicial} - ${project.periodo_execucao.data_final})`}
                                            >
                                                {widthPercent > 5 && <span className="truncate drop-shadow-md">{project.titulo}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {timelineProjects.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    Nenhum projeto com datas definidas para este ano.
                                </div>
                            )}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
