'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Document {
  _id: string;
  nome_instituicao: string;
  ano_referencia: number;
  data_extracao: string;
}

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
    carga_horaria_semanal: number | string;
    tipo_hora: string;
  }>;
  etapas_processo?: Array<{
    descricao: string;
    inicio: string;
    fim: string;
  }>;
}

interface AnexoAquisicao {
  item: number;
  projeto_referencia: string;
  denominacao: string;
  quantidade: number;
  preco_total_estimado: number;
}

interface DocumentData {
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
  };
  situacoes_problema_gerais: string[];
  acoes_projetos: AcaoProjeto[];
  anexo1_aquisicoes: AnexoAquisicao[];
}

export function ManualDocumentEditor() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Carregar lista de documentos
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/manual');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      } else {
        toast.error(data.message || 'Erro ao carregar documentos');
      }
    } catch (error) {
      toast.error('Erro ao carregar documentos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentData = async (documentId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get',
          documentId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDocumentData(data.document);
        const doc = documents.find(d => d._id === documentId);
        if (doc) {
          setSelectedDocument(doc);
        }
      } else {
        toast.error(data.message || 'Erro ao carregar documento');
      }
    } catch (error) {
      toast.error('Erro ao carregar documento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createNewDocument = async () => {
    try {
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
        setDocumentData(data.document);
        setSelectedDocument(null);
        setIsCreateDialogOpen(false);
        toast.success('Novo documento criado');
      } else {
        toast.error(data.message || 'Erro ao criar documento');
      }
    } catch (error) {
      toast.error('Erro ao criar documento');
      console.error(error);
    }
  };

  const saveDocument = async () => {
    if (!documentData) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/documents/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          documentData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Documento salvo com sucesso');
        // Recarregar lista de documentos
        loadDocuments();
      } else {
        toast.error(data.message || 'Erro ao salvar documento');
      }
    } catch (error) {
      toast.error('Erro ao salvar documento');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateDocumentField = (field: string, value: any) => {
    if (!documentData) return;
    
    setDocumentData({
      ...documentData,
      [field]: value
    });
  };

  const updateIdentificacaoUnidade = (field: string, value: string) => {
    if (!documentData) return;
    
    setDocumentData({
      ...documentData,
      identificacao_unidade: {
        ...documentData.identificacao_unidade,
        [field]: value
      }
    });
  };

  const updateAcaoProjeto = (index: number, field: string, value: any) => {
    if (!documentData) return;
    
    const novasAcoes = [...documentData.acoes_projetos];
    novasAcoes[index] = {
      ...novasAcoes[index],
      [field]: value
    };
    
    setDocumentData({
      ...documentData,
      acoes_projetos: novasAcoes
    });
  };

  const updateEquipeProjeto = (projetoIndex: number, equipeIndex: number, field: string, value: any) => {
    if (!documentData) return;
    
    const novasAcoes = [...documentData.acoes_projetos];
    const novaEquipe = [...novasAcoes[projetoIndex].equipe];
    novaEquipe[equipeIndex] = {
      ...novaEquipe[equipeIndex],
      [field]: value
    };
    
    novasAcoes[projetoIndex] = {
      ...novasAcoes[projetoIndex],
      equipe: novaEquipe
    };
    
    setDocumentData({
      ...documentData,
      acoes_projetos: novasAcoes
    });
  };

  const updateAnexoAquisicao = (index: number, field: string, value: any) => {
    if (!documentData) return;
    
    const novosAnexos = [...documentData.anexo1_aquisicoes];
    novosAnexos[index] = {
      ...novosAnexos[index],
      [field]: value
    };
    
    setDocumentData({
      ...documentData,
      anexo1_aquisicoes: novosAnexos
    });
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Editor Manual de Documentos</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>Criar Novo Documento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Documento</DialogTitle>
              <DialogDescription>
                Criar um novo documento manualmente com a estrutura base.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createNewDocument}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!documentData ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Selecione um documento para editar:</h2>
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card 
                key={doc._id} 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => loadDocumentData(doc._id)}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{doc.nome_instituicao}</span>
                    <Badge variant="secondary">{doc.ano_referencia}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Extraído em: {new Date(doc.data_extracao).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {selectedDocument 
                ? `Editando: ${selectedDocument.nome_instituicao} (${selectedDocument.ano_referencia})` 
                : 'Novo Documento'}
            </h2>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => {
                setDocumentData(null);
                setSelectedDocument(null);
              }}>
                Voltar
              </Button>
              <Button onClick={saveDocument} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Documento'}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="analise">Análise</TabsTrigger>
              <TabsTrigger value="projetos">Projetos</TabsTrigger>
              <TabsTrigger value="aquisicoes">Aquisições</TabsTrigger>
              <TabsTrigger value="metadados">Metadados</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ano de Referência</Label>
                      <Input
                        type="number"
                        value={documentData.ano_referencia}
                        onChange={(e) => updateDocumentField('ano_referencia', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Versão do Documento</Label>
                      <Input
                        value={documentData.versao_documento}
                        onChange={(e) => updateDocumentField('versao_documento', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nome da Instituição</Label>
                    <Input
                      value={documentData.instituicao_nome}
                      onChange={(e) => updateDocumentField('instituicao_nome', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Identificação da Unidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input
                        value={documentData.identificacao_unidade.codigo}
                        onChange={(e) => updateIdentificacaoUnidade('codigo', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={documentData.identificacao_unidade.nome}
                        onChange={(e) => updateIdentificacaoUnidade('nome', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Diretor(a)</Label>
                    <Input
                      value={documentData.identificacao_unidade.diretor}
                      onChange={(e) => updateIdentificacaoUnidade('diretor', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analise" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise do Cenário</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={documentData.analise_cenario}
                    onChange={(e) => updateDocumentField('analise_cenario', e.target.value)}
                    rows={10}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Situações-Problema Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documentData.situacoes_problema_gerais.map((situacao, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        value={situacao}
                        onChange={(e) => {
                          const novasSituacoes = [...documentData.situacoes_problema_gerais];
                          novasSituacoes[index] = e.target.value;
                          updateDocumentField('situacoes_problema_gerais', novasSituacoes);
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const novasSituacoes = [...documentData.situacoes_problema_gerais];
                          novasSituacoes.splice(index, 1);
                          updateDocumentField('situacoes_problema_gerais', novasSituacoes);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const novasSituacoes = [...documentData.situacoes_problema_gerais, ''];
                      updateDocumentField('situacoes_problema_gerais', novasSituacoes);
                    }}
                  >
                    Adicionar Situação
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projetos" className="space-y-4">
              <div className="space-y-6">
                {documentData.acoes_projetos.map((projeto, projetoIndex) => (
                  <Card key={projetoIndex}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>Projeto {projetoIndex + 1}: {projeto.titulo}</span>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const novosProjetos = [...documentData.acoes_projetos];
                            novosProjetos.splice(projetoIndex, 1);
                            updateDocumentField('acoes_projetos', novosProjetos);
                          }}
                        >
                          Remover Projeto
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Código da Ação</Label>
                          <Input
                            value={projeto.codigo_acao}
                            onChange={(e) => updateAcaoProjeto(projetoIndex, 'codigo_acao', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={projeto.titulo}
                            onChange={(e) => updateAcaoProjeto(projetoIndex, 'titulo', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Origem/Prioridade</Label>
                          <Input
                            value={projeto.origem_prioridade || ''}
                            onChange={(e) => updateAcaoProjeto(projetoIndex, 'origem_prioridade', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Custo Estimado (R$)</Label>
                          <Input
                            type="number"
                            value={projeto.custo_estimado || 0}
                            onChange={(e) => updateAcaoProjeto(projetoIndex, 'custo_estimado', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>O que será feito</Label>
                        <Textarea
                          value={projeto.o_que_sera_feito || ''}
                          onChange={(e) => updateAcaoProjeto(projetoIndex, 'o_que_sera_feito', e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Por que será feito</Label>
                        <Textarea
                          value={projeto.por_que_sera_feito || ''}
                          onChange={(e) => updateAcaoProjeto(projetoIndex, 'por_que_sera_feito', e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Data Inicial</Label>
                          <Input
                            value={projeto.periodo_execucao.data_inicial || ''}
                            onChange={(e) => updateAcaoProjeto(projetoIndex, 'periodo_execucao', {
                              ...projeto.periodo_execucao,
                              data_inicial: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data Final</Label>
                          <Input
                            value={projeto.periodo_execucao.data_final || ''}
                            onChange={(e) => updateAcaoProjeto(projetoIndex, 'periodo_execucao', {
                              ...projeto.periodo_execucao,
                              data_final: e.target.value
                            })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Fonte dos Recursos</Label>
                        <Input
                          value={projeto.fonte_recursos || ''}
                          onChange={(e) => updateAcaoProjeto(projetoIndex, 'fonte_recursos', e.target.value)}
                        />
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Equipe</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {projeto.equipe.map((membro, equipeIndex) => (
                            <div key={equipeIndex} className="grid grid-cols-4 gap-2">
                              <div className="space-y-2">
                                <Label>Função</Label>
                                <Input
                                  value={membro.funcao}
                                  onChange={(e) => updateEquipeProjeto(projetoIndex, equipeIndex, 'funcao', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                  value={membro.nome}
                                  onChange={(e) => updateEquipeProjeto(projetoIndex, equipeIndex, 'nome', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Carga Horária</Label>
                                <Input
                                  type="number"
                                  value={membro.carga_horaria_semanal}
                                  onChange={(e) => updateEquipeProjeto(projetoIndex, equipeIndex, 'carga_horaria_semanal', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo de Hora</Label>
                                <Input
                                  value={membro.tipo_hora}
                                  onChange={(e) => updateEquipeProjeto(projetoIndex, equipeIndex, 'tipo_hora', e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => {
                              const novosProjetos = [...documentData.acoes_projetos];
                              novosProjetos[projetoIndex] = {
                                ...novosProjetos[projetoIndex],
                                equipe: [
                                  ...novosProjetos[projetoIndex].equipe,
                                  {
                                    funcao: '',
                                    nome: '',
                                    carga_horaria_semanal: 0,
                                    tipo_hora: ''
                                  }
                                ]
                              };
                              updateDocumentField('acoes_projetos', novosProjetos);
                            }}
                          >
                            Adicionar Membro
                          </Button>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  onClick={() => {
                    const novosProjetos = [...documentData.acoes_projetos, {
                      codigo_acao: '',
                      titulo: '',
                      origem_prioridade: null,
                      o_que_sera_feito: null,
                      por_que_sera_feito: null,
                      custo_estimado: null,
                      fonte_recursos: null,
                      periodo_execucao: {
                        data_inicial: null,
                        data_final: null
                      },
                      equipe: []
                    }];
                    updateDocumentField('acoes_projetos', novosProjetos);
                  }}
                >
                  Adicionar Projeto
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="aquisicoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Anexo 1 - Lista de Aquisições</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentData.anexo1_aquisicoes.map((aquisicao, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 items-end">
                      <div className="space-y-2">
                        <Label>Item</Label>
                        <Input
                          type="number"
                          value={aquisicao.item}
                          onChange={(e) => updateAnexoAquisicao(index, 'item', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Projeto Ref.</Label>
                        <Input
                          value={aquisicao.projeto_referencia}
                          onChange={(e) => updateAnexoAquisicao(index, 'projeto_referencia', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Denominação</Label>
                        <Input
                          value={aquisicao.denominacao}
                          onChange={(e) => updateAnexoAquisicao(index, 'denominacao', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={aquisicao.quantidade}
                          onChange={(e) => updateAnexoAquisicao(index, 'quantidade', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Total (R$)</Label>
                        <Input
                          type="number"
                          value={aquisicao.preco_total_estimado}
                          onChange={(e) => updateAnexoAquisicao(index, 'preco_total_estimado', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const novosAnexos = [...documentData.anexo1_aquisicoes];
                          novosAnexos.splice(index, 1);
                          updateDocumentField('anexo1_aquisicoes', novosAnexos);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const novosAnexos = [...documentData.anexo1_aquisicoes, {
                        item: documentData.anexo1_aquisicoes.length + 1,
                        projeto_referencia: '',
                        denominacao: '',
                        quantidade: 0,
                        preco_total_estimado: 0
                      }];
                      updateDocumentField('anexo1_aquisicoes', novosAnexos);
                    }}
                  >
                    Adicionar Aquisição
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadados" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Metadados de Extração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Arquivo Original</Label>
                    <Input
                      value={documentData.metadados_extracao.nome_arquivo_original}
                      onChange={(e) => updateDocumentField('metadados_extracao', {
                        ...documentData.metadados_extracao,
                        nome_arquivo_original: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Extração</Label>
                    <Input
                      type="datetime-local"
                      value={new Date(documentData.metadados_extracao.data_extracao).toISOString().slice(0, 16)}
                      onChange={(e) => updateDocumentField('metadados_extracao', {
                        ...documentData.metadados_extracao,
                        data_extracao: new Date(e.target.value).toISOString()
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}