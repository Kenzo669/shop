// Connexion des outils externes via MCP (Model Context Protocol) :
// découverte OAuth standard, enregistrement automatique du client, PKCE, jetons chiffrés,
// lecture de la liste des actions du serveur, et configuration pour l'API Claude.
import crypto from "crypto";
import { db, registerSchema } from "./db";
import { decrypt, encrypt } from "./crypto";
import { CATALOG_BY_ID } from "./catalog";

registerSchema(`
  CREATE TABLE IF NOT EXISTS mcp_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_id TEXT NOT NULL,       -- entrée du catalogue, ou 'custom'
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    auth TEXT NOT NULL,             -- oauth | token | none
    secret TEXT,                    -- chiffré : JSON { access_token, refresh_token, client_id, client_secret, token_endpoint }
    expires_at INTEGER,
    agents TEXT NOT NULL,           -- JSON : ids des agents autorisés
    tools TEXT,                     -- JSON : [{ name, description, readOnly, destructive }]
    disabled_tools TEXT NOT NULL DEFAULT '[]',
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS oauth_pending (
    state TEXT PRIMARY KEY,
    data TEXT NOT NULL,             -- chiffré
    created_at INTEGER NOT NULL
  );
`);

type Secret = {
  access_token?: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
  token_endpoint?: string;
};

export type McpTool = { name: string; description: string; readOnly: boolean; destructive: boolean };

type Row = {
  id: number;
  catalog_id: string;
  name: string;
  url: string;
  auth: "oauth" | "token" | "none";
  secret: string | null;
  expires_at: number | null;
  agents: string;
  tools: string | null;
  disabled_tools: string;
  last_error: string | null;
  created_at: string;
};

export type McpConnection = {
  id: number;
  catalog_id: string;
  name: string;
  url: string;
  auth: Row["auth"];
  agents: string[];
  tools: McpTool[] | null;
  disabled_tools: string[];
  last_error: string | null;
  created_at: string;
};

const publicView = (r: Row): McpConnection => ({
  id: r.id,
  catalog_id: r.catalog_id,
  name: r.name,
  url: r.url,
  auth: r.auth,
  agents: JSON.parse(r.agents),
  tools: r.tools ? JSON.parse(r.tools) : null,
  disabled_tools: JSON.parse(r.disabled_tools),
  last_error: r.last_error,
  created_at: r.created_at,
});

export function listMcp(): McpConnection[] {
  return (db.prepare("SELECT * FROM mcp_connections ORDER BY id").all() as Row[]).map(publicView);
}

function getRow(id: number) {
  return db.prepare("SELECT * FROM mcp_connections WHERE id = ?").get(id) as Row | undefined;
}

const readSecret = (r: Row): Secret => (r.secret ? (JSON.parse(decrypt(r.secret)) as Secret) : {});

export function checkUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error("Adresse invalide.");
  }
  // http:// n'est accepté que pour un serveur local (tests, outils installés sur la machine).
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) throw new Error("L'adresse doit commencer par https://");
  return u.toString();
}

