import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "./db";

// Les jetons d'accès aux comptes clients (Google, Microsoft…) sont chiffrés en base.
// Clé : APP_SECRET si défini, sinon une clé générée une fois et gardée dans data/secret.key.
function loadKey(): Buffer {
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv) return crypto.createHash("sha256").update(fromEnv).digest();
  const file = path.join(DATA_DIR, "secret.key");
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  return Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
}

const KEY = loadKey();

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
