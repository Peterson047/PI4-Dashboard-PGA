'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlusCircle, Loader2, Trash2, Pencil } from 'lucide-react'
import { User, Institution } from '@/lib/types'

// Esquema de validação
const userSchema = z.object({
    _id: z.string().optional(),
    name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
    email: z.string().email({ message: 'Por favor, insira um email válido.' }),
    password: z.string().optional(),
    role: z.enum(['admin', 'professor', 'diretor'], { required_error: 'A permissão é obrigatória.' }),
    accessLevel: z.enum(['all', 'specific']).optional(),
    allowedInstitutions: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            accessLevel: 'all',
            allowedInstitutions: [],
            role: 'professor'
        }
    });

    const selectedRole = watch('role');
    const selectedAccessLevel = watch('accessLevel');
    const selectedInstitutions = watch('allowedInstitutions') || [];

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        }
        setLoading(false);
    };

    const fetchInstitutions = async () => {
        try {
            const response = await fetch('/api/institutions');
            const data = await response.json();
            if (Array.isArray(data)) {
                setInstitutions(data);
            }
        } catch (error) {
            console.error("Erro ao buscar instituições:", error);
        }
    }

    useEffect(() => {
        fetchUsers();
        fetchInstitutions();
    }, []);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        reset({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            accessLevel: user.accessLevel || 'all',
            allowedInstitutions: user.allowedInstitutions || [],
            password: '' // Password empty on edit
        });
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        reset({
            name: '',
            email: '',
            password: '',
            role: 'professor',
            accessLevel: 'all',
            allowedInstitutions: []
        });
        setDialogOpen(true);
    };

    const onSubmit = async (formData: UserFormData) => {
        try {
            const url = '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            // If creating, password is required manually check (zod optional for edit)
            if (!editingUser && (!formData.password || formData.password.length < 6)) {
                alert("Senha é obrigatória e deve ter no mínimo 6 caracteres.");
                return;
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();
            if (result.success) {
                alert(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
                reset();
                setDialogOpen(false);
                fetchUsers();
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            alert('Falha ao conectar com a API.');
        }
    };

    const toggleInstitution = (id: string) => {
        const current = selectedInstitutions;
        if (current.includes(id)) {
            setValue('allowedInstitutions', current.filter(i => i !== id));
        } else {
            setValue('allowedInstitutions', [...current, id]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Gerenciamento de Usuários</h2>
                    <p className="text-sm text-gray-500">Crie, visualize e gerencie os usuários do sistema.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Usuário</Button>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
                            <DialogDescription>Preencha os dados abaixo.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" {...register('name')} />
                                    {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" {...register('email')} />
                                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="password">{editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}</Label>
                                <Input id="password" type="password" {...register('password')} placeholder={editingUser ? "••••••••" : ""} />
                                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                            </div>

                            <div>
                                <Label htmlFor="role">Permissão</Label>
                                <Select
                                    onValueChange={(val) => setValue('role', val as 'admin' | 'professor')}
                                    defaultValue={editingUser?.role || 'professor'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a permissão" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professor">Professor</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
                            </div>

                            {selectedRole === 'professor' && (
                                <div className="space-y-3 border p-4 rounded-md bg-gray-50">
                                    <Label className="text-base font-semibold">Acesso a Instituições</Label>

                                    <div className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="access-all"
                                                value="all"
                                                {...register('accessLevel')}
                                                className="h-4 w-4 text-blue-600"
                                            />
                                            <Label htmlFor="access-all">Todas as Instituições</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="access-specific"
                                                value="specific"
                                                {...register('accessLevel')}
                                                className="h-4 w-4 text-blue-600"
                                            />
                                            <Label htmlFor="access-specific">Selecionar Específicas</Label>
                                        </div>
                                    </div>

                                    {selectedAccessLevel === 'specific' && (
                                        <ScrollArea className="h-[200px] w-full rounded-md border bg-white p-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                {institutions.map((inst) => (
                                                    <div key={inst.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`inst-${inst.id}`}
                                                            checked={selectedInstitutions.includes(inst.id)}
                                                            onCheckedChange={() => toggleInstitution(inst.id)}
                                                        />
                                                        <label
                                                            htmlFor={`inst-${inst.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            {inst.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Usuários Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Permissão</TableHead>
                                <TableHead>Acesso</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto my-4 h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : (
                                users.map(user => (
                                    <TableRow key={user._id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.role === 'admin' ? 'Administrador' : 'Professor'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === 'admin' ? (
                                                <span className="text-gray-500 text-sm">Total</span>
                                            ) : (
                                                <span className="text-sm">
                                                    {user.accessLevel === 'specific'
                                                        ? `${user.allowedInstitutions?.length || 0} instituições`
                                                        : 'Todas'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                                                <Pencil className="w-4 h-4 text-gray-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