function redirectUri() {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/connect/mcp/callback`;
}

// ------------------------------------------------------------ OAuth (spécification MCP)

type AsMetadata = {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Trouve le serveur d'autorisation d'un serveur MCP (RFC 9728 puis RFC 8414). */
export async function discoverOAuth(serverUrl: string) {
  const u = new URL(serverUrl);
  // 1. Le serveur indique ses métadonnées dans l'en-tête WWW-Authenticate d'une réponse 401.
  let prmUrl: string | null = null;
  try {
    const r = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: initParams() }),
      signal: AbortSignal.timeout(10_000),
    });
    const wa = r.headers.get("www-authenticate") ?? "";
    prmUrl = /resource_metadata="([^"]+)"/.exec(wa)?.[1] ?? null;
    if (r.ok) return null; // pas d'authentification requise
  } catch {
    throw new Error("Le serveur ne répond pas. Vérifiez l'adresse.");
  }
  const candidates = [
    prmUrl,
    `${u.origin}/.well-known/oauth-protected-resource${u.pathname === "/" ? "" : u.pathname}`,
    `${u.origin}/.well-known/oauth-protected-resource`,
  ].filter(Boolean) as string[];
  let prm: { authorization_servers?: string[]; scopes_supported?: string[]; resource?: string } | null = null;
  for (const c of candidates) if ((prm = await getJson(c))) break;
  const issuer = prm?.authorization_servers?.[0] ?? u.origin; // ancienne spécification : le serveur est son propre émetteur
  const iu = new URL(issuer);
  const path = iu.pathname === "/" ? "" : iu.pathname;
  const asCandidates = [
    `${iu.origin}/.well-known/oauth-authorization-server${path}`,
    `${iu.origin}/.well-known/openid-configuration${path}`,
    `${iu.origin}${path}/.well-known/openid-configuration`,
    `${iu.origin}/.well-known/oauth-authorization-server`,
  ];
  let as: AsMetadata | null = null;
  for (const c of asCandidates) if ((as = await getJson<AsMetadata>(c))?.authorization_endpoint) break;
  if (!as?.authorization_endpoint || !as.token_endpoint) {
    throw new Error("Ce serveur ne propose pas de connexion automatique : utilisez une clé d'accès.");
  }
  return { as, scopes: prm?.scopes_supported ?? as.scopes_supported, resource: prm?.resource ?? serverUrl };
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Étape 1 : prépare l'URL de consentement de l'éditeur (enregistrement du client + PKCE). */
export async function startOAuth(input: { catalogId: string; name: string; url: string; agents: string[] }) {
  const url = checkUrl(input.url);
  const found = await discoverOAuth(url);
  if (!found) return { noAuth: true as const, url };
  const { as, scopes, resource } = found;
  if (!as.registration_endpoint) {
    throw new Error("Ce serveur n'accepte pas l'enregistrement automatique : utilisez une clé d'accès si l'éditeur en propose.");
  }
  const reg = await fetch(as.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Bureau IA",
      redirect_uris: [redirectUri()],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!reg.ok) throw new Error(`Enregistrement refusé par le serveur (${reg.status}).`);
  const client = (await reg.json()) as { client_id: string; client_secret?: string };
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(24));
  db.prepare("DELETE FROM oauth_pending WHERE created_at < ?").run(Date.now() - 15 * 60_000);
  db.prepare("INSERT INTO oauth_pending (state, data, created_at) VALUES (?, ?, ?)").run(
    state,
    encrypt(
      JSON.stringify({
        ...input,
        url,
        resource,
        verifier,
        client_id: client.client_id,
        client_secret: client.client_secret,
        token_endpoint: as.token_endpoint,
      }),
    ),
    Date.now(),
  );
  const params = new URLSearchParams({
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: redirectUri(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    resource,
  });
  if (scopes?.length) params.set("scope", scopes.join(" "));
  return { authorizeUrl: `${as.authorization_endpoint}?${params}`, state };
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };

async function tokenRequest(endpoint: string, body: Record<string, string>, clientSecret?: string) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(clientSecret ? { ...body, client_secret: clientSecret } : body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await r.json().catch(() => ({}))) as TokenResponse;
  if (!r.ok || !data.access_token) throw new Error(data.error_description ?? data.error ?? `refus du serveur (${r.status})`);
  return data;
}

/** Étape 2 : retour de l'éditeur avec un code, échangé contre les jetons. */
export async function finishOAuth(state: string, code: string) {
  const row = db.prepare("SELECT data FROM oauth_pending WHERE state = ?").get(state) as { data: string } | undefined;
  if (!row) throw new Error("Demande de connexion expirée, recommencez.");
  db.prepare("DELETE FROM oauth_pending WHERE state = ?").run(state);
  const p = JSON.parse(decrypt(row.data)) as {
    catalogId: string;
    name: string;
    url: string;
    agents: string[];
    resource: string;
    verifier: string;
    client_id: string;
    client_secret?: string;
    token_endpoint: string;
  };
  const t = await tokenRequest(
    p.token_endpoint,
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: p.client_id,
      code_verifier: p.verifier,
      resource: p.resource,
    },
    p.client_secret,
  );
  const id = insertConnection({
    catalogId: p.catalogId,
    name: p.name,
    url: p.url,
    auth: "oauth",
    agents: p.agents,
    secret: {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      client_id: p.client_id,
      client_secret: p.client_secret,
      token_endpoint: p.token_endpoint,
    },
    expiresAt: t.expires_in ? Date.now() + t.expires_in * 1000 : null,
  });
  await refreshTools(id);
  return p.name;
}

/** Connexion avec une clé d'accès (ou sans authentification). */
export async function connectWithToken(input: { catalogId: string; name: string; url: string; token?: string; agents: string[] }) {
  const url = checkUrl(input.url);
  const id = insertConnection({
    catalogId: input.catalogId,
    name: input.name,
    url,
    auth: input.token ? "token" : "none",
    agents: input.agents,
    secret: input.token ? { access_token: input.token.trim() } : null,
    expiresAt: null,
  });
  await refreshTools(id);
  const c = getRow(id)!;
  if (c.last_error) {
    db.prepare("DELETE FROM mcp_connections WHERE id = ?").run(id);
    throw new Error(c.last_error);
  }
  return id;
}

function insertConnection(c: {
  catalogId: string;
  name: string;
  url: string;
  auth: Row["auth"];
  agents: string[];
  secret: Secret | null;
  expiresAt: number | null;
}) {
  const r = db
    .prepare("INSERT INTO mcp_connections (catalog_id, name, url, auth, secret, expires_at, agents) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(c.catalogId, c.name, c.url, c.auth, c.secret ? encrypt(JSON.stringify(c.secret)) : null, c.expiresAt, JSON.stringify(c.agents));
  return Number(r.lastInsertRowid);
}

/** Jeton valide pour une connexion (renouvelé automatiquement s'il expire bientôt). */
async function validToken(r: Row): Promise<string | undefined> {
  const s = readSecret(r);
  if (r.auth !== "oauth") return s.access_token;
  if (!r.expires_at || r.expires_at > Date.now() + 5 * 60_000) return s.access_token;
  if (!s.refresh_token || !s.token_endpoint || !s.client_id) {
    throw new Error(`Accès à ${r.name} expiré : reconnectez-le.`);
  }
  const t = await tokenRequest(
    s.token_endpoint,
    { grant_type: "refresh_token", refresh_token: s.refresh_token, client_id: s.client_id, resource: r.url },
    s.client_secret,
  );
  const next: Secret = { ...s, access_token: t.access_token, refresh_token: t.refresh_token ?? s.refresh_token };
  db.prepare("UPDATE mcp_connections SET secret = ?, expires_at = ? WHERE id = ?").run(
    encrypt(JSON.stringify(next)),
    t.expires_in ? Date.now() + t.expires_in * 1000 : null,
    r.id,
  );
  return t.access_token;
}

// ------------------------------------------------------------ Dialogue MCP (liste des actions)

function initParams() {
  return { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Bureau IA", version: "1.0" } };
}

/** Lit une réponse JSON-RPC, en JSON simple ou en flux SSE (« Streamable HTTP »). */
async function readRpc(r: Response, id: number) {
  const type = r.headers.get("content-type") ?? "";
  const text = await r.text();
  const messages = type.includes("text/event-stream")
    ? text
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => {
          try {
            return JSON.parse(l.slice(5).trim());
          } catch {
            return null;
          }
        })
    : [JSON.parse(text)];
  const msg = messages.find((m) => m && m.id === id);
  if (!msg) throw new Error("réponse inattendue du serveur");
  if (msg.error) throw new Error(msg.error.message ?? "erreur du serveur");
  return msg.result;
}

async function listServerTools(url: string, token?: string): Promise<McpTool[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const post = (body: unknown, extra: Record<string, string> = {}) =>
    fetch(url, { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
  const init = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: initParams() });
  if (init.status === 401 || init.status === 403) throw new Error("Accès refusé : la clé ou la connexion n'est pas valide.");
  if (!init.ok) throw new Error(`Le serveur a répondu ${init.status}. Vérifiez l'adresse.`);
  const session = init.headers.get("mcp-session-id");
  const extra: Record<string, string> = session ? { "Mcp-Session-Id": session } : {};
  await readRpc(init, 1);
  await post({ jsonrpc: "2.0", method: "notifications/initialized" }, extra).catch(() => null);
  const tools: McpTool[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await post({ jsonrpc: "2.0", id: 2 + page, method: "tools/list", params: cursor ? { cursor } : {} }, extra);
    const result = (await readRpc(res, 2 + page)) as {
      tools: { name: string; description?: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } }[];
      nextCursor?: string;
    };
    for (const t of result.tools ?? []) {
      const readOnly = t.annotations?.readOnlyHint === true;
      tools.push({
        name: t.name,
        description: (t.description ?? "").slice(0, 300),
        readOnly,
        // Sans indication, une action qui modifie quelque chose est considérée comme potentiellement destructive
        // seulement si son nom le suggère ; l'utilisateur peut tout ajuster.
        destructive: !readOnly && (t.annotations?.destructiveHint === true || /delete|remove|refund|cancel|archive|destroy|drop|purge|void/i.test(t.name)),
      });
    }
    if (!(cursor = result.nextCursor)) break;
  }
  return tools;
}

