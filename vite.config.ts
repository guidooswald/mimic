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

function createVaultMiddleware() {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/local-vault')) {
      return next();
    }

    // Security: Only allow requests originating from localhost / same-origin dev server
    const host = req.headers.host || '';
    const origin = (req.headers.origin as string) || '';
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.hostname !== 'localhost' && originUrl.hostname !== '127.0.0.1') {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Access denied: Cross-origin vault access forbidden' }));
          return;
        }
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid origin header' }));
        return;
      }
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
