import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Pour l'application de bureau : serveur autonome embarqué dans l'installateur.
  ...(process.env.EQUIPIA_STANDALONE ? { output: "standalone" as const } : {}),
};

export default nextConfig;
