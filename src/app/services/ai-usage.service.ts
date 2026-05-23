import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { apiUrl, jsonAuthHeaders, storedToken } from './global';

export const COST_REFRESH_INTERVALS = [
  '6 hours',
  '12 hours',
  '1 day',
  '3 days',
  '7 days',
  '15 days',
  '1 month',
] as const;

export type CostRefreshInterval = (typeof COST_REFRESH_INTERVALS)[number];

export type AiModelInfo = {
  id: string;
  label: string;
  description: string;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export type AiModelCatalog = {
  provider?: string;
  defaultModel: string;
  models: AiModelInfo[];
  assistantEnabled?: boolean;
  source?: 'api' | 'fallback';
  notice?: string;
  webSearch?: {
    enabled: boolean;
    priceUsdPerThousandCalls: number;
    requiresExternalProvider?: boolean;
    warning?: string;
  };
};

export const FALLBACK_BEDROCK_MODEL_CATALOG: AiModelCatalog = {
  provider: 'amazon-bedrock',
  defaultModel: 'amazon.nova-lite-v1:0',
  assistantEnabled: false,
  source: 'fallback',
  notice:
    'El catálogo de modelos se cargó localmente porque la API de IA no está disponible en este ambiente.',
  models: [
    {
      id: 'amazon.nova-micro-v1:0',
      label: 'Amazon Nova Micro',
      description: 'Menor costo para textos cortos, resúmenes y variantes rápidas.',
      inputUsdPerMillionTokens: 0.035,
      outputUsdPerMillionTokens: 0.14,
    },
    {
      id: 'amazon.nova-lite-v1:0',
      label: 'Amazon Nova Lite',
      description: 'Balance recomendado entre costo, velocidad y calidad para edición SEO.',
      inputUsdPerMillionTokens: 0.06,
      outputUsdPerMillionTokens: 0.24,
    },
    {
      id: 'amazon.nova-pro-v1:0',
      label: 'Amazon Nova Pro',
      description: 'Mejor para borradores largos, estructura compleja y revisión editorial.',
      inputUsdPerMillionTokens: 0.8,
      outputUsdPerMillionTokens: 3.2,
    },
  ],
  webSearch: {
    enabled: false,
    priceUsdPerThousandCalls: 0,
    requiresExternalProvider: true,
    warning:
      'La investigación en internet no está integrada en el primer pase con Bedrock.',
  },
};

export type AiUsageSummary = {
  totalRequests: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  estimatedModelCostUsd?: number;
  averageCostPerRequestUsd?: number;
  failedRequests?: number;
  bySurface?: Array<UsageBreakdown>;
  byAction?: Array<UsageBreakdown>;
  byModel?: Array<UsageBreakdown>;
  webResearch?: WebResearchUsage;
};

export type UsageBreakdown = {
  label: string;
  requests: number;
  estimatedCostUsd?: number;
};

export type WebResearchUsage = {
  totalRequests: number;
  estimatedSearchCalls?: number;
  estimatedSearchCostUsd?: number;
  estimatedTotalCostUsd?: number;
};

export type AwsCostService = {
  service: string;
  amountUsd: number;
};

export type AwsCostSummary = {
  status: 'cached' | 'refreshed' | 'stale' | 'disabled' | string;
  services: AwsCostService[];
  totalUsd?: number;
  previousMonthTotalUsd?: number;
  lastRefreshedAt?: string;
  staleReason?: string;
};

export type CostDashboardSettings = {
  awsCostRefreshInterval: CostRefreshInterval;
};

export type AiUsageDashboard = {
  usage: AiUsageSummary;
  awsCost: AwsCostSummary;
  settings: CostDashboardSettings;
};

export type AiAssistRequest = {
  surface: 'blog' | 'publications' | 'solutions' | 'configurations' | string;
  action: string;
  model: string;
  instruction?: string;
  webResearch: boolean;
  context: Record<string, unknown>;
};

export type AiAssistResponse = {
  status: string;
  requestId: string;
  outputText: string;
  model: string;
  provider?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedModelCostUsd: number;
    estimatedWebSearchCalls?: number;
    estimatedWebSearchCostUsd?: number;
  };
};

@Injectable({ providedIn: 'root' })
export class AiUsageService {
  constructor(private _http: HttpClient) {}

  getModelCatalog(): Observable<AiModelCatalog> {
    return this._http
      .get<AiModelCatalog>(apiUrl('/ai/models'), {
        headers: this.authHeaders(),
      })
      .pipe(catchError(() => of(cloneModelCatalog(FALLBACK_BEDROCK_MODEL_CATALOG))));
  }

  getDashboard(from: string, to: string): Observable<AiUsageDashboard> {
    return forkJoin({
      usage: this.getAiUsage(from, to),
      awsCost: this.getAwsCosts(from, to),
      settings: this.getCostSettings(),
    });
  }

  getAiUsage(from: string, to: string): Observable<AiUsageSummary> {
    return this._http.get<AiUsageSummary>(
      apiUrl(`/ai/usage?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      { headers: this.authHeaders() }
    );
  }

  getAwsCosts(from: string, to: string): Observable<AwsCostSummary> {
    return this._http.get<AwsCostSummary>(
      apiUrl(`/costs/aws?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      { headers: this.authHeaders() }
    );
  }

  getCostSettings(): Observable<CostDashboardSettings> {
    return this._http.get<CostDashboardSettings>(apiUrl('/costs/settings'), {
      headers: this.authHeaders(),
    });
  }

  updateCostRefreshInterval(
    awsCostRefreshInterval: CostRefreshInterval
  ): Observable<CostDashboardSettings> {
    return this._http.put<CostDashboardSettings>(
      apiUrl('/costs/settings'),
      { awsCostRefreshInterval },
      { headers: this.authHeaders() }
    );
  }

  refreshAwsCosts(from: string, to: string): Observable<AwsCostSummary> {
    return this._http.post<AwsCostSummary>(
      apiUrl('/costs/aws/refresh'),
      { from, to },
      { headers: this.authHeaders() }
    );
  }

  requestAssistance(request: AiAssistRequest): Observable<AiAssistResponse> {
    return this._http.post<AiAssistResponse>(apiUrl('/ai/assist'), request, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(jsonAuthHeaders(storedToken()));
  }
}

function cloneModelCatalog(catalog: AiModelCatalog): AiModelCatalog {
  return {
    ...catalog,
    models: catalog.models.map((model) => ({ ...model })),
    webSearch: catalog.webSearch ? { ...catalog.webSearch } : undefined,
  };
}
