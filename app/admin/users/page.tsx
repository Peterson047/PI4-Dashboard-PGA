'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { UserManagement } from '@/components/admin/UserManagement'

export default function UserManagementPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Administração</h1>
          <UserManagement />
        </div>
      </div>
    </ProtectedRoute>
  );
}
