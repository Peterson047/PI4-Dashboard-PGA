"use client"

import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return; // Não faça nada enquanto carrega

    if (!user) {
      // Se não há usuário, sempre redireciona para o login
      router.push('/login');
    } else if (adminOnly && user.role !== 'admin') {
      // Se a rota é para admins e o usuário não é admin, redireciona para a home
      router.push('/');
    }
  }, [user, loading, router, adminOnly]);

  if (loading || !user || (adminOnly && user.role !== 'admin')) {
    // Mostra o spinner enquanto carrega ou se o usuário não for válido para a rota
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 