import type { AuthStrategy } from '../auth/types.js';
import type { RetryConfig } from '../config.js';
import { createConfig } from '../config.js';
import { HttpTransport } from '../http.js';
import type {
  HybridConfig,
  SearchRequest,
  VectorBoostConfig,
  VectorFieldSearch,
  VectorSearch,
} from './models.js';
import { SearchMode, buildSearchBody, mergeExtra } from './models.js';

function cleanPrefix(prefix: string): string {
  const value = prefix.replace(/^\/+|\/+$/g, '');
  if (!value) {
    throw new Error('apiPrefix cannot be empty');
  }
  return value;
}

function normalizeFolderPath(folderPath: string): string {
  return folderPath.replace(/^\/+|\/+$/g, '');
}

export interface FluxClientOptions {
  baseUrl: string;
  apiPrefix: string;
  auth: AuthStrategy;
  timeout?: number;
  retryConfig?: RetryConfig;
  defaultHeaders?: Record<string, string>;
}

export interface VectorSearchOptions {
  query: string;
  fields?: string[];
  top_k?: number;
  similarity_threshold?: number;
  limit?: number;
  offset?: number;
  [extra: string]: any;
}

export interface VectorFieldSearchOptions {
  field: string;
  query_vector: number[];
  top_k?: number;
  similarity_threshold?: number;
  limit?: number;
  offset?: number;
  [extra: string]: any;
}

export interface HybridSearchOptions {
  query: string;
  find_text: Record<string, any>;
  fields?: string[];
  top_k?: number;
  similarity_threshold?: number;
  vector_weight?: number;
  text_weight?: number;
  rerank_results?: boolean;
  limit?: number;
  offset?: number;
  [extra: string]: any;
}

export interface BoostedSearchOptions {
  find_text: Record<string, any>;
  query?: string;
  field?: string;
  query_vector?: number[];
  top_k?: number;
  similarity_threshold?: number;
  boost_factor?: number;
  boost_similarity_threshold?: number;
  max_boost_results?: number;
  limit?: number;
  offset?: number;
  [extra: string]: any;
}

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Client for FoxNose Flux delivery APIs.
 *
 * All methods are async and return parsed JSON responses.
 */
export class FluxClient {
  readonly apiPrefix: string;
  private readonly transport: HttpTransport;

  constructor(options: FluxClientOptions) {
    this.apiPrefix = cleanPrefix(options.apiPrefix);
    const config = createConfig({
      baseUrl: options.baseUrl,
      timeout: options.timeout ?? 15_000,
      defaultHeaders: options.defaultHeaders,
    });
    this.transport = new HttpTransport({
      config,
      auth: options.auth,
      retryConfig: options.retryConfig,
    });
  }

  private buildPath(folderPath: string, suffix = ''): string {
    const folder = normalizeFolderPath(folderPath);
    const base = `/${this.apiPrefix}/${folder}`;
    return suffix ? `${base}${suffix}` : base;
  }

  async listResources<T = any>(folderPath: string, params?: Record<string, any>): Promise<T> {
    const path = this.buildPath(folderPath);
    return this.transport.request('GET', path, { params });
  }

  async getResource<T = any>(
    folderPath: string,
    resourceKey: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const path = this.buildPath(folderPath, `/${resourceKey}`);
    return this.transport.request('GET', path, { params });
  }

  async search<T = any>(folderPath: string, body: Record<string, any>): Promise<T> {
    const path = this.buildPath(folderPath, '/_search');
    return this.transport.request('POST', path, { jsonBody: body });
  }

  /** Semantic search using auto-generated embeddings. */
  async vectorSearch<T = any>(folderPath: string, options: VectorSearchOptions): Promise<T> {
    const { query, fields, top_k = 10, similarity_threshold, limit, offset, ...rest } = options;
    const extra = stripUndefined(rest);
    const vs: VectorSearch = { query, fields, top_k, similarity_threshold };
    const req: SearchRequest = {
      search_mode: SearchMode.VECTOR,
      vector_search: vs,
      limit,
      offset,
    };
    const body = mergeExtra(buildSearchBody(req), extra);
    return this.search(folderPath, body);
  }

