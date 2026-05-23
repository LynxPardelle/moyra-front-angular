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
      estimatedModelCostUsd: 0.14,
      averageCostPerRequestUsd: 0.0175,
      failedRequests: 1,
      webResearch: {
        totalRequests: 2,
        estimatedSearchCalls: 3,
        estimatedSearchCostUsd: 0.03,
        estimatedTotalCostUsd: 0.07,
      },
      bySurface: [
        { label: 'Blog', requests: 5, estimatedCostUsd: 0.09 },
        { label: 'Publicaciones', requests: 3, estimatedCostUsd: 0.05 },
      ],
    },
    awsCost: {
      status: 'cached',
      totalUsd: 4.56,
      previousMonthTotalUsd: 5.67,
      lastRefreshedAt: '2026-05-21T10:00:00.000Z',
      services: [
        { service: 'Lambda', amountUsd: 1.23 },
        { service: 'DynamoDB', amountUsd: 2.34 },
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
    expect(text).toContain('6 hours');
    expect(text).toContain('DynamoDB');
    expect(text).toContain('Los costos de AWS se muestran con caché');
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
