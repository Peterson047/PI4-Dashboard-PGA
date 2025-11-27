'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Loader2, CheckCircle, AlertTriangle, LayoutDashboard, FileCheck, FileClock, FileCog, Database, RotateCcw, Copy, Trash2, FileText, RefreshCw } from "lucide-react"
import ProtectedRoute from '@/components/ProtectedRoute'
import { UploadForm } from '@/components/documents/UploadForm'
import { ProcessingView } from '@/components/documents/ProcessingView'
import { ResultView } from '@/components/documents/ResultView'
import { useToast } from '@/components/ui/use-toast'

type Status = 'idle' | 'processing' | 'success' | 'error'

// Tipo para documento processado
interface ProcessedDocument {
  _id: string;
  nome_arquivo_original: string;
  data_extracao: string | null;
  ano_referencia: number | null;
  instituicao_nome: string;
  identificacao_unidade: {
    codigo: string;
    nome: string;
    diretor: string;
  } | null;
  versao_documento: string | null;
  tem_pdf: boolean;
}

// Tipo para projeto/ação
interface AcaoProjeto {
  codigo_acao: string;
  titulo: string;
  origem_prioridade: string | null;
  o_que_sera_feito: string | null;
  por_que_sera_feito: string | null;
  custo_estimado: number | null;
  fonte_recursos: string | null;
  periodo_execucao: {
    data_inicial: string | null;
    data_final: string | null;
  };
  equipe: Array<{
    funcao: string;
    nome: string;
    carga_horaria_semanal: string | number;
    tipo_hora: string;
  }>;
  etapas_processo: Array<{
    descricao: string;
    inicio: string;
    fim: string;
  }>;
}

// Tipo para aquisição
interface AnexoAquisicao {
  item: number;
  projeto_referencia: string;
  denominacao: string;
  quantidade: number;
  preco_total_estimado: number;
}

// Tipo para documento completo
interface FullDocument {
  _id?: string;
  ano_referencia: number;
  versao_documento: string;
  instituicao_nome: string;
  identificacao_unidade: {
    codigo: string;
    nome: string;
    diretor: string;
  };
  analise_cenario: string;
  metadados_extracao: {
    nome_arquivo_original: string;
    data_extracao: string;
    metodo_extracao: string;
  };
  situacoes_problema_gerais: string[];
  acoes_projetos: AcaoProjeto[];
  anexo1_aquisicoes: AnexoAquisicao[];
}

