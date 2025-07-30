"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFormik } from "formik"
import * as Yup from "yup"
import { toast } from "sonner"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RetroButton } from "@/components/retro-button"
import api from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"

const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Email inválido").required("Email é obrigatório"),
  password: Yup.string().required("Senha é obrigatória"),
})

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validationSchema: isRegistering
      ? Yup.object().shape({
          name: Yup.string().required("Nome é obrigatório"),
          email: Yup.string().email("Email inválido").required("Email é obrigatório"),
          password: Yup.string().min(6, "Senha deve ter no mínimo 6 caracteres").required("Senha é obrigatória"),
        })
      : LoginSchema,
    onSubmit: async (values) => {
      try {
        let response
        if (isRegistering) {
          response = await api.post("/auth/register", {
            name: values.name,
            email: values.email,
            password: values.password,
          })
          toast.success("Cadastro realizado com sucesso! Faça login para continuar.")
          setIsRegistering(false) // Voltar para o formulário de login
          formik.resetForm() // Limpar o formulário
        } else {
          response = await api.post("/auth/login", {
            email: values.email,
            password: values.password,
          })
          login(response.data.token, response.data.user)
          toast.success("Login realizado com sucesso!")
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "Ocorreu um erro. Tente novamente."
        toast.error(errorMessage)
      }
    },
  })

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: 'url("/images/retro-pattern.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <RetroCard className="w-full max-w-md p-6">
        <RetroCardHeader className="text-center">
          <RetroCardTitle className="text-retro-green">MinhaGrana</RetroCardTitle>
          <p className="text-sm text-retro-text">{isRegistering ? "Crie sua conta" : "Faça login para continuar"}</p>
        </RetroCardHeader>
        <RetroCardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <Label htmlFor="name" className="retro-text">
                  Nome
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.name}
                  className="retro-border bg-white text-retro-text"
                />
                {formik.touched.name && formik.errors.name && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.name}</div>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="email" className="retro-text">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
                className="retro-border bg-white text-retro-text"
              />
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.email}</div>
              )}
            </div>
            <div>
              <Label htmlFor="password" className="retro-text">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
                className="retro-border bg-white text-retro-text"
              />
              {formik.touched.password && formik.errors.password && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.password}</div>
              )}
            </div>
            <RetroButton type="submit" className="w-full" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Carregando..." : isRegistering ? "Cadastrar" : "Entrar"}
            </RetroButton>
          </form>
          <div className="mt-4 text-center text-sm retro-text">
            {isRegistering ? (
              <>
                Já tem uma conta?{" "}
                <Link href="#" onClick={() => setIsRegistering(false)} className="text-retro-green hover:underline">
                  Faça login
                </Link>
              </>
            ) : (
              <>
                Não tem uma conta?{" "}
                <Link href="#" onClick={() => setIsRegistering(true)} className="text-retro-green hover:underline">
                  Cadastre-se
                </Link>
              </>
            )}
          </div>
          {!isRegistering && (
            <div className="mt-2 text-center text-sm">
              <Link href="/forgot-password" className="text-retro-green hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
          )}
        </RetroCardContent>
      </RetroCard>
    </div>
  )
}
