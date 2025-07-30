"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, DollarSign, Users, Folder, Wallet, Settings, LogOut, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Menu items.
const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Despesas",
    href: "/expenses",
    icon: DollarSign,
  },
  {
    title: "Famílias",
    href: "/families",
    icon: Users,
  },
  {
    title: "Projetos",
    href: "/projects",
    icon: Folder,
  },
  {
    title: "Carteira",
    href: "/wallets",
    icon: Wallet,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 p-2">
          <img src="/icon-192x192.png" alt="MinhaGrana Logo" className="h-8 w-8" />
          <span className="text-xl font-bold text-retro-green-foreground">MinhaGrana</span>
        </Link>
        <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={pathname === item.href}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="w-full">
                Ferramentas
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link href="/settings">
                              <Settings />
                              <span>Configurações</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">Configurações</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link href="/help">
                              <Plus />
                              <span>Ajuda</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">Ajuda e Suporte</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <img
                    src={user?.avatar_url || "/placeholder.svg?height=24&width=24&query=user-avatar"}
                    alt="User Avatar"
                    className="h-6 w-6 rounded-full border border-retro-border"
                  />
                  <span>{user?.name || user?.email || "Usuário"}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width] retro-card">
                <DropdownMenuItem className="retro-text">
                  <Link href="/profile" className="w-full">
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="retro-text">
                  <Link href="/billing" className="w-full">
                    <span>Assinatura</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="retro-text">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
