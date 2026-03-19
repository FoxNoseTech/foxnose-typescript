/**
 * Types and validation for Flux vector search requests.
 */

/** Search mode for the Flux search endpoint. */
export const SearchMode = {
  TEXT: 'text',
  VECTOR: 'vector',
  VECTOR_BOOSTED: 'vector_boosted',
  HYBRID: 'hybrid',
} as const;

export type SearchMode = (typeof SearchMode)[keyof typeof SearchMode];

/** Configuration for auto-generated embedding search. */
export interface VectorSearch {
  query: string;
  fields?: string[];
  top_k?: number;
  similarity_threshold?: number;
}

/** Configuration for custom pre-computed embedding search. */
export interface VectorFieldSearch {
  field: string;
  query_vector: number[];
  top_k?: number;
  similarity_threshold?: number;
}

/** Configuration for vector-boosted search mode. */
export interface VectorBoostConfig {
  boost_factor?: number;
  similarity_threshold?: number;
  max_boost_results?: number;
}

/** Configuration for hybrid (text + vector) search mode. */
export interface HybridConfig {
  vector_weight?: number;
  text_weight?: number;
  rerank_results?: boolean;
}

/** Full search request payload for the Flux search endpoint. */
export interface SearchRequest {
  search_mode?: SearchMode;
  find_text?: Record<string, any>;
  find_phrase?: Record<string, any>;
  vector_search?: VectorSearch;
  vector_field_search?: VectorFieldSearch;
  vector_boost_config?: VectorBoostConfig;
  hybrid_config?: HybridConfig;
  limit?: number;
  offset?: number;
  [extra: string]: any;
}

const SEARCH_REQUEST_KNOWN_KEYS = new Set([
  'search_mode',
  'find_text',
  'find_phrase',
  'vector_search',
  'vector_field_search',
  'vector_boost_config',
  'hybrid_config',
  'limit',
  'offset',
]);

function checkFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function checkThreshold(value: number | undefined, name: string): void {
  if (value != null) {
    checkFinite(value, name);
    if (value < 0 || value > 1) {
      throw new Error(`${name} must be between 0.0 and 1.0`);
    }
  }
}

