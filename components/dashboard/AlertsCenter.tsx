import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react"
import { InstitutionalData } from "@/lib/dataService"

interface AlertsCenterProps {
    institutionalData: InstitutionalData;
}

export function AlertsCenter({ institutionalData }: AlertsCenterProps) {
    // 1. Overloaded Resources Analysis
    const overloadedMembers = institutionalData.acoes_projetos.flatMap(p => p.equipe).reduce((acc, member) => {
        const workload = parseInt(String(member.carga_horaria_semanal).replace(/\D/g, '') || '0', 10);
        if (!acc[member.nome]) {
            acc[member.nome] = 0;
        }
        acc[member.nome] += workload;
        return acc;
    }, {} as Record<string, number>);

    const overloadedList = Object.entries(overloadedMembers)
        .filter(([_, hours]) => hours > 20) // Threshold > 20h
        .map(([name, hours]) => ({ name, hours }));

    // 2. Data Quality Analysis
    const projectsMissingData = institutionalData.acoes_projetos.filter(p =>
        !p.periodo_execucao.data_inicial ||
        !p.periodo_execucao.data_final ||
        p.equipe.length === 0
    );

    // 3. Budget Analysis
    const highCostProjects = institutionalData.acoes_projetos.filter(p =>
        (p.custo_estimado || 0) > 50000 && // Threshold > 50k
        (!p.o_que_sera_feito || p.o_que_sera_feito.length < 50) // Short description
    );

    const totalAlerts = overloadedList.length + projectsMissingData.length + highCostProjects.length;

    if (totalAlerts === 0) {
        return (
            <Card className="border-l-4 border-l-green-500 bg-green-50/30">
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-green-900">Tudo certo!</h3>
                        <p className="text-sm text-green-700">Nenhum alerta crítico identificado no momento.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Central de Alertas
                    <span className="ml-auto text-xs font-normal px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                        {totalAlerts} pendências
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Overloaded Resources */}
                {overloadedList.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <UsersAlertIcon /> Sobrecarga de Equipe
                        </h4>
                        {overloadedList.map((member, idx) => (
                            <Alert key={idx} variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="text-sm font-medium">{member.name}</AlertTitle>
                                <AlertDescription className="text-xs">
                                    Alocado em {member.hours}h semanais (Acima do recomendado de 20h)
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Missing Data */}
                {projectsMissingData.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <DataAlertIcon /> Dados Incompletos
                        </h4>
                        <Alert className="py-2 bg-blue-50 border-blue-200 text-blue-800">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-sm font-medium">{projectsMissingData.length} Projetos precisam de atenção</AlertTitle>
                            <AlertDescription className="text-xs text-blue-700">
                                Projetos com datas indefinidas ou sem equipe alocada.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Budget Warnings */}
                {highCostProjects.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <BudgetAlertIcon /> Orçamento vs. Detalhamento
                        </h4>
                        <Alert className="py-2 bg-amber-50 border-amber-200 text-amber-800">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-sm font-medium">{highCostProjects.length} Projetos de Alto Custo</AlertTitle>
                            <AlertDescription className="text-xs text-amber-700">
                                Projetos com orçamento {'>'} R$ 50k mas com descrição insuficiente.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

            </CardContent>
        </Card>
    )
}

function UsersAlertIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    )
}

function DataAlertIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
    )
}

function BudgetAlertIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    )
}