/** Relit la liste des actions du serveur et désactive par défaut les actions destructrices nouvelles. */
export async function refreshTools(id: number) {
  const r = getRow(id);
  if (!r) throw new Error("Connexion introuvable.");
  try {
    const tools = await listServerTools(r.url, await validToken(r));
    const known = new Set((r.tools ? (JSON.parse(r.tools) as McpTool[]) : []).map((t) => t.name));
    const disabled = new Set(JSON.parse(r.disabled_tools) as string[]);
    for (const t of tools) if (!known.has(t.name) && t.destructive) disabled.add(t.name);
    db.prepare("UPDATE mcp_connections SET tools = ?, disabled_tools = ?, last_error = NULL WHERE id = ?").run(
      JSON.stringify(tools),
      JSON.stringify([...disabled]),
      id,
    );
  } catch (err) {
    db.prepare("UPDATE mcp_connections SET last_error = ? WHERE id = ?").run(err instanceof Error ? err.message : String(err), id);
  }
}

export function updateMcp(id: number, patch: { agents?: string[]; disabled_tools?: string[] }) {
  if (patch.agents) db.prepare("UPDATE mcp_connections SET agents = ? WHERE id = ?").run(JSON.stringify(patch.agents), id);
  if (patch.disabled_tools)
    db.prepare("UPDATE mcp_connections SET disabled_tools = ? WHERE id = ?").run(JSON.stringify(patch.disabled_tools), id);
}

