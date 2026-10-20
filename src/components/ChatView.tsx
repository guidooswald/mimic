import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Cpu,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Gauge,
  StopCircle,
  Ban,
  Play,
  Split,
  Coins,
} from 'lucide-react';
import { AppConfig, ChatMessage, SophisticatedModel } from '../types';
import { SAMPLE_PROMPTS } from '../defaultConfig';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatCost } from '../services/routerEngine';

interface ChatViewProps {
  config: AppConfig;
  messages: ChatMessage[];
  isProcessing: boolean;
  onSendPrompt: (prompt: string, triageOnly?: boolean) => void;
  onCancel: () => void;
  onForceEscalate: (messageId: string, model: SophisticatedModel) => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
}

function getTierBadgeStyle(tier?: string) {
  switch (tier) {
    case 'jeff':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'flash':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'argon':
      return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
    case 'specialist':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

function getComplexityColor(score: number) {
  if (score <= 3) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score <= 6) return 'text-sky-400 bg-sky-500/15 border-sky-500/30';
  return 'text-violet-400 bg-violet-500/15 border-violet-500/30';
}

export const ChatView: React.FC<ChatViewProps> = ({
  config,
  messages,
  isProcessing,
  onSendPrompt,
  onCancel,
  onForceEscalate,
  onClearChat,
  onOpenSettings,
}) => {
  const [input, setInput] = useState('');
  const [triageOnly, setTriageOnly] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const enabledModels = config.sophisticatedModels.filter((m) => m.enabled);
  const hasLiveCredentials = Boolean(
    config.credentials.openRouterApiKey.trim() ||
      config.credentials.typeSafeApiKey.trim() ||
      config.credentials.geminiApiKey.trim()
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent, forceTriageOnly?: boolean) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const isTriage = forceTriageOnly !== undefined ? forceTriageOnly : triageOnly;
    onSendPrompt(trimmed, isTriage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleTrace = (id: string) => {
    setExpandedTraces((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      {/* Top Active System 1 -> System 2 Pipeline Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>System 1 (Fast): {config.jeff.displayName}</span>
            <span className="text-emerald-400/70 font-mono text-[11px]">
              ({config.jeff.modelId})
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-slate-400 font-medium mr-0.5">System 2 (Slow):</span>
            {enabledModels.length === 0 ? (
              <span className="text-slate-500 italic">None enabled</span>
            ) : (
              enabledModels.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${getTierBadgeStyle(
                    m.tier
                  )}`}
                  title={`${m.name} (${m.modelId}) — ${m.description}`}
                >
                  {m.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasLiveCredentials && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs transition-colors cursor-pointer"
              title="Click to connect OpenRouter or TypeSafe AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo Mode • Connect OpenRouter / TypeSafe</span>
            </button>
          )}
          {hasLiveCredentials && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live System 1 / System 2 Active</span>
            </span>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/70 transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="my-auto py-6 flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-950/50">
              <Bot className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 mb-3">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Inspired by Daniel Kahneman&apos;s &ldquo;Thinking, Fast and Slow&rdquo;</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              System 1 (<span className="text-emerald-400">TypeSafe Jev</span>) First.{' '}
              System 2 (<span className="text-violet-400">Gemini Flash / Argon</span>) When Needed.
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-xl">
              Every prompt is first evaluated by{' '}
              <span className="text-emerald-300 font-medium">Jev from TypeSafe AI</span> (
              <code className="text-xs text-emerald-300">{config.jeff.modelId}</code>)—a
              non-autoregressive <strong>System 1</strong> decision model that evaluates{' '}
              <code className="text-xs text-slate-300">noul</code>,{' '}
              <code className="text-xs text-slate-300">score</code>, and{' '}
              <code className="text-xs text-slate-300">choice</code> primitives in ~100ms before
              invoking a deliberative <strong>System 2</strong> LLM.
            </p>

            {/* Kahneman System 1 vs System 2 Architecture Cards */}
            <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-emerald-500/25">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                  <Gauge className="w-4 h-4" />
                  <span>System 1: TypeSafe Jev</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Fast, intuitive, non-autoregressive.</strong> Evaluates{' '}
                  <code>noul</code> (is answer already there?), <code>score</code> (complexity), and{' '}
                  <code>choice</code> in parallel (~100ms).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-sky-500/25">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span>System 2A: Gemini Flash</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Fast deliberative generation.</strong> Chosen by Jev for moderate coding,
                  summarization, and structured explanations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-violet-500/25">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>System 2B: Gemini Argon</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Deep slow thinking.</strong> Chosen by Jev when cognitive load is high:
                  distributed architecture, math proofs, and hard reasoning.
                </p>
              </div>
            </div>

            {/* Try Sample Prompts */}
            <div className="mt-7 w-full">
              <div className="flex items-center justify-between gap-2 mb-3 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test Jev&apos;s System 1 Primitives (noul / score / choice)</span>
                </div>
                {triageOnly && (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Split className="w-3 h-3" />
                    Triage Only Active (No System 2)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2.5 text-left">
                {SAMPLE_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onSendPrompt(item.prompt, triageOnly)}
                    className="group p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-start justify-between gap-4 cursor-pointer text-left disabled:opacity-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {item.label}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                            item.badgeColor === 'emerald'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : item.badgeColor === 'sky'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              : 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                          }`}
                        >
                          {item.expectedRoute}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.prompt}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-2xl rounded-2xl rounded-tr-sm px-4 py-3 bg-indigo-600 text-white shadow-md shadow-indigo-950/40">
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-200 mb-1 font-medium">
                      <User className="w-3 h-3" />
                      <span>You</span>
                    </div>
                    <p className="text-sm sm:text-[15px] whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            const isTraceOpen = expandedTraces[msg.id] !== false;
            const primitives = msg.routing?.jevPrimitives;

            return (
              <div key={msg.id} className="flex justify-start">
                <div className="w-full max-w-3xl space-y-2.5">
                  {/* System 1 (Jev) Telemetry Card */}
                  <div className="rounded-xl border border-slate-800/90 bg-slate-900/75 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleTrace(msg.id)}
                      className="w-full px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <Gauge className="w-4 h-4" />
                          <span>System 1 ({config.jeff.displayName})</span>
                        </span>

                        {msg.status === 'jeff_evaluating' && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-300">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            <span>
                              Running {config.jeff.displayName} System 1 primitives (noul, score,
                              choice)...
                            </span>
                          </span>
                        )}

                        {msg.routing && (
                          <>
                            {primitives && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 border border-slate-700 font-mono">
                                noul={primitives.answerAlreadyPresentNoul.toFixed(2)}
                              </span>
                            )}

                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-mono font-medium ${getComplexityColor(
                                msg.routing.complexityScore
                              )}`}
                            >
                              {primitives
                                ? `score=${primitives.complexityScoreRaw.toFixed(2)}/3.0`
                                : `Load ${msg.routing.complexityScore}/10`}
                            </span>

                            {msg.routing.answeredByJeff ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Resolved via System 1</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-medium">
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                <span
                                  className={`px-2 py-0.5 rounded-md border ${getTierBadgeStyle(
                                    msg.routing.selectedModelTier
                                  )}`}
                                >
                                  System 2: {msg.routing.selectedModelName}
                                </span>
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {msg.routing && (
                          <>
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="w-3 h-3" />
                              {msg.routing.jeffLatencyMs}ms
                            </span>
                            {(msg.routing.system1Cost !== undefined || msg.cost?.system1Cost !== undefined) && (
                              <span
                                className="flex items-center gap-1 font-mono text-[11px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25"
                                title={`System 1 (${config.jeff.displayName}) triage cost`}
                              >
                                <Coins className="w-3 h-3 text-amber-400" />
                                {formatCost(msg.cost?.system1Cost ?? msg.routing.system1Cost ?? 0)}
                              </span>
                            )}
                          </>
                        )}
                        {isTraceOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {isTraceOpen && msg.routing && (
                      <div className="px-3.5 py-3 border-t border-slate-800/80 bg-slate-950/60 text-xs space-y-3">
                        <div className="flex items-start gap-2 text-slate-300">
                          <span className="font-semibold text-emerald-400 shrink-0">
                            System 1 Judgment:
                          </span>
                          <span>{msg.routing.reasoning}</span>
                        </div>

                        {/* Visual breakdown of Jev's 3 typed primitives: noul, score, choice */}
                        {primitives && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                            {/* 1. NOUL Primitive */}
                            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                                  noul (Answer Ready)
                                </span>
                                <span className="font-mono text-xs font-bold text-white">
                                  {Math.round(primitives.answerAlreadyPresentNoul * 100)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round(primitives.answerAlreadyPresentNoul * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Threshold ≥ {Math.round(config.jeff.noulSelfAnswerThreshold * 100)}%
                                stays in System 1
                              </div>
                            </div>

                            {/* 2. SCORE Primitive */}
                            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-sky-400 font-semibold">
                                  score (Cognitive Load)
                                </span>
                                <span className="font-mono text-xs font-bold text-white">
                                  {primitives.complexityScoreRaw.toFixed(2)} / 3.0
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-sky-500 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round((primitives.complexityScoreRaw / 3) * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Confidence: {Math.round(primitives.complexityConfidence * 100)}%
                              </div>
                            </div>

                            {/* 3. CHOICE Primitive */}
                            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-violet-400 font-semibold">
                                  choice (Target Route)
                                </span>
                                <span className="font-mono text-[11px] text-slate-300">
                                  conf {Math.round(primitives.choiceConfidence * 100)}%
                                </span>
                              </div>
                              <div className="space-y-1 pt-0.5">
                                {Object.entries(primitives.choiceProbabilities)
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 3)
                                  .map(([key, prob]) => (
                                    <div
                                      key={key}
                                      className="flex items-center justify-between text-[10px] font-mono"
                                    >
                                      <span className="text-slate-300 truncate max-w-[120px]">
                                        {key === 'system1_direct' ? 'system1_direct' : key}
                                      </span>
                                      <span className="text-indigo-300 font-semibold">
                                        {Math.round(prob * 100)}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cost & Token Usage Breakdown */}
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center flex-wrap gap-2.5 text-slate-300">
                            <span className="flex items-center gap-1">
                              <Coins className="w-3 h-3 text-amber-400" />
                              <strong className="text-slate-400">System 1 Cost:</strong>
                              <span className="font-mono text-amber-300 font-semibold">
                                {formatCost(msg.cost?.system1Cost ?? msg.routing.system1Cost ?? 0)}
                              </span>
                              {msg.routing.system1Tokens && (
                                <span className="text-slate-500 font-mono text-[10px]">
                                  ({msg.routing.system1Tokens.promptTokens} in / {msg.routing.system1Tokens.completionTokens} out tokens)
                                </span>
                              )}
                            </span>

                            {msg.cost && msg.cost.system2Cost > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="text-slate-600">•</span>
                                <strong className="text-slate-400">System 2 Cost:</strong>
                                <span className="font-mono text-violet-300 font-semibold">
                                  {formatCost(msg.cost.system2Cost)}
                                </span>
                                {msg.cost.system2Tokens && (
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    ({msg.cost.system2Tokens.promptTokens} in / {msg.cost.system2Tokens.completionTokens} out tokens)
                                  </span>
                                )}
                              </span>
                            )}

                            {msg.cost && (
                              <span className="flex items-center gap-1">
                                <span className="text-slate-600">•</span>
                                <strong className="text-slate-400">Total:</strong>
                                <span className="font-mono text-emerald-300 font-semibold">
                                  {formatCost(msg.cost.totalCost)}
                                </span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-500">
                            {msg.cost?.isEstimated
                              ? '• Estimated via token rates'
                              : '• Exact API provider billing'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 2 (System 2) Escalation Loading Indicator */}
                  {msg.status === 'escalating_to_model' && msg.routing && (
                    <div className="rounded-2xl px-4 py-4 bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between gap-3 text-sm text-slate-200 shadow-lg">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-indigo-300">
                            System 2 Activated: Calling {msg.routing.selectedModelName}
                          </span>{' '}
                          <span className="text-slate-400 text-xs">
                            — {config.jeff.displayName} (System 1) delegated this prompt for{' '}
                            {msg.routing.selectedModelTier.toUpperCase()}-tier slow thinking...
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onCancel}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                        title="Cancel this System 2 call"
                      >
                        <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}

                  {/* Cancelled State */}
                  {msg.status === 'cancelled' && (
                    <div className="rounded-2xl px-4 py-3.5 bg-amber-950/30 border border-amber-500/40 text-amber-200 text-sm space-y-3">
                      <div className="flex items-center gap-2 font-medium text-amber-300">
                        <Ban className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Generation Stopped by User</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        The API request was cancelled before completion. System 1 (Jev) triage
                        completed in{' '}
                        <strong className="text-white font-mono">
                          {msg.routing?.jeffLatencyMs || 0}ms
                        </strong>
                        {(msg.routing?.system1Cost !== undefined || msg.cost?.system1Cost !== undefined) && (
                          <>
                            {' '}
                            (cost:{' '}
                            <strong className="text-amber-300 font-mono">
                              {formatCost(msg.cost?.system1Cost ?? msg.routing?.system1Cost ?? 0)}
                            </strong>
                            )
                          </>
                        )}
                        {msg.routing?.selectedModelName && (
                          <>
                            {' '}
                            and determined that{' '}
                            <strong className="text-indigo-300 font-semibold">
                              {msg.routing.selectedModelName}
                            </strong>{' '}
                            was the optimal System 2 model. System 2 deliberation was halted with zero additional token cost.
                          </>
                        )}
                      </p>

                      {/* Options to trigger models now */}
                      {enabledModels.length > 0 && msg.userPrompt && (
                        <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-amber-300/80">
                            Execute prompt with a model now:
                          </span>
                          <div className="flex items-center flex-wrap gap-1.5">
                            {enabledModels.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                disabled={isProcessing}
                                onClick={() => onForceEscalate(msg.id, m)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                                  msg.routing?.selectedModelId === m.id
                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                                    : getTierBadgeStyle(m.tier) + ' hover:brightness-125'
                                }`}
                              >
                                {msg.routing?.selectedModelId === m.id
                                  ? `Call Recommended: ${m.name}`
                                  : `Call ${m.name}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error State */}
                  {msg.status === 'error' && (
                    <div className="rounded-2xl px-4 py-3.5 bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold text-rose-300">Request Failed</div>
                        <p className="text-xs text-rose-200/90 leading-relaxed">
                          {msg.errorMessage}
                        </p>
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-medium text-rose-200 transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Open API Configuration</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Final Answer Bubble */}
                  {msg.status === 'complete' && (
                    <div className="rounded-2xl rounded-tl-sm px-5 py-4 bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${getTierBadgeStyle(
                              msg.finalModelTier
                            )}`}
                          >
                            {msg.finalModelTier === 'jeff'
                              ? `System 1 Fast Output (${config.jeff.displayName})`
                              : `System 2 Deliberative Output (${msg.finalModelName})`}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {msg.finalModelId}
                          </span>
                        </div>

                        <div className="flex items-center flex-wrap gap-2.5">
                          {msg.totalLatencyMs !== undefined && (
                            <span className="text-[11px] font-mono text-slate-400">
                              Total: {msg.totalLatencyMs}ms
                              {msg.escalationLatencyMs
                                ? ` (System 2: ${msg.escalationLatencyMs}ms)`
                                : ''}
                            </span>
                          )}

                          {msg.cost !== undefined && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px]"
                              title={`Total query cost: ${formatCost(msg.cost.totalCost)} (System 1: ${formatCost(msg.cost.system1Cost)} + System 2: ${formatCost(msg.cost.system2Cost)})${msg.cost.isEstimated ? ' [Estimated from model token rates]' : ' [Exact API provider usage]'}`}
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-400" />
                              <span>{formatCost(msg.cost.totalCost)}</span>
                              {msg.cost.isEstimated ? (
                                <span className="text-[9px] text-amber-400/70 uppercase">est</span>
                              ) : (
                                <span className="text-[9px] text-emerald-400/90 uppercase font-semibold">api</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <MarkdownRenderer content={msg.content} />

                      {/* Manual System 2 Escalation / Override Bar */}
                      {enabledModels.length > 0 && msg.userPrompt && (
                        <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span>Invoke or compare with another System 2 model:</span>
                          </span>
                          <div className="flex items-center flex-wrap gap-1.5">
                            {enabledModels.map((m) => {
                              const isCurrent =
                                msg.finalModelId === m.modelId && msg.finalModelTier !== 'jeff';
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => onForceEscalate(msg.id, m)}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                                    isCurrent
                                      ? 'bg-slate-800/90 border-slate-600 text-slate-300 hover:bg-slate-800'
                                      : getTierBadgeStyle(m.tier) + ' hover:brightness-125'
                                  }`}
                                >
                                  {isCurrent ? `Re-run ${m.name}` : `Call ${m.name}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Prompt Input Bar */}
      <div className="p-4 sm:px-6 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <form
          onSubmit={(e) => handleSubmit(e)}
          className="relative flex items-end gap-2 rounded-2xl bg-slate-900 border border-slate-700/80 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 px-4 py-3 shadow-lg transition-all"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              triageOnly
                ? `System 1 Triage Mode active: Evaluates prompt with ${config.jeff.displayName} and displays chosen route without calling System 2`
                : `Submit a prompt... ${config.jeff.displayName} (System 1) evaluates first and routes to System 2 (Gemini Flash / Argon) if needed`
            }
            disabled={isProcessing}
            className="w-full bg-transparent text-sm sm:text-[15px] text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-40 leading-relaxed"
          />

          {isProcessing ? (
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer shadow-md animate-pulse"
              title="Interrupt and cancel current API call"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              <span>{triageOnly ? 'Triage (Jev Only)' : `Ask ${config.jeff.displayName}`}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-3">
            {/* System 1 Triage Only Toggle */}
            <button
              type="button"
              onClick={() => setTriageOnly(!triageOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                triageOnly
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold shadow-sm'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title="When enabled, only runs System 1 (Jev) to inspect its decision, probability, and rubric score without calling System 2 LLMs"
            >
              <Split className="w-3.5 h-3.5" />
              <span>System 1 (Jev) Triage Only: {triageOnly ? 'ON' : 'OFF'}</span>
            </button>

            <span>
              Policy:{' '}
              <strong className="text-slate-400 capitalize">{config.jeff.sensitivity}</strong> (Noul
              threshold ≥ {Math.round(config.jeff.noulSelfAnswerThreshold * 100)}%)
            </span>
          </div>

          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
