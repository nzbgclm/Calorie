import type { AIConfig, MealType } from '@/types'
import { getAIConfig, isAIReady } from '@/utils/storage'

export type AIErrorCode =
  | 'NO_CONFIG'
  | 'NETWORK'
  | 'AUTH'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'FORMAT'
  | 'CONTENT'

export class AIError extends Error {
  code: AIErrorCode
  constructor(code: AIErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/** 把错误翻译成给用户看的一句话 */
export function describeAIError(err: unknown): string {
  if (err instanceof AIError) {
    switch (err.code) {
      case 'NO_CONFIG':
        return 'AI 未配置或未开启'
      case 'AUTH':
        return '密钥无效或已过期，请到 AI 设置检查'
      case 'NOT_FOUND':
        return '接口地址不存在，请检查地址'
      case 'TIMEOUT':
        return '请求超时，可重试或手动输入'
      case 'FORMAT':
        return 'AI 返回的格式看不懂，换个说法试试'
      case 'CONTENT':
        return 'AI 给出的数据不合理，请手动确认'
      default:
        return err.message || '网络请求失败'
    }
  }
  return '请求失败，请稍后重试'
}

// ---------------- 基础请求 ----------------

interface ReqOptions {
  url: string
  method?: 'GET' | 'POST'
  header?: Record<string, string>
  data?: unknown
  timeout?: number
}

function extractServerMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const obj = data as Record<string, unknown>
  const err = obj.error
  if (err && typeof err === 'object') {
    const msg = (err as Record<string, unknown>).message
    if (typeof msg === 'string') return msg
  }
  if (typeof obj.message === 'string') return obj.message
  return ''
}

function request<T = unknown>(opts: ReqOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: opts.url,
      method: opts.method ?? 'GET',
      header: opts.header,
      data: opts.data as never,
      timeout: opts.timeout ?? 15000,
      success: (res) => {
        const code = res.statusCode
        if (code === 401 || code === 403) {
          reject(new AIError('AUTH', '密钥无效或已过期'))
          return
        }
        if (code === 404) {
          reject(new AIError('NOT_FOUND', '接口地址不存在'))
          return
        }
        if (code < 200 || code >= 300) {
          const msg = extractServerMessage(res.data) || `请求失败（${code}）`
          reject(new AIError('NETWORK', msg))
          return
        }
        resolve(res.data as T)
      },
      fail: (err) => {
        const msg = String((err as { errMsg?: string })?.errMsg ?? '')
        if (/timeout/i.test(msg)) reject(new AIError('TIMEOUT', '请求超时'))
        else reject(new AIError('NETWORK', '网络请求失败'))
      }
    })
  })
}

function stripSlash(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/**
 * 地址归一化：用户可能只填域名，也可能填了带 /v1 的完整前缀。
 * 没写版本号时先试 /v1，再试原样，哪个通用哪个。
 */
export function baseCandidates(input: string): string[] {
  const base = stripSlash(input)
  if (!base) return []
  if (/\/v\d+$/i.test(base)) return [base]
  return [`${base}/v1`, base]
}

// ---------------- 模型列表 ----------------

function parseModelList(data: unknown): string[] {
  const out: string[] = []
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) out.push(v.trim())
  }
  const takeItem = (item: unknown) => {
    if (typeof item === 'string') {
      push(item)
      return
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      push(obj.id ?? obj.name)
    }
  }

  if (Array.isArray(data)) {
    data.forEach(takeItem)
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const list = obj.data ?? obj.models ?? obj.result
    if (Array.isArray(list)) list.forEach(takeItem)
  }

  return [...new Set(out)]
}

/** 对话类模型排前面，嵌入/语音/图像类排后面 */
function rankModel(name: string): number {
  const s = name.toLowerCase()
  if (/embed|whisper|tts|dall|moderation|rerank|audio|image/.test(s)) return 3
  if (/chat|gpt-4|gpt-3|deepseek|qwen|kimi|glm|claude|abab|hunyuan/.test(s)) return 0
  if (/instruct|turbo|max|plus/.test(s)) return 1
  return 2
}

export function sortModels(models: string[]): string[] {
  return [...models].sort((a, b) => rankModel(a) - rankModel(b) || a.localeCompare(b))
}

export interface FetchModelsResult {
  models: string[]
  /** 实际可用的基址（可能是自动补了 /v1 的那个） */
  baseUrl: string
}

export async function fetchModels(baseUrl: string, apiKey: string): Promise<FetchModelsResult> {
  const candidates = baseCandidates(baseUrl)
  if (!candidates.length) throw new AIError('NO_CONFIG', '请先填写接口地址')
  if (!apiKey.trim()) throw new AIError('NO_CONFIG', '请先填写密钥')

  let lastError: unknown = null
  for (const base of candidates) {
    try {
      const data = await request({
        url: `${base}/models`,
        header: { Authorization: `Bearer ${apiKey.trim()}` },
        timeout: 10000
      })
      const models = parseModelList(data)
      if (models.length) return { models: sortModels(models), baseUrl: base }
      lastError = new AIError('FORMAT', '返回内容里没有模型')
    } catch (e) {
      // 密钥错误没必要换地址重试
      if (e instanceof AIError && e.code === 'AUTH') throw e
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new AIError('FORMAT', '未能获取模型列表')
}

// ---------------- Chat ----------------

function pickContent(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const choices = (data as Record<string, unknown>).choices
  if (!Array.isArray(choices) || !choices.length) return ''
  const message = (choices[0] as Record<string, unknown>)?.message as
    | Record<string, unknown>
    | undefined
  const content = message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') {
          const t = (part as Record<string, unknown>).text
          return typeof t === 'string' ? t : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

/** 从可能带 markdown 代码块的文本里抠出 JSON 对象 */
export function extractJSON(text: string): Record<string, unknown> | null {
  const raw = text.trim()
  if (!raw) return null

  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(s)
      return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
    } catch {
      return null
    }
  }

  const direct = tryParse(raw)
  if (direct) return direct

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    const inner = tryParse(fenced[1].trim())
    if (inner) return inner
  }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const sliced = tryParse(raw.slice(start, end + 1))
    if (sliced) return sliced
  }

  return null
}

