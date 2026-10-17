import React, { useState } from 'react';
import {
  KeyRound,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Bot,
  Plus,
  Trash2,
  RotateCcw,
  ExternalLink,
  Search,
  Sparkles,
  Server,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  Gauge,
} from 'lucide-react';
import {
  AppConfig,
  ModelTier,
  OpenRouterCatalogModel,
  ProviderType,
  RoutingSensitivity,
  SophisticatedModel,
} from '../types';
import { DEFAULT_CONFIG, JEV_MODEL_PRESETS } from '../defaultConfig';
import {
  fetchOpenRouterCatalog,
  initiateOpenRouterOAuth,
  OpenRouterKeyInfo,
  verifyOpenRouterApiKey,
} from '../services/openrouterAuth';

interface ConfigViewProps {
  config: AppConfig;
  onUpdateConfig: (next: AppConfig) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ config, onUpdateConfig }) => {
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showTypeSafeKey, setShowTypeSafeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [verifyingKey, setVerifyingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    valid?: boolean;
    info?: OpenRouterKeyInfo;
    error?: string;
  }>({});

  // Add New Model form state
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModel, setNewModel] = useState<Omit<SophisticatedModel, 'id'>>({
    name: '',
    modelId: '',
    provider: 'openrouter',
    tier: 'flash',
    description: '',
    strengths: ['System 2 Reasoning', 'General Purpose'],
    costIndicator: '$$',
    speedIndicator: 'Fast',
    enabled: true,
  });
  const [strengthsInput, setStrengthsInput] = useState('System 2 Reasoning, General Purpose');

  // OpenRouter Live Catalog Browser
  const [catalogModels, setCatalogModels] = useState<OpenRouterCatalogModel[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);

  const updateCredentials = (patch: Partial<AppConfig['credentials']>) => {
    onUpdateConfig({
      ...config,
      credentials: {
        ...config.credentials,
        ...patch,
      },
    });
  };

  const updateJev = (patch: Partial<AppConfig['jeff']>) => {
    onUpdateConfig({
      ...config,
      jeff: {
        ...config.jeff,
        ...patch,
      },
    });
  };

  const handleVerifyOpenRouter = async () => {
    if (!config.credentials.openRouterApiKey.trim()) {
      setKeyStatus({ valid: false, error: 'Please enter an OpenRouter API key first.' });
      return;
    }
    setVerifyingKey(true);
    setKeyStatus({});
    try {
      const info = await verifyOpenRouterApiKey(config.credentials.openRouterApiKey);
      setKeyStatus({ valid: true, info });
    } catch (err: any) {
      setKeyStatus({ valid: false, error: err?.message || 'Verification failed' });
    } finally {
      setVerifyingKey(false);
    }
  };

  const handleLoadOpenRouterCatalog = async () => {
    setShowCatalogBrowser(true);
    if (catalogModels.length > 0) return;
    setLoadingCatalog(true);
    try {
      const list = await fetchOpenRouterCatalog();
      setCatalogModels(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleToggleSophisticatedModel = (id: string) => {
    onUpdateConfig({
      ...config,
      sophisticatedModels: config.sophisticatedModels.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    });
  };

  const handleUpdateSophisticatedModel = (id: string, patch: Partial<SophisticatedModel>) => {
    onUpdateConfig({
      ...config,
      sophisticatedModels: config.sophisticatedModels.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    });
  };

  const handleDeleteSophisticatedModel = (id: string) => {
    onUpdateConfig({
      ...config,
      sophisticatedModels: config.sophisticatedModels.filter((m) => m.id !== id),
    });
  };

  const handleCreateSophisticatedModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.name.trim() || !newModel.modelId.trim()) return;
    const created: SophisticatedModel = {
      ...newModel,
      id: `custom-${Date.now()}`,
      name: newModel.name.trim(),
      modelId: newModel.modelId.trim(),
      description:
        newModel.description.trim() ||
        `System 2 ${newModel.tier.toUpperCase()} model for specialized deliberative tasks.`,
      strengths: strengthsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onUpdateConfig({
      ...config,
      sophisticatedModels: [...config.sophisticatedModels, created],
    });
    setIsAddingModel(false);
    setNewModel({
      name: '',
      modelId: '',
      provider: 'openrouter',
      tier: 'flash',
      description: '',
      strengths: ['System 2 Reasoning', 'General Purpose'],
      costIndicator: '$$',
      speedIndicator: 'Fast',
      enabled: true,
    });
  };

  const filteredCatalog = catalogModels
    .filter(
      (m) =>
        m.id.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        m.name.toLowerCase().includes(catalogSearch.toLowerCase())
    )
    .slice(0, 12);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 overflow-y-auto">
      {/* Page Title & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            System 1 (<span className="text-emerald-400">TypeSafe Jev</span>) &amp; System 2 API Configuration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Log in with OpenRouter or TypeSafe AI to power{' '}
            <strong className="text-emerald-400">{config.jeff.displayName}</strong> (System 1 Fast
            Thinking) and configure the <strong>System 2</strong> deliberative models available to{' '}
            {config.jeff.displayName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdateConfig(DEFAULT_CONFIG)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* SECTION 1: OpenRouter Login & TypeSafe / Gemini Credentials */}
      <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                1. Provider Login &amp; API Keys
              </h2>
              <p className="text-xs text-slate-400">
                OpenRouter supports both TypeSafe&apos;s{' '}
                <code className="text-emerald-300">typesafe/jev-1.14</code> (via{' '}
                <code>/api/alpha/decisions</code>) and System 2 LLMs (Gemini Flash, Argon, Claude)
                under a single login.
              </p>
            </div>
          </div>

          {/* 1-Click OpenRouter OAuth Login Button */}
          <button
            type="button"
            onClick={() => initiateOpenRouterOAuth()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-950/50 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>
              {config.credentials.openRouterConnectedViaOAuth
                ? 'Reconnect with OpenRouter'
                : 'Log in with OpenRouter (OAuth)'}
            </span>
          </button>
        </div>

        {/* OpenRouter + TypeSafe Native API Keys */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              OpenRouter API Key (Unified Jev + System 2 Gateway)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenRouterKey ? 'text' : 'password'}
                  value={config.credentials.openRouterApiKey}
                  onChange={(e) =>
                    updateCredentials({
                      openRouterApiKey: e.target.value,
                      openRouterConnectedViaOAuth: false,
                    })
                  }
                  placeholder="sk-or-v1-..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 px-3.5 py-2 pr-9 text-xs sm:text-sm text-white font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showOpenRouterKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleVerifyOpenRouter}
                disabled={verifyingKey}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {verifyingKey ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Verify</span>
              </button>
            </div>

            {keyStatus.valid === true && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Connected! Key verified{' '}
                  {keyStatus.info?.usage !== undefined
                    ? `(Usage: $${Number(keyStatus.info.usage).toFixed(4)})`
                    : ''}
                </span>
              </div>
            )}
            {keyStatus.valid === false && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{keyStatus.error}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Click <strong>Log in with OpenRouter</strong> above or create a key at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                openrouter.ai/keys <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Native TypeSafe AI Key */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Native TypeSafe AI API Key (Optional — Direct /v1/systemone)
            </label>
            <div className="relative">
              <input
                type={showTypeSafeKey ? 'text' : 'password'}
                value={config.credentials.typeSafeApiKey}
                onChange={(e) => updateCredentials({ typeSafeApiKey: e.target.value })}
                placeholder="ts-..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 px-3.5 py-2 pr-9 text-xs sm:text-sm text-white font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowTypeSafeKey(!showTypeSafeKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showTypeSafeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Used if you select <strong>TypeSafe Native Cloud</strong> (<code>api.typesafe.ai/v1/systemone</code>) as Jev&apos;s provider instead of OpenRouter.
            </p>
          </div>
        </div>

        {/* Google Gemini Direct + Demo Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Direct Google Gemini API Key (Optional for System 2)
            </label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={config.credentials.geminiApiKey}
                onChange={(e) => updateCredentials({ geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 px-3.5 py-2 pr-9 text-xs sm:text-sm text-white font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="space-y-0.5 pr-3">
              <div className="text-xs font-semibold text-slate-200">
                Interactive Demo Mode when Unconfigured
              </div>
              <p className="text-[11px] text-slate-400">
                Simulate Jev&apos;s <code>noul</code>, <code>score</code>, and <code>choice</code>{' '}
                primitives if no API key is entered yet.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.credentials.useDemoModeWhenUnconfigured}
              onChange={(e) =>
                updateCredentials({ useDemoModeWhenUnconfigured: e.target.checked })
              }
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: System 1 (TypeSafe Jev) Settings */}
      <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white">
              2. System 1 (Fast Thinking): TypeSafe &ldquo;{config.jeff.displayName}&rdquo; Configuration
            </h2>
            <p className="text-xs text-slate-400">
              Inspired by Daniel Kahneman&apos;s <em>Thinking, Fast and Slow</em>: Jev evaluates
              every prompt first in ~100ms using non-autoregressive <code>noul</code>,{' '}
              <code>score</code>, and <code>choice</code> primitives.
            </p>
          </div>
        </div>

        {/* Quick Preset Selector for Jev */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            System 1 Model Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {JEV_MODEL_PRESETS.map((preset) => {
              const active =
                config.jeff.modelId === preset.modelId &&
                config.jeff.provider === preset.provider;
              return (
                <button
                  key={preset.modelId}
                  type="button"
                  onClick={() =>
                    updateJev({
                      modelId: preset.modelId,
                      provider: preset.provider,
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                      : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold text-emerald-300">{preset.label}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {preset.modelId}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{preset.note}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              System 1 Display Name
            </label>
            <input
              type="text"
              value={config.jeff.displayName}
              onChange={(e) => updateJev({ displayName: e.target.value || 'Jev' })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Provider</label>
            <select
              value={config.jeff.provider}
              onChange={(e) => updateJev({ provider: e.target.value as ProviderType })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="openrouter">OpenRouter (/api/alpha/decisions)</option>
              <option value="typesafe">TypeSafe Native (/v1/systemone)</option>
              <option value="gemini">Google Gemini Direct</option>
              <option value="custom">Custom Endpoint</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              System 1 Model ID
            </label>
            <input
              type="text"
              value={config.jeff.modelId}
              onChange={(e) => updateJev({ modelId: e.target.value })}
              placeholder="typesafe/jev-1.14"
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Routing Sensitivity & Noul Threshold Slider */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>System 1 → System 2 Escalation Mode</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['frugal', 'balanced', 'thorough'] as RoutingSensitivity[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    updateJev({
                      sensitivity: mode,
                      noulSelfAnswerThreshold:
                        mode === 'frugal' ? 0.45 : mode === 'thorough' ? 0.9 : 0.65,
                      maxSelfAnswerComplexity:
                        mode === 'frugal' ? 5 : mode === 'thorough' ? 1 : 3,
                    })
                  }
                  className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${
                    config.jeff.sensitivity === mode
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              <strong>Frugal:</strong> Keep in System 1 unless clearly complex.{' '}
              <strong>Balanced:</strong> Standard noul/score threshold.{' '}
              <strong>Thorough:</strong> Almost always escalate to System 2.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">
                Jev <code>noul</code> Threshold (Answer Already Present):
              </span>
              <span className="font-mono font-semibold text-emerald-400">
                ≥ {Math.round(config.jeff.noulSelfAnswerThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.05}
              value={config.jeff.noulSelfAnswerThreshold}
              onChange={(e) =>
                updateJev({ noulSelfAnswerThreshold: Number(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>20% (Frugal System 1)</span>
              <span>95% (Always Call System 2)</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: System 2 (Slow Thinking) Models Roster Available to Jev */}
      <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                3. System 2 (Slow Thinking) Models Roster Available to {config.jeff.displayName}
              </h2>
              <p className="text-xs text-slate-400">
                Each enabled model below is injected into {config.jeff.displayName}&apos;s{' '}
                <code>choice</code> primitive criteria so {config.jeff.displayName} returns a
                calibrated probability distribution across them.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadOpenRouterCatalog}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Browse OpenRouter Models</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingModel(!isAddingModel)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add System 2 Model</span>
            </button>
          </div>
        </div>

        {/* OpenRouter Live Catalog Search Drawer */}
        {showCatalogBrowser && (
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300">
                Search Live OpenRouter Catalog to Add to {config.jeff.displayName}&apos;s System 2 Roster
              </span>
              <button
                type="button"
                onClick={() => setShowCatalogBrowser(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search models (e.g. gemini, argon, flash, claude, deepseek, gpt-4o)..."
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            {loadingCatalog ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                Loading live models from OpenRouter...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {filteredCatalog.map((cm) => {
                  const isArgonLike = /pro|argon|opus|r1|gpt-4|sonnet|large/i.test(cm.id);
                  return (
                    <div
                      key={cm.id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{cm.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">{cm.id}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const added: SophisticatedModel = {
                            id: cm.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
                            name: cm.name,
                            modelId: cm.id,
                            provider: 'openrouter',
                            tier: isArgonLike ? 'argon' : 'flash',
                            description:
                              cm.description?.slice(0, 180) ||
                              `Use ${cm.name} when tasks match its ${
                                isArgonLike ? 'deep System 2 reasoning' : 'fast System 2 synthesis'
                              } profile.`,
                            strengths: isArgonLike
                              ? ['Deep System 2', 'Complex Tasks']
                              : ['Fast System 2', 'General Tasks'],
                            costIndicator: isArgonLike ? '$$$' : '$',
                            speedIndicator: isArgonLike ? 'Deep-Think' : 'Fast',
                            enabled: true,
                          };
                          onUpdateConfig({
                            ...config,
                            sophisticatedModels: [...config.sophisticatedModels, added],
                          });
                          setShowCatalogBrowser(false);
                        }}
                        className="px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 text-xs font-medium shrink-0 cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Manual Add Model Form */}
        {isAddingModel && (
          <form
            onSubmit={handleCreateSophisticatedModel}
            className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-4"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Add System 2 Model to {config.jeff.displayName}&apos;s Choice Criteria
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gemini 4 Argon"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">API Model ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. google/gemini-2.5-pro"
                  value={newModel.modelId}
                  onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">System 2 Tier</label>
                <select
                  value={newModel.tier}
                  onChange={(e) =>
                    setNewModel({ ...newModel, tier: e.target.value as ModelTier })
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  <option value="flash">Flash (Fast System 2)</option>
                  <option value="argon">Argon (Deep Frontier System 2)</option>
                  <option value="specialist">Specialist (Domain System 2)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Provider</label>
                <select
                  value={newModel.provider}
                  onChange={(e) =>
                    setNewModel({ ...newModel, provider: e.target.value as ProviderType })
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="gemini">Google Gemini Direct</option>
                  <option value="custom">Custom Endpoint</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Jev <code>choice</code> Criterion Description (When should Jev select this model?)
                </label>
                <input
                  type="text"
                  placeholder="Describe the cognitive load and task types suited for this System 2 model..."
                  value={newModel.description}
                  onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Strengths (comma-separated)
                </label>
                <input
                  type="text"
                  value={strengthsInput}
                  onChange={(e) => setStrengthsInput(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingModel(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
              >
                Save to Roster
              </button>
            </div>
          </form>
        )}

        {/* List of Sophisticated System 2 Models */}
        <div className="grid grid-cols-1 gap-3.5">
          {config.sophisticatedModels.map((model) => (
            <div
              key={model.id}
              className={`rounded-xl border p-4 transition-all ${
                model.enabled
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-slate-950/30 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                  <input
                    type="checkbox"
                    checked={model.enabled}
                    onChange={() => handleToggleSophisticatedModel(model.id)}
                    className="mt-1 w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={model.name}
                        onChange={(e) =>
                          handleUpdateSophisticatedModel(model.id, { name: e.target.value })
                        }
                        className="bg-transparent font-semibold text-sm text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold uppercase ${
                          model.tier === 'flash'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            : model.tier === 'argon'
                            ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        System 2 • {model.tier}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({model.costIndicator} • {model.speedIndicator})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-500">Model ID:</span>
                      <input
                        type="text"
                        value={model.modelId}
                        onChange={(e) =>
                          handleUpdateSophisticatedModel(model.id, { modelId: e.target.value })
                        }
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 font-mono text-xs text-indigo-300 focus:border-indigo-500 focus:outline-none min-w-[220px]"
                      />

                      <select
                        value={model.tier}
                        onChange={(e) =>
                          handleUpdateSophisticatedModel(model.id, {
                            tier: e.target.value as ModelTier,
                          })
                        }
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-300"
                      >
                        <option value="flash">Flash Tier</option>
                        <option value="argon">Argon / Frontier Tier</option>
                        <option value="specialist">Specialist Tier</option>
                      </select>

                      <select
                        value={model.provider}
                        onChange={(e) =>
                          handleUpdateSophisticatedModel(model.id, {
                            provider: e.target.value as ProviderType,
                          })
                        }
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-300"
                      >
                        <option value="openrouter">OpenRouter</option>
                        <option value="gemini">Gemini Direct</option>
                        <option value="custom">Custom Endpoint</option>
                      </select>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        <code>choice</code> criterion passed to {config.jeff.displayName}:
                      </label>
                      <textarea
                        rows={2}
                        value={model.description}
                        onChange={(e) =>
                          handleUpdateSophisticatedModel(model.id, {
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-lg bg-slate-900/70 border border-slate-800/90 px-2.5 py-1.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSophisticatedModel(model.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove model from roster"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
