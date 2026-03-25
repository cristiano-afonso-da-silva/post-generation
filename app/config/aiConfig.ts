// ════════════════════════════════════════════════════════════════════════════
// AI PROVIDER (OpenAI / Gemini) + MODEL IDS
// ════════════════════════════════════════════════════════════════════════════

export type AIProvider = 'openai' | 'gemini'

function normalizeProvider(v: string | undefined): AIProvider {
  const x = v?.trim().toLowerCase()
  if (x === 'gemini' || x === 'google') return 'gemini'
  return 'openai'
}

/** `openai` (ChatGPT API) or `gemini`. Defaults to `openai`. */
export const getAIProvider = (): AIProvider => normalizeProvider(process.env.AI_PROVIDER)

/** OpenAI chat model, e.g. gpt-4o-mini, gpt-4o — set via OPENAI_CHAT_MODEL or OPENAI_MODEL */
export const getOpenAIChatModel = (): string =>
  process.env.OPENAI_CHAT_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  'gpt-4o-mini'

/** Gemini model id when AI_PROVIDER=gemini */
export const getGeminiModelName = (): string =>
  process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash'

/** For logging / API meta */
export const getActiveChatModel = (): string =>
  getAIProvider() === 'openai' ? getOpenAIChatModel() : getGeminiModelName()
