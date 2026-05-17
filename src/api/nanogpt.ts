const NANOGPT_API_KEY = process.env.NANOGPT_API_KEY;
const API_BASE_URL = process.env.NANOGPT_BASE_URL || "https://nano-gpt.com/api";

if (!NANOGPT_API_KEY) {
    throw new Error("NANOGPT_API_KEY environment variable is required");
}

export interface TextPart {
    type: "text";
    text: string;
}

export interface ImagePart {
    type: "image_url";
    image_url: { url: string };
}

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool" | "function";
    content: string | (TextPart | ImagePart)[];
}

export type JsonObject = Record<string, unknown>;
export type QueryParams = Record<string, string | number | boolean | null | undefined>;
export type WebSearchProvider = "none" | "default" | "linkup" | "tavily" | "exa" | "kagi" | "brave" | "valyu";
export type WebSearchVariant = "standard" | "deep" | "fast" | "auto" | "neural" | "instant" | "deep-reasoning" | "search" | "web" | "news";
export type ModelCatalog = "canonical" | "subscription" | "paid" | "personalized" | "image" | "video" | "audio" | "embedding" | "character";

export interface ChatCompletionOptions {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    top_a?: number;
    min_p?: number;
    stop?: string | string[];
    frequency_penalty?: number;
    presence_penalty?: number;
    repetition_penalty?: number;
    seed?: number;
    service_tier?: string;
    response_format?: unknown;
    reasoning_effort?: string;
    reasoning?: JsonObject;
    model_context_limit?: number;
    youtube_transcripts?: boolean;
    scraping?: boolean;
    webSearch?: WebSearchProvider;
    webSearchVariant?: WebSearchVariant;
    webSearchBody?: JsonObject;
    suffixOverride?: string;
    provider?: string;
    billingMode?: string;
    memory?: boolean;
    memoryExpirationDays?: number;
    extra?: JsonObject;
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content?: string;
            reasoning?: string;
            reasoning_content?: string;
        };
        finish_reason: string;
    }[];
    usage?: JsonObject;
}

export interface SubscriptionUsage {
    active: boolean;
    limits: { daily: number; monthly: number };
    enforceDailyLimit: boolean;
    daily: { used: number; remaining: number; percentUsed: number; resetAt: number };
    monthly: { used: number; remaining: number; percentUsed: number; resetAt: number };
    period: { currentPeriodEnd: string };
    state: "active" | "grace" | "inactive";
    graceUntil: string | null;
}

export interface Model {
    id: string;
    name?: string;
    description?: string;
    owned_by?: string;
    created?: number;
    category?: string;
    capabilities?: JsonObject;
    supported_parameters?: JsonObject;
    pricing?: JsonObject;
    [key: string]: unknown;
}

export interface ImageModel extends Model {}

export interface ImageGenerationOptions {
    model?: string;
    n?: number;
    size?: string;
    response_format?: "url" | "b64_json";
    user?: string;
    imageDataUrl?: string;
    imageDataUrls?: string[];
    maskDataUrl?: string;
    strength?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
    seed?: number;
    kontext_max_mode?: boolean;
    extra?: JsonObject;
}

export interface ImageGenerationResponse {
    created: number;
    data: { url?: string; b64_json?: string }[];
    cost?: number;
    paymentSource?: string;
    remainingBalance?: number;
}

export interface ScrapeResult {
    url: string;
    success: boolean;
    title?: string;
    content?: string;
    markdown?: string;
    error?: string;
}

export interface ScrapeSummary {
    requested: number;
    processed: number;
    successful: number;
    failed: number;
    totalCost: number;
    stealthModeUsed: boolean;
}

export interface ScrapeUrlsResponse {
    results: ScrapeResult[];
    summary: ScrapeSummary;
}

export interface BinaryResponse {
    data: Buffer;
    contentType: string;
    filename: string;
}

