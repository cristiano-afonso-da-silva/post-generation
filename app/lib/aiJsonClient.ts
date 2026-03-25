import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAIProvider, getOpenAIChatModel, getGeminiModelName } from '../config/aiConfig'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function getOpenAIKey(): string {
  return (process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY || '').trim()
}

export function getGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim()
}

async function callOpenAIWithRetry(
  openai: OpenAI,
  model: string,
  params: { userPrompt: string; temperature: number; maxOutputTokens: number },
  attempt = 0,
  maxRetries = 3
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You must respond with a single valid JSON object only. No markdown code fences, no explanation before or after the JSON.',
        },
        { role: 'user', content: params.userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: params.temperature,
      max_tokens: params.maxOutputTokens,
    })
    const text = completion.choices[0]?.message?.content?.trim() || ''
    if (!text) throw new Error('Empty response from OpenAI')
    return text
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    const message = err?.message || ''
    const isQuota =
      err?.status === 429 ||
      message.includes('429') ||
      /rate limit|quota|too many requests/i.test(message)
    if (isQuota && attempt < maxRetries) {
      const delayMs = Math.min(90000, 4000 * Math.pow(2, attempt))
      console.warn(
        `⚠️  OpenAI rate limit (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(delayMs / 1000)}s...`
      )
      await sleep(delayMs)
      return callOpenAIWithRetry(openai, model, params, attempt + 1, maxRetries)
    }
    throw error
  }
}

async function callGeminiWithRetry(
  targetModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  request: Parameters<typeof targetModel.generateContent>[0],
  options?: Parameters<typeof targetModel.generateContent>[1],
  attempt = 0,
  maxRetries = 3
) {
  try {
    return await targetModel.generateContent(request, options)
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    const message = err?.message || ''
    const isQuotaError =
      err?.status === 429 ||
      message.includes('429') ||
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('too many requests')

    if (isQuotaError && attempt < maxRetries) {
      let delayMs = 4000
      const retryMatch = message.match(/"retryDelay":"(\d+)s"/)
      if (retryMatch?.[1]) {
        const seconds = parseInt(retryMatch[1], 10)
        if (!Number.isNaN(seconds)) delayMs = Math.max(1000, seconds * 1000)
      }

      console.warn(
        `⚠️  Gemini quota hit (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(
          delayMs / 1000
        )}s...`
      )
      await sleep(delayMs)
      return callGeminiWithRetry(targetModel, request, options, attempt + 1, maxRetries)
    }

    throw error
  }
}

export type GeminiJsonSchema = Record<string, unknown>

/**
 * Structured JSON from the active provider. Prompts must ask for JSON; OpenAI uses json_object mode.
 * For Gemini, pass geminiResponseSchema for API-enforced shape when supported.
 */
export async function generateJsonFromPrompt(params: {
  userPrompt: string
  temperature: number
  maxOutputTokens: number
  geminiResponseSchema?: GeminiJsonSchema
}): Promise<string> {
  const provider = getAIProvider()

  if (provider === 'openai') {
    const key = getOpenAIKey()
    if (!key) {
      throw new Error(
        'OPENAI_API_KEY is not configured. Set OPENAI_API_KEY (or OPEN_AI_API_KEY) in your environment variables.'
      )
    }
    const openai = new OpenAI({ apiKey: key })
    const model = getOpenAIChatModel()
    return callOpenAIWithRetry(openai, model, {
      userPrompt: params.userPrompt,
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
    })
  }

  const key = getGeminiKey()
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Set GEMINI_API_KEY or use AI_PROVIDER=openai with OPENAI_API_KEY.'
    )
  }

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({
    model: getGeminiModelName(),
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
    },
  })

  const generationConfig: Record<string, unknown> = {
    temperature: params.temperature,
    maxOutputTokens: params.maxOutputTokens,
    responseMimeType: 'application/json',
  }
  if (params.geminiResponseSchema) {
    generationConfig.responseSchema = params.geminiResponseSchema
  }

  const result = await callGeminiWithRetry(model, {
    contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
    generationConfig: generationConfig as any,
  })

  return result.response.text()
}

export function assertCarouselAiConfigured(): { ok: true } | { ok: false; error: string } {
  if (getAIProvider() === 'openai') {
    if (!getOpenAIKey()) {
      return { ok: false, error: 'OPENAI_API_KEY is not configured.' }
    }
    return { ok: true }
  }
  if (!getGeminiKey()) {
    return { ok: false, error: 'GEMINI_API_KEY is not configured.' }
  }
  return { ok: true }
}
