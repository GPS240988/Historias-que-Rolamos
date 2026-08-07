// src/index.ts
// Cloudflare Worker backend for "Histórias que Rolamos" local-first sync

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

        // Check if campaign exists
        const campaign = await env.DB.prepare(
          'SELECT * FROM campaigns WHERE id = ? AND deleted = 0'
        ).bind(body.campaignId).first();

        if (!campaign) {
          return new Response(JSON.stringify({ error: 'Grimório não encontrado.' }), { status: 404, headers });
        }

        // Add user as PLAYER
        await env.DB.prepare(
          'INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, ?)'
        ).bind(body.campaignId, currentUserId, 'PLAYER').run();

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      // --- MEDIA D1 ENDPOINTS (native BLOB storage) ---
      if (path.startsWith('/api/media/upload/') && request.method === 'PUT') {
        const rawId = path.substring(18); // Get /api/media/upload/:id
        const isThumb = rawId.endsWith('_thumb');
        const mediaId = isThumb ? rawId.slice(0, -6) : rawId;
        const body = await request.arrayBuffer();

        const column = isThumb ? 'thumbnail_data' : 'blob_data';
        await env.DB.prepare(
          `UPDATE media SET ${column} = ? WHERE id = ?`
        ).bind(body, mediaId).run();

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (path.startsWith('/api/media/download/')) {
        const rawId = path.substring(20); // Get /api/media/download/:id
        const isThumb = rawId.endsWith('_thumb');
        const mediaId = isThumb ? rawId.slice(0, -6) : rawId;

        const column = isThumb ? 'thumbnail_data' : 'blob_data';
        const row = await env.DB.prepare(
          `SELECT ${column}, mime_type FROM media WHERE id = ? AND deleted = 0`
        ).bind(mediaId).first<any>();

        if (!row || !row[column]) {
          return new Response(JSON.stringify({ error: 'Arquivo não encontrado.' }), { status: 404, headers });
        }

        const fileHeaders = new Headers(headers);
        fileHeaders.set('Content-Type', row.mime_type || 'application/octet-stream');
        fileHeaders.set('Cache-Control', 'public, max-age=31536000');

        return new Response(row[column], { headers: fileHeaders });
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

      // --- SYNC PUSH ROUTE (POST /api/sync) ---
      if (path === '/api/sync' && request.method === 'POST') {
        const body = await request.json() as any;
        const mutations = body.mutations || [];
        const results = [];

        for (const mut of mutations) {
          const { outboxId, entityType, entityId, operation, baseVersion, payload } = mut;

          // Determine campaignId
          let campaignId = payload?.campaignId;
          if (entityType === 'campaign') {
            campaignId = entityId;
          }

          if (!campaignId && operation === 'DELETE') {
            // Find campaignId from database if payload is missing
            const tableMap: Record<string, string> = {
              character: 'characters',
              memory: 'memories',
              token: 'tokens',
              memoryCharacter: 'memory_characters',
              media: 'media'
            };
            const table = tableMap[entityType];
            if (table) {
              const row = await env.DB.prepare(`SELECT campaign_id FROM ${table} WHERE id = ?`).bind(entityId).first<any>();
              campaignId = row?.campaign_id;
            }
          }

          if (!campaignId) {
            results.push({ outboxId, status: 'error', error: 'CampaignId could not be identified.' });
            continue;
          }

          // Authorization Guard
          let isMaster = false;
          if (entityType === 'campaign' && operation === 'CREATE') {
            // Anyone authenticated can create a new campaign
            isMaster = true;
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

          // Enforce MASTER permissions for sensitive operations
          const isMasterOnly = (entityType === 'campaign') || 
                               (entityType === 'memory' && operation === 'DELETE');
          if (isMasterOnly && !isMaster) {
            results.push({ outboxId, status: 'error', error: 'Forbidden. Ação permitida apenas para o Mestre da campanha.' });
            continue;
          }

          // Conflict Resolution Engine
          const tableMap: Record<string, string> = {
            campaign: 'campaigns',
            character: 'characters',
            memory: 'memories',
            token: 'tokens',
            memoryCharacter: 'memory_characters',
            media: 'media'
          };
          const dbTable = tableMap[entityType];

          // Fetch current server state
          const serverRow = await env.DB.prepare(
            `SELECT version, deleted, ${entityType === 'campaign' ? 'name' : 'campaign_id'} FROM ${dbTable} WHERE id = ?`
          ).bind(entityId).first<any>();

          const serverExists = !!serverRow;
          const serverDeleted = serverExists && serverRow.deleted === 1;
          const serverVersion = serverExists ? serverRow.version : 0;

          // Conflict check (Scenario B & C)
          if (serverExists && baseVersion < serverVersion) {
            // Fetch full conflict payload
            const fullRow = await env.DB.prepare(`SELECT * FROM ${dbTable} WHERE id = ?`).bind(entityId).first<any>();
            // Parse JSON fields
            if (fullRow) {
              if (fullRow.evolutions) fullRow.evolutions = JSON.parse(fullRow.evolutions);
              if (fullRow.hero_descriptions) fullRow.hero_descriptions = JSON.parse(fullRow.hero_descriptions);
              if (fullRow.character_ids) fullRow.character_ids = JSON.parse(fullRow.character_ids);
              if (fullRow.tags) fullRow.tags = JSON.parse(fullRow.tags);
              if (fullRow.comments) fullRow.comments = JSON.parse(fullRow.comments);
              // Map snake_case keys back to camelCase for client if needed
              if (fullRow.campaign_id) { fullRow.campaignId = fullRow.campaign_id; delete fullRow.campaign_id; }
              if (fullRow.player_name) { fullRow.playerName = fullRow.player_name; delete fullRow.player_name; }
              if (fullRow.character_type) { fullRow.characterType = fullRow.character_type; delete fullRow.character_type; }
              if (fullRow.cover_image_id) { fullRow.coverImageId = fullRow.cover_image_id; delete fullRow.cover_image_id; }
              if (fullRow.start_date) { fullRow.startDate = fullRow.start_date; delete fullRow.start_date; }
              if (fullRow.created_at) { fullRow.createdAt = fullRow.created_at; delete fullRow.created_at; }
              if (fullRow.updated_at) { fullRow.updatedAt = fullRow.updated_at; delete fullRow.updated_at; }
              if (fullRow.image_id) { fullRow.imageId = fullRow.image_id; delete fullRow.image_id; }
              if (fullRow.sheet_media_id) { fullRow.sheetMediaId = fullRow.sheet_media_id; delete fullRow.sheet_media_id; }
              if (fullRow.mime_type) { fullRow.mimeType = fullRow.mime_type; delete fullRow.mime_type; }
              if (fullRow.is_gallery) { fullRow.isGallery = fullRow.is_gallery === 1; delete fullRow.is_gallery; }
              if (fullRow.related_character_id) { fullRow.relatedCharacterId = fullRow.related_character_id; delete fullRow.related_character_id; }
              if (fullRow.related_memory_id) { fullRow.relatedMemoryId = fullRow.related_memory_id; delete fullRow.related_memory_id; }
              if (fullRow.media_id) { fullRow.mediaId = fullRow.media_id; delete fullRow.media_id; }
              if (fullRow.memory_id) { fullRow.memoryId = fullRow.memory_id; delete fullRow.memory_id; }
              if (fullRow.character_id) { fullRow.characterId = fullRow.character_id; delete fullRow.character_id; }
              if (fullRow.level_reached) { fullRow.levelReached = fullRow.level_reached; delete fullRow.level_reached; }
            }

            results.push({
              outboxId,
              status: 'conflict',
              serverVersion,
              serverPayload: serverDeleted ? null : fullRow
            });
            continue;
          }

          // Apply Mutation
          const nextVersion = serverVersion + 1;
          const timestamp = new Date().toISOString();

          if (operation === 'DELETE') {
            await env.DB.prepare(
              `UPDATE ${dbTable} SET deleted = 1, version = ?, updated_at = ? WHERE id = ?`
            ).bind(nextVersion, timestamp, entityId).run();

            // Append delete to change log
            await env.DB.prepare(
              'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(campaignId, entityType, entityId, 'DELETE', nextVersion, currentUserId, timestamp, null).run();

          } else {
            // CREATE or UPDATE
            if (entityType === 'campaign') {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO campaigns (id, name, system, description, cover_image_id, start_date, created_at, updated_at, version, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
              ).bind(payload.id, payload.name, payload.system, payload.description, payload.coverImageId || null, payload.startDate, payload.createdAt, payload.updatedAt, nextVersion).run();

              if (operation === 'CREATE') {
                // Link creator as MASTER
                await env.DB.prepare(
                  'INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, ?)'
                ).bind(payload.id, currentUserId, 'MASTER').run();
              }

            } else if (entityType === 'character') {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO characters (id, campaign_id, player_name, name, character_type, race, origin, class, level, hp, mp, image_id, sheet_media_id, concept, description, notes, evolutions, created_at, updated_at, version, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
              ).bind(payload.id, payload.campaignId, payload.playerName || null, payload.name, payload.characterType, payload.race || null, payload.origin || null, payload.class || null, payload.level, payload.hp, payload.mp, payload.imageId || null, payload.sheetMediaId || null, payload.concept || null, payload.description || null, payload.notes || null, JSON.stringify(payload.evolutions || []), payload.createdAt, payload.updatedAt || null, nextVersion).run();

            } else if (entityType === 'memory') {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO memories (id, campaign_id, title, description, hero_descriptions, event_date, type, image_id, character_ids, tags, comments, created_at, updated_at, version, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
              ).bind(payload.id, payload.campaignId, payload.title, payload.description || null, JSON.stringify(payload.heroDescriptions || {}), payload.eventDate, payload.type, payload.imageId || null, JSON.stringify(payload.characterIds || []), JSON.stringify(payload.tags || []), JSON.stringify(payload.comments || []), payload.createdAt, payload.updatedAt, nextVersion).run();

            } else if (entityType === 'memoryCharacter') {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO memory_characters (id, campaign_id, memory_id, character_id, level_reached, version, deleted) VALUES (?, ?, ?, ?, ?, ?, 0)'
              ).bind(payload.id, payload.campaignId || campaignId, payload.memoryId, payload.characterId, payload.levelReached || null, nextVersion).run();

            } else if (entityType === 'token') {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO tokens (id, campaign_id, name, media_id, category, related_character_id, notes, created_at, updated_at, version, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
              ).bind(payload.id, payload.campaignId, payload.name, payload.mediaId, payload.category, payload.relatedCharacterId || null, payload.notes || null, payload.createdAt, payload.updatedAt, nextVersion).run();

            } else if (entityType === 'media') {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO media (id, campaign_id, filename, mime_type, size, width, height, title, description, event_date, related_character_id, related_memory_id, tags, is_gallery, created_at, updated_at, version, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
              ).bind(payload.id, payload.campaignId, payload.filename, payload.mimeType, payload.size, payload.width || null, payload.height || null, payload.title || null, payload.description || null, payload.eventDate || null, payload.relatedCharacterId || null, payload.relatedMemoryId || null, JSON.stringify(payload.tags || []), payload.isGallery ? 1 : 0, payload.createdAt, payload.createdAt, nextVersion).run();
            }

            // Append creation/update to change log
            await env.DB.prepare(
              'INSERT INTO change_log (campaign_id, entity_type, entity_id, operation, version, user_id, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(campaignId, entityType, entityId, operation, nextVersion, currentUserId, timestamp, JSON.stringify(payload)).run();
          }

          results.push({ outboxId, status: 'success', serverVersion: nextVersion });
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
