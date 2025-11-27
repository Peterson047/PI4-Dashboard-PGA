"use client"

// Removido useState, Button, ChevronLeft, ChevronRight
import { SidebarContent } from "./SidebarContent"

interface SidebarProps { // Definir props
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) { // Receber isCollapsed como prop
  // Removido toggleSidebar

  return (
    <div
      className={`relative flex flex-col h-full border-r bg-gray-50 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Removido o div do botão de toggle */}
      <SidebarContent isCollapsed={isCollapsed} />
    </div>
  )
}
