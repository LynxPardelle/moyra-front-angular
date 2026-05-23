import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { apiUrl } from './global';
import {
  AiUsageService,
  CostRefreshInterval,
  FALLBACK_BEDROCK_MODEL_CATALOG,
} from './ai-usage.service';

function validToken(): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    'cognito:groups': ['ROLE_ADMIN'],
  };
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encodedPayload}.signature`;
}

describe('AiUsageService', () => {
  let service: AiUsageService;
  let http: HttpTestingController;
  let token: string;

  beforeEach(() => {
    token = validToken();
    localStorage.setItem('token', token);

    TestBed.configureTestingModule({
      providers: [
        AiUsageService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AiUsageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads the allowed model catalog with admin auth', () => {
    service.getModelCatalog().subscribe((catalog) => {
      expect(catalog.defaultModel).toBe('amazon.nova-lite-v1:0');
      expect(catalog.models.length).toBe(1);
      expect(catalog.monthlyTokenBudget).toBe(1000000);
    });

    const req = http.expectOne(apiUrl('/ai/models'));
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(token);
    req.flush({
      provider: 'amazon-bedrock',
      defaultModel: 'amazon.nova-lite-v1:0',
      models: [
        {
          id: 'amazon.nova-lite-v1:0',
          label: 'Amazon Nova Lite',
          description: 'Balanced quality and cost.',
          inputUsdPerMillionTokens: 0.06,
          outputUsdPerMillionTokens: 0.24,
        },
      ],
      monthlyTokenBudget: 1000000,
    });
  });

  it('falls back to a local Bedrock catalog when the model endpoint is unavailable', () => {
    service.getModelCatalog().subscribe((catalog) => {
      expect(catalog.source).toBe('fallback');
      expect(catalog.assistantEnabled).toBeFalse();
      expect(catalog.defaultModel).toBe(FALLBACK_BEDROCK_MODEL_CATALOG.defaultModel);
      expect(catalog.models.length).toBeGreaterThan(1);
    });

    const req = http.expectOne(apiUrl('/ai/models'));
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
  });

  it('loads usage, AWS costs, and dashboard settings for a date range', () => {
    service.getDashboard('2026-05-01', '2026-05-21').subscribe((dashboard) => {
      expect(dashboard.usage.totalRequests).toBe(3);
      expect(dashboard.awsCost.status).toBe('cached');
      expect(dashboard.settings.awsCostRefreshInterval).toBe('6 hours');
    });

    const usageReq = http.expectOne(
      apiUrl('/ai/usage?from=2026-05-01&to=2026-05-21')
    );
    const costReq = http.expectOne(
      apiUrl('/costs/aws?from=2026-05-01&to=2026-05-21')
    );
    const settingsReq = http.expectOne(apiUrl('/costs/settings'));

    expect(usageReq.request.method).toBe('GET');
    expect(costReq.request.method).toBe('GET');
    expect(settingsReq.request.method).toBe('GET');
    expect(usageReq.request.headers.get('Authorization')).toBe(token);
    expect(costReq.request.headers.get('Authorization')).toBe(token);
    expect(settingsReq.request.headers.get('Authorization')).toBe(token);

    usageReq.flush({ totalRequests: 3 });
    costReq.flush({ status: 'cached', services: [] });
    settingsReq.flush({ awsCostRefreshInterval: '6 hours' });
  });

  it('updates the AWS cost refresh interval using the allowlisted value', () => {
    const interval: CostRefreshInterval = '1 day';

    service.updateCostRefreshInterval(interval).subscribe((settings) => {
      expect(settings.awsCostRefreshInterval).toBe(interval);
    });

    const req = http.expectOne(apiUrl('/costs/settings'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      awsCostRefreshInterval: interval,
    });
    expect(req.request.headers.get('Authorization')).toBe(token);
    req.flush({ awsCostRefreshInterval: interval });
  });

  it('manual AWS cost refresh sends an admin-only refresh request', () => {
    service.refreshAwsCosts('2026-05-01', '2026-05-21').subscribe((awsCost) => {
      expect(awsCost.status).toBe('refreshed');
    });

    const req = http.expectOne(apiUrl('/costs/aws/refresh'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      from: '2026-05-01',
      to: '2026-05-21',
    });
    expect(req.request.headers.get('Authorization')).toBe(token);
    req.flush({ status: 'refreshed', services: [] });
  });

  it('sends an AI assistance request with model options and web research disabled', () => {
    service
      .requestAssistance({
        surface: 'blog',
        action: 'seo-metadata',
        model: 'amazon.nova-lite-v1:0',
        instruction: 'Hazlo claro para clientes.',
        webResearch: false,
        context: {
          title: 'Contrato mercantil',
        },
      })
      .subscribe((response) => {
        expect(response.outputText).toContain('Título sugerido');
        expect(response.usage.estimatedModelCostUsd).toBe(0.0003);
      });

    const req = http.expectOne(apiUrl('/ai/assist'));
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(token);
    expect(req.request.body).toEqual({
      surface: 'blog',
      action: 'seo-metadata',
      model: 'amazon.nova-lite-v1:0',
      instruction: 'Hazlo claro para clientes.',
      webResearch: false,
      context: {
        title: 'Contrato mercantil',
      },
    });
    req.flush({
      status: 'success',
      requestId: 'usage-123',
      outputText: 'Título sugerido',
      model: 'amazon.nova-lite-v1:0',
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        estimatedModelCostUsd: 0.0003,
      },
    });
  });
});