export function deleteMcp(id: number) {
  db.prepare("DELETE FROM mcp_connections WHERE id = ?").run(id);
}

// ------------------------------------------------------------ Pour l'API Claude

const serverName = (r: Row) => `c${r.id}-${(CATALOG_BY_ID[r.catalog_id]?.id ?? "outil").replace(/[^a-z0-9-]/gi, "")}`;

/** Serveurs MCP et toolsets à fournir à un agent pour une tâche. */
export async function mcpForAgent(agentId: string, onError: (msg: string) => void) {
  const rows = (db.prepare("SELECT * FROM mcp_connections").all() as Row[]).filter((r) =>
    (JSON.parse(r.agents) as string[]).includes(agentId),
  );
  const servers: { type: "url"; url: string; name: string; authorization_token?: string }[] = [];
  const toolsets: { type: "mcp_toolset"; mcp_server_name: string; configs?: Record<string, { enabled: boolean }> }[] = [];
  const names: string[] = [];
  for (const r of rows) {
    let token: string | undefined;
    try {
      token = await validToken(r);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
      continue;
    }
    const name = serverName(r);
    servers.push({ type: "url", url: r.url, name, ...(token ? { authorization_token: token } : {}) });
    const disabled = JSON.parse(r.disabled_tools) as string[];
    toolsets.push({
      type: "mcp_toolset",
      mcp_server_name: name,
      ...(disabled.length ? { configs: Object.fromEntries(disabled.map((t) => [t, { enabled: false }])) } : {}),
    });
    names.push(r.name);
  }
  return { servers, toolsets, names };
}