  /** Search using custom pre-computed embeddings. */
  async vectorFieldSearch<T = any>(
    folderPath: string,
    options: VectorFieldSearchOptions,
  ): Promise<T> {
    const {
      field,
      query_vector,
      top_k = 10,
      similarity_threshold,
      limit,
      offset,
      ...rest
    } = options;
    const extra = stripUndefined(rest);
    const vfs: VectorFieldSearch = { field, query_vector, top_k, similarity_threshold };
    const req: SearchRequest = {
      search_mode: SearchMode.VECTOR,
      vector_field_search: vfs,
      limit,
      offset,
    };
    const body = mergeExtra(buildSearchBody(req), extra);
    return this.search(folderPath, body);
  }

  /** Blended text + vector search with configurable weights. */
  async hybridSearch<T = any>(folderPath: string, options: HybridSearchOptions): Promise<T> {
    const {
      query,
      find_text,
      fields,
      top_k = 10,
      similarity_threshold,
      vector_weight = 0.6,
      text_weight = 0.4,
      rerank_results = true,
      limit,
      offset,
      ...rest
    } = options;
    const extra = stripUndefined(rest);
    const vs: VectorSearch = { query, fields, top_k, similarity_threshold };
    const hybrid: HybridConfig = { vector_weight, text_weight, rerank_results };
    const req: SearchRequest = {
      search_mode: SearchMode.HYBRID,
      find_text,
      vector_search: vs,
      hybrid_config: hybrid,
      limit,
      offset,
    };
    const body = mergeExtra(buildSearchBody(req), extra);
    return this.search(folderPath, body);
  }

  /** Text search with results boosted by vector similarity. */
  async boostedSearch<T = any>(folderPath: string, options: BoostedSearchOptions): Promise<T> {
    const {
      find_text,
      query,
      field,
      query_vector,
      top_k = 10,
      similarity_threshold,
      boost_factor = 1.5,
      boost_similarity_threshold,
      max_boost_results = 20,
      limit,
      offset,
      ...rest
    } = options;
    const extra = stripUndefined(rest);

    const hasAuto = query != null;
    const hasCustom = field != null || query_vector != null;

    if (hasAuto && hasCustom) {
      throw new Error(
        "Provide either 'query' for auto-generated embeddings " +
          "or 'field' + 'query_vector' for custom embeddings, not both",
      );
    }

    let vs: VectorSearch | undefined;
    let vfs: VectorFieldSearch | undefined;

    if (hasAuto) {
      vs = { query: query!, top_k, similarity_threshold };
    } else if (field != null && query_vector != null) {
      vfs = { field, query_vector, top_k, similarity_threshold };
    } else {
      throw new Error(
        "Provide either 'query' for auto-generated embeddings " +
          "or 'field' + 'query_vector' for custom embeddings",
      );
    }

    const boostConfig: VectorBoostConfig = {
      boost_factor,
      similarity_threshold: boost_similarity_threshold,
      max_boost_results,
    };

    const req: SearchRequest = {
      search_mode: SearchMode.VECTOR_BOOSTED,
      find_text,
      vector_search: vs,
      vector_field_search: vfs,
      vector_boost_config: boostConfig,
      limit,
      offset,
    };
    const body = mergeExtra(buildSearchBody(req), extra);
    return this.search(folderPath, body);
  }

  async getRouter<T = any>(): Promise<T> {
    const path = `/${this.apiPrefix}/_router`;
    return this.transport.request('GET', path);
  }

  async getSchema<T = any>(folderPath: string): Promise<T> {
    const path = this.buildPath(folderPath, '/_schema');
    return this.transport.request('GET', path);
  }

  close(): void {
    this.transport.close();
  }
}
