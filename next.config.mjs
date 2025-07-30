/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuração para PWA
  // Para produção, você pode querer usar um plugin como 'next-pwa'
  // No ambiente v0, o suporte PWA é mais simplificado via manifest.ts
  // e a inclusão de ícones no diretório public.
  // Para um PWA completo, em um ambiente real, você adicionaria:
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = { fs: false, path: false };
  //   }
  //   return config;
  // },
};

export default nextConfig;
