import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiUsageService } from '../../../services/ai-usage.service';
import { AiAssistantPanelComponent } from './ai-assistant-panel.component';

class FakeAiUsageService {
  getModelCatalog() {
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssistantPanelComponent],
      providers: [{ provide: AiUsageService, useClass: FakeAiUsageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AiAssistantPanelComponent);
    component = fixture.componentInstance;
    component.surface = 'blog';
    component.context = { title: 'Contrato mercantil' };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders Bedrock model costs and monthly token usage', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Asistente IA');
    expect(text).toContain('Amazon Nova Micro');
    expect(text).toContain('Tokens mensuales');
    expect(text).toContain('2,000 de 15,000,000');
    expect(text).toContain('tope aprox.');
    expect(text).not.toContain('Investigación en internet');
  });

  it('generates and displays an editable suggestion with cost', async () => {
    await component.generate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('USD 0.00');
    const textarea = fixture.nativeElement.querySelector(
      '.ai-assistant-panel__field--output textarea'
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Título sugerido');
    expect(component.outputText).toBe('Título sugerido');
  });
});