// Main Page Component
export default function ProcessDocumentPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('novo-upload')
  const [file, setFile] = useState<File | null>(null)
  const [institutionName, setInstitutionName] = useState('')
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [status, setStatus] = useState<Status>('idle')
  const [logs, setLogs] = useState<string[]>([])

  // Estados adicionais para gerenciamento de documentos
  const [documents, setDocuments] = useState<ProcessedDocument[]>([])
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<ProcessedDocument | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState<FullDocument | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState(false)

  const resetForm = () => {
    setStatus('idle');
    setFile(null);
    setInstitutionName('');
    setYear(new Date().getFullYear().toString());
    setLogs([]);
  };

  const handleSubmit = async (uploadedFile: File, institution: string, uploadYear: string) => {
    setFile(uploadedFile);
    setInstitutionName(institution);
    setYear(uploadYear);
    setStatus('processing');
    setLogs(['Iniciando conexão com o servidor...']);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('institutionName', institution);
    formData.append('year', uploadYear);

    try {
      const response = await fetch('/api/documents/process-pdf', { method: 'POST', body: formData });
      if (!response.body) throw new Error('A resposta da API não contém um corpo.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const jsonString = line.replace('data: ', '');
          try {
            const data = JSON.parse(jsonString);
            if (data.log) setLogs(prev => [...prev, data.log]);
            if (data.status === 'success') {
              setStatus('success');
              toast({
                title: "Sucesso!",
                description: "Documento processado e salvo no banco de dados.",
              });
            }
            if (data.status === 'failure') {
              setStatus('error');
              setLogs(prev => [...prev, `ERRO: ${data.message}`]);
              toast({
                title: "Erro no processamento",
                description: data.message || "Ocorreu um erro ao processar o documento.",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Falha ao decodificar JSON do stream:", jsonString);
          }
        }
      }
    } catch (err) {
      setStatus('error');
      const errorMsg = err instanceof Error ? err.message : String(err);
      setLogs(prev => [...prev, `Erro de conexão com a API: ${errorMsg}`]);
      toast({
        title: "Erro de conexão",
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  // Função para carregar documentos
  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.message || 'Erro ao carregar documentos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentos');
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar documentos quando a aba de arquivos processados for selecionada
  useEffect(() => {
    if (activeTab === 'arquivos-processados') {
      loadDocuments();
    }
  }, [activeTab]);

  // Adicionar função para editar documento
  const handleEditDocument = async (doc: any) => {
    try {
      // Buscar o documento completo
      const response = await fetch(`/api/documents/${doc._id}`);
      const data = await response.json();

      if (data.success) {
        setDocumentToEdit(data.document);
        setEditDialogOpen(true);
      } else {
        setError(data.message || 'Erro ao carregar documento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documento');
      console.error('Erro ao carregar documento:', err);
    }
  };

  // Adicionar função para salvar o documento editado
  const handleSaveEdit = async () => {
    if (!documentToEdit) return;

    setEditing(true);
    try {
      const response = await fetch('/api/documents/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          documentData: documentToEdit
        })
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar a lista de documentos
        loadDocuments();
        setEditDialogOpen(false);
        setDocumentToEdit(null);

        // Forçar atualização dos dados no dashboard
        window.dispatchEvent(new Event('documentsUpdated'));
      } else {
        setError(data.message || 'Erro ao salvar documento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar documento');
      console.error('Erro ao salvar documento:', err);
    } finally {
      setEditing(false);
    }
  };

  // Adicionar função para criar novo documento
  const handleCreateNewDocument = async () => {
    try {
      setIsCreating(true);
      const response = await fetch('/api/documents/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create'
        })
      });

      const data = await response.json();

      if (data.success) {
        setDocumentToEdit(data.document);
        setEditDialogOpen(true);
      } else {
        setError(data.message || 'Erro ao criar novo documento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar novo documento');
      console.error('Erro ao criar novo documento:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return <ProcessingView logs={logs} status={status} />;
      case 'success':
        return <ResultView type="success" logs={logs} onReset={resetForm} />;
      case 'error':
        return <ResultView type="error" logs={logs} onReset={resetForm} />;
      case 'idle':
      default:
        return <UploadForm onSubmit={handleSubmit} isProcessing={false} />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50/50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-xl font-bold text-gray-800">Gerenciamento de Documentos</h1>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 z-50 relative no-underline"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Voltar ao Dashboard
              </a>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 flex items-start justify-center">
          <Card className="w-full max-w-6xl mt-8">
            <CardHeader>
              <CardTitle>Documentos PGA</CardTitle>
              <CardDescription>
                Faça upload de novos documentos ou gerencie os arquivos já processados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="novo-upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Novo Upload
                  </TabsTrigger>
                  <TabsTrigger value="arquivos-processados">
                    <FileText className="mr-2 h-4 w-4" />
                    Arquivos Processados
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="novo-upload" className="mt-6">
                  {renderContent()}
                </TabsContent>
                <TabsContent value="arquivos-processados" className="mt-6">
                  <ProcessedFilesManager
                    documents={documents}
                    onEditDocument={handleEditDocument}
                    onRefresh={loadDocuments}
                    onCreateNewDocument={handleCreateNewDocument}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>

        {/* Diálogo de edição */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Documento</DialogTitle>
              <DialogDescription>
                Edite as informações do documento manualmente.
              </DialogDescription>
            </DialogHeader>
            {documentToEdit && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="institutionName">Nome da Instituição</Label>
                    <Input
                      id="institutionName"
                      value={documentToEdit.instituicao_nome || documentToEdit.identificacao_unidade?.nome || ''}
                      onChange={(e) => setDocumentToEdit({
                        ...documentToEdit,
                        instituicao_nome: e.target.value,
                        identificacao_unidade: {
                          ...documentToEdit.identificacao_unidade,
                          nome: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="institutionCode">Código da Instituição</Label>
                    <Input
                      id="institutionCode"
                      value={documentToEdit.identificacao_unidade?.codigo || ''}
                      onChange={(e) => setDocumentToEdit({
                        ...documentToEdit,
                        identificacao_unidade: {
                          ...documentToEdit.identificacao_unidade,
                          codigo: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="directorName">Nome do Diretor</Label>
                  <Input
                    id="directorName"
                    value={documentToEdit.identificacao_unidade?.diretor || ''}
                    onChange={(e) => setDocumentToEdit({
                      ...documentToEdit,
                      identificacao_unidade: {
                        ...documentToEdit.identificacao_unidade,
                        diretor: e.target.value
                      }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="referenceYear">Ano de Referência</Label>
                  <Input
                    id="referenceYear"
                    type="number"
                    value={documentToEdit.ano_referencia || ''}
                    onChange={(e) => setDocumentToEdit({
                      ...documentToEdit,
                      ano_referencia: e.target.value ? parseInt(e.target.value) : new Date().getFullYear()
                    })}
                  />
                </div>

                {/* Análise do Cenário */}
                <div>
                  <Label htmlFor="analiseCenario">Análise do Cenário</Label>
                  <Textarea
                    id="analiseCenario"
                    value={documentToEdit.analise_cenario || ''}
                    onChange={(e) => setDocumentToEdit({
                      ...documentToEdit,
                      analise_cenario: e.target.value
                    })}
                    rows={4}
                  />
                </div>

                {/* Situações Problema Gerais */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Situações Problema Gerais</Label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newSituacoes = [...(documentToEdit.situacoes_problema_gerais || []), ""];
                        setDocumentToEdit({
                          ...documentToEdit,
                          situacoes_problema_gerais: newSituacoes
                        });
                      }}
                    >
                      Adicionar Situação
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {documentToEdit.situacoes_problema_gerais?.map((situacao: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={situacao || ''}
                          onChange={(e) => {
                            const newSituacoes = [...(documentToEdit.situacoes_problema_gerais || [])];
                            newSituacoes[index] = e.target.value;
                            setDocumentToEdit({
                              ...documentToEdit,
                              situacoes_problema_gerais: newSituacoes
                            });
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => {
                            const newSituacoes = [...(documentToEdit.situacoes_problema_gerais || [])];
                            newSituacoes.splice(index, 1);
                            setDocumentToEdit({
                              ...documentToEdit,
                              situacoes_problema_gerais: newSituacoes
                            });
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projetos/Ações */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Projetos/Ações</Label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newProject = {
                          codigo_acao: `${documentToEdit.acoes_projetos?.length + 1 || 1}`.padStart(2, '0'),
                          titulo: "Novo Projeto",
                          origem_prioridade: null,
                          o_que_sera_feito: "",
                          por_que_sera_feito: "",
                          custo_estimado: null,
                          fonte_recursos: "",
                          periodo_execucao: {
                            data_inicial: null,
                            data_final: null
                          },
                          equipe: [],
                          etapas_processo: []
                        };

                        setDocumentToEdit({
                          ...documentToEdit,
                          acoes_projetos: [...(documentToEdit.acoes_projetos || []), newProject]
                        });
                      }}
                    >
                      Adicionar Projeto
                    </Button>
                  </div>
                  <div className="border rounded-md p-4 space-y-4 max-h-96 overflow-y-auto">
                    {documentToEdit.acoes_projetos?.map((projeto: any, index: number) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Projeto {index + 1}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              const newProjects = [...documentToEdit.acoes_projetos];
                              newProjects.splice(index, 1);
                              setDocumentToEdit({
                                ...documentToEdit,
                                acoes_projetos: newProjects
                              });
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label>Código</Label>
                            <Input
                              value={projeto.codigo_acao || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].codigo_acao = e.target.value;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={projeto.titulo || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].titulo = e.target.value;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label>Origem/Prioridade</Label>
                            <Input
                              value={projeto.origem_prioridade || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].origem_prioridade = e.target.value;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Custo Estimado</Label>
                            <Input
                              type="number"
                              value={projeto.custo_estimado || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].custo_estimado = parseFloat(e.target.value) || null;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label>Fonte de Recursos</Label>
                            <Input
                              value={projeto.fonte_recursos || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].fonte_recursos = e.target.value;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Data Inicial</Label>
                            <Input
                              type="text"
                              placeholder="dd/mm/aaaa"
                              value={projeto.periodo_execucao?.data_inicial || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].periodo_execucao = {
                                  ...newProjects[index].periodo_execucao,
                                  data_inicial: e.target.value
                                };
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div className="mb-2">
                          <Label>Data Final</Label>
                          <Input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            value={projeto.periodo_execucao?.data_final || ''}
                            onChange={(e) => {
                              const newProjects = [...documentToEdit.acoes_projetos];
                              newProjects[index].periodo_execucao = {
                                ...newProjects[index].periodo_execucao,
                                data_final: e.target.value
                              };
                              setDocumentToEdit({
                                ...documentToEdit,
                                acoes_projetos: newProjects
                              });
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label>O que será feito</Label>
                            <Textarea
                              value={projeto.o_que_sera_feito || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].o_que_sera_feito = e.target.value;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Por que será feito</Label>
                            <Textarea
                              value={projeto.por_que_sera_feito || ''}
                              onChange={(e) => {
                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].por_que_sera_feito = e.target.value;
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            />
                          </div>
                        </div>

                        {/* Seção de Equipe */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <Label>Equipe</Label>
                            <Button
                              size="sm"
                              onClick={() => {
                                const newMember = {
                                  funcao: "",
                                  nome: "",
                                  carga_horaria_semanal: "",
                                  tipo_hora: ""
                                };

                                const newProjects = [...documentToEdit.acoes_projetos];
                                newProjects[index].equipe = [...(newProjects[index].equipe || []), newMember];
                                setDocumentToEdit({
                                  ...documentToEdit,
                                  acoes_projetos: newProjects
                                });
                              }}
                            >
                              Adicionar Membro
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {projeto.equipe?.map((membro: any, membroIndex: number) => (
                              <div key={membroIndex} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 border rounded">
                                <div>
                                  <Label>Função</Label>
                                  <Input
                                    value={membro.funcao || ''}
                                    onChange={(e) => {
                                      const newProjects = [...documentToEdit.acoes_projetos];
                                      newProjects[index].equipe[membroIndex].funcao = e.target.value;
                                      setDocumentToEdit({
                                        ...documentToEdit,
                                        acoes_projetos: newProjects
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label>Nome</Label>
                                  <Input
                                    value={membro.nome || ''}
                                    onChange={(e) => {
                                      const newProjects = [...documentToEdit.acoes_projetos];
                                      newProjects[index].equipe[membroIndex].nome = e.target.value;
                                      setDocumentToEdit({
                                        ...documentToEdit,
                                        acoes_projetos: newProjects
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label>Carga Horária</Label>
                                  <Input
                                    type="number"
                                    value={membro.carga_horaria_semanal || ''}
                                    onChange={(e) => {
                                      const newProjects = [...documentToEdit.acoes_projetos];
                                      newProjects[index].equipe[membroIndex].carga_horaria_semanal = e.target.value;
                                      setDocumentToEdit({
                                        ...documentToEdit,
                                        acoes_projetos: newProjects
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label>Tipo de Hora</Label>
                                  <Input
                                    value={membro.tipo_hora || ''}
                                    onChange={(e) => {
                                      const newProjects = [...documentToEdit.acoes_projetos];
                                      newProjects[index].equipe[membroIndex].tipo_hora = e.target.value;
                                      setDocumentToEdit({
                                        ...documentToEdit,
                                        acoes_projetos: newProjects
                                      });
                                    }}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-600 hover:bg-red-50 w-full"
                                    onClick={() => {
                                      const newProjects = [...documentToEdit.acoes_projetos];
                                      newProjects[index].equipe.splice(membroIndex, 1);
                                      setDocumentToEdit({
                                        ...documentToEdit,
                                        acoes_projetos: newProjects
                                      });
                                    }}
                                  >
                                    Remover
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setDocumentToEdit(null);
                }}
                disabled={editing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editing}
              >
                {editing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}


// Componente para gerenciar arquivos processados
const ProcessedFilesManager = ({
  documents,
  onEditDocument,
  onRefresh,
  onCreateNewDocument
}: {
  documents: any[];
  onEditDocument: (doc: any) => void;
  onRefresh: () => void;
  onCreateNewDocument: () => void;
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [setDocuments] = useState(() => (docs: any[]) => { }); // Função vazia apenas para tipagem

  const itemsPerPage = 10;

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatData = (data: any) => {
    return data ? JSON.stringify(data, null, 2) : 'N/A';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const handleDeleteClick = (doc: any) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentToDelete._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar a lista de documentos através da função onRefresh
        onRefresh();
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      } else {
        setError(data.message || 'Erro ao deletar documento');
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar documento');
      console.error('Erro ao deletar documento:', err);
    } finally {
      setDeleting(false);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = documents.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Arquivos Processados</h3>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} {documents.length === 1 ? 'documento encontrado' : 'documentos encontrados'}
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={onCreateNewDocument} variant="default" size="sm">
            <Database className="mr-2 h-4 w-4" />
            Inserir Manualmente
          </Button>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Nenhum documento processado encontrado.</p>
          <p className="text-sm text-gray-500 mt-2">Faça upload de um novo documento na aba "Novo Upload".</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Data de Extração</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDocuments.map((doc) => (
                <TableRow key={doc._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="truncate max-w-xs">{doc.nome_arquivo_original}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="truncate">{doc.instituicao_nome}</p>
                      {doc.identificacao_unidade && (
                        <p className="text-xs text-gray-500 truncate">
                          {doc.identificacao_unidade.codigo}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{doc.ano_referencia || 'N/A'}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(doc.data_extracao)}
                  </TableCell>
                  <TableCell>{doc.versao_documento || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      onClick={() => onEditDocument(doc)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <FileCog className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(doc)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center p-4">
            <p className="text-sm text-gray-500">
              Exibindo {startIndex + 1} - {Math.min(endIndex, documents.length)} de {documents.length}
            </p>
            <div className="space-x-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(documents.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(documents.length / itemsPerPage)}
                variant="outline"
                size="sm"
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o documento <strong>{documentToDelete?.nome_arquivo_original}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700 mb-2">Esta ação irá remover:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600">
              <li>O documento do banco de dados MongoDB</li>
              <li>O arquivo PDF original (se existir na pasta uploads)</li>
              <li>Todos os dados extraídos relacionados</li>
            </ul>
            <p className="text-sm text-red-600 font-semibold mt-4">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDocumentToDelete(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
