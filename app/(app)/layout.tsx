"use client"

import type React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/auth-provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-retro-background">
        <Loader2 className="h-10 w-10 animate-spin text-retro-green" />
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Should redirect by useEffect
  }

  // Generate breadcrumbs based on pathname
  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/")
    const isLast = index === pathSegments.length - 1
    const displaySegment = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

    return (
      <BreadcrumbItem key={href}>
        {isLast ? (
          <BreadcrumbPage className="retro-text">{displaySegment}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={href} className="text-retro-green hover:underline">
            {displaySegment}
          </BreadcrumbLink>
        )}
        {!isLast && <BreadcrumbSeparator className="retro-text" />}
      </BreadcrumbItem>
    )
  })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b-2 border-retro-border bg-retro-background px-4">
          <SidebarTrigger className="-ml-1 retro-button" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-retro-border" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-retro-green hover:underline">
                  Início
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pathSegments.length > 0 && <BreadcrumbSeparator className="retro-text" />}
              {breadcrumbs}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 bg-retro-background retro-text">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