interface RequestOptions {
    headers?: Record<string, string>;
    query?: QueryParams;
    authStyle?: "bearer" | "x-api-key" | "both";
}

function withQuery(endpoint: string, query?: QueryParams): string {
    if (!query) return endpoint;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
        }
    }
    const rendered = params.toString();
    return rendered ? `${endpoint}?${rendered}` : endpoint;
}

function authHeaders(apiKey: string, style: RequestOptions["authStyle"] = "bearer"): Record<string, string> {
    const headers: Record<string, string> = {};
    if (style === "bearer" || style === "both") headers.Authorization = `Bearer ${apiKey}`;
    if (style === "x-api-key" || style === "both") headers["x-api-key"] = apiKey;
    return headers;
}

async function parseError(response: Response): Promise<Error> {
    const contentType = response.headers.get("content-type") || "";
    let detail = response.statusText;
    try {
        detail = contentType.includes("application/json")
            ? JSON.stringify(await response.json())
            : await response.text();
    } catch {
        // Keep status text fallback.
    }
    const hint = response.status === 402
        ? " Payment required: enable pay-as-you-go or add balance for this NanoGPT feature."
        : response.status === 429
            ? " Rate limited by NanoGPT."
            : "";
    return new Error(`NanoGPT API error (${response.status}): ${detail}${hint}`);
}

function getModelWithWebSearch(model: string, provider: WebSearchProvider, variant?: WebSearchVariant): string {
    if (provider === "none") return model;
    if (provider === "default") return `${model}:online`;

    let suffix: string = provider;
    if (variant && variant !== "standard") {
        if ((provider === "linkup" || provider === "tavily") && variant === "deep") {
            suffix = `${provider}-deep`;
        } else if (provider === "kagi" && (variant === "deep" || variant === "search")) {
            suffix = `${provider}-search`;
        } else {
            suffix = `${provider}-${variant}`;
        }
    }
    return `${model}:online/${suffix}`;
}

class NanoGPTClient {
    constructor(private apiKey: string) {}

    private url(endpoint: string, query?: QueryParams): string {
        const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        return `${API_BASE_URL}${withQuery(normalized, query)}`;
    }

