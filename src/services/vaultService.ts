import { ProviderCredentials } from '../types';

export interface LocalVaultMetadata {
  exists: boolean;
  encryptedFilePath: string;
  algorithm: string;
  updatedAt: string | null;
  cipherPreview: string | null;
}

export async function loadEncryptedVaultCredentials(): Promise<{
  metadata: LocalVaultMetadata;
  credentials: Partial<ProviderCredentials> | null;
}> {
  const response = await fetch('/api/local-vault', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to read local encrypted vault (HTTP ${response.status})`);
  }

  const data = await response.json();
  return {
    metadata: {
      exists: Boolean(data.exists),
      encryptedFilePath: data.encryptedFilePath || '.secrets/credentials.enc.json',
      algorithm: data.algorithm || 'AES-256-GCM',
      updatedAt: data.updatedAt || null,
      cipherPreview: data.cipherPreview || null,
    },
    credentials: data.credentials || null,
  };
}

export async function saveEncryptedVaultCredentials(
  credentials: ProviderCredentials
): Promise<LocalVaultMetadata> {
  const response = await fetch('/api/local-vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials }),
  });

  if (!response.ok) {
    throw new Error(`Failed to write local encrypted vault (HTTP ${response.status})`);
  }

  const data = await response.json();
  return {
    exists: true,
    encryptedFilePath: data.encryptedFilePath || '.secrets/credentials.enc.json',
    algorithm: data.algorithm || 'AES-256-GCM',
    updatedAt: data.updatedAt || new Date().toISOString(),
    cipherPreview: data.cipherPreview || null,
  };
}

export async function clearEncryptedVaultCredentials(): Promise<void> {
  await fetch('/api/local-vault', { method: 'DELETE' });
}
