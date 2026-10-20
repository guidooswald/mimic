import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  MessageSquare,
  SlidersHorizontal,
  CheckCircle2,
  Activity,
  Lock,
  Coins,
} from 'lucide-react';
import { AppConfig, ChatMessage, CostBreakdown, SophisticatedModel } from './types';
import { DEFAULT_CONFIG } from './defaultConfig';
import { ChatView } from './components/ChatView';
import { ConfigView } from './components/ConfigView';
import { checkAndExchangeOpenRouterOAuthCode } from './services/openrouterAuth';
import {
  executeJeffRoutingPipeline,
  forceCallSophisticatedModel,
  formatCost,
} from './services/routerEngine';
import {
  loadEncryptedVaultCredentials,
  LocalVaultMetadata,
  saveEncryptedVaultCredentials,
} from './services/vaultService';

const CONFIG_STORAGE_KEY = 'mimic_app_config_v2';
const MESSAGES_STORAGE_KEY = 'mimic_chat_messages_v2';

function loadInitialNonSecretConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      // Never load or trust raw API keys from localStorage; they come from .secrets/credentials.enc.json
      credentials: {
        ...DEFAULT_CONFIG.credentials,
        useDemoModeWhenUnconfigured:
          parsed.credentials?.useDemoModeWhenUnconfigured ??
          DEFAULT_CONFIG.credentials.useDemoModeWhenUnconfigured,
        customEndpointUrl:
          parsed.credentials?.customEndpointUrl ||
          DEFAULT_CONFIG.credentials.customEndpointUrl,
      },
      jeff: { ...DEFAULT_CONFIG.jeff, ...parsed.jeff },
      sophisticatedModels:
        Array.isArray(parsed.sophisticatedModels) && parsed.sophisticatedModels.length > 0
          ? parsed.sophisticatedModels.map((m: SophisticatedModel) => {
              if (m.modelId === 'google/gemini-2.5-flash' || m.modelId === 'gemini-2.5-flash') {
                return { ...m, modelId: 'google/gemini-3.8-flash' };
              }
              if (m.modelId === 'google/gemini-2.5-pro' || m.modelId === 'gemini-2.5-pro') {
                return { ...m, modelId: 'google/gemini-4-argon' };
              }
              if (m.modelId === 'anthropic/claude-3.7-sonnet' || m.modelId === 'anthropic/claude-3-5-sonnet') {
                return { ...m, name: 'Claude Sonnet 5.5', modelId: 'anthropic/claude-sonnet-5.5' };
              }
              if (m.modelId === 'deepseek/deepseek-r1') {
                return { ...m, name: 'DeepSeek R1 (0528)', modelId: 'deepseek/deepseek-r1-0528' };
              }
              return m;
            })
          : DEFAULT_CONFIG.sophisticatedModels,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function loadInitialMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'config'>('chat');
  const [config, setConfig] = useState<AppConfig>(loadInitialNonSecretConfig);
  const [messages, setMessages] = useState<ChatMessage[]>(loadInitialMessages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [oauthToast, setOauthToast] = useState<string | null>(null);
  const [vaultMetadata, setVaultMetadata] = useState<LocalVaultMetadata>({
    exists: false,
    encryptedFilePath: '.secrets/credentials.enc.json',
    algorithm: 'AES-256-GCM',
    updatedAt: null,
    cipherPreview: null,
  });

  const isVaultLoadedRef = useRef(false);

  // Persist ONLY non-sensitive settings to localStorage (strip all API keys)
  useEffect(() => {
    try {
      const sanitizedConfig = {
        ...config,
        credentials: {
          openRouterApiKey: '',
          openRouterConnectedViaOAuth: config.credentials.openRouterConnectedViaOAuth,
          typeSafeApiKey: '',
          geminiApiKey: '',
          customEndpointUrl: config.credentials.customEndpointUrl,
          customApiKey: '',
          useDemoModeWhenUnconfigured: config.credentials.useDemoModeWhenUnconfigured,
        },
      };
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitizedConfig));
    } catch (e) {
      console.error('Failed to persist non-secret config:', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to persist messages:', e);
    }
  }, [messages]);

  // Load encrypted API credentials from `.secrets/credentials.enc.json` on startup
  useEffect(() => {
    loadEncryptedVaultCredentials()
      .then(async ({ metadata, credentials }) => {
        setVaultMetadata(metadata);
        if (credentials) {
          setConfig((prev) => ({
            ...prev,
            credentials: {
              ...prev.credentials,
              ...credentials,
            },
          }));
        }
        isVaultLoadedRef.current = true;

        // Next, check if returning from OpenRouter OAuth PKCE flow
        const oauthKey = await checkAndExchangeOpenRouterOAuthCode();
        if (oauthKey) {
          setConfig((prev) => {
            const nextCreds = {
              ...prev.credentials,
              ...(credentials || {}),
              openRouterApiKey: oauthKey,
              openRouterConnectedViaOAuth: true,
            };
            saveEncryptedVaultCredentials(nextCreds)
              .then((meta) => setVaultMetadata(meta))
              .catch(console.error);
            return {
              ...prev,
              credentials: nextCreds,
            };
          });
          setOauthToast(
            'Authenticated with OpenRouter! API key encrypted to .secrets/credentials.enc.json'
          );
          setTimeout(() => setOauthToast(null), 5000);
        }
      })
      .catch((err) => {
        console.error('Vault load error:', err);
        isVaultLoadedRef.current = true;
      });
  }, []);

  // Automatically encrypt and save credentials to `.secrets/credentials.enc.json` whenever updated
  const handleUpdateConfig = (next: AppConfig) => {
    const credsChanged =
      next.credentials.openRouterApiKey !== config.credentials.openRouterApiKey ||
      next.credentials.typeSafeApiKey !== config.credentials.typeSafeApiKey ||
      next.credentials.geminiApiKey !== config.credentials.geminiApiKey ||
      next.credentials.customApiKey !== config.credentials.customApiKey;

    setConfig(next);

    if (isVaultLoadedRef.current && credsChanged) {
      saveEncryptedVaultCredentials(next.credentials)
        .then((meta) => setVaultMetadata(meta))
        .catch((err) => console.error('Failed to save encrypted vault:', err));
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSendPrompt = async (prompt: string, triageOnly = false) => {
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now() + 1}`;
    const startTimestamp = performance.now();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      status: 'complete',
    };

    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      userPrompt: prompt,
      timestamp: Date.now(),
      status: 'jeff_evaluating',
      isTriageOnly: triageOnly,
    };

    const historySnapshot = [...messages, userMessage];
    setMessages([...historySnapshot, placeholderAssistant]);
    setIsProcessing(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await executeJeffRoutingPipeline(
        prompt,
        historySnapshot,
        config,
        (decision) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    routing: decision,
                    status: decision.answeredByJeff
                      ? 'jeff_evaluating'
                      : triageOnly
                      ? 'jeff_evaluating'
                      : 'escalating_to_model',
                  }
                : m
            )
          );
        },
        {
          signal: controller.signal,
          triageOnly,
        }
      );

      const totalLatencyMs = Math.round(performance.now() - startTimestamp);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                status: 'complete',
                content: result.finalContent,
                routing: result.decision,
                finalModelName: result.finalModelName,
                finalModelId: result.finalModelId,
                finalModelTier: result.finalModelTier,
                escalationLatencyMs: result.escalationLatencyMs,
                totalLatencyMs,
                isTriageOnly: triageOnly,
                cost: result.cost,
              }
            : m
        )
      );
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  status: 'cancelled',
                  errorMessage: 'Generation was cancelled by the user.',
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  status: 'error',
                  errorMessage: err?.message || 'Unexpected error during routing.',
                }
              : m
          )
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const handleForceEscalate = async (messageId: string, targetModel: SophisticatedModel) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.userPrompt || isProcessing) return;

    setIsProcessing(true);
    const prevRouting = targetMsg.routing;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              status: 'escalating_to_model',
              routing: prevRouting
                ? {
                    ...prevRouting,
                    answeredByJeff: false,
                    selectedModelId: targetModel.id,
                    selectedModelName: targetModel.name,
                    selectedModelTier: targetModel.tier,
                    reasoning: `Manually escalated to System 2 model ${targetModel.name} (${targetModel.modelId}).`,
                  }
                : undefined,
            }
          : m
      )
    );

    try {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      const historyBefore = messages.slice(0, Math.max(0, msgIndex - 1));

      const res = await forceCallSophisticatedModel(
        targetMsg.userPrompt,
        historyBefore,
        targetModel,
        config,
        controller.signal
      );

      const s1Cost = targetMsg.cost?.system1Cost ?? targetMsg.routing?.system1Cost ?? 0;
      const s1Tokens = targetMsg.cost?.system1Tokens ?? targetMsg.routing?.system1Tokens;
      const combinedCost: CostBreakdown | undefined = res.cost
        ? {
            system1Cost: s1Cost,
            system2Cost: res.cost.system2Cost,
            totalCost: Number((s1Cost + res.cost.system2Cost).toFixed(7)),
            system1Tokens: s1Tokens,
            system2Tokens: res.cost.system2Tokens,
            isEstimated: res.cost.isEstimated,
          }
        : targetMsg.cost;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'complete',
                content: res.content,
                finalModelName: targetModel.name,
                finalModelId: targetModel.modelId,
                finalModelTier: targetModel.tier,
                escalationLatencyMs: res.latencyMs,
                totalLatencyMs: (m.routing?.jeffLatencyMs || 0) + res.latencyMs,
                cost: combinedCost,
              }
            : m
        )
      );
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  status: 'cancelled',
                  errorMessage: 'Manual escalation cancelled by the user.',
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  status: 'error',
                  errorMessage: err?.message || 'Manual escalation failed.',
                }
              : m
          )
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const completedAssistantMsgs = messages.filter(
    (m) => m.role === 'assistant' && m.status === 'complete' && m.routing
  );
  const directByJeffCount = completedAssistantMsgs.filter(
    (m) => m.finalModelTier === 'jeff'
  ).length;
  const escalatedCount = completedAssistantMsgs.length - directByJeffCount;

  const totalSessionCost = completedAssistantMsgs.reduce(
    (sum, m) => sum + (m.cost?.totalCost || 0),
    0
  );
  const estimatedSavings = completedAssistantMsgs.reduce((sum, m) => {
    if (m.finalModelTier === 'jeff' || m.isTriageOnly) {
      const saved = Math.max(0, 0.0045 - (m.cost?.system1Cost || 0.000012));
      return sum + saved;
    }
    return sum;
  }, 0);

  const isConnected = Boolean(
    config.credentials.openRouterApiKey.trim() ||
      config.credentials.typeSafeApiKey.trim() ||
      config.credentials.geminiApiKey.trim()
  );

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* OAuth Notification Banner */}
      {oauthToast && (
        <div className="bg-emerald-600/95 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{oauthToast}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="px-4 sm:px-6 h-16 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('chat');
            setMessages([]);
          }}
          className="flex items-center gap-3 text-left group cursor-pointer hover:opacity-90 transition-all focus:outline-none"
          title="Back to start"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-950/60 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Mimic
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                System 1 ({config.jeff.displayName}) + System 2 Router
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Thinking, Fast and Slow: TypeSafe Jev (System 1) → Gemini Flash / Argon (System 2)
            </p>
          </div>
        </button>

        {/* Session Routing Telemetry Pill */}
        {completedAssistantMsgs.length > 0 && (
          <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="flex items-center gap-1 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dual-Process Telemetry:</span>
            </span>
            <span className="text-emerald-400 font-medium">
              {directByJeffCount} System 1 ({config.jeff.displayName})
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-violet-300 font-medium">
              {escalatedCount} System 2 (Flash / Argon)
            </span>
            <span className="text-slate-600">•</span>
            <span
              className="text-amber-300 font-mono font-medium flex items-center gap-1.5"
              title={`Total session cost: ${formatCost(totalSessionCost)}. Estimated saved via System 1 triage / direct resolution: ~${formatCost(estimatedSavings)}.`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Cost: {formatCost(totalSessionCost)}</span>
              {estimatedSavings > 0 && (
                <span className="text-emerald-400 font-normal text-[11px]">
                  (Saved ~{formatCost(estimatedSavings)})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configuration &amp; APIs</span>
            {vaultMetadata.exists && (
              <span title="Encrypted in .secrets/credentials.enc.json">
                <Lock className="w-3 h-3 text-emerald-400" />
              </span>
            )}
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={isConnected ? 'API Key Encrypted & Active' : 'Demo Mode (Click to configure API)'}
            />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatView
            config={config}
            messages={messages}
            isProcessing={isProcessing}
            onSendPrompt={handleSendPrompt}
            onCancel={handleCancelRequest}
            onForceEscalate={handleForceEscalate}
            onClearChat={() => setMessages([])}
            onOpenSettings={() => setActiveTab('config')}
          />
        ) : (
          <ConfigView
            config={config}
            vaultMetadata={vaultMetadata}
            onUpdateConfig={handleUpdateConfig}
            onVaultMetadataChange={setVaultMetadata}
          />
        )}
      </main>
    </div>
  );
}
export default App;
