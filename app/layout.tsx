"use client"

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/lib/authContext'
import { TabProvider } from '@/lib/tabContext'
import { Sidebar } from '@/components/Sidebar'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <AuthProvider>
          <TabProvider>
            <div className="flex h-screen relative">
              <Sidebar isCollapsed={isCollapsed} />

              {/* Botão de toggle como "puxador" no topo */}
              <div
                className="absolute top-4 z-50 transition-all duration-300 ease-in-out pointer-events-none"
                style={{ left: isCollapsed ? 'calc(4.5rem - 16px)' : 'calc(15.5rem - 16px)' }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleSidebar}
                  className="rounded-full h-8 w-8 shadow-md border border-gray-300 pointer-events-auto"
                >
                  {isCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                </Button>
              </div>

              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </TabProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
