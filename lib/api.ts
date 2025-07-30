import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar o token JWT a cada requisição
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("minhagrana_jwt_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor para lidar com erros de autenticação (ex: token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado ou inválido, redirecionar para login
      localStorage.removeItem("minhagrana_jwt_token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

export default api
