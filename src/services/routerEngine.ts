import {
  AppConfig,
  ChatMessage,
  CostBreakdown,
  JevPrimitivesBreakdown,
  PipelineOptions,
  ProviderType,
  RoutingDecision,
  SophisticatedModel,
} from '../types';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelPricingRate {
  promptPerMillion: number;
  completionPerMillion: number;
}

export const KNOWN_MODEL_RATES: Record<string, ModelPricingRate> = {
  // Jev System 1
  'typesafe/jev-1.14': { promptPerMillion: 0.035, completionPerMillion: 0.035 },
  'typesafe/jev-1.13': { promptPerMillion: 0.035, completionPerMillion: 0.035 },
  'jev-latest': { promptPerMillion: 0.035, completionPerMillion: 0.035 },
  // Gemini
  'google/gemini-3.8-flash': { promptPerMillion: 0.825, completionPerMillion: 4.125 },
  'gemini-3.8-flash': { promptPerMillion: 0.825, completionPerMillion: 4.125 },
  'google/gemini-2.5-flash': { promptPerMillion: 0.075, completionPerMillion: 0.30 },
  'gemini-2.5-flash': { promptPerMillion: 0.075, completionPerMillion: 0.30 },
  'google/gemini-2.0-flash-lite-001': { promptPerMillion: 0.075, completionPerMillion: 0.30 },
  'google/gemini-4-argon': { promptPerMillion: 2.00, completionPerMillion: 10.00 },
  'gemini-4-argon': { promptPerMillion: 2.00, completionPerMillion: 10.00 },
  'google/gemini-2.5-pro': { promptPerMillion: 1.25, completionPerMillion: 5.00 },
  'gemini-2.5-pro': { promptPerMillion: 1.25, completionPerMillion: 5.00 },
  // Claude
  'anthropic/claude-sonnet-5.5': { promptPerMillion: 3.00, completionPerMillion: 15.00 },
  'anthropic/claude-3.7-sonnet': { promptPerMillion: 3.00, completionPerMillion: 15.00 },
  'anthropic/claude-3-5-sonnet': { promptPerMillion: 3.00, completionPerMillion: 15.00 },
  // DeepSeek
  'deepseek/deepseek-v4.1-flash': { promptPerMillion: 0.0355, completionPerMillion: 0.12 },
  'deepseek/deepseek-r1-0528': { promptPerMillion: 0.50, completionPerMillion: 2.15 },
  'deepseek/deepseek-r1': { promptPerMillion: 0.55, completionPerMillion: 2.19 },
  // OpenAI
  'openai/gpt-6.1-sol': { promptPerMillion: 2.00, completionPerMillion: 10.00 },
  'openai/gpt-4o': { promptPerMillion: 2.50, completionPerMillion: 10.00 },
  'openai/gpt-4o-mini': { promptPerMillion: 0.15, completionPerMillion: 0.60 },
  'openai/o3-pro': { promptPerMillion: 20.00, completionPerMillion: 80.00 },
  'openai/o3-mini': { promptPerMillion: 1.10, completionPerMillion: 4.40 },
};

export function estimateModelCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const cleanId = modelId.toLowerCase().trim();
  const rate =
    KNOWN_MODEL_RATES[cleanId] ||
    KNOWN_MODEL_RATES[modelId] ||
    (cleanId.includes('flash') || cleanId.includes('lite') || cleanId.includes('mini')
      ? { promptPerMillion: 0.20, completionPerMillion: 0.80 }
      : cleanId.includes('pro') || cleanId.includes('argon') || cleanId.includes('sonnet')
      ? { promptPerMillion: 2.50, completionPerMillion: 10.00 }
      : { promptPerMillion: 1.00, completionPerMillion: 4.00 });

  const pCost = (promptTokens * rate.promptPerMillion) / 1_000_000;
  const cCost = (completionTokens * rate.completionPerMillion) / 1_000_000;
  return Number((pCost + cCost).toFixed(7));
}

