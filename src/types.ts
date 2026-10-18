export type ProviderType = 'openrouter' | 'typesafe' | 'gemini' | 'custom';

export type ModelTier = 'flash' | 'argon' | 'specialist';

export type RoutingSensitivity = 'frugal' | 'balanced' | 'thorough';

export interface ProviderCredentials {
  openRouterApiKey: string;
  openRouterConnectedViaOAuth: boolean;
  typeSafeApiKey: string;
  geminiApiKey: string;
  customEndpointUrl: string;
  customApiKey: string;
  useDemoModeWhenUnconfigured: boolean;
}

export interface JevConfig {
  displayName: string;
  provider: ProviderType;
  modelId: string; // e.g. "typesafe/jev-1.14" on OpenRouter or "jev-latest" on TypeSafe
  sensitivity: RoutingSensitivity;
  noulSelfAnswerThreshold: number; // 0.1 to 0.95: if Jev's noul >= this, answer is already present / trivial
  maxSelfAnswerComplexity: number; // 1 to 10
  customInstructions: string;
}

export interface SophisticatedModel {
  id: string;
  name: string;
  modelId: string;
  provider: ProviderType;
  tier: ModelTier;
  description: string; // Passed into Jev's `choice` criteria dictionary
  strengths: string[];
  costIndicator: '$' | '$$' | '$$$';
  speedIndicator: 'Ultra-Fast' | 'Fast' | 'Deep-Think';
  enabled: boolean;
}

export interface AppConfig {
  credentials: ProviderCredentials;
  jeff: JevConfig;
  sophisticatedModels: SophisticatedModel[];
}

export interface JevPrimitivesBreakdown {
  /** Jev `noul` primitive: 0.0 to 1.0 probability that answer is already in state or trivial */
  answerAlreadyPresentNoul: number;
  /** Jev `score` primitive: 0 to 3 rubric score + confidence */
  complexityScoreRaw: number; // 0.0 to 3.0
  complexityConfidence: number; // 0.0 to 1.0
  complexityLegend: Record<string, string>;
  complexityProbabilities: Record<string, number>;
  /** Jev `choice` primitive: probability breakdown across candidate System 2 models */
  choiceWinner: string;
  choiceConfidence: number; // 0.0 to 1.0
  choiceProbabilities: Record<string, number>;
}

export interface RoutingDecision {
  answeredByJeff: boolean;
  complexityScore: number; // Normalized 1-10 for UI badge
  category: string;
  reasoning: string;
  jeffDraftOrNotes?: string;
  selectedModelId: string | null;
  selectedModelName: string | null;
  selectedModelTier: ModelTier | 'jeff';
  jeffLatencyMs: number;
  usedDemoSimulation?: boolean;
  jevPrimitives?: JevPrimitivesBreakdown;
}

export interface PipelineOptions {
  signal?: AbortSignal;
  triageOnly?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  userPrompt?: string;
  timestamp: number;
  status: 'jeff_evaluating' | 'escalating_to_model' | 'complete' | 'cancelled' | 'error';
  isTriageOnly?: boolean;
  routing?: RoutingDecision;
  finalModelName?: string;
  finalModelId?: string;
  finalModelTier?: ModelTier | 'jeff';
  escalationLatencyMs?: number;
  totalLatencyMs?: number;
  errorMessage?: string;
}

export interface OpenRouterCatalogModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}
