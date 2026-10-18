import { OpenRouterCatalogModel } from '../types';

const PKCE_VERIFIER_STORAGE_KEY = 'mimic_openrouter_pkce_verifier';

function generateRandomVerifier(length = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('');
}

async function createS256Challenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64 = btoa(String.fromCharCode(...hashArray));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Initiates the official OpenRouter OAuth PKCE flow in the browser.
 * After the user authorizes on openrouter.ai, they are redirected back with ?code=...
 */
export async function initiateOpenRouterOAuth(): Promise<void> {
  const codeVerifier = generateRandomVerifier(64);
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier);

  const codeChallenge = await createS256Challenge(codeVerifier);
  const callbackUrl = `${window.location.origin}${window.location.pathname}`;

  const authUrl = new URL('https://openrouter.ai/auth');
  authUrl.searchParams.set('callback_url', callbackUrl);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  window.location.href = authUrl.toString();
}

/**
 * Checks if the current URL contains an OpenRouter OAuth ?code=... callback parameter
 * and exchanges it for an OpenRouter API key.
 */
export async function checkAndExchangeOpenRouterOAuthCode(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;

  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);

  // Clean up URL query params immediately so refresh doesn't re-trigger
  const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);

  try {
    const body: Record<string, string> = { code };
    if (codeVerifier) {
      body.code_verifier = codeVerifier;
      body.code_challenge_method = 'S256';
    }

    const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter OAuth exchange failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (data && typeof data.key === 'string') {
      return data.key;
    }
    throw new Error('No API key returned from OpenRouter OAuth exchange');
  } catch (err) {
    console.error('Error exchanging OpenRouter OAuth code:', err);
    throw err;
  }
}

export interface OpenRouterKeyInfo {
  label?: string;
  usage?: number;
  limit?: number | null;
  is_free_tier?: boolean;
}

/**
 * Verifies an OpenRouter API key and returns metadata about the key.
 */
export async function verifyOpenRouterApiKey(apiKey: string): Promise<OpenRouterKeyInfo> {
  const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey.replace(/[^\x00-\xFF]/g, '').trim()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Invalid API key or OpenRouter error (HTTP ${response.status})`);
  }

  const json = await response.json();
  return json.data || {};
}

/**
 * Fetches available models from OpenRouter catalog so users can add any model to Jeff's roster.
 */
export async function fetchOpenRouterCatalog(): Promise<OpenRouterCatalogModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models (HTTP ${response.status})`);
  }
  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
}
