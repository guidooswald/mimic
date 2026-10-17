import React, { useState, useEffect } from 'react';
import {
  Bot,
  MessageSquare,
  SlidersHorizontal,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { AppConfig, ChatMessage, SophisticatedModel } from './types';
import { DEFAULT_CONFIG } from './defaultConfig';
import { ChatView } from './components/ChatView';
import { ConfigView } from './components/ConfigView';
import { checkAndExchangeOpenRouterOAuthCode } from './services/openrouterAuth';
import {
  executeJeffRoutingPipeline,
  forceCallSophisticatedModel,
} from './services/routerEngine';

const CONFIG_STORAGE_KEY = 'mimic_app_config_v2';
const MESSAGES_STORAGE_KEY = 'mimic_chat_messages_v2';

function loadInitialConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      credentials: { ...DEFAULT_CONFIG.credentials, ...parsed.credentials },
      jeff: { ...DEFAULT_CONFIG.jeff, ...parsed.jeff },
      sophisticatedModels:
        Array.isArray(parsed.sophisticatedModels) && parsed.sophisticatedModels.length > 0
          ? parsed.sophisticatedModels
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
  const [config, setConfig] = useState<AppConfig>(loadInitialConfig);
  const [messages, setMessages] = useState<ChatMessage[]>(loadInitialMessages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [oauthToast, setOauthToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to persist config:', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to persist messages:', e);
    }
  }, [messages]);

  // Handle OpenRouter OAuth PKCE redirect callback automatically
  useEffect(() => {
    checkAndExchangeOpenRouterOAuthCode()
      .then((apiKey) => {
        if (apiKey) {
          setConfig((prev) => ({
            ...prev,
            credentials: {
              ...prev.credentials,
              openRouterApiKey: apiKey,
              openRouterConnectedViaOAuth: true,
            },
          }));
          setOauthToast('Successfully authenticated with OpenRouter!');
          setTimeout(() => setOauthToast(null), 5000);
        }
      })
      .catch((err) => {
        setOauthToast(`OpenRouter OAuth failed: ${err.message}`);
        setTimeout(() => setOauthToast(null), 6000);
      });
  }, []);

  const handleSendPrompt = async (prompt: string) => {
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
    };

    const historySnapshot = [...messages, userMessage];
    setMessages([...historySnapshot, placeholderAssistant]);
    setIsProcessing(true);

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
                      : 'escalating_to_model',
                  }
                : m
            )
          );
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
              }
            : m
        )
      );
    } catch (err: any) {
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
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceEscalate = async (messageId: string, targetModel: SophisticatedModel) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.userPrompt || isProcessing) return;

    setIsProcessing(true);
    const prevRouting = targetMsg.routing;

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
        config
      );

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
              }
            : m
        )
      );
    } catch (err: any) {
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
    } finally {
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-950/60">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">Mimic</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                System 1 ({config.jeff.displayName}) + System 2 Router
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Thinking, Fast and Slow: TypeSafe Jev (System 1) → Gemini Flash / Argon (System 2)
            </p>
          </div>
        </div>

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
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={isConnected ? 'API Key Configured' : 'Demo Mode (Click to configure API)'}
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
            onForceEscalate={handleForceEscalate}
            onClearChat={() => setMessages([])}
            onOpenSettings={() => setActiveTab('config')}
          />
        ) : (
          <ConfigView config={config} onUpdateConfig={setConfig} />
        )}
      </main>
    </div>
  );
}
export default App;
