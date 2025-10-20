import { findModel, getCatalog } from "@lucky/models/llm-catalog/catalog-queries"
import type { ModelEntry, ModelPricingTier, ModelSpeed } from "@lucky/shared/contracts/llm-contracts/models"

export interface ModelFilters {
  onlyRuntimeEnabled?: boolean
  cheapestOnly?: boolean
  pricingTier?: ModelPricingTier
  minIntelligence?: number
  maxIntelligence?: number
  speed?: ModelSpeed
  gateways?: string[]
  capabilities?: string[] // all must be present if provided
  minContextLength?: number
  maxContextLength?: number
  regions?: string[] // any overlap
  supports?: Partial<{
    tools: boolean
    json: boolean
    streaming: boolean
    vision: boolean
    reasoning: boolean
    audio: boolean
    video: boolean
  }>
}

export type ModelSort = "cheapest" | "smartest" | "fastest" | "newest" | "alphabetical"

export interface FindModelOptions {
  filters?: ModelFilters
  sort?: ModelSort
  searchSet?: ModelEntry[]
  /** simple substring match across NON-model fields (gateway, id, description, regions, capabilities, pricingTier, speed, supports) */
  searchText?: string
  limit?: number
  offset?: number
  sortDir?: "asc" | "desc"
}

type WithNormalized = ModelEntry & {
  runtimeEnabled?: boolean
  uiHiddenInProd?: boolean
  releaseDate?: string
}

type Comparator = (a: WithNormalized, b: WithNormalized) => number

const SPEED_ORDER: Record<NonNullable<ModelEntry["speed"]>, number> = {
  slow: 1,
  balanced: 2,
  fast: 3,
}

function priceScore(m: ModelEntry): number {
  const input = m.input ?? 0
  const output = m.output ?? 0
  return input + output
}

function alphaKey(m: WithNormalized): string {
  const prov = (m.gateway || "").toLowerCase()
  const mdl = (m.gatewayModelId || "").toLowerCase()
  return `${prov}#${mdl}`
}

function releaseMs(m: WithNormalized): number {
  const raw = m.releaseDate ? Date.parse(m.releaseDate) : Number.NaN
  if (Number.isNaN(raw)) return 0
  return raw
}

function matchesFilters(m: WithNormalized, f?: ModelFilters): boolean {
  if (!f) return true

  if (f.onlyRuntimeEnabled && m.runtimeEnabled === false) return false
  if (f.cheapestOnly && m.pricingTier !== "low") return false
  if (f.pricingTier && m.pricingTier !== f.pricingTier) return false

  const intel = m.intelligence ?? 0
  if (f.minIntelligence != null && intel < f.minIntelligence) return false
  if (f.maxIntelligence != null && intel > f.maxIntelligence) return false

  if (f.speed && m.speed !== f.speed) return false

  if (f.gateways && f.gateways.length > 0) {
    const want = new Set(f.gateways.map(p => p.toLowerCase()))
    const have = (m.gateway || "").toLowerCase()
    if (!want.has(have)) return false
  }

  if (f.capabilities && f.capabilities.length > 0) {
    const haveCaps = new Set([
      m.supportsTools ? "tools" : "",
      m.supportsJsonMode ? "json" : "",
      m.supportsStreaming ? "streaming" : "",
      m.supportsVision ? "vision" : "",
      m.supportsReasoning ? "reasoning" : "",
      m.supportsAudio ? "audio" : "",
      m.supportsVideo ? "video" : "",
    ])
    for (const c of f.capabilities) {
      if (!haveCaps.has(c)) return false
    }
  }

  if (f.minContextLength != null && m.contextLength < f.minContextLength) return false
  if (f.maxContextLength != null && m.contextLength > f.maxContextLength) return false

  if (f.regions && f.regions.length > 0) {
    const haveRegions = new Set((m.regions || []).map(r => r.toLowerCase()))
    let any = false
    for (const r of f.regions) {
      if (haveRegions.has(r.toLowerCase())) {
        any = true
        break
      }
    }
    if (!any) return false
  }

  if (f.supports) {
    const s = f.supports
    if (s.tools != null && m.supportsTools !== s.tools) return false
    if (s.json != null && m.supportsJsonMode !== s.json) return false
    if (s.streaming != null && m.supportsStreaming !== s.streaming) return false
    if (s.vision != null && m.supportsVision !== s.vision) return false
    if (s.reasoning != null && m.supportsReasoning !== s.reasoning) return false
    if (s.audio != null && m.supportsAudio !== s.audio) return false
    if (s.video != null && m.supportsVideo !== s.video) return false
  }

  return true
}

