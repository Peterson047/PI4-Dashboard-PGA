"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Building, LayoutDashboard, FileText, User, PieChart, BookOpen, DollarSign, TrendingUp, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTab } from "@/lib/tabContext"

// Navigation structure with groups
const navigation = [
  // HIGHLIGHT - Main Dashboard
  {
    name: "Dashboard",
    href: "/",
    icon: PieChart,
    isLink: true,
    isHighlight: true,
  },

  // GROUP - Por Instituição
  {
    name: "Por Instituição",
    isGroup: true,
    items: [
      { name: "Visão Geral", tab: "visao-geral", icon: LayoutDashboard },
      { name: "Projetos", tab: "detalhes", icon: BookOpen },
      { name: "Recursos", tab: "recursos", icon: DollarSign },
      { name: "Tendências", tab: "tendencias", icon: TrendingUp },
      { name: "Alertas", tab: "alertas", icon: Bell },
    ]
  },

  // NORMAL - Other pages
  { name: "Documentos", href: "/documents", icon: FileText, isLink: true, isSpecial: true },
  { name: "Perfil", href: "/profile", icon: User, isLink: true },
]

interface SidebarContentProps {
  isCollapsed: boolean;
}

export function SidebarContent({ isCollapsed }: SidebarContentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { activeTab, setActiveTab } = useTab()

  const handleInstitutionNavigation = (tab: string) => {
    setActiveTab(tab)
    router.push(`/institution?tab=${tab}`)
  }

  return (
    <TooltipProvider>
      <div className={cn("flex h-16 shrink-0 items-center", isCollapsed ? "justify-center" : "px-4")}>
        <Building className="h-8 w-auto text-blue-600" />
        <span className={cn("ml-3 text-gray-800 font-semibold text-lg", isCollapsed && "hidden")}>PGA Dashboard</span>
      </div>
      <nav className={cn("flex flex-1 flex-col", !isCollapsed && "px-2")}>
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item, index) => {
                // Render GROUP
                if ('isGroup' in item && item.isGroup) {
                  return (
                    <li key={item.name} className="mt-4">
                      {!isCollapsed && (
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {item.name}
                        </div>
                      )}
                      <ul className="space-y-1">
                        {item.items?.map((subItem) => {
                          const isActive = pathname === '/institution' && activeTab === subItem.tab

                          return (
                            <li key={subItem.name}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleInstitutionNavigation(subItem.tab)}
                                    className={cn(
                                      isActive
                                        ? "bg-blue-50 text-blue-700 border-l-4 border-l-blue-600"
                                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-l-4 border-l-transparent",
                                      "group flex gap-x-3 rounded-r-md p-2 text-sm leading-6 font-medium w-full text-left transition-colors",
                                      !isCollapsed && "ml-2",
                                      isCollapsed && "justify-center"
                                    )}
                                  >
                                    <subItem.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                                    <span className={cn(!isCollapsed && "flex-1")}>{!isCollapsed && subItem.name}</span>
                                  </button>
                                </TooltipTrigger>
                                {isCollapsed && (
                                  <TooltipContent side="right">
                                    {subItem.name}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                }

                // Render LINK
                if ('isLink' in item && item.isLink) {
                  const isActive = pathname === item.href
                  const isHighlight = 'isHighlight' in item && item.isHighlight
                  const isSpecial = 'isSpecial' in item && item.isSpecial

                  return (
                    <li key={item.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              isActive
                                ? "bg-blue-100 text-blue-700"
                                : isHighlight
                                  ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border-l-4 border-l-blue-600 shadow-sm"
                                  : isSpecial
                                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border border-amber-200 shadow-sm"
                                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50",
                              "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all",
                              isHighlight && "font-bold",
                              isCollapsed && "justify-center"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "shrink-0",
                                isHighlight ? "h-6 w-6" : "h-5 w-5",
                                isSpecial && !isActive ? "text-amber-600" : ""
                              )}
                              aria-hidden="true"
                            />
                            <span className={cn(!isCollapsed && "flex-1")}>{!isCollapsed && item.name}</span>
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right">
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </li>
                  )
                }

                return null
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </TooltipProvider>
  )
}
