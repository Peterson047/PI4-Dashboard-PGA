'use client'

import { useAuth } from '@/lib/authContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from '@/components/admin/UserManagement'
import { User, Shield, Building, Mail, Calendar, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const { user, logout } = useAuth()
    const router = useRouter()

    if (!user) {
        return null // ProtectedRoute handles redirect
    }

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header Section */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Mail className="w-4 h-4" />
                                    <span>{user.email}</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="border-gray-300 hover:bg-gray-50">
                            <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
                        </Button>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                            {user.role === 'admin' && (
                                <TabsTrigger value="admin">Administração</TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="overview" className="mt-6 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="w-5 h-5 text-blue-600" />
                                            Informações Pessoais
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 gap-1">
                                            <span className="text-sm font-medium text-gray-500">Nome Completo</span>
                                            <span className="text-base font-medium text-gray-900">{user.name}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            <span className="text-sm font-medium text-gray-500">Email</span>
                                            <span className="text-base font-medium text-gray-900">{user.email}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-purple-600" />
                                            Acesso e Permissões
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 gap-1">
                                            <span className="text-sm font-medium text-gray-500">Nível de Acesso</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {user.role === 'admin' ? 'Administrador' : 'Professor'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            <span className="text-sm font-medium text-gray-500">Instituição Vinculada</span>
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-gray-400" />
                                                <span className="text-base font-medium text-gray-900">
                                                    {user.institution ? user.institution.toUpperCase() : 'Acesso Global'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {user.role === 'admin' && (
                            <TabsContent value="admin" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Painel Administrativo</CardTitle>
                                        <CardDescription>
                                            Gerencie usuários e configurações do sistema.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <UserManagement />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
        </ProtectedRoute>
    )
}