function checkPositiveInt(value: number | undefined, name: string): void {
  if (value != null) {
    checkFinite(value, name);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive integer (>= 1)`);
    }
  }
}

function validateVectorSearch(vs: VectorSearch): void {
  checkPositiveInt(vs.top_k, 'top_k');
  checkThreshold(vs.similarity_threshold, 'similarity_threshold');
}

function validateVectorFieldSearch(vfs: VectorFieldSearch): void {
  if (!vfs.query_vector || vfs.query_vector.length === 0) {
    throw new Error('query_vector must not be empty');
  }
  for (let i = 0; i < vfs.query_vector.length; i++) {
    if (!Number.isFinite(vfs.query_vector[i])) {
      throw new Error(`query_vector[${i}] must be a finite number`);
    }
  }
  checkPositiveInt(vfs.top_k, 'top_k');
  checkThreshold(vfs.similarity_threshold, 'similarity_threshold');
}

function validateBoostConfig(cfg: VectorBoostConfig): void {
  if (cfg.boost_factor != null) {
    checkFinite(cfg.boost_factor, 'boost_factor');
    if (cfg.boost_factor <= 0) {
      throw new Error('boost_factor must be > 0');
    }
  }
  checkThreshold(cfg.similarity_threshold, 'similarity_threshold');
  checkPositiveInt(cfg.max_boost_results, 'max_boost_results');
}

function validateHybridConfig(cfg: HybridConfig): void {
  if (cfg.vector_weight != null) {
    checkFinite(cfg.vector_weight, 'vector_weight');
    if (cfg.vector_weight < 0 || cfg.vector_weight > 1) {
      throw new Error('vector_weight must be between 0.0 and 1.0');
    }
  }
  if (cfg.text_weight != null) {
    checkFinite(cfg.text_weight, 'text_weight');
    if (cfg.text_weight < 0 || cfg.text_weight > 1) {
      throw new Error('text_weight must be between 0.0 and 1.0');
    }
  }
  const vw = cfg.vector_weight ?? 0.6;
  const tw = cfg.text_weight ?? 0.4;
  if (Math.abs(vw + tw - 1.0) > 1e-6) {
    throw new Error(`vector_weight + text_weight must equal 1.0, got ${vw + tw}`);
  }
}

/**
 * Validate a {@link SearchRequest} and return a clean body object (no undefined values).
 *
 * Enforces cross-field constraints:
 * - `vector_search` and `vector_field_search` are mutually exclusive
 * - Each search mode has specific required/forbidden fields
 */
export function buildSearchBody(req: SearchRequest): Record<string, any> {
  const mode = req.search_mode ?? SearchMode.TEXT;
  const vs = req.vector_search;
  const vfs = req.vector_field_search;
  const boost = req.vector_boost_config;
  const hybrid = req.hybrid_config;
  const hasText = req.find_text != null || req.find_phrase != null;

  // Field-level validation
  if (vs) validateVectorSearch(vs);
  if (vfs) validateVectorFieldSearch(vfs);
  if (boost) validateBoostConfig(boost);
  if (hybrid) validateHybridConfig(hybrid);

  // Mutual exclusion
  if (vs && vfs) {
    throw new Error('vector_search and vector_field_search are mutually exclusive');
  }

  // Per-mode rules
  if (mode === SearchMode.TEXT) {
    if (vs) throw new Error('vector_search is not allowed in text search mode');
    if (vfs) throw new Error('vector_field_search is not allowed in text search mode');
    if (boost) throw new Error('vector_boost_config is not allowed in text search mode');
    if (hybrid) throw new Error('hybrid_config is not allowed in text search mode');
  } else if (mode === SearchMode.VECTOR) {
    if (!vs && !vfs) {
      throw new Error('vector search mode requires vector_search or vector_field_search');
    }
    if (boost) throw new Error('vector_boost_config is not allowed in vector search mode');
    if (hybrid) throw new Error('hybrid_config is not allowed in vector search mode');
  } else if (mode === SearchMode.VECTOR_BOOSTED) {
    if (!vs && !vfs) {
      throw new Error('vector_boosted mode requires vector_search or vector_field_search');
    }
    if (!hasText) throw new Error('vector_boosted mode requires find_text or find_phrase');
    if (hybrid) throw new Error('hybrid_config is not allowed in vector_boosted mode');
  } else if (mode === SearchMode.HYBRID) {
    if (vfs) throw new Error('vector_field_search is not allowed in hybrid mode');
    if (!vs) throw new Error('hybrid mode requires vector_search');
    if (!hasText) throw new Error('hybrid mode requires find_text or find_phrase');
    if (boost) throw new Error('vector_boost_config is not allowed in hybrid mode');
  } else {
    const validModes = Object.values(SearchMode).join(', ');
    throw new Error(`Unknown search_mode: "${mode}". Valid modes: ${validModes}`);
  }

  // Build clean body (strip undefined)
  const body: Record<string, any> = {};
  for (const [key, value] of Object.entries(req)) {
    if (value !== undefined) {
      body[key] = value;
    }
  }
  if (!body.search_mode) {
    body.search_mode = mode;
  }
  return body;
}

/**
 * Merge extra body params, rejecting keys that conflict with SearchRequest fields.
 * @internal
 */
export function mergeExtra(
  validated: Record<string, any>,
  extra: Record<string, any>,
): Record<string, any> {
  const conflicts: string[] = [];
  for (const key of Object.keys(extra)) {
    if (SEARCH_REQUEST_KNOWN_KEYS.has(key)) {
      conflicts.push(key);
    }
  }
  if (conflicts.length > 0) {
    throw new Error(
      `extra keys conflict with SearchRequest fields: ${conflicts.sort().join(', ')}. ` +
        'Use the explicit parameters instead.',
    );
  }
  return { ...validated, ...extra };
}