/** substring match over NON-model fields only */
function matchesSearchText(m: WithNormalized, q?: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()

  const gateway = (m.gateway || "").toLowerCase()
  if (gateway.includes(needle)) return true

  const id = (m.gatewayModelId || "").toLowerCase()
  if (id.includes(needle)) return true

  const desc = (m.description || "").toLowerCase()
  if (desc.includes(needle)) return true

  const regions = (m.regions || []).join(" ").toLowerCase()
  if (regions.includes(needle)) return true

  const capsJoined = [
    m.supportsTools ? "tools" : "",
    m.supportsJsonMode ? "json" : "",
    m.supportsStreaming ? "streaming" : "",
    m.supportsVision ? "vision" : "",
    m.supportsReasoning ? "reasoning" : "",
    m.supportsAudio ? "audio" : "",
    m.supportsVideo ? "video" : "",
  ]
    .join(" ")
    .toLowerCase()
  if (capsJoined.includes(needle)) return true

  const tier = (m.pricingTier || "").toLowerCase()
  if (tier.includes(needle)) return true

  const speed = (m.speed || "").toLowerCase()
  if (speed.includes(needle)) return true

  // supports flags: allow searching by flag name when true (e.g., "vision", "streaming")
  const supportsLabels: string[] = []
  if (m.supportsTools) supportsLabels.push("tools")
  if (m.supportsJsonMode) supportsLabels.push("json")
  if (m.supportsStreaming) supportsLabels.push("streaming")
  if (m.supportsVision) supportsLabels.push("vision")
  if (m.supportsReasoning) supportsLabels.push("reasoning")
  if (m.supportsAudio) supportsLabels.push("audio")
  if (m.supportsVideo) supportsLabels.push("video")
  if (supportsLabels.join(" ").includes(needle)) return true

  return false
}

function cmpAlphabetical(dir: "asc" | "desc"): Comparator {
  const sign = dir === "asc" ? 1 : -1
  return (a, b) => alphaKey(a).localeCompare(alphaKey(b)) * sign
}

function cmpCheapest(dir: "asc" | "desc"): Comparator {
  const sign = dir === "asc" ? 1 : -1
  return (a, b) => {
    const pa = priceScore(a)
    const pb = priceScore(b)
    if (pa !== pb) return (pa - pb) * sign
    if (a.intelligence !== b.intelligence) return b.intelligence - a.intelligence
    return alphaKey(a).localeCompare(alphaKey(b))
  }
}

function cmpSmartest(dir: "asc" | "desc"): Comparator {
  const sign = dir === "asc" ? 1 : -1
  return (a, b) => {
    if (a.intelligence !== b.intelligence) return (a.intelligence - b.intelligence) * sign
    const pa = priceScore(a)
    const pb = priceScore(b)
    if (pa !== pb) return pa - pb
    return alphaKey(a).localeCompare(alphaKey(b))
  }
}

function cmpFastest(dir: "asc" | "desc"): Comparator {
  const sign = dir === "asc" ? 1 : -1
  return (a, b) => {
    const sa = SPEED_ORDER[a.speed] ?? 0
    const sb = SPEED_ORDER[b.speed] ?? 0
    if (sa !== sb) return (sa - sb) * sign
    if (a.intelligence !== b.intelligence) return b.intelligence - a.intelligence
    return alphaKey(a).localeCompare(alphaKey(b))
  }
}

function cmpNewest(dir: "asc" | "desc"): Comparator {
  const sign = dir === "asc" ? 1 : -1
  return (a, b) => {
    const ta = releaseMs(a)
    const tb = releaseMs(b)
    if (ta !== tb) return (ta - tb) * sign
    return alphaKey(a).localeCompare(alphaKey(b))
  }
}

const SORTERS: Record<ModelSort, (dir: "asc" | "desc") => Comparator> = {
  alphabetical: cmpAlphabetical,
  cheapest: cmpCheapest,
  smartest: cmpSmartest,
  fastest: cmpFastest,
  newest: cmpNewest,
}

function pickComparator(sort: ModelSort | undefined, dir: "asc" | "desc" | undefined): Comparator {
  const key = sort ?? "alphabetical"
  let defaultDir: "asc" | "desc" = "asc"
  if (key === "smartest") defaultDir = "desc"
  if (key === "fastest") defaultDir = "desc"
  if (key === "newest") defaultDir = "desc"
  const chosenDir = dir ?? defaultDir
  const maker = SORTERS[key] ?? cmpAlphabetical
  return maker(chosenDir)
}

/**
 * Search models with structured filters + simple substring on NON-model fields.
 * No caching. Assumes normalizeModel(ModelEntry) returns non-deprecated fields.
 */
export function findModels(options: FindModelOptions = {}): ModelEntry[] {
  const filters = options.filters
  const sort = options.sort ?? "alphabetical"
  const searchSet = options.searchSet
  const searchText = options.searchText
  const limit = options.limit
  const offset = options.offset ?? 0
  const sortDir = options.sortDir

  const raw = searchSet ?? getCatalog()
  const normalized: WithNormalized[] = raw.map(m => findModel(m.gatewayModelId) as WithNormalized)

  let models = normalized.filter(m => matchesFilters(m, filters))
  if (searchText && searchText.trim() !== "") {
    models = models.filter(m => matchesSearchText(m, searchText))
  }

  const cmp = pickComparator(sort, sortDir)
  const sorted = models.slice().sort(cmp)

  const start = Math.max(0, offset)
  const end = limit != null ? start + Math.max(0, limit) : undefined
  const paged = sorted.slice(start, end)

  return paged
}