async function chatOnce(
  url: string,
  config: AIConfig,
  messages: { role: string; content: string }[],
  jsonMode: boolean
): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.2
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const data = await request({
    url,
    method: 'POST',
    header: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    data: body
  })
  return pickContent(data)
}

async function chat(config: AIConfig, system: string, user: string): Promise<string> {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
  // 手动填模型名时 baseUrl 可能没归一化，这里再试一次 /v1
  const bases = baseCandidates(config.baseUrl)
  let lastError: unknown = null

  for (const base of bases) {
    const url = `${base}/chat/completions`
    try {
      try {
        return await chatOnce(url, config, messages, true)
      } catch (e) {
        // 部分服务商不支持 response_format，去掉后重试一次
        if (e instanceof AIError && (e.code === 'NETWORK' || e.code === 'FORMAT')) {
          return await chatOnce(url, config, messages, false)
        }
        throw e
      }
    } catch (e) {
      if (e instanceof AIError && e.code === 'AUTH') throw e
      lastError = e
    }
  }

  throw lastError instanceof Error ? lastError : new AIError('NETWORK', '请求失败')
}

function ensureReady(): AIConfig {
  const config = getAIConfig()
  if (!isAIReady(config)) throw new AIError('NO_CONFIG', 'AI 未启用或配置不完整')
  return config
}

// ---------------- 能力一：单条热量估算 ----------------

export interface AIEstimate {
  name: string
  kcal: number
  portion: string
  confidence: 'high' | 'medium' | 'low'
  note: string
}

const ESTIMATE_SYSTEM = `你是食物热量估算助手。根据用户描述的中文食物，估算摄入热量并返回 JSON。
要求：
1. 只返回 JSON 对象，不要任何解释文字。
2. 热量按「常见中式做法 + 可食用部分」估算，单位 kcal，取整数。
3. 若描述里包含数量，按该数量计算总热量。
4. 无法判断份量时给出最常见的默认份量，并在 note 里说明假设。
5. 输出字段：{"name":"食物名","kcal":整数,"portion":"份量描述","confidence":"high|medium|low","note":"一句话说明"}`

export async function estimateFood(description: string): Promise<AIEstimate> {
  const config = ensureReady()
  const text = await chat(config, ESTIMATE_SYSTEM, description)
  const json = extractJSON(text)
  if (!json) throw new AIError('FORMAT', '返回内容无法解析')

  const kcal = Number(json.kcal)
  if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 5000) {
    throw new AIError('CONTENT', '热量数值不合理')
  }

  const confidence = String(json.confidence ?? 'medium')
  return {
    name: String(json.name ?? description).slice(0, 30),
    kcal: Math.round(kcal),
    portion: String(json.portion ?? '1份').slice(0, 20),
    confidence: (['high', 'medium', 'low'].includes(confidence) ? confidence : 'medium') as
      | 'high'
      | 'medium'
      | 'low',
    note: String(json.note ?? '').slice(0, 60)
  }
}

// ---------------- 能力二：一句话解析多条 ----------------

export interface AIParsedItem {
  name: string
  amount: string
  kcal: number
  meal: MealType
}

const PARSE_SYSTEM = `你是饮食记录解析助手。把用户的一句中文描述拆成若干条食物记录并返回 JSON。
要求：
1. 只返回 JSON 对象，不要解释文字。
2. meal 只能是 breakfast / lunch / dinner / extra 之一。按描述里的时间词判断（早上/早晨/早餐→breakfast，中午/午饭/午餐→lunch，晚上/晚饭/晚餐→dinner，下午/加餐/夜宵→extra）。
3. 描述里没有时间词时，所有条目使用用户指定的默认餐次。
4. kcal 为整数，按常见中式做法估算。
5. 输出格式：{"items":[{"name":"食物名","amount":"份量描述","kcal":整数,"meal":"lunch"}]}。
6. 拆不出任何食物时返回 {"items":[]}。`

const MEAL_SET: MealType[] = ['breakfast', 'lunch', 'dinner', 'extra']

export async function parseMealText(
  description: string,
  defaultMeal: MealType
): Promise<AIParsedItem[]> {
  const config = ensureReady()
  const text = await chat(
    config,
    PARSE_SYSTEM,
    `默认餐次：${defaultMeal}\n用户描述：${description}`
  )
  const json = extractJSON(text)
  if (!json) throw new AIError('FORMAT', '返回内容无法解析')

  const rawItems = json.items
  if (!Array.isArray(rawItems)) throw new AIError('FORMAT', '返回里没有 items')

  const items: AIParsedItem[] = []
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue
    const obj = raw as Record<string, unknown>
    const name = String(obj.name ?? '').trim().slice(0, 30)
    const kcal = Number(obj.kcal)
    if (!name || !Number.isFinite(kcal) || kcal <= 0 || kcal > 5000) continue
    const meal = MEAL_SET.includes(obj.meal as MealType) ? (obj.meal as MealType) : defaultMeal
    items.push({
      name,
      amount: String(obj.amount ?? '').slice(0, 20),
      kcal: Math.round(kcal),
      meal
    })
  }

  if (!items.length) throw new AIError('CONTENT', '没有识别出食物，换个说法试试')
  return items
}
