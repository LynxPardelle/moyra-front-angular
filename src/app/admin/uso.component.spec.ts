import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiUsageService } from '../services/ai-usage.service';
import { UsoComponent } from './uso.component';

class FakeAiUsageService {
  dashboard = {
    usage: {
      totalRequests: 8,
      totalInputTokens: 1200,
      totalOutputTokens: 800,
      monthlyTokenBudget: 1000000,
      monthlyTokenRemaining: 998000,
      monthlyTokenBudgetEstimatedCostUsd: 0.0875,
      monthlyTokensUsedEstimatedCostUsd: 0.14,
      monthlyTokenBudgetPricingNote: 'Aproximado con Amazon Nova Micro.',
      estimatedModelCostUsd: 0.14,
      averageCostPerRequestUsd: 0.0175,
      failedRequests: 1,
      bySurface: [
        { label: 'Blog', requests: 5, estimatedCostUsd: 0.09 },
        { label: 'Publicaciones', requests: 3, estimatedCostUsd: 0.05 },
      ],
    },
    awsCost: {
      status: 'cached',
      totalUsd: 4.56,
      periodTotalUsd: 4.56,
      costExplorerTotalUsd: 1.23,
      estimatedPersistentMonthlyUsd: 1.21,
      lastRefreshedAt: '2026-05-21T10:00:00.000Z',
      services: [
        { service: 'AWS Lambda', amountUsd: 1.23 },
        { service: 'Amazon S3', amountUsd: 0 },
      ],
      computedServices: [
        {
          service: 'AWS Secrets Manager',
          environment: 'production',
          environmentLabel: 'Producción',
          purpose: 'Guarda el secreto usado para firmar sesiones.',
          usageLabel: '1 secreto',
          basis: '1 secreto JWT por ambiente.',
          amountUsd: 0.4,
          monthlyAmountUsd: 0.4,
        },
        {
          service: 'Amazon S3',
          environment: 'test',
          environmentLabel: 'Testing',
          purpose: 'Guarda archivos del sitio.',
          usageLabel: '15 objetos, 2 MB',
          basis: 'Almacenamiento Standard.',
          amountUsd: 0.0042,
          monthlyAmountUsd: 0.006,
        },
      ],
      computedEnvironments: [
        {
          environment: 'production',
          environmentLabel: 'Producción',
          totalUsd: 0.4,
          monthlyBaseUsd: 0.4,
          services: [
            {
              service: 'AWS Secrets Manager',
              environment: 'production',
              environmentLabel: 'Producción',
              purpose: 'Guarda el secreto usado para firmar sesiones.',
              usageLabel: '1 secreto',
              basis: '1 secreto JWT por ambiente.',
              amountUsd: 0.4,
              monthlyAmountUsd: 0.4,
            },
          ],
        },
        {
          environment: 'test',
          environmentLabel: 'Testing',
          totalUsd: 0.0042,
          monthlyBaseUsd: 0.006,
          services: [
            {
              service: 'Amazon S3',
              environment: 'test',
              environmentLabel: 'Testing',
              purpose: 'Guarda archivos del sitio.',
              usageLabel: '15 objetos, 2 MB',
              basis: 'Almacenamiento Standard.',
              amountUsd: 0.0042,
              monthlyAmountUsd: 0.006,
            },
          ],
        },
      ],
    },
    settings: {
      awsCostRefreshInterval: '6 hours' as const,
    },
  };

  updateCostRefreshIntervalCalls: string[] = [];
  refreshCalls: Array<{ from: string; to: string }> = [];

  getDashboard() {
    return of(this.dashboard);
  }

  updateCostRefreshInterval(interval: any) {
    this.updateCostRefreshIntervalCalls.push(interval);
    this.dashboard.settings.awsCostRefreshInterval = interval;
    return of(this.dashboard.settings);
  }

  refreshAwsCosts(from: string, to: string) {
    this.refreshCalls.push({ from, to });
    this.dashboard.awsCost.status = 'refreshed';
    return of(this.dashboard.awsCost);
  }
}

describe('UsoComponent', () => {
  let component: UsoComponent;
  let fixture: ComponentFixture<UsoComponent>;
  let service: FakeAiUsageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsoComponent],
      providers: [
        {
          provide: AiUsageService,
          useClass: FakeAiUsageService,
        },
      ],
    }).compileComponents();

    service = TestBed.inject(AiUsageService) as unknown as FakeAiUsageService;
    fixture = TestBed.createComponent(UsoComponent);
    component = fixture.componentInstance;
    component.from = '2026-05-01';
    component.to = '2026-05-21';
    fixture.detectChanges();
  });

  it('renders AI usage, AWS costs, and the selected refresh interval', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Uso y costos');
    expect(text).toContain('8');
    expect(text).toContain('USD 0.14');
    expect(text).toContain('USD 4.56');
    expect(text).toContain('998000 tokens disponibles');
    expect(text).toContain('6 hours');
    expect(text).toContain('Producción');
    expect(text).toContain('Testing');
    expect(text).toContain('Guarda archivos del sitio');
    expect(text).toContain('AWS Secrets Manager');
    expect(text).toContain('Amazon S3');
    expect(text).not.toContain('Investigación web');
    expect(text).toContain('El total principal se calcula');
  });

  it('updates the AWS cost refresh interval from the dashboard', () => {
    component.selectedInterval = '1 day';
    component.saveRefreshInterval();
    fixture.detectChanges();

    expect(service.updateCostRefreshIntervalCalls).toEqual(['1 day']);
    expect(component.selectedInterval).toBe('1 day');
  });

  it('runs a manual AWS cost refresh for the selected date range', () => {
    component.refreshAwsCosts();
    fixture.detectChanges();

    expect(service.refreshCalls).toEqual([
      { from: '2026-05-01', to: '2026-05-21' },
    ]);
    expect(component.awsCost?.status).toBe('refreshed');
  });
});
