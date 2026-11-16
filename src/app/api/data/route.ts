import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { db, FILES_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const files = fs.readdirSync(FILES_DIR).map((name) => {
    const st = fs.statSync(path.join(FILES_DIR, name));
    return { name, size: st.size, modified: st.mtime.toISOString() };
  });
  files.sort((a, b) => b.modified.localeCompare(a.modified));
  return NextResponse.json({
    emails: db.prepare("SELECT * FROM emails ORDER BY id DESC LIMIT 200").all(),
    transactions: db.prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT 500").all(),
    prospects: db.prepare("SELECT * FROM prospects ORDER BY id DESC").all(),
    files,
  });
}
