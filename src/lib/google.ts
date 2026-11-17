import { getConnection, saveConnection, updateAccessToken } from "./connections";

// Accès demandés au client quand il connecte son compte Google.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly", // lire les mails
  "https://www.googleapis.com/auth/gmail.send", // envoyer les mails validés
  "https://www.googleapis.com/auth/calendar.events", // lire et créer des rendez-vous
];

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/connect/google/callback`;
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline", // pour obtenir un refresh_token : l'accès reste valable sans reconnexion
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  const data = (await r.json()) as TokenResponse;
  if (!r.ok || data.error) throw new Error(`Google : ${data.error_description ?? data.error ?? r.status}`);
  return data;
}

/** Fin de la connexion OAuth : échange le code contre des jetons et enregistre le compte. */
export async function finishGoogleConnect(code: string) {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  const me = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => r.json() as Promise<{ email?: string }>);
  if (!me.email) throw new Error("Impossible de lire l'adresse du compte Google.");
  saveConnection({
    provider: "google",
    accountEmail: me.email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    scopes: tokens.scope,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  return me.email;
}

export async function revokeGoogle(token: string) {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
}

export function googleConnected() {
  return getConnection("google") !== null;
}

/** Jeton valide pour le compte Google connecté (rafraîchi automatiquement si expiré). */
async function accessToken(): Promise<string> {
  const c = getConnection("google");
  if (!c) throw new Error("Aucun compte Google connecté. Connectez-le depuis le menu Connexions.");
  if (c.expires_at > Date.now() + 60_000) return c.accessToken;
  if (!c.refreshToken) throw new Error("Accès Google expiré : reconnectez le compte depuis le menu Connexions.");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: c.refreshToken });
  const expiresAt = Date.now() + t.expires_in * 1000;
  updateAccessToken(c.id, t.access_token, expiresAt);
  return t.access_token;
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Google ${r.status} : ${text.slice(0, 300)}`);
  }
  return (await r.json()) as T;
}

// ---------- Gmail ----------

type GmailHeader = { name: string; value: string };
type GmailPart = { mimeType: string; body?: { data?: string }; parts?: GmailPart[]; headers?: GmailHeader[] };
type GmailMessage = {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
  payload: GmailPart & { headers: GmailHeader[] };
};

const header = (m: GmailMessage, name: string) =>
  m.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

function decodeB64Url(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractText(part: GmailPart): string {
  if (part.mimeType === "text/plain" && part.body?.data) return decodeB64Url(part.body.data);
  for (const p of part.parts ?? []) {
    const t = extractText(p);
    if (t) return t;
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeB64Url(part.body.data).replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }
  return "";
}

/** Recherche dans la boîte (même syntaxe que la barre de recherche Gmail). */
export async function gmailSearch(query: string, max = 15) {
  const list = await api<{ messages?: { id: string }[] }>(
    `${GMAIL}/messages?${new URLSearchParams({ q: query, maxResults: String(max) })}`,
  );
  const ids = list.messages ?? [];
  const metas = await Promise.all(
    ids.map((m) =>
      api<GmailMessage>(
        `${GMAIL}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ),
  );
  return metas.map((m) => ({
    id: m.id,
    thread_id: m.threadId,
    from: header(m, "From"),
    to: header(m, "To"),
    subject: header(m, "Subject"),
    date: header(m, "Date"),
    unread: m.labelIds?.includes("UNREAD") ?? false,
    snippet: m.snippet,
  }));
}

export async function gmailRead(id: string) {
  const m = await api<GmailMessage>(`${GMAIL}/messages/${encodeURIComponent(id)}?format=full`);
  return {
    id: m.id,
    thread_id: m.threadId,
    from: header(m, "From"),
    to: header(m, "To"),
    cc: header(m, "Cc"),
    subject: header(m, "Subject"),
    date: header(m, "Date"),
    message_id: header(m, "Message-ID"),
    body: extractText(m.payload).slice(0, 20_000),
  };
}

const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`);

/** Envoie un mail depuis le compte connecté ; si replyToId est fourni, la réponse reste dans le fil. */
export async function gmailSend(to: string, subject: string, body: string, replyToId?: string | null) {
  let threadId: string | undefined;
  const extra: string[] = [];
  if (replyToId) {
    const orig = await gmailRead(replyToId);
    threadId = orig.thread_id;
    if (orig.message_id) extra.push(`In-Reply-To: ${orig.message_id}`, `References: ${orig.message_id}`);
  }
  const raw = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    ...extra,
    "",
    Buffer.from(body, "utf8").toString("base64"),
  ].join("\r\n");
  return api<{ id: string }>(`${GMAIL}/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url"), threadId }),
  });
}

// ---------- Google Agenda ----------

type CalEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string }[];
};

export async function calendarList(from: string, to: string) {
  const data = await api<{ items: CalEvent[] }>(
    `${CALENDAR}/events?${new URLSearchParams({
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    })}`,
  );
  return data.items.map((e) => ({
    id: e.id,
    titre: e.summary ?? "(sans titre)",
    debut: e.start.dateTime ?? e.start.date,
    fin: e.end.dateTime ?? e.end.date,
    lieu: e.location,
    participants: e.attendees?.map((a) => a.email),
  }));
}

export async function calendarCreate(ev: {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}) {
  const tz = process.env.TIMEZONE ?? "Europe/Paris";
  // sendUpdates=none : aucune invitation n'est envoyée à des tiers par l'IA.
  const e = await api<CalEvent>(`${CALENDAR}/events?sendUpdates=none`, {
    method: "POST",
    body: JSON.stringify({
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      start: { dateTime: ev.start, timeZone: tz },
      end: { dateTime: ev.end, timeZone: tz },
    }),
  });
  return { id: e.id, lien: e.htmlLink };
}