    async request<T>(endpoint: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
        const initHeaders = init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {};
        const response = await fetch(this.url(endpoint, options.query), {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...authHeaders(this.apiKey, options.authStyle),
                ...options.headers,
                ...initHeaders,
            },
        });
        if (!response.ok) throw await parseError(response);
        return response.json() as Promise<T>;
    }

    async requestBinary(endpoint: string, body: JsonObject, filename: string, options: RequestOptions = {}): Promise<BinaryResponse> {
        const response = await fetch(this.url(endpoint, options.query), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders(this.apiKey, options.authStyle),
                ...options.headers,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw await parseError(response);
        return {
            data: Buffer.from(await response.arrayBuffer()),
            contentType: response.headers.get("content-type") || "application/octet-stream",
            filename,
        };
    }

    async chat(messages: ChatMessage[], model: string, options: ChatCompletionOptions = {}): Promise<ChatCompletionResponse> {
        const finalModel = options.suffixOverride
            ? `${model}${options.suffixOverride}`
            : getModelWithWebSearch(model, options.webSearch || "none", options.webSearchVariant);

        const headers: Record<string, string> = {};
        if (options.provider) headers["X-Provider"] = options.provider;
        if (options.billingMode) headers["X-Billing-Mode"] = options.billingMode;
        if (options.memory) headers.memory = "true";
        if (options.memoryExpirationDays) headers.memory_expiration_days = String(options.memoryExpirationDays);

        const body: JsonObject = {
            model: finalModel,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 4000,
            top_p: options.top_p ?? 1,
            ...options.extra,
        };

        for (const key of [
            "top_k", "top_a", "min_p", "stop", "frequency_penalty", "presence_penalty",
            "repetition_penalty", "seed", "service_tier", "response_format", "reasoning_effort",
            "reasoning", "model_context_limit", "youtube_transcripts", "scraping",
        ] as const) {
            if (options[key] !== undefined) body[key] = options[key] as unknown;
        }
        if (options.webSearchBody) body.webSearch = options.webSearchBody;
        if (options.billingMode) {
            body.billing_mode = options.billingMode;
            body.billingMode = options.billingMode;
        }

        return this.request<ChatCompletionResponse>("/v1/chat/completions", {
            method: "POST",
            body: JSON.stringify(body),
        }, { headers });
    }

    async createResponse(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/responses", { method: "POST", body: JSON.stringify(body) });
    }

    async createMessage(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/messages", { method: "POST", body: JSON.stringify(body) });
    }

    async countMessageTokens(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/messages/count_tokens", { method: "POST", body: JSON.stringify(body) });
    }

    async completion(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/completions", { method: "POST", body: JSON.stringify(body) });
    }

    async getModels(catalog: ModelCatalog = "subscription", detailed = false, query: QueryParams = {}): Promise<Model[]> {
        const endpoints: Record<ModelCatalog, string> = {
            canonical: "/v1/models",
            subscription: "/subscription/v1/models",
            paid: "/paid/v1/models",
            personalized: "/personalized/v1/models",
            image: "/v1/image-models",
            video: "/v1/video-models",
            audio: "/v1/audio-models",
            embedding: "/v1/embedding-models",
            character: "/v1/character-models",
        };
        const response = await this.request<{ data: Model[] } | Model[]>(endpoints[catalog], {}, { query: { detailed, ...query } });
        return Array.isArray(response) ? response : response.data || [];
    }

    async getImageModels(detailed = true): Promise<ImageModel[]> {
        return this.getModels("image", detailed);
    }

    async getUsage(): Promise<SubscriptionUsage> {
        return this.request<SubscriptionUsage>("/subscription/v1/usage");
    }

    async getBalance(): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/balance", { method: "POST", body: "{}" }, { authStyle: "both" });
    }

    async getStatus(): Promise<JsonObject> {
        return this.request<JsonObject>("/status", {}, { authStyle: "both" });
    }

    async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<ImageGenerationResponse> {
        return this.request<ImageGenerationResponse>("/v1/images/generations", {
            method: "POST",
            body: JSON.stringify({
                prompt,
                model: options.model ?? "hidream",
                n: options.n ?? 1,
                ...options.extra,
                ...(options.size ? { size: options.size } : {}),
                ...(options.response_format ? { response_format: options.response_format } : {}),
                ...(options.user ? { user: options.user } : {}),
                ...(options.imageDataUrl ? { imageDataUrl: options.imageDataUrl } : {}),
                ...(options.imageDataUrls ? { imageDataUrls: options.imageDataUrls } : {}),
                ...(options.maskDataUrl ? { maskDataUrl: options.maskDataUrl } : {}),
                ...(options.strength !== undefined ? { strength: options.strength } : {}),
                ...(options.guidance_scale !== undefined ? { guidance_scale: options.guidance_scale } : {}),
                ...(options.num_inference_steps !== undefined ? { num_inference_steps: options.num_inference_steps } : {}),
                ...(options.seed !== undefined ? { seed: options.seed } : {}),
                ...(options.kontext_max_mode !== undefined ? { kontext_max_mode: options.kontext_max_mode } : {}),
            }),
        });
    }

    async editImage(body: JsonObject): Promise<ImageGenerationResponse> {
        return this.request<ImageGenerationResponse>("/v1/images/edits", { method: "POST", body: JSON.stringify(body) });
    }

    async scrapeUrls(urls: string[], stealthMode = false): Promise<ScrapeUrlsResponse> {
        return this.request<ScrapeUrlsResponse>("/scrape-urls", { method: "POST", body: JSON.stringify({ urls, stealthMode }) });
    }

    async directWebSearch(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/web", { method: "POST", body: JSON.stringify(body) });
    }

    async extract(endpoint: string, body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>(endpoint, { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async hunter(path: string, body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>(`/v1/hunter/${path}`, { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async createEmbedding(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/embeddings", { method: "POST", body: JSON.stringify(body) });
    }

    async aiDetection(text: string, mode: "ai" | "plagiarism", extra: JsonObject = {}): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/ai-detection", { method: "POST", body: JSON.stringify({ text, mode, ...extra }) }, { authStyle: "both" });
    }

    async classifyNsfw(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/nsfw/image", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async youtubeTranscribe(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/youtube/transcribe", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async memory(body: JsonObject, expirationDays?: number): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/memory", { method: "POST", body: JSON.stringify(body) }, {
            headers: expirationDays ? { memory_expiration_days: String(expirationDays) } : undefined,
        });
    }

    async audioSpeech(body: JsonObject): Promise<BinaryResponse> {
        const format = typeof body.response_format === "string" ? body.response_format : "mp3";
        return this.requestBinary("/v1/audio/speech", body, `speech.${format}`);
    }

    async tts(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/tts", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async ttsStatus(id: string): Promise<JsonObject> {
        return this.request<JsonObject>("/tts/status", {}, { authStyle: "both", query: { id } });
    }

    async transcribe(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/audio/transcriptions", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async transcribeStatus(id: string): Promise<JsonObject> {
        return this.request<JsonObject>("/transcribe/status", { method: "POST", body: JSON.stringify({ id }) }, { authStyle: "both" });
    }

    async voiceClone(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/voice-cloning", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async generateVideo(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/generate-video", { method: "POST", body: JSON.stringify(body) }, { authStyle: "x-api-key" });
    }

    async videoStatus(requestId: string): Promise<JsonObject> {
        return this.request<JsonObject>("/video/status", {}, { authStyle: "x-api-key", query: { requestId } });
    }

    async videoRecover(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/video/recover", { method: "POST", body: JSON.stringify(body) }, { authStyle: "x-api-key" });
    }

    async videoExtend(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/generate-video/extend", { method: "POST", body: JSON.stringify(body) }, { authStyle: "x-api-key" });
    }

    async videoContent(query: QueryParams): Promise<JsonObject> {
        return this.request<JsonObject>("/video/content", {}, { authStyle: "x-api-key", query });
    }

    async teeAttestation(model: string): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/tee/attestation", {}, { query: { model }, authStyle: "both" });
    }

    async teeSignature(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/tee/signature", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async listCharacters(query: QueryParams = {}): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/characters", {}, { query, authStyle: "both" });
    }

    async myCharacters(query: QueryParams = {}): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/characters/mine", {}, { query, authStyle: "both" });
    }

    async getCharacter(idOrSlug: string): Promise<JsonObject> {
        return this.request<JsonObject>(`/v1/characters/${encodeURIComponent(idOrSlug)}`, {}, { authStyle: "both" });
    }

    async createCharacter(body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>("/v1/characters", { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async patchCharacter(idOrSlug: string, body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>(`/v1/characters/${encodeURIComponent(idOrSlug)}`, { method: "PATCH", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async deleteCharacter(idOrSlug: string): Promise<JsonObject> {
        return this.request<JsonObject>(`/v1/characters/${encodeURIComponent(idOrSlug)}`, { method: "DELETE" }, { authStyle: "both" });
    }

    async reviewCharacter(idOrSlug: string, body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>(`/v1/characters/${encodeURIComponent(idOrSlug)}/review`, { method: "PUT", body: JSON.stringify(body) }, { authStyle: "both" });
    }

    async reportCharacter(idOrSlug: string, body: JsonObject): Promise<JsonObject> {
        return this.request<JsonObject>(`/v1/characters/${encodeURIComponent(idOrSlug)}/report`, { method: "POST", body: JSON.stringify(body) }, { authStyle: "both" });
    }
}

export const nanogpt = new NanoGPTClient(NANOGPT_API_KEY);
