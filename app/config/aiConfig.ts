// ════════════════════════════════════════════════════════════════════════════
// AI PROVIDER CONFIGURATION (GEMINI-ONLY)
// ════════════════════════════════════════════════════════════════════════════
// Centralized configuration for AI model provider

export type AIProvider = 'gemini';

export const GEMINI_MODEL = 'gemini-2.0-flash-exp';

export const getActiveModel = (): string => {
  return GEMINI_MODEL;
};

export const getActiveProvider = (): AIProvider => {
  return 'gemini';
};

