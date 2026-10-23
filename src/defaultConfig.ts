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
    name: 'Claude Sonnet 5.5',
    modelId: 'anthropic/claude-sonnet-5.5',
    provider: 'openrouter',
    tier: 'specialist',
    description:
      'System 2 Software Engineering & Nuance Specialist (Claude Sonnet 5.5). Select for intricate full-stack UI/UX code, refactoring, agentic flows, or nuanced creative writing.',
    strengths: ['Full-Stack Code', 'Nuanced Writing', 'Refactoring', 'UI Design', 'Agentic Workflows'],
    costIndicator: '$$',
    speedIndicator: 'Fast',
    enabled: true,
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4.1 Flash',
    modelId: 'deepseek/deepseek-v4.1-flash',
    provider: 'openrouter',
    tier: 'flash',
    description:
      'System 2 Ultra-Fast & Cost-Efficient MoE model (DeepSeek V4.1 Flash). Select for high-throughput code synthesis, summarization, and data parsing at fraction of cost.',
    strengths: ['Ultra-Low Latency', 'Extreme Cost Efficiency', 'Code Synthesis', '1M Context'],
    costIndicator: '$',
    speedIndicator: 'Fast',
    enabled: true,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 (0528)',
    modelId: 'deepseek/deepseek-r1-0528',
    provider: 'openrouter',
    tier: 'argon',
    description:
      'System 2 Open-Weights Reasoning Specialist (DeepSeek R1 0528). Select for formal logic verification, math derivations, competitive coding, and exhaustive step-by-step reasoning.',
    strengths: ['Chain-of-Thought', 'Formal Logic', 'Math Proofs', 'Algorithm Design'],
    costIndicator: '$$',
    speedIndicator: 'Deep-Think',
    enabled: false,
  },
  {
    id: 'gpt-6-sol',
    name: 'GPT-6.1 Sol',
    modelId: 'openai/gpt-6.1-sol',
    provider: 'openrouter',
    tier: 'specialist',
    description:
      'System 2 General Multimodal & Enterprise Synthesis model (OpenAI GPT-6.1 Sol). Select for complex structured instructions, balanced enterprise reasoning, and large multi-document synthesis.',
    strengths: ['Enterprise Reasoning', 'Structured JSON', 'Multimodal', '1M Context'],
    costIndicator: '$$',
    speedIndicator: 'Fast',
    enabled: false,
  },
  {
    id: 'o3-pro',
    name: 'OpenAI o3 Pro',
    modelId: 'openai/o3-pro',
    provider: 'openrouter',
    tier: 'argon',
    description:
      'System 2 Deep Deliberation Frontier Reasoner (OpenAI o3 Pro). Select when maximum cognitive verification, complex theorem proving, and critical safety validations are required.',
    strengths: ['Maximum Verification', 'Deep Thinking', 'Complex Theorems', 'Hardest Edge Cases'],
    costIndicator: '$$$',
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
    label: 'System 1 Fast Verification — Affirmative (Yes)',
    prompt: 'Is Canberra the capital city of Australia?',
    expectedRoute: 'System 1 Fast-Path (Yes, Canberra is Capital)',
    badgeColor: 'emerald',
  },
  {
    label: 'System 1 Fast Verification — Negative (No)',
    prompt: 'Is Zurich the capital of Switzerland?',
    expectedRoute: 'System 1 Fast-Path (No, Bern is Capital)',
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
