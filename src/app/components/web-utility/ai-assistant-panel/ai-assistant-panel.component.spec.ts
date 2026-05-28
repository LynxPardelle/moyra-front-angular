import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiUsageService } from '../../../services/ai-usage.service';
import { AiAssistantPanelComponent } from './ai-assistant-panel.component';

class FakeAiUsageService {
  getModelCatalogCalls = 0;
  getAiUsageCalls = 0;
  requestAssistanceCalls = 0;

  getModelCatalog() {
    this.getModelCatalogCalls += 1;
    return of({
      defaultModel: 'amazon.nova-micro-v1:0',
      models: [
        {
          id: 'amazon.nova-micro-v1:0',
          label: 'Amazon Nova Micro',
          description: 'Costo bajo.',
          inputUsdPerMillionTokens: 0.035,
          outputUsdPerMillionTokens: 0.14,
        },
      ],
      assistantEnabled: true,
      monthlyTokenBudget: 15000000,
    });
  }

  getAiUsage() {
    this.getAiUsageCalls += 1;
    return of({
      totalRequests: 2,
      totalInputTokens: 1200,
      totalOutputTokens: 800,
      monthlyTokenBudget: 15000000,
      monthlyTokenRemaining: 14998000,
      monthlyTokenBudgetEstimatedCostUsd: 1.31,
      monthlyTokensUsedEstimatedCostUsd: 0.0003,
      monthlyTokenBudgetPricingNote: 'Aproximado con Amazon Nova Micro.',
    });
  }

  requestAssistance() {
    this.requestAssistanceCalls += 1;
    return of({
      status: 'success',
      requestId: 'usage-123',
      outputText: 'Título sugerido',
      model: 'amazon.nova-micro-v1:0',
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        estimatedModelCostUsd: 0.0003,
      },
    });
  }
}

describe('AiAssistantPanelComponent', () => {
  let component: AiAssistantPanelComponent;
  let fixture: ComponentFixture<AiAssistantPanelComponent>;
  let aiUsageService: FakeAiUsageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssistantPanelComponent],
      providers: [{ provide: AiUsageService, useClass: FakeAiUsageService }],
    }).compileComponents();

    aiUsageService = TestBed.inject(AiUsageService) as unknown as FakeAiUsageService;
    fixture = TestBed.createComponent(AiAssistantPanelComponent);
    component = fixture.componentInstance;
    component.surface = 'blog';
    component.context = { title: 'Contrato mercantil' };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('hides the assistant while Bedrock quotas block usable generation', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Asistente IA');
    expect(fixture.nativeElement.querySelector('.ai-assistant-panel')).toBeNull();
    expect(aiUsageService.getModelCatalogCalls).toBe(0);
    expect(aiUsageService.getAiUsageCalls).toBe(0);
  });

  it('does not call the AI backend while the feature is hidden', async () => {
    await component.generate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(aiUsageService.requestAssistanceCalls).toBe(0);
    expect(component.outputText).toBe('');
  });
});
