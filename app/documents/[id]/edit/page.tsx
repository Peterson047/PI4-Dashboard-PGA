"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'

// Define a interface completa do documento para tipagem
interface Document {
  _id: string;
  originalName: string;
  institutionName: string;
  year: number;
  status: 'uploaded' | 'processing' | 'processed' | 'saved' | 'error';
  normalizedData?: any; // Usaremos 'any' por enquanto para flexibilidade
}

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [document, setDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/documents/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDocument(data.document);
            // Inicializa o formulário com os dados normalizados
            setFormData(data.document.normalizedData || {});
          } else {
            alert('Erro ao carregar o documento.');
          }
          setLoading(false);
        })
        .catch(() => {
          alert('Erro ao carregar o documento.');
          setLoading(false);
        });
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, path: string) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev };
      // Navega e atualiza o estado aninhado
      let current = newFormData;
      const keys = path.split('.');
      keys.slice(0, -1).forEach(key => {
        current = current[key];
      });
      current[keys[keys.length - 1]][name] = value;
      return newFormData;
    });
  };
  
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev };
      newFormData.acoes_projetos[index][name] = value;
      return newFormData;
    });
  };

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      acoes_projetos: [...(prev.acoes_projetos || []), { titulo: '', o_que_sera_feito: '' }]
    }));
  };

  const removeProject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acoes_projetos: prev.acoes_projetos.filter((_: any, i: number) => i !== index)
    }));
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        alert('Documento salvo com sucesso!');
        router.push('/documents');
      } else {
        alert(data.message || 'Erro ao salvar o documento.');
      }
    } catch (error) {
      alert('Erro ao salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Carregando documento...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (!document || !formData) {
    return <p>Documento não encontrado.</p>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Revisar e Aprovar Documento</h1>
              <p className="text-gray-600">{document.originalName}</p>
            </div>
            <div className="flex items-center space-x-2">
               <Button variant="outline" onClick={() => router.push('/documents')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar e Aprovar
              </Button>
            </div>
          </div>

          {/* Formulário de Edição */}
          <div className="space-y-6">
            {/* Identificação da Unidade */}
            <Card>
              <CardHeader>
                <CardTitle>1. Identificação da Unidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome da Unidade</label>
                  <Input 
                    name="nome"
                    value={formData.identificacao_unidade?.nome || ''}
                    onChange={(e) => handleInputChange(e, 'identificacao_unidade')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Diretor(a)</label>
                  <Input 
                    name="diretor"
                    value={formData.identificacao_unidade?.diretor || ''}
                    onChange={(e) => handleInputChange(e, 'identificacao_unidade')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Análise do Cenário */}
            <Card>
              <CardHeader>
                <CardTitle>2. Análise do Cenário</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  name="analise_cenario"
                  value={formData.analise_cenario || ''}
                  onChange={(e) => setFormData({...formData, analise_cenario: e.target.value})}
                  rows={6}
                />
              </CardContent>
            </Card>

            {/* Ações/Projetos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>3. Ações/Projetos</CardTitle>
                <Button variant="outline" size="sm" onClick={addProject}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Adicionar Projeto
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.acoes_projetos?.map((proj: any, index: number) => (
                  <div key={index} className="border p-4 rounded-lg space-y-2 relative">
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 w-6 h-6" onClick={() => removeProject(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div>
                      <label className="text-sm font-medium">Título do Projeto</label>
                      <Input name="titulo" value={proj.titulo || ''} onChange={(e) => handleProjectChange(e, index)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">O que será feito?</label>
                      <Textarea name="o_que_sera_feito" value={proj.o_que_sera_feito || ''} onChange={(e) => handleProjectChange(e, index)} rows={3} />
                    </div>
                     <div>
                      <label className="text-sm font-medium">Custo Estimado</label>
                      <Input name="custo_estimado" value={proj.custo_estimado || ''} onChange={(e) => handleProjectChange(e, index)} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
