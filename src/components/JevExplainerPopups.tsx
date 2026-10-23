import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Gauge,
  Split,
  Info,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Layers,
  Brain,
  HelpCircle,
  X,
  Zap,
  Clock,
  Coins,
} from 'lucide-react';
import { JevPrimitivesBreakdown, RoutingDecision, AppConfig } from '../types';
import { formatCost } from '../services/routerEngine';

// ============================================================================
// 1. NOUL EXPLAINER POPUP & BOX
// ============================================================================

interface NoulExplainerBoxProps {
  primitives: JevPrimitivesBreakdown;
  config: AppConfig;
  answeredByJeff: boolean;
  routing: RoutingDecision;
}

export const NoulExplainerBox: React.FC<NoulExplainerBoxProps> = ({
  primitives,
  config,
  answeredByJeff,
  routing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const noulVal = primitives.answerAlreadyPresentNoul;
  const noulPercent = Math.round(noulVal * 100);
  const thresholdVal = config.jeff.noulSelfAnswerThreshold;
  const thresholdPercent = Math.round(thresholdVal * 100);
  const isSelfAnswered = noulVal >= thresholdVal;

  return (
    <div
      ref={containerRef}
      className="relative group/noul"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Interactive Result Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer space-y-1 shadow-xs"
        role="button"
        tabIndex={0}
        aria-label="View System 1 noul explainer"
        title="Hover or click to view what Jev's noul primitive means"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <span>noul (Answer Ready)</span>
            <Info className="w-3 h-3 text-emerald-400/70 group-hover/noul:text-emerald-300 transition-colors" />
          </span>
          <span className="font-mono text-xs font-bold text-white flex items-center gap-1">
            <span>{noulPercent}%</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({noulVal.toFixed(2)})
            </span>
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, noulPercent)}%` }}
          />
          {/* Threshold mark */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
            style={{ left: `${Math.min(99, thresholdPercent)}%` }}
            title={`Threshold: ${thresholdPercent}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Threshold ≥ {thresholdPercent}%</span>
          <span className={isSelfAnswered ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
            {isSelfAnswered ? '✓ System 1 Stays' : '→ Escalate'}
          </span>
        </div>
      </div>

      {/* Floating Explainer Popup Window */}
      <div
        className={`absolute top-full left-0 sm:left-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 text-left transition-all duration-200 pointer-events-auto ${
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white tracking-tight">
                  Jev Primitive: <code className="text-emerald-400 font-mono">noul</code>
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-mono">
                  {noulVal.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Answer-Ready / Intuitive Knowledge Retrieval
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-800"
            aria-label="Close explainer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Callout */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 font-sans">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400">Current noul:</span>
            <span className="font-bold text-white">{noulPercent}% ({noulVal.toFixed(2)})</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400">Self-Answer Threshold:</span>
            <span className="text-amber-300 font-semibold">≥ {thresholdPercent}%</span>
          </div>
          <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px]">
            {isSelfAnswered ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Threshold met! Answered instantly in System 1 (~{routing.jeffLatencyMs}ms).</span>
              </span>
            ) : (
              <span className="text-violet-300 font-medium flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Below threshold. Prompt requires System 2 deliberative reasoning.</span>
              </span>
            )}
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
          <div>
            <span className="font-semibold text-emerald-400">What does &ldquo;noul&rdquo; mean?</span>
            <p className="mt-0.5 text-slate-300">
              Derived from the Greek <em>nous</em> (mind/intuition). In TypeSafe AI&apos;s JEV architecture,{' '}
              <code className="text-emerald-300 font-mono">noul</code> is a non-autoregressive probability score evaluating whether the answer already exists in the model&apos;s direct knowledge or conversation state without multi-step calculation.
            </p>
          </div>

          <div>
            <span className="font-semibold text-white">Kahneman Dual-Process Principle:</span>
            <p className="mt-0.5 text-slate-400">
              In <em>Thinking, Fast and Slow</em>, Daniel Kahneman defines System 1 as automatic, effortless associative memory (e.g., answering &ldquo;2 + 2 = 4&rdquo; or recognizing a face). When <code className="text-emerald-300 font-mono">noul</code> is high, System 1 replies directly in &lt;100ms, completely bypassing costly slow-thinking LLMs.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span>Cost avoided: ~99.7% of frontier LLM fees</span>
          <span className="font-mono">Sub-second triage</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SCORE EXPLAINER POPUP & BOX
// ============================================================================

interface ScoreExplainerBoxProps {
  primitives: JevPrimitivesBreakdown;
  routing: RoutingDecision;
  config: AppConfig;
}

export const ScoreExplainerBox: React.FC<ScoreExplainerBoxProps> = ({
  primitives,
  routing,
  config,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rawScore = primitives.complexityScoreRaw;
  const confidencePercent = Math.round(primitives.complexityConfidence * 100);
  const normalizedScore = routing.complexityScore;

  const getScoreBand = (score: number) => {
    if (score <= 1.0) {
      return {
        label: 'Low Cognitive Load (Level 0–1)',
        tier: 'System 1 / Light Fast',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        desc: 'Direct factual retrieval, definitions, greetings, formatting.',
      };
    }
    if (score <= 2.0) {
      return {
        label: 'Moderate Cognitive Load (Level 2)',
        tier: 'Gemini Flash (System 2 Fast)',
        color: 'text-sky-400',
        bg: 'bg-sky-500/10 border-sky-500/30',
        desc: 'Standard programming, structured summarization, synthesis.',
      };
    }
    return {
      label: 'High Cognitive Load (Level 3)',
      tier: 'Gemini Argon (System 2 Deep Reasoning)',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/30',
      desc: 'Distributed systems, math proofs, multi-step algorithmic reasoning.',
    };
  };

  const band = getScoreBand(rawScore);

  return (
    <div
      className="relative group/score"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Interactive Result Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer space-y-1 shadow-xs"
        role="button"
        tabIndex={0}
        aria-label="View System 1 score explainer"
        title="Hover or click to view what Jev's score primitive means"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-sky-400 font-semibold flex items-center gap-1">
            <span>score (Cognitive Load)</span>
            <Info className="w-3 h-3 text-sky-400/70 group-hover/score:text-sky-300 transition-colors" />
          </span>
          <span className="font-mono text-xs font-bold text-white flex items-center gap-1">
            <span>{rawScore.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-normal">/ 3.0</span>
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((rawScore / 3) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Confidence: {confidencePercent}%</span>
          <span className="font-mono text-[10px] text-sky-300">
            Load {normalizedScore}/10
          </span>
        </div>
      </div>

      {/* Floating Explainer Popup Window */}
      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 text-left transition-all duration-200 pointer-events-auto ${
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white tracking-tight">
                  Jev Primitive: <code className="text-sky-400 font-mono">score</code>
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 font-mono">
                  {rawScore.toFixed(2)} / 3.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Cognitive Load &amp; Mental Complexity Scale
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-800"
            aria-label="Close explainer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Assessment Card */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 font-sans">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400">Estimated Load:</span>
            <span className={`font-bold ${band.color}`}>
              {rawScore.toFixed(2)} / 3.0 (Scale {normalizedScore}/10)
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400">Jev Model Confidence:</span>
            <span className="text-white font-semibold">{confidencePercent}%</span>
          </div>

          <div className={`p-2 rounded-lg border text-[11px] ${band.bg} ${band.color}`}>
            <div className="font-semibold">{band.label}</div>
            <div className="text-slate-300 text-[10px] mt-0.5">{band.desc}</div>
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
          <div>
            <span className="font-semibold text-sky-400">What does &ldquo;score&rdquo; mean?</span>
            <p className="mt-0.5 text-slate-300">
              TypeSafe JEV runs a fast regression scoring rubric in ~50ms. Rather than generating text blindly, it measures the <strong>cognitive burden</strong> needed to formulate an accurate answer.
            </p>
          </div>

          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>0.0 – 1.0: Routine facts &amp; instant retrieval</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span>1.0 – 2.0: Moderate synthesis &amp; code generation (Flash)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
              <span>2.0 – 3.0: High abstraction, math, architecture (Argon)</span>
            </div>
          </div>

          <div>
            <span className="font-semibold text-white">Kahneman Dual-Process Principle:</span>
            <p className="mt-0.5 text-slate-400">
              Kahneman showed that cognitive load is physiologically measurable (such as pupil dilation). Mimic mirrors this biology by quantifying computational strain before selecting an LLM.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span>Target tier: {band.tier}</span>
          <span className="font-mono">{routing.jeffLatencyMs}ms triage</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. CHOICE EXPLAINER POPUP & BOX
// ============================================================================

interface ChoiceExplainerBoxProps {
  primitives: JevPrimitivesBreakdown;
  routing: RoutingDecision;
  config: AppConfig;
}

export const ChoiceExplainerBox: React.FC<ChoiceExplainerBoxProps> = ({
  primitives,
  routing,
  config,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const winner = primitives.choiceWinner;
  const choiceConfidence = Math.round(primitives.choiceConfidence * 100);
  const sortedProbabilities = Object.entries(primitives.choiceProbabilities).sort(
    (a, b) => b[1] - a[1]
  );

  const getTierDetails = (key: string) => {
    switch (key.toLowerCase()) {
      case 'system1_direct':
        return {
          label: 'System 1 Direct (Jev)',
          desc: 'Instant sub-second response from Jev without downstream LLM invocation.',
          cost: '~$0.000012',
        };
      case 'flash':
      case 'google/gemini-3.8-flash':
      case 'gemini-3.8-flash':
        return {
          label: 'Gemini 3.8 Flash',
          desc: 'Fast System 2 generalist for standard code, writing, and explanations.',
          cost: '~$0.000300',
        };
      case 'argon':
      case 'google/gemini-4-argon':
      case 'gemini-4-argon':
        return {
          label: 'Gemini 4 Argon',
          desc: 'Deep deliberative reasoning for distributed systems, formal logic, and hard math.',
          cost: '~$0.004500',
        };
      default:
        return {
          label: key,
          desc: 'Specialized model chosen based on candidate probability distribution.',
          cost: 'Variable',
        };
    }
  };

  const winningDetails = getTierDetails(winner);

  return (
    <div
      className="relative group/choice"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Interactive Result Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-violet-500/50 transition-all cursor-pointer space-y-1 shadow-xs"
        role="button"
        tabIndex={0}
        aria-label="View System 1 choice explainer"
        title="Hover or click to view what Jev's choice primitive means"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-violet-400 font-semibold flex items-center gap-1">
            <span>choice (Target Route)</span>
            <Info className="w-3 h-3 text-violet-400/70 group-hover/choice:text-violet-300 transition-colors" />
          </span>
          <span className="font-mono text-[11px] text-slate-300">
            conf {choiceConfidence}%
          </span>
        </div>

        <div className="space-y-1 pt-0.5">
          {sortedProbabilities.slice(0, 3).map(([key, prob]) => (
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

      {/* Floating Explainer Popup Window */}
      <div
        className={`absolute top-full right-0 sm:right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 text-left transition-all duration-200 pointer-events-auto ${
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white tracking-tight">
                  Jev Primitive: <code className="text-violet-400 font-mono">choice</code>
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-300 border border-violet-500/25 font-mono">
                  {choiceConfidence}% conf
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Multi-Class Softmax Dispatch Classifier
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-800"
            aria-label="Close explainer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Route Banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 font-sans">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400">Winning Route:</span>
            <span className="font-bold text-violet-300 font-mono">
              {winningDetails.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-normal">
            {winningDetails.desc}
          </p>

          {/* Probability Distribution Table */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Candidate Tier Probabilities:
            </span>
            {sortedProbabilities.map(([key, prob]) => {
              const pPercent = Math.round(prob * 100);
              const isWin = key === winner;
              return (
                <div key={key} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className={isWin ? 'text-white font-semibold' : 'text-slate-400'}>
                      {key} {isWin ? '★ (Selected)' : ''}
                    </span>
                    <span className={isWin ? 'text-violet-300 font-bold' : 'text-slate-400'}>
                      {pPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isWin ? 'bg-violet-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${pPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
          <div>
            <span className="font-semibold text-violet-400">What does &ldquo;choice&rdquo; mean?</span>
            <p className="mt-0.5 text-slate-300">
              TypeSafe JEV computes a softmax distribution predicting which execution tier will achieve the Pareto optimum: maximum answer quality with minimum token cost and latency.
            </p>
          </div>

          <div>
            <span className="font-semibold text-white">Kahneman Dual-Process Principle:</span>
            <p className="mt-0.5 text-slate-400">
              In cognitive psychology, the brain avoids allocating heavy mental effort unless necessary (&ldquo;the law of least effort&rdquo;). Jev acts as this gatekeeper: if the query can be resolved by intuition, it stays in System 1; otherwise, it directs focus to the specific reasoning faculty.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span>Est. Tier Cost: {winningDetails.cost}</span>
          <span className="font-mono">Adaptive AI Router</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. HEADER PILL EXPLAINER (For noul=0.85, score=1.20/3.0, Resolved via System 1)
// ============================================================================

interface HeaderPillExplainerProps {
  type: 'noul' | 'score' | 'decision';
  routing: RoutingDecision;
  config: AppConfig;
  children: React.ReactNode;
}

export const HeaderPillExplainer: React.FC<HeaderPillExplainerProps> = ({
  type,
  routing,
  config,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const primitives = routing.jevPrimitives;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      <div className="cursor-help transition-transform hover:scale-105">
        {children}
      </div>

      {/* Floating Popup Window for Pill */}
      <div
        className={`absolute top-full left-0 mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 text-left transition-all duration-200 pointer-events-auto ${
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'noul' && primitives && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-white">Jev System 1: noul Primitive</strong>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong className="text-emerald-400 font-mono">
                noul = {primitives.answerAlreadyPresentNoul.toFixed(2)} (
                {Math.round(primitives.answerAlreadyPresentNoul * 100)}%)
              </strong>{' '}
              vs threshold{' '}
              <strong className="text-amber-300 font-mono">
                ≥ {Math.round(config.jeff.noulSelfAnswerThreshold * 100)}%
              </strong>
              .
            </p>
            <p className="text-slate-400 text-[11px] leading-normal">
              {primitives.answerAlreadyPresentNoul >= config.jeff.noulSelfAnswerThreshold
                ? 'System 1 recognized this answer as readily available in fast weights, completing instantly without invoking an expensive System 2 LLM.'
                : 'System 1 recognized that this prompt requires slow deliberative reasoning, delegating to an external System 2 model.'}
            </p>
          </div>
        )}

        {type === 'score' && primitives && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <strong className="text-white">Jev System 1: score Primitive</strong>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong className="text-sky-400 font-mono">
                score = {primitives.complexityScoreRaw.toFixed(2)} / 3.0
              </strong>{' '}
              (Complexity Scale {routing.complexityScore}/10,{' '}
              {Math.round(primitives.complexityConfidence * 100)}% confidence).
            </p>
            <p className="text-slate-400 text-[11px] leading-normal">
              Quantifies cognitive load in ~50ms. Higher scores route to deeper reasoning tiers (Flash for moderate, Argon for high complexity).
            </p>
          </div>
        )}

        {type === 'decision' && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
              {routing.answeredByJeff ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-violet-400" />
              )}
              <strong className="text-white">
                {routing.answeredByJeff
                  ? 'Resolved via System 1'
                  : `Delegated to System 2: ${routing.selectedModelName}`}
              </strong>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong>Reasoning:</strong> {routing.reasoning}
            </p>
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Triage time: {routing.jeffLatencyMs}ms</span>
              <span>Cost: {formatCost(routing.system1Cost || 0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 5. FINAL OUTPUT BADGE EXPLAINER (For Final Answer Bubble Header)
// ============================================================================

interface FinalOutputBadgeExplainerProps {
  tier?: string;
  modelName?: string | null;
  modelId?: string;
  routing?: RoutingDecision;
  config: AppConfig;
  children: React.ReactNode;
}

export const FinalOutputBadgeExplainer: React.FC<FinalOutputBadgeExplainerProps> = ({
  tier,
  modelName,
  modelId,
  routing,
  config,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isJeff = tier === 'jeff';

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      <div className="cursor-help transition-transform hover:scale-105">
        {children}
      </div>

      <div
        className={`absolute top-full left-0 mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 text-left transition-all duration-200 pointer-events-auto ${
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
            {isJeff ? (
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Brain className="w-4 h-4 text-violet-400 shrink-0" />
            )}
            <div>
              <strong className="text-white block">
                {isJeff
                  ? `System 1 Output (${config.jeff.displayName})`
                  : `System 2 Output (${modelName || 'Frontier Model'})`}
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">{modelId}</span>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed text-[11px]">
            {isJeff ? (
              <>
                Generated directly by <strong>System 1</strong> in{' '}
                <span className="text-emerald-300 font-mono font-medium">
                  {routing?.jeffLatencyMs || 0}ms
                </span>{' '}
                with zero downstream LLM token costs. The prompt had high knowledge retrieval confidence (
                <em>noul</em> &ge; threshold).
              </>
            ) : (
              <>
                System 1 (Jev) determined that this prompt had a cognitive load of{' '}
                <span className="text-violet-300 font-mono font-medium">
                  {routing?.complexityScore || 0}/10
                </span>{' '}
                requiring slow, deliberative reasoning from <strong>{modelName}</strong>.
              </>
            )}
          </p>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>{isJeff ? '⚡ Fast Reflexive Path' : '🧠 Slow Deliberative Path'}</span>
            <span className="font-mono">Kahneman Dual-Process</span>
          </div>
        </div>
      </div>
    </div>
  );
};

