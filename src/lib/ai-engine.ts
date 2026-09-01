/**
 * Reform AI Engine — Delegates to the local LLM client.
 *
 * This module re-exports llmChat as aiChat for backward compatibility
 * with all existing API routes. The actual LLM calls go through the
 * local OpenAI-compatible endpoint (Ollama, LM Studio, etc.) with an
 * automatic rule-based fallback.
 *
 * Every call — real or fallback — still flows through the Xano function
 * stacks and is logged to ai_generation_log. The audit trail is real;
 * only the "brain" differs.
 *
 * Usage:
 *   import { aiChat } from '@/lib/ai-engine';
 *   const result = await aiChat(systemPrompt, userMessage, options);
 *   // result.content = string (the "LLM response")
 *   // result.model = 'llama3.2'
 *   // result.latency_ms = number
 *   // result.fallback = boolean (true if mock was used — NOT exposed to users)
 */

export { llmChat as aiChat, isLocalLLMAvailable } from './llm-client';
export type { LLMChatResult as AIChatResult } from './llm-client';
