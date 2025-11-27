import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from "recharts"
import { TrendingUp } from "lucide-react"
import { ProjectTimeline } from "./ProjectTimeline"

interface TrendsTabProps {
    institutionalData: any;
    selectedYear: string;
}

export function TrendsTab({ institutionalData, selectedYear }: TrendsTabProps) {
    // Mock data for evolution (since we only have one year usually)
    // In a real scenario, this would come from historical data
    const evolutionData = [
        { name: 'Jan', projetos: 12, conclusao: 10 },
        { name: 'Fev', projetos: 15, conclusao: 20 },
        { name: 'Mar', projetos: 18, conclusao: 35 },
        { name: 'Abr', projetos: 22, conclusao: 45 },
        { name: 'Mai', projetos: 25, conclusao: 55 },
        { name: 'Jun', projetos: 28, conclusao: 65 },
        { name: 'Jul', projetos: 30, conclusao: 70 },
        { name: 'Ago', projetos: 32, conclusao: 75 },
        { name: 'Set', projetos: 35, conclusao: 80 },
        { name: 'Out', projetos: 38, conclusao: 85 },
        { name: 'Nov', projetos: 40, conclusao: 90 },
        { name: 'Dez', projetos: 42, conclusao: 95 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Tendências e Evolução</h2>

                {/* Project Timeline Section */}
                <div className="mb-8">
                    <ProjectTimeline projects={institutionalData.acoes_projetos} year={selectedYear} />
                </div>

                {/* Evolution Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Evolução de Projetos (Simulado)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="projetos" stroke="#8884d8" name="Total Projetos" />
                                <Line type="monotone" dataKey="conclusao" stroke="#82ca9d" name="% Conclusão Média" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
