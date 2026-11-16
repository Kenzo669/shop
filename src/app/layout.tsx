import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bureau IA",
  description: "Un bureau virtuel en 3D où des agents IA travaillent pour votre entreprise.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
