// src/index.ts
// Cloudflare Worker backend for "Histórias que Rolamos" — Server-Authoritative Sync
// Fonte da verdade: D1. Frontend usa IndexedDB apenas como espelho de leitura.

// --- JWT HELPER FUNCTIONS ---
function base64UrlEncode(str: string): string {
  const binary = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...binary))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function signJwt(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${encodedSignature}`;
}

async function verifyJwt(token: string, secret: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(
      atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => c.charCodeAt(0))
    );

    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(data)
    );

    if (!verified) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// --- PASSWORD HASHING FUNCTIONS ---
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    key,
    256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    key,
    256
  );
  const checkHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return checkHex === hashHex;
}

// --- ENVIRONMENT INTERFACE ---
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

// --- HELPER CORS HEADERS ---
function corsHeaders(origin: string | null = '*'): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return headers;
}

// --- MAX PAYLOAD SIZE (1MB por mutation) para proteger o plano free ---
const MAX_MUTATION_PAYLOAD = 1_000_000; // 1MB
const MAX_SYNC_MUTATIONS = 500;

// Maps camelCase payload → snake_case SQL columns
const ENTITY_META: Record<string, {
  table: string;
  columns: string[];
  placeholders: string;
  valueGetter: (p: any) => any[];
  updateSet: string;
}> = {
  campaign: {
    table: 'campaigns',
    columns: ['id', 'name', 'system', 'description', 'cover_image_id', 'start_date', 'created_at', 'updated_at', 'version', 'deleted'],
    placeholders: '(?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    valueGetter: (p) => [p.id, p.name, p.system, p.description || null, p.coverImageId || null, p.startDate, p.createdAt, p.updatedAt],
    updateSet: `name = ?, system = ?, description = ?, cover_image_id = ?, start_date = ?, updated_at = ?, version = ?`
  },
  character: {
    table: 'characters',
    columns: ['id', 'campaign_id', 'player_name', 'name', 'character_type', 'race', 'origin', 'class', 'level', 'hp', 'mp', 'image_id', 'sheet_media_id', 'concept', 'description', 'notes', 'evolutions', 'created_at', 'updated_at', 'version', 'deleted'],
    placeholders: '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    valueGetter: (p) => [p.id, p.campaignId, p.playerName || null, p.name, p.characterType, p.race || null, p.origin || null, p.class || null, p.level, p.hp, p.mp, p.imageId || null, p.sheetMediaId || null, p.concept || null, p.description || null, p.notes || null, JSON.stringify(p.evolutions || []), p.createdAt, p.updatedAt || null],
    updateSet: `campaign_id = ?, player_name = ?, name = ?, character_type = ?, race = ?, origin = ?, class = ?, level = ?, hp = ?, mp = ?, image_id = ?, sheet_media_id = ?, concept = ?, description = ?, notes = ?, evolutions = ?, updated_at = ?, version = ?`
  },
  memory: {
    table: 'memories',
    columns: ['id', 'campaign_id', 'title', 'description', 'hero_descriptions', 'event_date', 'type', 'image_id', 'character_ids', 'tags', 'comments', 'created_at', 'updated_at', 'version', 'deleted'],
    placeholders: '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    valueGetter: (p) => [p.id, p.campaignId, p.title, p.description || null, JSON.stringify(p.heroDescriptions || {}), p.eventDate, p.type, p.imageId || null, JSON.stringify(p.characterIds || []), JSON.stringify(p.tags || []), JSON.stringify(p.comments || []), p.createdAt, p.updatedAt],
    updateSet: `campaign_id = ?, title = ?, description = ?, hero_descriptions = ?, event_date = ?, type = ?, image_id = ?, character_ids = ?, tags = ?, comments = ?, updated_at = ?, version = ?`
  },
  memoryCharacter: {
    table: 'memory_characters',
    columns: ['id', 'campaign_id', 'memory_id', 'character_id', 'level_reached', 'version', 'deleted'],
    placeholders: '(?, ?, ?, ?, ?, ?, 0)',
    valueGetter: (p) => [p.id, p.campaignId, p.memoryId, p.characterId, p.levelReached || null],
    updateSet: `campaign_id = ?, memory_id = ?, character_id = ?, level_reached = ?, version = ?`
  },
  token: {
    table: 'tokens',
    columns: ['id', 'campaign_id', 'name', 'media_id', 'category', 'related_character_id', 'notes', 'created_at', 'updated_at', 'version', 'deleted'],
    placeholders: '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    valueGetter: (p) => [p.id, p.campaignId, p.name, p.mediaId, p.category, p.relatedCharacterId || null, p.notes || null, p.createdAt, p.updatedAt],
    updateSet: `campaign_id = ?, name = ?, media_id = ?, category = ?, related_character_id = ?, notes = ?, updated_at = ?, version = ?`
  },
  media: {
    table: 'media',
    columns: ['id', 'campaign_id', 'filename', 'mime_type', 'size', 'width', 'height', 'title', 'description', 'event_date', 'related_character_id', 'related_memory_id', 'tags', 'is_gallery', 'created_at', 'updated_at', 'version', 'deleted'],
    placeholders: '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    valueGetter: (p) => [p.id, p.campaignId, p.filename, p.mimeType, p.size, p.width || null, p.height || null, p.title || null, p.description || null, p.eventDate || null, p.relatedCharacterId || null, p.relatedMemoryId || null, JSON.stringify(p.tags || []), p.isGallery ? 1 : 0, p.createdAt, p.createdAt],
    updateSet: `campaign_id = ?, filename = ?, mime_type = ?, size = ?, width = ?, height = ?, title = ?, description = ?, event_date = ?, related_character_id = ?, related_memory_id = ?, tags = ?, is_gallery = ?, updated_at = ?, version = ?`
  }
};

// Child tables for campaign cascade delete
const CAMPAIGN_CHILD_TABLES = [
  { table: 'characters', entityType: 'character', idCol: 'id' },
  { table: 'memories', entityType: 'memory', idCol: 'id' },
  { table: 'memory_characters', entityType: 'memoryCharacter', idCol: 'id' },
  { table: 'tokens', entityType: 'token', idCol: 'id' },
  { table: 'media', entityType: 'media', idCol: 'id' }
];

// Maps snake_case SQL row → camelCase client object (used for change_log payloads already camelCase)
function serializeConflictRow(row: any): any {
  if (!row) return null;
  const out: any = { ...row };
  if (out.evolutions) out.evolutions = JSON.parse(out.evolutions);
  if (out.hero_descriptions) {
    out.heroDescriptions = JSON.parse(out.hero_descriptions);
    delete out.hero_descriptions;
  }
  if (out.character_ids) {
    out.characterIds = JSON.parse(out.character_ids);
    delete out.character_ids;
  }
  if (out.tags) out.tags = JSON.parse(out.tags);
  if (out.comments) out.comments = JSON.parse(out.comments);
  if (out.campaign_id) { out.campaignId = out.campaign_id; delete out.campaign_id; }
  if (out.player_name) { out.playerName = out.player_name; delete out.player_name; }
  if (out.character_type) { out.characterType = out.character_type; delete out.character_type; }
  if (out.cover_image_id) { out.coverImageId = out.cover_image_id; delete out.cover_image_id; }
  if (out.start_date) { out.startDate = out.start_date; delete out.start_date; }
  if (out.created_at) { out.createdAt = out.created_at; delete out.created_at; }
  if (out.updated_at) { out.updatedAt = out.updated_at; delete out.updated_at; }
  if (out.image_id) { out.imageId = out.image_id; delete out.image_id; }
  if (out.sheet_media_id) { out.sheetMediaId = out.sheet_media_id; delete out.sheet_media_id; }
  if (out.mime_type) { out.mimeType = out.mime_type; delete out.mime_type; }
  if (out.is_gallery !== undefined) { out.isGallery = out.is_gallery === 1; delete out.is_gallery; }
  if (out.related_character_id) { out.relatedCharacterId = out.related_character_id; delete out.related_character_id; }
  if (out.related_memory_id) { out.relatedMemoryId = out.related_memory_id; delete out.related_memory_id; }
  if (out.media_id) { out.mediaId = out.media_id; delete out.media_id; }
  if (out.memory_id) { out.memoryId = out.memory_id; delete out.memory_id; }
  if (out.character_id) { out.characterId = out.character_id; delete out.character_id; }
  if (out.level_reached) { out.levelReached = out.level_reached; delete out.level_reached; }
  if (out.event_date) { out.eventDate = out.event_date; delete out.event_date; }
  if (out.deleted) out.deleted = out.deleted === 1;
  return out;
}

// --- MAIN CONTROLLER HANDLER ---
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('origin');
    const headers = corsHeaders(origin);

    // Preflight check
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- PUBLIC AUTH ROUTES ---
      if (path === '/api/auth/register' && request.method === 'POST') {
        const body = await request.json() as any;
        if (!body.username || !body.password) {
          return new Response(JSON.stringify({ error: 'Username e senha obrigatórios.' }), { status: 400, headers });
        }
        if (typeof body.username !== 'string' || typeof body.password !== 'string' ||
          body.username.length < 3 || body.username.length > 50 ||
          body.password.length < 4 || body.password.length > 200) {
          return new Response(JSON.stringify({ error: 'Credenciais inválidas. Usuário: 3-50 chars, Senha: 4-200 chars.' }), { status: 400, headers });
        }

        const userId = crypto.randomUUID();
        const hash = await hashPassword(body.password);
        const now = new Date().toISOString();

        try {
          await env.DB.prepare(
            'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
          ).bind(userId, body.username, hash, now).run();
        } catch (e: any) {
          if (e.message?.includes('UNIQUE')) {
            return new Response(JSON.stringify({ error: 'Este grimório já possui um proprietário com este nome.' }), { status: 400, headers });
          }
          throw e;
        }

        const token = await signJwt({ sub: userId, username: body.username, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30) }, env.JWT_SECRET);
        return new Response(JSON.stringify({ token, user: { id: userId, username: body.username } }), { status: 201, headers });
      }

      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json() as any;
        if (!body.username || !body.password) {
          return new Response(JSON.stringify({ error: 'Username e senha obrigatórios.' }), { status: 400, headers });
        }

        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE username = ?'
        ).bind(body.username).first<any>();

        if (!user || !(await verifyPassword(body.password, user.password_hash))) {
          return new Response(JSON.stringify({ error: 'Chave de entrada incorreta para este grimório.' }), { status: 401, headers });
        }

        const token = await signJwt({ sub: user.id, username: user.username, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30) }, env.JWT_SECRET);
        return new Response(JSON.stringify({ token, user: { id: user.id, username: user.username } }), { status: 200, headers });
      }

      // --- AUTHENTICATED MIDDLEWARE SHIELD ---
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Acesso restrito. Autentique-se primeiro.' }), { status: 401, headers });
      }

      const token = authHeader.substring(7);
      const userPayload = await verifyJwt(token, env.JWT_SECRET);
      if (!userPayload) {
        return new Response(JSON.stringify({ error: 'Token inválido ou expirado.' }), { status: 401, headers });
      }

      const currentUserId = userPayload.sub;

      // --- CAMPAIGN JOIN ROUTE ---
      if (path === '/api/campaigns/join' && request.method === 'POST') {
        const body = await request.json() as any;
        if (!body.campaignId) {
          return new Response(JSON.stringify({ error: 'ID da campanha obrigatório.' }), { status: 400, headers });
        }

        // Check if campaign exists (not deleted)
        const campaign = await env.DB.prepare(
          'SELECT * FROM campaigns WHERE id = ? AND deleted = 0'
        ).bind(body.campaignId).first();

        if (!campaign) {
          return new Response(JSON.stringify({ error: 'Grimório não encontrado.' }), { status: 404, headers });
        }

        // Add user as PLAYER (don't downgrade an existing MASTER)
        await env.DB.prepare(
          'INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, ?)'
        ).bind(body.campaignId, currentUserId, 'PLAYER').run();

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      // --- CAMPAIGN LEAVE ROUTE (remove membership) ---
      if (path === '/api/campaigns/leave' && request.method === 'POST') {
        const body = await request.json() as any;
        if (!body.campaignId) {
          return new Response(JSON.stringify({ error: 'ID da campanha obrigatório.' }), { status: 400, headers });
        }
        await env.DB.prepare(
          'DELETE FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
        ).bind(body.campaignId, currentUserId).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      // --- MEDIA D1 ENDPOINTS (native BLOB storage) ---
      if (path.startsWith('/api/media/upload/') && request.method === 'PUT') {
        const rawId = path.substring(18); // Get /api/media/upload/:id
        const contentLength = request.headers.get('Content-Length') || '0';
        if (parseInt(contentLength, 10) > 15_000_000) {
          return new Response(JSON.stringify({ error: 'Arquivo excede 15MB.' }), { status: 413, headers });
        }
        const body = await request.arrayBuffer();

        await env.DB.prepare(
          'INSERT OR REPLACE INTO media_files (id, data) VALUES (?, ?)'
        ).bind(rawId, body).run();

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (path.startsWith('/api/media/download/')) {
        const rawId = path.substring(20); // Get /api/media/download/:id
        const isThumb = rawId.endsWith('_thumb');
        const mediaId = isThumb ? rawId.slice(0, -6) : rawId;

        const row = await env.DB.prepare(
          'SELECT data FROM media_files WHERE id = ?'
        ).bind(rawId).first<any>();

        if (!row || !row.data) {
          return new Response(JSON.stringify({ error: 'Arquivo não encontrado.' }), { status: 404, headers });
        }

        // Get mime_type from metadata table if available
        const mimeRow = await env.DB.prepare(
          'SELECT mime_type FROM media WHERE id = ?'
        ).bind(mediaId).first<any>();

        const fileHeaders = new Headers(headers);
        fileHeaders.set('Content-Type', mimeRow?.mime_type || 'application/octet-stream');
        fileHeaders.set('Cache-Control', 'public, max-age=31536000');

        return new Response(row.data, { headers: fileHeaders });
      }

      // --- SYNC PULL ROUTE (GET /api/sync) ---
      if (path === '/api/sync' && request.method === 'GET') {
        const campaignId = url.searchParams.get('campaignId');
        const since = parseInt(url.searchParams.get('since') || '0', 10);

        if (!campaignId) {
          return new Response(JSON.stringify({ error: 'campaignId obrigatório.' }), { status: 400, headers });
        }

        // Enforce campaign membership
        const member = await env.DB.prepare(
          'SELECT role FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
        ).bind(campaignId, currentUserId).first<any>();

        if (!member) {
          return new Response(JSON.stringify({ error: 'Sem permissão para ler este grimório.' }), { status: 403, headers });
        }

        // Fetch updates from change log
        const changes = await env.DB.prepare(
          'SELECT sequence, entity_type AS entityType, entity_id AS entityId, operation, version, payload FROM change_log WHERE campaign_id = ? AND sequence > ? ORDER BY sequence ASC'
        ).bind(campaignId, since).all<any>();

        // Get current server sequence
        const maxSeqRes = await env.DB.prepare(
          'SELECT MAX(sequence) as maxSeq FROM change_log WHERE campaign_id = ?'
        ).bind(campaignId).first<any>();
        const serverSequence = maxSeqRes?.maxSeq || since;

        const mappedChanges = changes.results.map(c => ({
          sequence: c.sequence,
          entityType: c.entityType,
          entityId: c.entityId,
          operation: c.operation,
          version: c.version,
          payload: c.payload ? JSON.parse(c.payload) : null
        }));

        return new Response(JSON.stringify({ serverSequence, changes: mappedChanges }), { status: 200, headers });
      }

      // --- SYNC PUSH ROUTE (POST /api/sync) — Server-Authoritative, Atomic per mutation ---
      if (path === '/api/sync' && request.method === 'POST') {
        const body = await request.json() as any;
        const mutations = body.mutations || [];

        if (mutations.length > MAX_SYNC_MUTATIONS) {
          return new Response(JSON.stringify({ error: `Máximo de ${MAX_SYNC_MUTATIONS} mutações por requisição.` }), { status: 413, headers });
        }

        const results: Array<{
          outboxId: number;
          status: 'success' | 'conflict' | 'error';
          serverVersion?: number;
          serverPayload?: any;
          error?: string;
        }> = [];

        for (const mut of mutations) {
          const { outboxId, entityType, entityId, operation, baseVersion, payload } = mut;

          // Validate payload size
          if (payload) {
            const size = JSON.stringify(payload).length;
            if (size > MAX_MUTATION_PAYLOAD) {
              results.push({ outboxId, status: 'error', error: 'Payload excede 1MB.' });
              continue;
            }
          }

          const meta = ENTITY_META[entityType as string];
          if (!meta) {
            results.push({ outboxId, status: 'error', error: `Tipo de entidade desconhecido: ${entityType}` });
            continue;
          }

          // Determine campaignId
          let campaignId = payload?.campaignId;
          if (entityType === 'campaign') {
            campaignId = entityId;
          }

          if (!campaignId && operation === 'DELETE') {
            // Find campaignId from database if payload is missing
            const row = await env.DB.prepare(`SELECT campaign_id FROM ${meta.table} WHERE id = ?`).bind(entityId).first<any>();
            campaignId = row?.campaign_id;
          }

          if (!campaignId) {
            results.push({ outboxId, status: 'error', error: 'CampaignId could not be identified.' });
            continue;
          }

          // Fetch current server state (version + deleted flag)
          const serverRow = await env.DB.prepare(
            `SELECT version, deleted FROM ${meta.table} WHERE id = ?`
          ).bind(entityId).first<any>();

          const serverExists = !!serverRow;
          const serverDeleted = serverExists && serverRow.deleted === 1;
          const serverVersion = serverExists ? serverRow.version : 0;

          // --- Authorization Guard ---
          let isMaster = false;
          if (entityType === 'campaign' && (operation === 'CREATE' || !serverExists)) {
            isMaster = true; // Anyone authenticated can create a new campaign
          } else {
            const memberCountRes = await env.DB.prepare(
              'SELECT COUNT(*) as count FROM campaign_members WHERE campaign_id = ?'
            ).bind(campaignId).first<any>();
            const isOrphaned = !memberCountRes || memberCountRes.count === 0;

            if (isOrphaned) {
              isMaster = true;
              await env.DB.prepare(
                'INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, ?)'
              ).bind(campaignId, currentUserId, 'MASTER').run();
            } else {
              const member = await env.DB.prepare(
                'SELECT role FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
              ).bind(campaignId, currentUserId).first<any>();

              if (!member) {
                results.push({ outboxId, status: 'error', error: 'Forbidden. Not a member of this campaign.' });
                continue;
              }
              isMaster = member.role === 'MASTER';
            }
          }

          // Enforce MASTER permissions for sensitive operations
          const isMasterOnly = (entityType === 'campaign') ||
            (entityType === 'memory' && operation === 'DELETE');
          if (isMasterOnly && !isMaster) {
            results.push({ outboxId, status: 'error', error: 'Forbidden. Ação permitida apenas para o Mestre da campanha.' });
            continue;
          }

          // --- Tombstone protection: cannot UPDATE a deleted record ---
          if (operation === 'UPDATE' && serverExists && serverDeleted) {
            results.push({
              outboxId,
              status: 'conflict',
              serverVersion,
              serverPayload: null // null = entity deleted on server
            });
            continue;
          }

          // --- Conflict check (baseVersion must match current server version) ---
          if (serverExists && baseVersion < serverVersion) {
            // Fetch full conflict payload
            const fullRow = await env.DB.prepare(`SELECT * FROM ${meta.table} WHERE id = ?`).bind(entityId).first<any>();
            results.push({
              outboxId,
              status: 'conflict',
              serverVersion,
              serverPayload: serverDeleted ? null : serializeConflictRow(fullRow)
            });
            continue;
          }

          // --- Apply Mutation (ATOMIC per mutation via env.DB.batch) ---
          const nextVersion = serverVersion + 1;
          const timestamp = new Date().toISOString();

          if (operation === 'DELETE') {
            if (entityType === 'campaign') {
              // --- CASCADE DELETE: mark campaign + all children as deleted, emit change_log for all ---
              const stmts: D1PreparedStatement[] = [];

              // Delete campaign
              stmts.push(env.DB.prepare(
                'UPDATE campaigns SET deleted = 1, version = ?, updated_at = ? WHERE id = ?'
              ).bind(nextVersion, timestamp, entityId));
              stmts.push(env.DB.prepare(
                'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(campaignId, 'campaign', entityId, 'DELETE', nextVersion, currentUserId, timestamp, null));

              // For each child table: find children, mark deleted, emit change_log DELETE
              for (const child of CAMPAIGN_CHILD_TABLES) {
                // Must SELECT before UPDATE in the same transaction — batch executes sequentially but we
                // need the ids first; do SELECT separately (read is outside batch to keep atomicity of writes).
                const childRows = await env.DB.prepare(
                  `SELECT id, version FROM ${child.table} WHERE campaign_id = ? AND deleted = 0`
                ).bind(campaignId).all<any>();

                for (const childRow of childRows.results || []) {
                  const childNextVersion = childRow.version + 1;
                  stmts.push(env.DB.prepare(
                    `UPDATE ${child.table} SET deleted = 1, version = ? WHERE id = ?`
                  ).bind(childNextVersion, childRow.id));
                  stmts.push(env.DB.prepare(
                    'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                  ).bind(campaignId, child.entityType, childRow.id, 'DELETE', childNextVersion, currentUserId, timestamp, null));
                }
              }

              await env.DB.batch(stmts);
              results.push({ outboxId, status: 'success', serverVersion: nextVersion });
            } else {
              // Non-campaign DELETE: mark deleted + change_log
              await env.DB.batch([
                env.DB.prepare(
                  `UPDATE ${meta.table} SET deleted = 1, version = ?, updated_at = ? WHERE id = ?`
                ).bind(nextVersion, timestamp, entityId),
                env.DB.prepare(
                  'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(campaignId, entityType, entityId, 'DELETE', nextVersion, currentUserId, timestamp, null)
              ]);
              results.push({ outboxId, status: 'success', serverVersion: nextVersion });
            }
          } else {
            // CREATE or UPDATE
            const insertSql = `INSERT OR REPLACE INTO ${meta.table} (${meta.columns.join(', ')}) VALUES ${meta.placeholders}`;
            const updateSql = `UPDATE ${meta.table} SET ${meta.updateSet} WHERE id = ? AND deleted = 0`;
            const values = meta.valueGetter(payload);

            if (operation === 'CREATE' && serverExists && !serverDeleted) {
              // Duplicate create — conflict
              const fullRow = await env.DB.prepare(`SELECT * FROM ${meta.table} WHERE id = ?`).bind(entityId).first<any>();
              results.push({
                outboxId,
                status: 'conflict',
                serverVersion,
                serverPayload: serializeConflictRow(fullRow)
              });
              continue;
            }

            if (operation === 'UPDATE') {
              // Attempt in-place UPDATE (never resurrects tombstones)
              const updateValues = values.slice(1); // skip id
              updateValues.push(nextVersion, entityId); // version set, then WHERE id
              const u = env.DB.prepare(updateSql).bind(...updateValues);
              const updRes = await u.run();

              if (updRes.meta.changes === 0 && !serverExists) {
                // Row doesn't exist at all → insert it
                const insertValues = [...values, nextVersion];
                // columns already include version placeholder; note: placeholders ends with 0 for deleted
                await env.DB.batch([
                  env.DB.prepare(insertSql).bind(...values, nextVersion),
                  env.DB.prepare(
                    'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                  ).bind(campaignId, entityType, entityId, operation, nextVersion, currentUserId, timestamp, JSON.stringify(payload))
                ]);
              } else {
                // Append update to change log
                await env.DB.prepare(
                  'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(campaignId, entityType, entityId, operation, nextVersion, currentUserId, timestamp, JSON.stringify(payload)).run();
              }
            } else {
              // CREATE
              await env.DB.batch([
                env.DB.prepare(insertSql).bind(...values, nextVersion),
                env.DB.prepare(
                  'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(campaignId, entityType, entityId, operation, nextVersion, currentUserId, timestamp, JSON.stringify(payload))
              ]);
            }

            if (entityType === 'campaign' && (operation === 'CREATE' || !serverExists)) {
              // Link creator as MASTER
              await env.DB.prepare(
                'INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, ?)'
              ).bind(entityId, currentUserId, 'MASTER').run();
            }

            results.push({ outboxId, status: 'success', serverVersion: nextVersion });
          }
        }

        return new Response(JSON.stringify({ success: true, results }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Endpoint não encontrado.' }), { status: 404, headers });

    } catch (err: any) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message || 'Erro catastrófico no Servidor do Grimório.' }), { status: 500, headers });
    }
  }
};