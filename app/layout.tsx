import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MinhaGrana - Gestão Financeira Familiar",
  description: "Aplicativo para famílias registrarem, acompanharem e dividirem despesas.",
  manifest: "/manifest.ts", // Link para o manifest PWA
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