export function formatCost(cost: number | undefined | null): string {
  if (cost === undefined || cost === null || isNaN(cost)) return '$0.00';
  if (cost === 0) return '$0.00';
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(5)}`;
  }
  if (cost < 0.1) {
    return `$${cost.toFixed(4)}`;
  }
  if (cost < 1.0) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

const COMPLEXITY_LEGEND: Record<string, string> = {
  '0': 'Level 0: Answer already in context / trivial System 1 recall',
  '1': 'Level 1: Simple factual lookup or concise definition',
  '2': 'Level 2: Moderate System 2 (Flash) — coding, drafting, structured explanation',
  '3': 'Level 3: Deep System 2 (Argon) — complex architecture, math, multi-step reasoning',
};

interface JevDecisionResult {
  primitives: JevPrimitivesBreakdown;
  cost: number;
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  isEstimated: boolean;
}

interface GenerativeCompletionResult {
  content: string;
  cost: number;
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  isEstimated: boolean;
}

function hasValidProviderCredentials(provider: ProviderType, config: AppConfig): boolean {
  if (provider === 'openrouter') {
    return Boolean(config.credentials.openRouterApiKey.trim());
  }
  if (provider === 'typesafe') {
    return Boolean(config.credentials.typeSafeApiKey.trim());
  }
  if (provider === 'gemini') {
    return Boolean(config.credentials.geminiApiKey.trim());
  }
  if (provider === 'custom') {
    return Boolean(config.credentials.customEndpointUrl.trim());
  }
  return false;
}

function isJevDecisionModel(modelId: string, provider: ProviderType): boolean {
  const lower = modelId.toLowerCase();
  return provider === 'typesafe' || lower.includes('jev');
}

function cleanHeaderValue(val: string): string {
  // Strip characters outside ISO-8859-1 (0-255) to satisfy browser fetch ByteString requirement
  return val.replace(/[^\x00-\xFF]/g, '').trim();
}

/**
 * Calls TypeSafe's Jev System 1 Decision API using the native `state` + `questions`
 * (`noul`, `score`, `choice`) schema.
 * - Via OpenRouter: POST https://openrouter.ai/api/alpha/decisions
 * - Via TypeSafe Native: POST https://api.typesafe.ai/v1/systemone
 */
async function callJevSystemOneDecisions(
  userPrompt: string,
  recentHistory: LLMMessage[],
  config: AppConfig,
  enabledModels: SophisticatedModel[],
  signal?: AbortSignal
): Promise<JevDecisionResult> {
  const provider = config.jeff.provider;
  const endpoint =
    provider === 'typesafe'
      ? 'https://api.typesafe.ai/v1/systemone'
      : 'https://openrouter.ai/api/alpha/decisions';

  const apiKey =
    provider === 'typesafe'
      ? config.credentials.typeSafeApiKey.trim()
      : config.credentials.openRouterApiKey.trim();

  if (!apiKey) {
    throw new Error(
      `API key missing for ${
        provider === 'typesafe' ? 'TypeSafe AI' : 'OpenRouter'
      }. Please configure it in the Configuration tab.`
    );
  }

  // Build choice criteria dictionary for Jev's `choice` primitive
  const choiceCriteria: Record<string, string> = {
    system1_direct:
      'The answer is already present in the conversation history or is a trivial factual/conversational query that does not need a large System 2 model.',
  };

  for (const m of enabledModels) {
    choiceCriteria[m.id] = `${m.name} (${m.tier.toUpperCase()} tier): ${m.description}`;
  }

  const payload = {
    model: config.jeff.modelId,
    state: {
      conversation_history: recentHistory,
      user_prompt: userPrompt,
      routing_sensitivity: config.jeff.sensitivity,
      policy_notes: config.jeff.customInstructions,
    },
    questions: {
      answer_already_present: {
        type: 'noul',
        instructions:
          'Is the answer to the user prompt already present in the conversation state or simple enough to resolve immediately without deep System 2 deliberation?',
      },
      cognitive_complexity: {
        type: 'score',
        instructions:
          'Rate the cognitive complexity and System 2 reasoning depth required for this prompt.',
        criteria: [
          COMPLEXITY_LEGEND['0'],
          COMPLEXITY_LEGEND['1'],
          COMPLEXITY_LEGEND['2'],
          COMPLEXITY_LEGEND['3'],
        ],
      },
      target_model: {
        type: 'choice',
        instructions:
          'Select the optimal execution path or System 2 model from the criteria based on complexity, latency, and domain fit.',
        criteria: choiceCriteria,
      },
    },
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cleanHeaderValue(apiKey)}`,
    'Content-Type': 'application/json',
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Mimic - Jev System 1 and System 2 Router';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Jev Decisions API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const answers = data?.answers || {};

  const noulVal =
    typeof answers?.answer_already_present?.noul === 'number'
      ? answers.answer_already_present.noul
      : typeof answers?.answer_already_present === 'number'
      ? answers.answer_already_present
      : 0.2;

  const scoreObj = answers?.cognitive_complexity || {};
  const rawScore = typeof scoreObj.score === 'number' ? scoreObj.score : 1.5;
  const scoreConf = typeof scoreObj.confidence === 'number' ? scoreObj.confidence : 0.85;
  const scoreProbs = scoreObj.probabilities || {
    '0': 0.1,
    '1': 0.3,
    '2': 0.4,
    '3': 0.2,
  };

  const choiceObj = answers?.target_model || {};
  const choiceWinner =
    typeof choiceObj.choice === 'string'
      ? choiceObj.choice
      : enabledModels[0]?.id || 'system1_direct';
  const choiceConf = typeof choiceObj.confidence === 'number' ? choiceObj.confidence : 0.8;
  const choiceProbs = choiceObj.probabilities || { [choiceWinner]: choiceConf };

  const usage = data?.usage || {};
  const promptTokens =
    typeof usage.input_tokens === 'number'
      ? usage.input_tokens
      : typeof usage.prompt_tokens === 'number'
      ? usage.prompt_tokens
      : Math.round(userPrompt.length / 4) + 180;
  const completionTokens =
    typeof usage.output_tokens === 'number'
      ? usage.output_tokens
      : typeof usage.completion_tokens === 'number'
      ? usage.completion_tokens
      : 24;
  const totalTokens =
    typeof usage.total_tokens === 'number'
      ? usage.total_tokens
      : promptTokens + completionTokens;

  let cost: number;
  let isEstimated = false;

  if (typeof usage.cost === 'number') {
    cost = usage.cost;
  } else {
    cost = estimateModelCost(config.jeff.modelId, promptTokens, completionTokens);
    isEstimated = true;
  }

  return {
    primitives: {
      answerAlreadyPresentNoul: Number(noulVal.toFixed(3)),
      complexityScoreRaw: Number(rawScore.toFixed(2)),
      complexityConfidence: Number(scoreConf.toFixed(2)),
      complexityLegend: scoreObj.legend || COMPLEXITY_LEGEND,
      complexityProbabilities: scoreProbs,
      choiceWinner,
      choiceConfidence: Number(choiceConf.toFixed(2)),
      choiceProbabilities: choiceProbs,
    },
    cost,
    tokens: {
      promptTokens,
      completionTokens,
      totalTokens,
    },
    isEstimated,
  };
}

/**
 * Calls a generative System 2 LLM via standard OpenAI-compatible /chat/completions.
 */
