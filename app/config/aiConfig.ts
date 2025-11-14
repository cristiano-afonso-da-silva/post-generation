// ════════════════════════════════════════════════════════════════════════════
// AI PROVIDER CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════
// Centralized configuration for AI model providers

export type AIProvider = 'gemini' | 'openai';

export const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) || 'gemini';

export const GEMINI_MODEL = 'gemini-2.0-flash-exp';
export const OPENAI_MODEL = 'gpt-5.1';

export const getActiveModel = (): string => {
  return AI_PROVIDER === 'openai' ? OPENAI_MODEL : GEMINI_MODEL;
};

export const getActiveProvider = (): AIProvider => {
  return AI_PROVIDER;
};

