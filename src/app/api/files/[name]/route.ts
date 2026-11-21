import fs from "fs";
import path from "path";
import { filesDir } from "@/lib/db";
import { safeFileName } from "@/lib/tools";
import { authed } from "@/lib/auth";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function GET_handler(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name: raw } = await params;
  const name = safeFileName(decodeURIComponent(raw));
  const p = name && path.join(filesDir(), name);
  if (!p || !fs.existsSync(p)) return new Response("Introuvable", { status: 404 });
  const ext = path.extname(p).toLowerCase();
  return new Response(fs.readFileSync(p), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      // Les fichiers HTML écrits par l'IA s'affichent sans pouvoir exécuter de script.
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src * data:",
    },
  });
}

export const GET = authed("GET", GET_handler);
