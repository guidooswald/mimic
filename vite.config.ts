import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SECRETS_DIR = path.resolve(process.cwd(), '.secrets');
const MASTER_KEY_PATH = path.join(SECRETS_DIR, '.master.key');
const ENCRYPTED_VAULT_PATH = path.join(SECRETS_DIR, 'credentials.enc.json');

interface EncryptedVaultFile {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
  updatedAt: string;
}

function ensureMasterKey(): Buffer {
  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true });
  }
  if (fs.existsSync(MASTER_KEY_PATH)) {
    const hex = fs.readFileSync(MASTER_KEY_PATH, 'utf8').trim();
    if (hex.length === 64) {
      return Buffer.from(hex, 'hex');
    }
  }
  const newKey = crypto.randomBytes(32); // 256-bit key
  fs.writeFileSync(MASTER_KEY_PATH, newKey.toString('hex'), { mode: 0o600 });
  return newKey;
}

function encryptCredentials(data: Record<string, unknown>): EncryptedVaultFile {
  const key = ensureMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload: EncryptedVaultFile = {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(ENCRYPTED_VAULT_PATH, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return payload;
}

function decryptCredentials(): {
  exists: boolean;
  credentials: Record<string, unknown> | null;
  updatedAt?: string;
  cipherPreview?: string;
} {
  if (!fs.existsSync(ENCRYPTED_VAULT_PATH)) {
    return { exists: false, credentials: null };
  }

  try {
    const raw = fs.readFileSync(ENCRYPTED_VAULT_PATH, 'utf8');
    const payload = JSON.parse(raw) as EncryptedVaultFile;
    const key = ensureMasterKey();

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'hex')),
      decipher.final(),
    ]);

    return {
      exists: true,
      credentials: JSON.parse(decrypted.toString('utf8')),
      updatedAt: payload.updatedAt,
      cipherPreview:
        payload.ciphertext.length > 24
          ? `${payload.ciphertext.slice(0, 24)}...`
          : payload.ciphertext,
    };
  } catch (err) {
    console.error('Failed to decrypt .secrets/credentials.enc.json:', err);
    return { exists: false, credentials: null };
  }
}

const MAX_VAULT_BODY_BYTES = 100 * 1024; // 100 KB limit for credentials payload

const VAULT_PATH = '/api/local-vault';

// Hostnames allowed to address the vault API. Anything else (e.g. a
// DNS-rebound attacker domain resolving to 127.0.0.1) is rejected outright.
const ALLOWED_VAULT_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// Custom header required on mutating vault requests (POST/DELETE). Cross-origin
// requests carrying a custom header always trigger a CORS preflight, which this
// server never approves — so browsers cannot fire them from other origins.
const VAULT_REQUEST_HEADER = 'x-mimic-vault';
const VAULT_REQUEST_HEADER_VALUE = '1';

interface ParsedHost {
  hostname: string;
  port: string;
}

function parseHostHeader(host: string | undefined): ParsedHost | null {
  if (!host) return null;
  const value = host.trim().toLowerCase();
  if (!value) return null;

  if (value.startsWith('[')) {
    // IPv6 literal, e.g. [::1]:5173
    const close = value.indexOf(']');
    if (close === -1) return null;
    const hostname = value.slice(0, close + 1);
    const rest = value.slice(close + 1);
    if (rest && !rest.startsWith(':')) return null;
    const port = rest ? rest.slice(1) : '';
    if (port && !/^\d+$/.test(port)) return null;
    return { hostname, port };
  }

  const colon = value.lastIndexOf(':');
  if (colon === -1) return { hostname: value, port: '' };
  const hostname = value.slice(0, colon);
  const port = value.slice(colon + 1);
  // More than one colon without brackets is an unparseable (raw IPv6) host — reject.
  if (hostname.includes(':')) return null;
  if (port && !/^\d+$/.test(port)) return null;
  return { hostname, port };
}

