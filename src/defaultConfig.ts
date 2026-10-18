import { AppConfig, SophisticatedModel } from './types';

export const JEV_MODEL_PRESETS = [
  {
    label: 'Jev 1.14 via OpenRouter (System 1 Decisions API)',
    modelId: 'typesafe/jev-1.14',
    provider: 'openrouter' as const,
    note: 'TypeSafe AI’s non-autoregressive System 1 model on OpenRouter (/api/alpha/decisions) — 70-300ms parallel noul/score/choice triage',
  },
  {
    label: 'Jev Latest via TypeSafe Native Cloud',
    modelId: 'jev-latest',
    provider: 'typesafe' as const,
    note: 'Direct connection to api.typesafe.ai/v1/systemone using your TYPESAFE_API_KEY',
  },
  {
    label: 'Jev 1.13 via OpenRouter',
    modelId: 'typesafe/jev-1.13',
    provider: 'openrouter' as const,
    note: 'Previous stable TypeSafe Jev System 1 checkpoint on OpenRouter',
  },
  {
    label: 'Fallback Chat Router (Gemini 2.0 Flash Lite)',
    modelId: 'google/gemini-2.0-flash-lite-001',
    provider: 'openrouter' as const,
    note: 'Small autoregressive chat model fallback if you want System 1 to also generate prose directly',
  },
];

export const DEFAULT_SOPHISTICATED_MODELS: SophisticatedModel[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    modelId: 'google/gemini-3.8-flash',
    provider: 'openrouter',
    tier: 'flash',
    description:
      'System 2 Fast-Deliberative model. Select when the answer is not already in context and the user needs standard code generation, summarization, drafting, or structured explanations without heavy frontier reasoning.',
    strengths: ['Fast System 2', 'Standard Coding', 'Summarization', 'Drafting & Synthesis'],
    costIndicator: '$',
    speedIndicator: 'Fast',
    enabled: true,
  },
  {
    id: 'gemini-argon',
    name: 'Gemini Argon',
    modelId: 'google/gemini-4-argon',
    provider: 'openrouter',
    tier: 'argon',
    description:
      'System 2 Deep-Deliberative frontier model (Argon / Pro tier). Select when the prompt requires complex multi-step reasoning, distributed system architecture, formal math proofs, or subtle debugging.',
    strengths: ['Deep System 2 Reasoning', 'System Architecture', 'Complex Math', 'Hard Debugging'],
    costIndicator: '$$$',
    speedIndicator: 'Deep-Think',
    enabled: true,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3.7 Sonnet',
    modelId: 'anthropic/claude-3.7-sonnet',
    provider: 'openrouter',
    tier: 'specialist',
    description:
      'System 2 Software Engineering & Nuance Specialist. Select for intricate full-stack UI/UX code, refactoring, or nuanced creative writing.',
    strengths: ['Full-Stack Code', 'Nuanced Writing', 'Refactoring', 'UI Design'],
    costIndicator: '$$',
    speedIndicator: 'Fast',
    enabled: true,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    modelId: 'deepseek/deepseek-r1',
    provider: 'openrouter',
    tier: 'argon',
    description:
      'System 2 Chain-of-Thought Specialist for formal logic verification, algorithmic puzzles, and step-by-step mathematical derivations.',
    strengths: ['Chain-of-Thought', 'Logic Puzzles', 'Algorithm Design'],
    costIndicator: '$$',
    speedIndicator: 'Deep-Think',
    enabled: false,
  },
];

export const DEFAULT_CONFIG: AppConfig = {
  credentials: {
    openRouterApiKey: '',
    openRouterConnectedViaOAuth: false,
    typeSafeApiKey: '',
    geminiApiKey: '',
    customEndpointUrl: 'http://localhost:11434/v1',
    customApiKey: '',
    useDemoModeWhenUnconfigured: true,
  },
  jeff: {
    displayName: 'Jev',
    provider: 'openrouter',
    modelId: 'typesafe/jev-1.14',
    sensitivity: 'balanced',
    noulSelfAnswerThreshold: 0.65,
    maxSelfAnswerComplexity: 3,
    customInstructions:
      'Use System 1 (Jev) to check if the answer is already in the conversation state or can be resolved immediately (`noul`), score the cognitive load (`score`), and choose between Gemini Flash (moderate System 2 tasks) and Gemini Argon (deep System 2 analytical reasoning) via `choice`.',
  },
  sophisticatedModels: DEFAULT_SOPHISTICATED_MODELS,
};

export const SAMPLE_PROMPTS = [
  {
    label: 'System 1 Fast Verification (Served by Jev Alone)',
    prompt: 'Is Canberra the capital city of Australia?',
    expectedRoute: 'Jev System 1 (Zero System 2 Calls)',
    badgeColor: 'emerald',
  },
  {
    label: 'System 2 — Fast Deliberation (Routes to Gemini Flash)',
    prompt: 'Write a clean TypeScript debounce hook for React with cancellation support and explain how it works.',
    expectedRoute: 'Gemini Flash (System 2)',
    badgeColor: 'sky',
  },
  {
    label: 'System 2 — Deep Deliberation (Routes to Gemini Argon)',
    prompt: 'Design a distributed rate-limiting architecture across 5 global regions handling 250k req/sec with sub-5ms p99 latency, eventual consistency fallback, and Byzantine fault tolerance analysis.',
    expectedRoute: 'Gemini Argon (System 2)',
    badgeColor: 'violet',
  },
];
