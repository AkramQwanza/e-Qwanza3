export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiClient {
  private baseUrl: string;
  private projectId: number;

  constructor(baseUrl: string = DEFAULT_BASE_URL, projectId: number = 1) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.projectId = projectId;
  }

  setProjectId(projectId: number) {
    this.projectId = projectId;
  }

  getProjectId() {
    return this.projectId;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, init);
      const contentType = res.headers.get("content-type");
      const body = contentType && contentType.includes("application/json") ? await res.json() : await res.text();
      if (!res.ok) {
        const message = typeof body === "string" ? body : body?.signal || body?.message || "Erreur inconnue";
        return { ok: false, error: message, status: res.status };
      }
      return { ok: true, data: body as T };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  }

  // Files upload
  async uploadFile(file: File): Promise<ApiResult<{ signal: string; file_id: string; asset_name: string }>> {
    const form = new FormData();
    form.append("file", file);
    return this.request(`/api/v1/data/upload/${this.projectId}`, {
      method: "POST",
      body: form,
    });
  }

  // Process chunks (optionally for a specific file_id)
  async processFiles(params: { chunk_size: number; overlap_size: number; do_reset?: number; file_id?: string }): Promise<ApiResult<{ signal: string; inserted_chunks: number; processed_files: number }>> {
    return this.request(`/api/v1/data/process/${this.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, do_reset: params.do_reset ?? 0 }),
    });
  }

  // Push to vector index
  async pushToIndex(params: { do_reset?: boolean }): Promise<ApiResult<{ signal: string; inserted_items_count: number }>> {
    return this.request(`/api/v1/nlp/index/push/${this.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ do_reset: params.do_reset ?? false }),
    });
  }

  // Answer RAG
  async answer(params: { text: string; limit?: number }): Promise<ApiResult<{ signal: string; answer: string; full_prompt: string; chat_history: any }>> {
    return this.request(`/api/v1/nlp/index/answer/${this.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: params.text, limit: params.limit ?? 10 }),
    });
  }

  // List assets for current project
  async listAssets(): Promise<ApiResult<{ signal: string; assets: { asset_id: number; asset_name: string; asset_size: number; created_at?: string }[] }>> {
    return this.request(`/api/v1/data/assets/${this.projectId}`);
  }

  // Delete asset by name
  async deleteAsset(assetName: string): Promise<ApiResult<{ signal: string; asset_name: string }>> {
    return this.request(`/api/v1/data/asset/${this.projectId}/${encodeURIComponent(assetName)}` , {
      method: "DELETE",
    });
  }
}

// export const apiClient = new ApiClient();
// export const apiClient = new ApiClient(DEFAULT_BASE_URL, 3); // Utilise project_id = 3
// Clients pour chaque mode
export const enterpriseApiClient = new ApiClient(DEFAULT_BASE_URL, 1); // Mode Entreprise
export const personalApiClient = new ApiClient(DEFAULT_BASE_URL, 2);   // Mode Personnel