/**
 * True only when the Origin is a well-formed http(s) URL that is exactly
 * same-origin with the request's Host header (hostname *and* port must match).
 * A page served from another localhost port does not qualify.
 */
function isSameOriginWithHost(origin: string, hostHeader: string): boolean {
  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') return false;
    return originUrl.host.toLowerCase() === hostHeader.trim().toLowerCase();
  } catch {
    return false;
  }
}

function rejectRequest(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

function createVaultMiddleware() {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url) return next();

    let pathname = req.url;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      // fall back to the raw url; the strict equality below will reject it
    }
    if (pathname !== VAULT_PATH) {
      return next();
    }

    // Decrypted credentials must never be written to any cache.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');

    // Fix 1: validate the Host header unconditionally. A DNS-rebinding attack
    // reaches this endpoint same-origin (so no Origin header is sent) — the
    // Host check is what stops it.
    const hostHeader = req.headers.host;
    const parsedHost = parseHostHeader(hostHeader);
    if (!parsedHost || !ALLOWED_VAULT_HOSTNAMES.has(parsedHost.hostname)) {
      rejectRequest(res, 403, 'Access denied: vault API is only available on localhost');
      return;
    }

    // Fix 3: when an Origin is present it must be *exactly* same-origin with
    // the Host header (hostname and port), not merely "some localhost page".
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      if (!isSameOriginWithHost(origin, hostHeader as string)) {
        try {
          new URL(origin);
          rejectRequest(
            res,
            403,
            'Access denied: Cross-origin vault access forbidden'
          );
        } catch {
          rejectRequest(res, 400, 'Invalid origin header');
        }
        return;
      }
    }

    // Fix 2: mutating requests must carry the custom header, which forces a
    // CORS preflight for any cross-site attempt (and preflights always fail
    // here, since no Access-Control-Allow-* headers are ever emitted).
    if (
      (req.method === 'POST' || req.method === 'DELETE') &&
      req.headers[VAULT_REQUEST_HEADER] !== VAULT_REQUEST_HEADER_VALUE
    ) {
      rejectRequest(res, 403, 'Access denied: missing vault request header');
      return;
    }

    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
      const result = decryptCredentials();
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          exists: result.exists,
          encryptedFilePath: '.secrets/credentials.enc.json',
          algorithm: 'AES-256-GCM',
          updatedAt: result.updatedAt || null,
          cipherPreview: result.cipherPreview || null,
          credentials: result.credentials,
        })
      );
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      let bodyLength = 0;

      req.on('data', (chunk) => {
        bodyLength += chunk.length;
        if (bodyLength > MAX_VAULT_BODY_BYTES) {
          res.statusCode = 413;
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
          return;
        }
        body += chunk;
      });

      req.on('end', () => {
        if (res.writableEnded) return;
        try {
          const parsed = JSON.parse(body || '{}');
          const creds = parsed.credentials || {};
          const encrypted = encryptCredentials(creds);
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              saved: true,
              encryptedFilePath: '.secrets/credentials.enc.json',
              algorithm: 'AES-256-GCM',
              updatedAt: encrypted.updatedAt,
              cipherPreview:
                encrypted.ciphertext.length > 24
                  ? `${encrypted.ciphertext.slice(0, 24)}...`
                  : encrypted.ciphertext,
            })
          );
        } catch (err: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err?.message || 'Failed to encrypt credentials' }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      if (fs.existsSync(ENCRYPTED_VAULT_PATH)) {
        fs.unlinkSync(ENCRYPTED_VAULT_PATH);
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ deleted: true }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  };
}

function localEncryptedVaultPlugin(): Plugin {
  return {
    name: 'mimic-local-encrypted-vault',
    configureServer(server) {
      server.middlewares.use(createVaultMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createVaultMiddleware());
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), localEncryptedVaultPlugin()],
  server: {
    port: 5173,
    open: false,
  },
});
