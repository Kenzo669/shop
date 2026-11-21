import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { db, filesDir } from "@/lib/db";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  const files = fs.readdirSync(filesDir()).map((name) => {
    const st = fs.statSync(path.join(filesDir(), name));
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

export const GET = authed("GET", GET_handler);
