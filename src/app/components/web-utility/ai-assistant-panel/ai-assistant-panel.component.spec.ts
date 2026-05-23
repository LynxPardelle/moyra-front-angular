import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiUsageService } from '../../../services/ai-usage.service';
import { AiAssistantPanelComponent } from './ai-assistant-panel.component';

class FakeAiUsageService {
  getModelCatalog() {
    return of({
      defaultModel: 'ai21.jamba-1-5-mini-v1:0',
      models: [
        {
          id: 'ai21.jamba-1-5-mini-v1:0',
          label: 'AI21 Jamba 1.5 Mini',
          description: 'Contexto amplio.',
          inputUsdPerMillionTokens: 0.2,
          outputUsdPerMillionTokens: 0.4,
        },
      ],
      assistantEnabled: true,
      monthlyTokenBudget: 16666666,
    });
  }

  getAiUsage() {
    return of({
      totalRequests: 2,
      totalInputTokens: 1200,
      totalOutputTokens: 800,
      monthlyTokenBudget: 16666666,
      monthlyTokenRemaining: 16664666,
      monthlyTokenBudgetEstimatedCostUsd: 5,
      monthlyTokensUsedEstimatedCostUsd: 0.0003,
      monthlyTokenBudgetPricingNote: 'Aproximado con AI21 Jamba 1.5 Mini.',
    });
  }

  requestAssistance() {
    return of({
      status: 'success',
      requestId: 'usage-123',
      outputText: 'Título sugerido',
      model: 'ai21.jamba-1-5-mini-v1:0',
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
    expect(text).toContain('AI21 Jamba 1.5 Mini');
    expect(text).toContain('Tokens mensuales');
    expect(text).toContain('2,000 de 16,666,666');
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