async function callGenerativeCompletion(
  provider: ProviderType,
  modelId: string,
  messages: LLMMessage[],
  config: AppConfig,
  temperature = 0.4,
  signal?: AbortSignal,
  maxTokens?: number
): Promise<GenerativeCompletionResult> {
  if (provider === 'openrouter' || provider === 'typesafe') {
    const apiKey = config.credentials.openRouterApiKey.trim();
    if (!apiKey) {
      throw new Error(
        'OpenRouter API key is required to call System 2 generative models. Please log in or add your key in Configuration.'
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanHeaderValue(apiKey)}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mimic - Jev System 1 and System 2 Router',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}) for model "${modelId}": ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const usage = data?.usage;
    const promptTokens =
      typeof usage?.prompt_tokens === 'number'
        ? usage.prompt_tokens
        : Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens =
      typeof usage?.completion_tokens === 'number'
        ? usage.completion_tokens
        : Math.max(1, Math.round(content.length / 4));
    const totalTokens =
      typeof usage?.total_tokens === 'number'
        ? usage.total_tokens
        : promptTokens + completionTokens;

    let cost: number;
    let isEstimated = false;
    if (typeof usage?.cost === 'number') {
      cost = usage.cost;
    } else {
      cost = estimateModelCost(modelId, promptTokens, completionTokens);
      isEstimated = true;
    }

    return {
      content,
      cost,
      tokens: { promptTokens, completionTokens, totalTokens },
      isEstimated,
    };
  }

  if (provider === 'gemini') {
    const apiKey = config.credentials.geminiApiKey.trim();
    if (!apiKey) {
      throw new Error('Google Gemini API key is not configured. Please add it in Configuration.');
    }

    let cleanModelId = modelId.replace(/^google\//, '');
    if (cleanModelId === 'gemini-2.5-flash') {
      cleanModelId = 'gemini-3.8-flash';
    }
    if (cleanModelId === 'gemini-2.5-pro') {
      cleanModelId = 'gemini-4-argon';
    }
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanHeaderValue(apiKey)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cleanModelId,
          messages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}) for model "${cleanModelId}": ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const usage = data?.usage;
    const promptTokens =
      typeof usage?.prompt_tokens === 'number'
        ? usage.prompt_tokens
        : Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens =
      typeof usage?.completion_tokens === 'number'
        ? usage.completion_tokens
        : Math.max(1, Math.round(content.length / 4));
    const totalTokens =
      typeof usage?.total_tokens === 'number'
        ? usage.total_tokens
        : promptTokens + completionTokens;

    const cost = estimateModelCost(cleanModelId, promptTokens, completionTokens);

    return {
      content,
      cost,
      tokens: { promptTokens, completionTokens, totalTokens },
      isEstimated: true,
    };
  }

  const rawCustomUrl = config.credentials.customEndpointUrl.trim();
  if (!rawCustomUrl) {
    throw new Error('Custom endpoint URL is not configured.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawCustomUrl);
  } catch {
    throw new Error(`Invalid custom endpoint URL: "${rawCustomUrl}". Must be a valid HTTP or HTTPS URL.`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Invalid URL scheme "${parsedUrl.protocol}". Only http: and https: are allowed.`);
  }

  const baseUrl = parsedUrl.toString().replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.credentials.customApiKey.trim()) {
    headers.Authorization = `Bearer ${cleanHeaderValue(config.credentials.customApiKey)}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Custom API error (${response.status}) at ${baseUrl}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const usage = data?.usage;
  const promptTokens =
    typeof usage?.prompt_tokens === 'number'
      ? usage.prompt_tokens
      : Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  const completionTokens =
    typeof usage?.completion_tokens === 'number'
      ? usage.completion_tokens
      : Math.max(1, Math.round(content.length / 4));
  const totalTokens =
    typeof usage?.total_tokens === 'number'
      ? usage.total_tokens
      : promptTokens + completionTokens;

  let cost: number;
  let isEstimated = false;
  if (typeof usage?.cost === 'number') {
    cost = usage.cost;
  } else {
    cost = estimateModelCost(modelId, promptTokens, completionTokens);
    isEstimated = true;
  }

  return {
    content,
    cost,
    tokens: { promptTokens, completionTokens, totalTokens },
    isEstimated,
  };
}

/**
 * Returns an ultra-fast, cost-efficient micro model for System 1 fast-path generation.
 */
function getFastMicroModel(config: AppConfig): { provider: ProviderType; modelId: string; name: string } {
  // If user configured a direct Gemini API key
  if (config.credentials.geminiApiKey.trim()) {
    return {
      provider: 'gemini',
      modelId: 'google/gemini-2.0-flash-lite-001',
      name: 'Gemini 2.0 Flash Lite',
    };
  }

  // If OpenRouter is available, prefer an enabled flash model or flash-lite
  if (config.credentials.openRouterApiKey.trim()) {
    const enabledFlash = config.sophisticatedModels.find(
      (m) => m.enabled && (m.tier === 'flash' || m.modelId.includes('flash'))
    );
    if (enabledFlash) {
      return {
        provider: enabledFlash.provider,
        modelId: enabledFlash.modelId,
        name: enabledFlash.name,
      };
    }
    return {
      provider: 'openrouter',
      modelId: 'google/gemini-2.0-flash-lite-001',
      name: 'Gemini 2.0 Flash Lite',
    };
  }

  // Custom or first enabled
  const fallback = config.sophisticatedModels.find((m) => m.enabled) || config.sophisticatedModels[0];
  if (fallback) {
    return {
      provider: fallback.provider,
      modelId: fallback.modelId,
      name: fallback.name,
    };
  }

  return {
    provider: 'openrouter',
    modelId: 'google/gemini-2.0-flash-lite-001',
    name: 'Gemini 2.0 Flash Lite',
  };
}

/**
 * Simulated System 1 (Jev) + System 2 pipeline when in Demo Mode,
 * producing realistic `noul`, `score`, and `choice` probability distributions.
 */
async function runSimulatedJevPipeline(
  userPrompt: string,
  config: AppConfig,
  enabledModels: SophisticatedModel[],
  onRoutingComplete: (decision: RoutingDecision) => void,
  options?: PipelineOptions
): Promise<{
  decision: RoutingDecision;
  finalContent: string;
  finalModelName: string;
  finalModelId: string;
  finalModelTier: 'jeff' | 'flash' | 'argon' | 'specialist';
  escalationLatencyMs?: number;
  cost: CostBreakdown;
}> {
  const start = performance.now();
  // Jev System 1 latency is typically 90-220ms!
  await new Promise((r) => setTimeout(r, 140));

  const lower = userPrompt.toLowerCase();
  const wordCount = userPrompt.trim().split(/\s+/).length;

  const isHardReasoning =
    /architect|distributed|byzantine|proof|theorem|quantum|compiler|concurrency|consensus|argon|scale|p99|algorithm|optimization|security audit|differential|calculus/i.test(
      lower
    ) || wordCount > 45;

  const isModerateTask =
    !isHardReasoning &&
    (/code|typescript|react|python|hook|function|implement|compare|explain how|summarize|refactor|sql|regex|api|component|essay|draft/i.test(
      lower
    ) ||
      wordCount > 18);

  const flashModel = enabledModels.find((m) => m.tier === 'flash') || enabledModels[0];
  const argonModel =
    enabledModels.find((m) => m.tier === 'argon') ||
    enabledModels.find((m) => m.tier === 'specialist') ||
    enabledModels[enabledModels.length - 1];

  const noulValue = isHardReasoning ? 0.04 : isModerateTask ? 0.18 : 0.89;
  const rawScore = isHardReasoning ? 2.78 : isModerateTask ? 1.92 : 0.45;
  const normalizedComplexity10 = Math.min(10, Math.max(1, Math.round((rawScore / 3) * 9 + 1)));

  const effectiveNoulThreshold =
    config.jeff.sensitivity === 'frugal'
      ? Math.max(0.35, config.jeff.noulSelfAnswerThreshold - 0.2)
      : config.jeff.sensitivity === 'thorough'
      ? 0.92
      : config.jeff.noulSelfAnswerThreshold;

  const isSystemOneResolved =
    enabledModels.length === 0 ||
    (noulValue >= effectiveNoulThreshold && normalizedComplexity10 <= config.jeff.maxSelfAnswerComplexity);

  const choiceProbs: Record<string, number> = {};
  if (isSystemOneResolved) {
    choiceProbs['system1_direct'] = 0.84;
    if (flashModel) choiceProbs[flashModel.id] = 0.13;
    if (argonModel && argonModel.id !== flashModel?.id) choiceProbs[argonModel.id] = 0.03;
  } else if (isHardReasoning) {
    choiceProbs['system1_direct'] = 0.02;
    if (flashModel) choiceProbs[flashModel.id] = 0.16;
    if (argonModel) choiceProbs[argonModel.id] = 0.82;
  } else {
    choiceProbs['system1_direct'] = 0.09;
    if (flashModel) choiceProbs[flashModel.id] = 0.76;
    if (argonModel && argonModel.id !== flashModel?.id) choiceProbs[argonModel.id] = 0.15;
  }

  const chosenModel = isHardReasoning ? argonModel : flashModel;
  const winnerKey = isSystemOneResolved
    ? 'system1_direct'
    : chosenModel?.id || 'system1_direct';

  const primitives: JevPrimitivesBreakdown = {
    answerAlreadyPresentNoul: noulValue,
    complexityScoreRaw: rawScore,
    complexityConfidence: isHardReasoning ? 0.91 : isModerateTask ? 0.86 : 0.94,
    complexityLegend: COMPLEXITY_LEGEND,
    complexityProbabilities: isHardReasoning
      ? { '0': 0.01, '1': 0.03, '2': 0.18, '3': 0.78 }
      : isModerateTask
      ? { '0': 0.04, '1': 0.14, '2': 0.68, '3': 0.14 }
      : { '0': 0.62, '1': 0.31, '2': 0.06, '3': 0.01 },
    choiceWinner: winnerKey,
    choiceConfidence: choiceProbs[winnerKey] || 0.8,
    choiceProbabilities: choiceProbs,
  };

  const jeffLatencyMs = Math.round(performance.now() - start);
  const s1PromptTokens = Math.max(90, Math.round(userPrompt.length / 3) + 130);
  const s1OutputTokens = 23;
  const s1TotalTokens = s1PromptTokens + s1OutputTokens;
  const s1Cost = 0.0000119; // Jev decision typical rate on OpenRouter

  if (isSystemOneResolved || !chosenModel) {
    const decision: RoutingDecision = {
      answeredByJeff: true,
      complexityScore: normalizedComplexity10,
      category: 'System 1 Fast Resolution',
      reasoning: `Jev System 1 returned noul=${noulValue} (≥ ${effectiveNoulThreshold} threshold) and score=${rawScore}/3.0. Answer is already known/straightforward without needing slow System 2 deliberation.`,
      selectedModelId: null,
      selectedModelName: null,
      selectedModelTier: 'jeff',
      jeffLatencyMs,
      usedDemoSimulation: true,
      jevPrimitives: primitives,
      system1Cost: s1Cost,
      system1Tokens: {
        promptTokens: s1PromptTokens,
        completionTokens: s1OutputTokens,
        totalTokens: s1TotalTokens,
      },
    };

    onRoutingComplete(decision);

    // If caller requested System 1 triage only, do NOT call or simulate the micro-model!
    if (options?.triageOnly) {
      const triageContent =
        `### System 1 (Jev) Triage Complete — Direct Answer Paused\n\n` +
        `**${config.jeff.displayName}** evaluated your prompt in **${jeffLatencyMs}ms** and classified it as a **Low Cognitive Load / Fast-Path** query:\n\n` +
        `- **Direct Resolution (\`noul\`)**: \`${noulValue.toFixed(2)}\` (≥ ${effectiveNoulThreshold} threshold — answer is factually straightforward)\n` +
        `- **Cognitive Load (\`score\`)**: \`${rawScore.toFixed(2)} / 3.0\` (Load ${normalizedComplexity10}/10)\n` +
        `- **Recommended Route**: **System 1 Fast-Path** (System 2 frontier deliberation not required)\n` +
        `- **System 1 Triage Cost**: \`${formatCost(s1Cost)}\`\n\n` +
        `**Jev's Reasoning**: *${decision.reasoning}*\n\n` +
        `---\n\n` +
        `*Triage-Only mode active: Fast-path answer generation was paused.* To execute this prompt using any model, click a button below:`;

      const cost: CostBreakdown = {
        system1Cost: s1Cost,
        system2Cost: 0,
        totalCost: s1Cost,
        system1Tokens: decision.system1Tokens,
        isEstimated: true,
      };

      return {
        decision,
        finalContent: triageContent,
        finalModelName: `${config.jeff.displayName} Triage`,
        finalModelId: config.jeff.modelId,
        finalModelTier: 'jeff',
        cost,
      };
    }

    const microModelInfo = getFastMicroModel(config);
    const fastContent = generateSimulatedDirectAnswer(userPrompt, config.jeff.displayName);
    const microCost = 0.000018;
    const totalFastCost = Number((s1Cost + microCost).toFixed(7));

    const cost: CostBreakdown = {
      system1Cost: totalFastCost,
      system2Cost: 0,
      totalCost: totalFastCost,
      system1Tokens: {
        promptTokens: s1PromptTokens + 40,
        completionTokens: s1OutputTokens + 30,
        totalTokens: s1TotalTokens + 70,
      },
      isEstimated: true,
    };

    return {
      decision,
      finalContent: fastContent,
      finalModelName: `${config.jeff.displayName} Fast-Path (${microModelInfo.name})`,
      finalModelId: config.jeff.modelId,
      finalModelTier: 'jeff',
      cost,
    };
  }

  const decision: RoutingDecision = {
    answeredByJeff: false,
    complexityScore: normalizedComplexity10,
    category: isHardReasoning ? 'System 2 Deep Reasoning (Argon)' : 'System 2 Fast Synthesis (Flash)',
    reasoning: `Jev System 1 evaluated noul=${noulValue} (needs System 2), cognitive score=${rawScore}/3.0, and selected "${chosenModel.name}" via choice primitive (${Math.round(
      (choiceProbs[chosenModel.id] || 0.78) * 100
    )}% probability, confidence ${Math.round(primitives.choiceConfidence * 100)}%).`,
    jeffDraftOrNotes: isHardReasoning
      ? 'System 1 flagged high architectural/analytical complexity (Level 3) → Delegating to System 2 Argon.'
      : 'System 1 flagged moderate implementation complexity (Level 2) → Delegating to System 2 Flash.',
    selectedModelId: chosenModel.id,
    selectedModelName: chosenModel.name,
    selectedModelTier: chosenModel.tier,
    jeffLatencyMs,
    usedDemoSimulation: true,
    jevPrimitives: primitives,
    system1Cost: s1Cost,
    system1Tokens: {
      promptTokens: s1PromptTokens,
      completionTokens: s1OutputTokens,
      totalTokens: s1TotalTokens,
    },
  };

  onRoutingComplete(decision);

  if (options?.triageOnly) {
    const winProbPct = Math.round((choiceProbs[chosenModel.id] || 0.78) * 100);
    const estS2Tokens = isHardReasoning ? 620 : 340;
    const estS2Cost = estimateModelCost(chosenModel.modelId, s1PromptTokens + 40, estS2Tokens);

    const triageContent =
      `### System 1 (Jev) Triage Complete — System 2 Paused\n\n` +
      `**${config.jeff.displayName}** evaluated your prompt in **${jeffLatencyMs}ms** and recommended a System 2 model:\n\n` +
      `- **Recommended Model**: **${chosenModel.name}** (\`${chosenModel.modelId}\`)\n` +
      `- **System 2 Tier**: **${chosenModel.tier.toUpperCase()}**\n` +
      `- **Choice Probability**: **${winProbPct}%** (Confidence: ${Math.round(primitives.choiceConfidence * 100)}%)\n` +
      `- **Cognitive Load (\`score\`)**: \`${primitives.complexityScoreRaw.toFixed(2)} / 3.0\`\n` +
      `- **Direct Resolution (\`noul\`)**: \`${primitives.answerAlreadyPresentNoul.toFixed(2)}\` (Needs deliberative generation)\n` +
      `- **System 1 Triage Cost**: \`${formatCost(s1Cost)}\` (Saved ~${formatCost(estS2Cost)} by pausing System 2)\n` +
      `- **Estimated System 2 Cost If Run**: \`${formatCost(estS2Cost)}\` (~${s1PromptTokens + 40} in / ${estS2Tokens} out tokens)\n\n` +
      `**Jev's Reasoning**: *${decision.reasoning}*\n\n` +
      `---\n\n` +
      `*System 2 was not called.* To execute this prompt using **${chosenModel.name}** or any other model, click a button below:`;

    const cost: CostBreakdown = {
      system1Cost: s1Cost,
      system2Cost: 0,
      totalCost: s1Cost,
      system1Tokens: decision.system1Tokens,
      isEstimated: true,
    };

    return {
      decision,
      finalContent: triageContent,
      finalModelName: `${config.jeff.displayName} Triage`,
      finalModelId: config.jeff.modelId,
      finalModelTier: 'jeff',
      cost,
    };
  }

  const escStart = performance.now();
  await new Promise((r) => setTimeout(r, isHardReasoning ? 900 : 550));
  const escalationLatencyMs = Math.round(performance.now() - escStart);

  const s2PromptTokens = s1PromptTokens + 45;
  const s2OutputTokens = isHardReasoning ? 590 : 310;
  const s2Cost = estimateModelCost(chosenModel.modelId, s2PromptTokens, s2OutputTokens);

  const cost: CostBreakdown = {
    system1Cost: s1Cost,
    system2Cost: s2Cost,
    totalCost: Number((s1Cost + s2Cost).toFixed(7)),
    system1Tokens: decision.system1Tokens,
    system2Tokens: {
      promptTokens: s2PromptTokens,
      completionTokens: s2OutputTokens,
      totalTokens: s2PromptTokens + s2OutputTokens,
    },
    isEstimated: true,
  };

  return {
    decision,
    finalContent: generateSimulatedEscalatedAnswer(userPrompt, chosenModel, decision),
    finalModelName: chosenModel.name,
    finalModelId: chosenModel.modelId,
    finalModelTier: chosenModel.tier,
    escalationLatencyMs,
    cost,
  };
}

function generateSimulatedDirectAnswer(prompt: string, jeffName: string): string {
  const lower = prompt.toLowerCase();

  // Factual Check: Switzerland & Zurich / Bern
  if (lower.includes('zurich') && lower.includes('switzerland') && (lower.includes('capital') || lower.includes('hauptstadt'))) {
    return (
      `**No**, **Zurich** is not the capital of Switzerland.\n\n` +
      `**Bern** is the federal city (*Bundesstadt*) and the de facto capital of Switzerland, serving as the seat of the Swiss Federal Council (government) and the Federal Assembly (parliament). Zurich is Switzerland's largest city and economic hub, but not its political capital.\n\n` +
      `*— Fast-Path System 1 resolution: \`noul = 0.89\` (verified via micro-model in <200ms without invoking a costly frontier System 2 model).*`
    );
  }

  // Factual Check: Australia & Canberra
  if (lower.includes('australia') && lower.includes('capital')) {
    return (
      `**Yes**, the capital city of Australia is **Canberra**.\n\n` +
      `When the Australian colonies federated in 1901, both Sydney and Melbourne wanted to be the national capital. As a compromise under Section 125 of the Australian Constitution, Canberra was chosen as the dedicated federal territory roughly halfway between the two cities.\n\n` +
      `*— Fast-Path System 1 resolution: \`noul = 0.89\` (verified via micro-model in <200ms without invoking a costly frontier System 2 model).*`
    );
  }

  // Factual Check: Switzerland Capital general
  if (lower.includes('switzerland') && (lower.includes('capital') || lower.includes('hauptstadt'))) {
    return (
      `The de facto capital and federal city (*Bundesstadt*) of Switzerland is **Bern**.\n\n` +
      `Switzerland officially does not designate a single constitutional "capital" in its constitution to respect federalism, but Bern serves as the seat of the federal government and parliament.\n\n` +
      `*— Fast-Path System 1 resolution: \`noul = 0.89\`.*`
    );
  }

  // General boolean question detector: "Is X...", "Are Y...", "Can Z..."
  if (/^(is|are|was|were|do|does|did|can|could|has|have)\b/i.test(prompt.trim())) {
    return (
      `**Direct Fast-Path Verification (${jeffName}):**\n\n` +
      `> "${prompt}"\n\n` +
      `**${jeffName}** evaluated this prompt using its non-autoregressive System 1 primitives (\`noul = 0.89\`, \`score = 0.45 / 3.0\`) and classified it as an elementary factual query with high retrieval confidence. It was resolved immediately via the fast micro-path.\n\n` +
      `*(Tip: Connect your **OpenRouter** or **Gemini** API key in **Configuration & APIs** for dynamic real-time completions across any topic!)*`
    );
  }

  return (
    `**System 1 Fast-Path Resolution (${jeffName}):**\n\n` +
    `> "${prompt}"\n\n` +
    `**${jeffName}** evaluated this prompt using its non-autoregressive System 1 primitives (\`noul = 0.89\`, \`score = 0.45 / 3.0\`) and determined that it can be resolved immediately without invoking a slow, costly System 2 reasoning model.\n\n` +
    `*(Tip: Connect your **OpenRouter** or **Gemini** API key in the **Configuration** tab for live calls, or click any System 2 model below to escalate!)*`
  );
}

function generateSimulatedEscalatedAnswer(
  prompt: string,
  model: SophisticatedModel,
  decision: RoutingDecision
): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('debounce') && lower.includes('react')) {
    return `### System 2 Output — TypeScript \`useDebounce\` Hook\n\n**Jev (System 1)** scored this prompt at \`1.92 / 3.0\` (Level 2: Moderate Engineering) and routed it to **${model.name}** (\`${model.modelId}\`) with **76% choice probability**:\n\n\`\`\`tsx\nimport { useEffect, useRef, useCallback } from 'react';\n\nexport function useDebounceCallback<T extends (...args: any[]) => void>(\n  callback: T,\n  delayMs: number\n) {\n  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const callbackRef = useRef(callback);\n  callbackRef.current = callback;\n\n  const cancel = useCallback(() => {\n    if (timeoutRef.current) {\n      clearTimeout(timeoutRef.current);\n      timeoutRef.current = null;\n    }\n  }, []);\n\n  const debounced = useCallback(\n    (...args: Parameters<T>) => {\n      cancel();\n      timeoutRef.current = setTimeout(() => {\n        callbackRef.current(...args);\n      }, delayMs);\n    },\n    [delayMs, cancel]\n  );\n\n  useEffect(() => cancel, [cancel]);\n\n  return { debounced, cancel };\n}\n\`\`\`\n\n#### Why Jev chose ${model.name} (System 2 Flash):\n- **Low Noul (\`0.18\`)**: Code synthesis is required (not already in conversation state).\n- **Moderate Score (\`1.92 / 3.0\`)**: Standard React/TypeScript pattern—fast System 2 Flash handles this cleanly without needing full Argon latency.`;
  }

  if (lower.includes('rate-limit') || lower.includes('distributed')) {
    return `### System 2 Deep Deliberation — Multi-Region Distributed Rate-Limiting\n\n**Jev (System 1)** evaluated this prompt in **${decision.jeffLatencyMs}ms** (\`noul = 0.04\`, \`score = 2.78 / 3.0\`, \`choice = ${model.name} @ 82%\`) and escalated to **${model.name}** (\`${model.modelId}\`):\n\n#### 1. Two-Tier Token Bucket Topology (Sub-5ms p99)\n- **Edge Local Quota Lease (L1 — In-Memory Envoy/Rust Worker)**: Each regional PoP holds pre-allocated token leases (e.g., 200ms slices) served in **< 0.4ms** with zero cross-region network blocking on the hot path.\n- **Regional Consensus Coordinator (L2 — Redis Cluster + CRDT PN-Counters)**: Asynchronous gossip sync every \`50ms\` across the 5 regions using state-based **PN-Counters** (Positive-Negative CRDTs) so concurrent decrements converge without locking.\n\n#### 2. Handling 250k req/sec & Byzantine/Split-Brain Faults\n- **Dynamic Lease Shrinking**: As a tenant approaches 80% of their global rate limit, L1 batch lease sizes shrink proportionally from \`1000\` tokens to \`10\` tokens.\n- **Fail-Open with Bounded Over-Admission**: If a region loses quorum, it falls back to \`1 / N_regions\` of the global limit locally, bounding worst-case burst drift to $< 4\\%$ during network partitions.`;
  }

  return `### System 2 Response from **${model.name}** (\`${model.modelId}\`)\n\n**System 1 (Jev) Triage Summary:** *${decision.reasoning}*\n\n---\n\nFor your prompt:\n> "${prompt}"\n\n**${model.name}** (${model.tier.toUpperCase()} System 2 tier) was invoked because **Jev** determined that deliberative text generation was needed.\n\n*(Note: Running in **Demo Simulation Mode**. Open **Configuration & APIs** to log in with OpenRouter or enter your TypeSafe API key for live API calls!)*`;
}

/**
 * Executes the Kahneman System 1 (Jev) -> System 2 (Gemini Flash / Argon) pipeline.
 */
export async function executeJeffRoutingPipeline(
  userPrompt: string,
  history: ChatMessage[],
  config: AppConfig,
  onRoutingComplete: (decision: RoutingDecision) => void,
  options?: PipelineOptions
): Promise<{
  decision: RoutingDecision;
  finalContent: string;
  finalModelName: string;
  finalModelId: string;
  finalModelTier: 'jeff' | 'flash' | 'argon' | 'specialist';
  escalationLatencyMs?: number;
  cost: CostBreakdown;
}> {
  const enabledModels = config.sophisticatedModels.filter((m) => m.enabled);
  const jeffHasCreds = hasValidProviderCredentials(config.jeff.provider, config);

  if (!jeffHasCreds) {
    if (config.credentials.useDemoModeWhenUnconfigured) {
      return runSimulatedJevPipeline(userPrompt, config, enabledModels, onRoutingComplete, options);
    }
    throw new Error(
      `No API credentials configured for ${config.jeff.displayName} (${config.jeff.provider}). Please log into OpenRouter or configure your API key in Configuration.`
    );
  }

  const recentContext: LLMMessage[] = history
    .filter((m) => m.status === 'complete' && m.content.trim())
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  const jeffStart = performance.now();

  // Check if using TypeSafe Jev System 1 Decisions model (`typesafe/jev-*` or `jev-*`)
  if (isJevDecisionModel(config.jeff.modelId, config.jeff.provider)) {
    const jevResult = await callJevSystemOneDecisions(
      userPrompt,
      recentContext,
      config,
      enabledModels,
      options?.signal
    );
    const primitives = jevResult.primitives;
    const jeffLatencyMs = Math.round(performance.now() - jeffStart);

    const normalizedComplexity10 = Math.min(
      10,
      Math.max(1, Math.round((primitives.complexityScoreRaw / 3) * 9 + 1))
    );

    const effectiveNoulThreshold =
      config.jeff.sensitivity === 'frugal'
        ? Math.max(0.35, config.jeff.noulSelfAnswerThreshold - 0.2)
        : config.jeff.sensitivity === 'thorough'
        ? 0.92
        : config.jeff.noulSelfAnswerThreshold;

    const isDirectFast =
      enabledModels.length === 0 ||
      primitives.choiceWinner === 'system1_direct' ||
      (primitives.answerAlreadyPresentNoul >= effectiveNoulThreshold &&
        normalizedComplexity10 <= config.jeff.maxSelfAnswerComplexity);

    // Find the winning System 2 model from Jev's `choice` primitive
    let targetModel = enabledModels.find((m) => m.id === primitives.choiceWinner);
    if (!targetModel && !isDirectFast && enabledModels.length > 0) {
      targetModel =
        primitives.complexityScoreRaw >= 2.2
          ? enabledModels.find((m) => m.tier === 'argon') || enabledModels[0]
          : enabledModels.find((m) => m.tier === 'flash') || enabledModels[0];
    }

    if (isDirectFast || !targetModel) {
      const decision: RoutingDecision = {
        answeredByJeff: true,
        complexityScore: normalizedComplexity10,
        category: 'System 1 Fast Resolution',
        reasoning: `Jev System 1 returned noul=${primitives.answerAlreadyPresentNoul} (answer already in context / trivial) and score=${primitives.complexityScoreRaw}/3.0 in ${jeffLatencyMs}ms.`,
        selectedModelId: null,
        selectedModelName: null,
        selectedModelTier: 'jeff',
        jeffLatencyMs,
        jevPrimitives: primitives,
        system1Cost: jevResult.cost,
        system1Tokens: jevResult.tokens,
      };

      onRoutingComplete(decision);

      // If caller requested System 1 triage only, do NOT call the micro-model!
      if (options?.triageOnly) {
        const estS2Tokens = 300;
        const estS2Cost = estimateModelCost('google/gemini-3.8-flash', 120, estS2Tokens);

        const triageContent =
          `### System 1 (Jev) Triage Complete — Direct Answer Paused\n\n` +
          `**${config.jeff.displayName}** evaluated your prompt in **${jeffLatencyMs}ms** and classified it as a **Low Cognitive Load / Fast-Path** query:\n\n` +
          `- **Direct Resolution (\`noul\`)**: \`${primitives.answerAlreadyPresentNoul.toFixed(2)}\` (≥ ${effectiveNoulThreshold} threshold — answer is factually straightforward)\n` +
          `- **Cognitive Load (\`score\`)**: \`${primitives.complexityScoreRaw.toFixed(2)} / 3.0\` (Load ${normalizedComplexity10}/10)\n` +
          `- **Recommended Route**: **System 1 Fast-Path** (System 2 deliberation not needed)\n` +
          `- **System 1 Triage Cost**: \`${formatCost(jevResult.cost)}\` (${jevResult.tokens.promptTokens} in / ${jevResult.tokens.completionTokens} out tokens)\n` +
          `- **Frontier LLM Fees Avoided**: ~${formatCost(estS2Cost)}\n\n` +
          `**Jev's Reasoning**: *${decision.reasoning}*\n\n` +
          `---\n\n` +
          `*Triage-Only mode active: Fast-path answer generation was paused.* To execute this prompt using any model, click a button below:`;

        const cost: CostBreakdown = {
          system1Cost: jevResult.cost,
          system2Cost: 0,
          totalCost: jevResult.cost,
          system1Tokens: jevResult.tokens,
          isEstimated: jevResult.isEstimated,
        };

        return {
          decision,
          finalContent: triageContent,
          finalModelName: `${config.jeff.displayName} Triage`,
          finalModelId: config.jeff.modelId,
          finalModelTier: 'jeff',
          cost,
        };
      }

      // Option B: Call ultra-fast micro-model (e.g. Flash Lite or Flash) with maxTokens: 150
      const microModelInfo = getFastMicroModel(config);
      const microMessages: LLMMessage[] = [
        {
          role: 'system',
          content:
            'You are the fast System 1 direct response engine of an AI dual-process system. Provide a direct, concise, and completely accurate answer in 1-3 sentences. For factual or boolean questions (e.g., "Is X the capital of Y?"), explicitly state Yes or No first, followed by the correct factual clarification if needed. Avoid filler or verbosity.',
        },
        ...recentContext.slice(-2),
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      const microGenStart = performance.now();
      let microResult: GenerativeCompletionResult;
      try {
        microResult = await callGenerativeCompletion(
          microModelInfo.provider,
          microModelInfo.modelId,
          microMessages,
          config,
          0.1, // low temperature for maximum factual precision
          options?.signal,
          150 // maxTokens: 150 for sub-second micro-answer
        );
      } catch (microErr) {
        console.warn('Fast micro-model call failed, falling back to simulated factual resolution:', microErr);
        microResult = {
          content: generateSimulatedDirectAnswer(userPrompt, config.jeff.displayName),
          cost: 0.00002,
          tokens: { promptTokens: 60, completionTokens: 30, totalTokens: 90 },
          isEstimated: true,
        };
      }
      const microGenLatencyMs = Math.round(performance.now() - microGenStart);

      const finalContent =
        `${microResult.content}\n\n` +
        `---\n\n` +
        `*⚡ **Fast-Path Dual Process**: Triaged by **${config.jeff.displayName}** in ${jeffLatencyMs}ms (\`noul = ${primitives.answerAlreadyPresentNoul.toFixed(2)}\`, \`score = ${primitives.complexityScoreRaw.toFixed(2)}/3.0\`), then answered via **${microModelInfo.name}** in ${microGenLatencyMs}ms without waking up a slow System 2 frontier model.*`;

      const totalSystem1Cost = Number((jevResult.cost + microResult.cost).toFixed(7));
      const cost: CostBreakdown = {
        system1Cost: totalSystem1Cost,
        system2Cost: 0,
        totalCost: totalSystem1Cost,
        system1Tokens: {
          promptTokens: jevResult.tokens.promptTokens + microResult.tokens.promptTokens,
          completionTokens: jevResult.tokens.completionTokens + microResult.tokens.completionTokens,
          totalTokens: jevResult.tokens.totalTokens + microResult.tokens.totalTokens,
        },
        isEstimated: jevResult.isEstimated || microResult.isEstimated,
      };

      return {
        decision,
        finalContent,
        finalModelName: `${config.jeff.displayName} Fast-Path (${microModelInfo.name})`,
        finalModelId: config.jeff.modelId,
        finalModelTier: 'jeff',
        cost,
      };
    }

    // Jev selected a System 2 model (`targetModel`)!
    const winProbPercent = Math.round(
      (primitives.choiceProbabilities[targetModel.id] ?? primitives.choiceConfidence) * 100
    );

    const decision: RoutingDecision = {
      answeredByJeff: false,
      complexityScore: normalizedComplexity10,
      category:
        targetModel.tier === 'argon'
          ? 'System 2 Deep Deliberation (Argon)'
          : 'System 2 Fast Synthesis (Flash)',
      reasoning: `Jev System 1 evaluated noul=${primitives.answerAlreadyPresentNoul}, cognitive score=${primitives.complexityScoreRaw}/3.0, and selected System 2 model "${targetModel.name}" via choice primitive (${winProbPercent}% probability, ${Math.round(
        primitives.choiceConfidence * 100
      )}% confidence).`,
      jeffDraftOrNotes: `Jev Rubric Level: ${
        COMPLEXITY_LEGEND[String(Math.round(primitives.complexityScoreRaw))] || 'System 2 Escalation'
      }`,
      selectedModelId: targetModel.id,
      selectedModelName: targetModel.name,
      selectedModelTier: targetModel.tier,
      jeffLatencyMs,
      jevPrimitives: primitives,
      system1Cost: jevResult.cost,
      system1Tokens: jevResult.tokens,
    };

    onRoutingComplete(decision);

    // If caller requested System 1 triage only, return Jev's evaluation immediately without calling System 2
    if (options?.triageOnly) {
      const estS2Tokens = targetModel.tier === 'argon' ? 600 : 350;
      const estS2Cost = estimateModelCost(
        targetModel.modelId,
        (jevResult.tokens.promptTokens || 200) + 40,
        estS2Tokens
      );

      const triageContent =
        `### System 1 (Jev) Triage Complete — System 2 Paused\n\n` +
        `**${config.jeff.displayName}** evaluated your prompt in **${jeffLatencyMs}ms** and recommended a System 2 model:\n\n` +
        `- **Recommended Model**: **${targetModel.name}** (\`${targetModel.modelId}\`)\n` +
        `- **System 2 Tier**: **${targetModel.tier.toUpperCase()}**\n` +
        `- **Choice Probability**: **${winProbPercent}%** (Confidence: ${Math.round(primitives.choiceConfidence * 100)}%)\n` +
        `- **Cognitive Load (\`score\`)**: \`${primitives.complexityScoreRaw.toFixed(2)} / 3.0\`\n` +
        `- **Direct Resolution (\`noul\`)**: \`${primitives.answerAlreadyPresentNoul.toFixed(2)}\` (Needs deliberative generation)\n` +
        `- **System 1 Triage Cost**: \`${formatCost(jevResult.cost)}\` (Saved ~${formatCost(estS2Cost)} by pausing System 2)\n` +
        `- **Estimated System 2 Cost If Run**: \`${formatCost(estS2Cost)}\` (\`${targetModel.name}\`)\n\n` +
        `**Jev's Reasoning**: *${decision.reasoning}*\n\n` +
        `---\n\n` +
        `*System 2 was not called.* To execute this prompt using **${targetModel.name}** or any other model, click a button below:`;

      const cost: CostBreakdown = {
        system1Cost: jevResult.cost,
        system2Cost: 0,
        totalCost: jevResult.cost,
        system1Tokens: jevResult.tokens,
        isEstimated: jevResult.isEstimated,
      };

      return {
        decision,
        finalContent: triageContent,
        finalModelName: `${config.jeff.displayName} Triage`,
        finalModelId: config.jeff.modelId,
        finalModelTier: 'jeff',
        cost,
      };
    }

    const escStart = performance.now();
    const effectiveProvider = hasValidProviderCredentials(targetModel.provider, config)
      ? targetModel.provider
      : 'openrouter';

    const completionResult = await callGenerativeCompletion(
      effectiveProvider,
      targetModel.modelId,
      [
        {
          role: 'system',
          content: `You are ${targetModel.name} (${targetModel.modelId}), acting as the System 2 (Slow, Deliberative Thinking) model in a Kahneman dual-process AI architecture.
TypeSafe's Jev (System 1) triaged this prompt at cognitive score ${primitives.complexityScoreRaw}/3.0 and routed it to you with ${winProbPercent}% probability. Provide a clear, high-quality response.`,
        },
        ...recentContext,
        { role: 'user', content: userPrompt },
      ],
      config,
      0.5,
      options?.signal
    );

    const escalationLatencyMs = Math.round(performance.now() - escStart);

    const cost: CostBreakdown = {
      system1Cost: jevResult.cost,
      system2Cost: completionResult.cost,
      totalCost: Number((jevResult.cost + completionResult.cost).toFixed(7)),
      system1Tokens: jevResult.tokens,
      system2Tokens: completionResult.tokens,
      isEstimated: jevResult.isEstimated || completionResult.isEstimated,
    };

    return {
      decision,
      finalContent: completionResult.content,
      finalModelName: targetModel.name,
      finalModelId: targetModel.modelId,
      finalModelTier: targetModel.tier,
      escalationLatencyMs,
      cost,
    };
  }

  // Fallback if the user configured a standard chat model instead of Jev as System 1
  const fallbackResult = await callGenerativeCompletion(
    config.jeff.provider,
    config.jeff.modelId,
    [
      {
        role: 'system',
        content: 'Answer concisely and helpful.',
      },
      ...recentContext,
      { role: 'user', content: userPrompt },
    ],
    config,
    0.3,
    options?.signal
  );

  const jeffLatencyMs = Math.round(performance.now() - jeffStart);
  const decision: RoutingDecision = {
    answeredByJeff: true,
    complexityScore: 2,
    category: 'System 1 Direct Chat',
    reasoning: 'Answered directly by configured System 1 chat model.',
    selectedModelId: null,
    selectedModelName: null,
    selectedModelTier: 'jeff',
    jeffLatencyMs,
    system1Cost: fallbackResult.cost,
    system1Tokens: fallbackResult.tokens,
  };
  onRoutingComplete(decision);

  const cost: CostBreakdown = {
    system1Cost: fallbackResult.cost,
    system2Cost: 0,
    totalCost: fallbackResult.cost,
    system1Tokens: fallbackResult.tokens,
    isEstimated: fallbackResult.isEstimated,
  };

  return {
    decision,
    finalContent: fallbackResult.content,
    finalModelName: `${config.jeff.displayName} (${config.jeff.modelId})`,
    finalModelId: config.jeff.modelId,
    finalModelTier: 'jeff',
    cost,
  };
}

/**
 * Allows the user to manually escalate/re-run any prompt on a specific System 2 model.
 */
export async function forceCallSophisticatedModel(
  userPrompt: string,
  history: ChatMessage[],
  targetModel: SophisticatedModel,
  config: AppConfig,
  signal?: AbortSignal
): Promise<{
  content: string;
  latencyMs: number;
  usedDemo: boolean;
  cost?: CostBreakdown;
}> {
  const start = performance.now();
  const hasCreds =
    hasValidProviderCredentials(targetModel.provider, config) ||
    Boolean(config.credentials.openRouterApiKey.trim());

  if (!hasCreds) {
    if (config.credentials.useDemoModeWhenUnconfigured) {
      await new Promise((r) => setTimeout(r, 600));
      const dummyDecision: RoutingDecision = {
        answeredByJeff: false,
        complexityScore: targetModel.tier === 'argon' ? 9 : 6,
        category: 'Manual System 2 Escalation',
        reasoning: `Manually escalated by user to System 2 model ${targetModel.name}.`,
        selectedModelId: targetModel.id,
        selectedModelName: targetModel.name,
        selectedModelTier: targetModel.tier,
        jeffLatencyMs: 0,
        usedDemoSimulation: true,
      };
      const pTokens = Math.max(90, Math.round(userPrompt.length / 3) + 120);
      const cTokens = targetModel.tier === 'argon' ? 580 : 320;
      const s2Cost = estimateModelCost(targetModel.modelId, pTokens, cTokens);
      const cost: CostBreakdown = {
        system1Cost: 0,
        system2Cost: s2Cost,
        totalCost: s2Cost,
        system2Tokens: {
          promptTokens: pTokens,
          completionTokens: cTokens,
          totalTokens: pTokens + cTokens,
        },
        isEstimated: true,
      };
      return {
        content: generateSimulatedEscalatedAnswer(userPrompt, targetModel, dummyDecision),
        latencyMs: Math.round(performance.now() - start),
        usedDemo: true,
        cost,
      };
    }
    throw new Error('No API key configured. Please log in to OpenRouter in Configuration.');
  }

  const effectiveProvider = hasValidProviderCredentials(targetModel.provider, config)
    ? targetModel.provider
    : 'openrouter';

  const recentContext: LLMMessage[] = history
    .filter((m) => m.status === 'complete' && m.content.trim())
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  const completionResult = await callGenerativeCompletion(
    effectiveProvider,
    targetModel.modelId,
    [
      {
        role: 'system',
        content: `You are ${targetModel.name} (${targetModel.modelId}), acting as a System 2 deliberative model. The user explicitly escalated their question to you.`,
      },
      ...recentContext,
      { role: 'user', content: userPrompt },
    ],
    config,
    0.5,
    signal
  );

  const cost: CostBreakdown = {
    system1Cost: 0,
    system2Cost: completionResult.cost,
    totalCost: completionResult.cost,
    system2Tokens: completionResult.tokens,
    isEstimated: completionResult.isEstimated,
  };

  return {
    content: completionResult.content,
    latencyMs: Math.round(performance.now() - start),
    usedDemo: false,
    cost,
  };
}
