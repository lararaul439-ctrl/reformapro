import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida "standalone": imagen de despliegue mínima (Docker, VPS, etc.).
  output: "standalone",
  poweredByHeader: false,
  // Estos paquetes usan módulos nativos / Node y no deben empaquetarse.
  serverExternalPackages: ["@libsql/client", "libsql", "@react-pdf/renderer"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
