# Thinking, Fast and Slow in the Era of LLMs: Building Mimic with TypeSafe Jev

**By Guido Oswald**  
*Published at [guido.swiss](https://guido.swiss) • October 2026*  
*Project Repository: [guidooswald/mimic on GitHub](https://github.com/guidooswald/mimic)*  

---

I recently finished reading Daniel Kahneman’s landmark book, *[Thinking, Fast and Slow](https://www.amazon.com/-/de/dp/0374533555/)*. As someone immersed in software architecture and artificial intelligence, I could not stop thinking about how closely Kahneman’s dual-process cognitive model maps onto the biggest challenges we face with Large Language Models today.

In human cognition, our brains constantly balance two distinct systems:
- **System 1 (Fast Thinking):** Operates automatically, instinctively, and effortlessly. It evaluates situations in milliseconds, recognizes familiar patterns, and answers easy questions without conscious deliberation. Crucially, it also acts as a mental gatekeeper—quietly deciding when a problem is too complex and needs to be escalated.
- **System 2 (Slow Thinking):** Deliberative, analytical, step-by-step, and mentally exhausting. It is only called upon when System 1 signals high cognitive difficulty—like calculating 17 × 24, writing a distributed database algorithm, or parsing a dense legal contract.

Looking at current AI systems, almost everything we build behaves exclusively like **System 2 on overdrive**. Every single prompt—whether it is a trivial factual confirmation or a multi-region distributed systems design—triggers an autoregressive frontier model generating tokens sequentially. This burns massive computational energy, runs up high API bills, and forces users to wait multiple seconds for responses that should have been instant.

Naturally, my first instinct was to ask: *Can we replicate Kahneman’s dual-process architecture in code?*

---

## The Initial Hurdle: Why Small LLMs Fall Short as System 1

At first, I explored what many engineering teams attempt: putting a smaller autoregressive model (like Gemini Flash-Lite, Llama 8B, or Mistral 7B) in front as a router to decide if the larger model (like Gemini Argon, Claude Sonnet, or OpenAI o3) is needed.

While that sounds intuitive on paper, it misses the entire point of Kahneman’s System 1:
1. **Autoregressive Latency:** Even a small 7B model must generate text token by token. Generating a JSON routing classification still takes 800ms to 2,000ms.
2. **Fragile Output Parsing:** Autoregressive models output unstructured strings. Regex and JSON schema validators can fail, hallucinatory text creeps in, and probability calibration is notoriously difficult to extract cleanly.
3. **Effort & Energy:** Running a generative decoder loop for simple classification is still cognitively "heavy." Kahneman’s System 1 is effortless and instantaneous—not a slow thinker talking quickly.

I found myself wanting a true non-generative decision primitive.

---

## Enter TypeSafe Jev: The True System 1 We Needed

Just as I was prototyping these trade-offs, **TypeSafe AI** released **Jev** (`typesafe/jev-1.14` / `jev-latest`). 

Jev turned out to be the missing puzzle piece for a genuine dual-process AI architecture. Unlike traditional autoregressive LLMs, Jev is purpose-built from the ground up as a **non-autoregressive decision model** (`output_tokens: 0`). 

Instead of generating text tokens, you hand Jev the conversation state and a set of typed primitive questions. Jev evaluates them in a single parallel forward pass and returns calibrated probability distributions in **70 to 250 milliseconds**.

In Mimic, Jev evaluates three primary cognitive primitives in parallel:

1. **`noul` (Answer Already Present):** Evaluates whether the question is already answered in the context state, trivial to resolve, or self-evident. When `noul` is high (e.g., ≥ 0.65), System 1 resolves the request immediately. Zero System 2 models are invoked.
2. **`score` (Cognitive Complexity Rubric):** Scores the required thinking depth on an ordered rubric from Level 0 to Level 3 with full confidence distributions:
   - *Level 0:* Immediate memory recall / context reflection
   - *Level 1:* Basic factual lookup or definition
   - *Level 2:* Moderate engineering or structured drafting
   - *Level 3:* Deep architectural reasoning, formal math proofs, or complex logic
3. **`choice` (Model Selection Matrix):** Evaluates the active System 2 models against their semantic capability profiles and outputs exact probability weights for the optimal recipient model.

It delivers results sub-second with almost zero effort—exactly how Kahneman described System 1.

---

## Introducing Mimic: The Dual-Process AI Router

To bring this architecture to life, I built and open-sourced **[Mimic](https://github.com/guidooswald/mimic)**.

![Mimic Cognitive Architecture Diagram](screenshots/architecture-diagram.png)

Mimic pairs **TypeSafe Jev as System 1** with leading frontier models as **System 2** (**Gemini 3.8 Flash**, **Gemini 4 Argon**, **Claude Sonnet 5.5**, and **DeepSeek R1**).

### How the Pipeline Works in Practice

Here is what happens when you enter a prompt into Mimic:

1. **Instantaneous System 1 Assessment (~100–250ms):**  
   Jev inspects the prompt and conversation history. In less than a quarter of a second, Mimic receives Jev’s `noul`, `score`, and `choice` metrics.
2. **Fast-Path Resolution (Zero System 2):**  
   If the prompt is straightforward (e.g. *"Is Canberra the capital of Australia?"*), Jev outputs `noul = 0.89` and `score = 0.45 / 3.0`. Mimic serves the verdict instantly from System 1. No heavy LLM is awoken, no generation latency is incurred, and zero expensive tokens are consumed.
3. **Targeted System 2 Escalation:**  
   If the prompt requires deliberative generation (e.g. writing a React hook or designing a multi-region distributed rate limiter), Jev detects low `noul` and assigns a calibrated cognitive score. It routes moderate engineering tasks to **Fast Deliberation** (Gemini 3.8 Flash or DeepSeek V4.1 Flash) and high-load tasks to **Deep Slow Thinking** (Gemini 4 Argon or Claude Sonnet 5.5).

---

## Key Highlights & Open-Source Features

Building Mimic was also an opportunity to build a modern, privacy-first web application. Here are a few features built into the project:

- **System 1 Triage-Only Mode:** A dedicated toggle in the UI that runs Jev and pauses execution before invoking System 2. You can inspect Jev's exact decision primitives, cognitive load rubric level, confidence scores, and recommended model without spending a single generative token.
- **Immediate Request Cancellation:** Native `AbortController` integration that allows you to interrupt any active System 1 evaluation or in-flight System 2 generation instantly.
- **Local AES-256-GCM Encrypted Vault:** API credentials are encrypted on disk with a local 256-bit key (`.secrets/credentials.enc.json`) and strictly excluded from Git. No API keys ever touch browser `localStorage`.
- **1-Click OpenRouter OAuth PKCE:** Seamless browser authorization via RFC 7636 PKCE standard.

---

## Looking Ahead: The Future of Cognitive AI Systems

Daniel Kahneman showed us that human intelligence is not a single monolithic engine running at maximum power 100% of the time. Our brilliance lies in our cognitive efficiency: navigating the vast majority of our day on rapid intuition (System 1) and reserving deliberative concentration (System 2) for problems that truly demand it.

As AI models continue to grow in capability and reasoning cost, monolithic prompt-and-generate workflows will increasingly look like brute force. Systems like **TypeSafe Jev** point toward a much smarter, more biologically inspired paradigm: **sub-second intuitive triage on the edge, coupled with deliberative frontier reasoning on demand.**

Check out the code, try it with your own API keys, or run it in demo mode:

🔗 **GitHub Repository:** [https://github.com/guidooswald/mimic](https://github.com/guidooswald/mimic)  
📖 **Book Inspiration:** *[Thinking, Fast and Slow](https://www.amazon.com/-/de/dp/0374533555/)* by Daniel Kahneman  
🌐 **Personal Website:** [guido.swiss](https://guido.swiss)  
