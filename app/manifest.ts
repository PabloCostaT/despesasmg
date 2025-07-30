import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MinhaGrana PWA",
    short_name: "MinhaGrana",
    description: "Aplicativo de gestão financeira familiar",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007A33", // Cor verde escuro do tema retrô
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
