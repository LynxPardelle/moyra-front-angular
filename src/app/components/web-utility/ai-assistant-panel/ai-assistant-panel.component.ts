import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  AiModelCatalog,
  AiModelInfo,
  AiUsageService,
} from '../../../services/ai-usage.service';

type AssistantAction = {
  value: string;
  label: string;
};

const ACTIONS_BY_SURFACE: Record<string, AssistantAction[]> = {
  blog: [
    { value: 'outline', label: 'Estructura del artículo' },
    { value: 'seo-metadata', label: 'SEO y descripción' },
    { value: 'faq', label: 'Preguntas frecuentes' },
    { value: 'rewrite', label: 'Reescritura clara' },
    { value: 'social-copy', label: 'Texto para redes' },
  ],
  publications: [
    { value: 'summary', label: 'Resumen claro' },
    { value: 'seo-metadata', label: 'SEO y descripción' },
    { value: 'faq', label: 'Preguntas frecuentes' },
    { value: 'rewrite', label: 'Reescritura clara' },
    { value: 'social-copy', label: 'Texto para compartir' },
  ],
  solutions: [
    { value: 'service-seo-rewrite', label: 'Mejorar solución' },
    { value: 'faq', label: 'Preguntas frecuentes' },
    { value: 'cta', label: 'Llamado a la acción' },
    { value: 'metadata', label: 'SEO de solución' },
  ],
  configurations: [
    { value: 'copy-polish', label: 'Pulir texto público' },
    { value: 'short-variant', label: 'Versión corta' },
    { value: 'long-variant', label: 'Versión amplia' },
    { value: 'metadata', label: 'SEO de página' },
  ],
};

@Component({
  selector: 'app-ai-assistant-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrls: ['./ai-assistant-panel.component.scss'],
})
export class AiAssistantPanelComponent implements OnInit {
  @Input() surface = 'blog';
  @Input() context: Record<string, unknown> = {};

  public catalog: AiModelCatalog | null = null;
  public selectedAction = '';
  public selectedModel = '';
  public instruction = '';
  public outputText = '';
  public loading = false;
  public errorMessage = '';
  public statusMessage = '';
  public estimatedCostUsd = 0;
  public monthlyTokenBudget = 0;
  public monthlyTokensUsed = 0;
  public monthlyTokenBudgetEstimatedCostUsd = 0;
  public monthlyTokensUsedEstimatedCostUsd = 0;
  public monthlyTokenBudgetPricingNote = '';

  constructor(private _aiUsageService: AiUsageService) {}

  ngOnInit(): void {
    this.selectedAction = this.actions[0]?.value || 'seo-metadata';
    void this.loadCatalog();
  }

  get actions(): AssistantAction[] {
    return ACTIONS_BY_SURFACE[this.surface] || ACTIONS_BY_SURFACE['blog'];
  }

  get selectedModelInfo(): AiModelInfo | undefined {
    return this.catalog?.models.find((model) => model.id === this.selectedModel);
  }

  get assistantEnabled(): boolean {
    return this.catalog?.assistantEnabled !== false;
  }

  get monthlyUsageText(): string {
    if (!this.monthlyTokenBudget) {
      return 'Uso mensual de tokens pendiente de cargar.';
    }

    return `${this.formatNumber(this.monthlyTokensUsed)} de ${this.formatNumber(
      this.monthlyTokenBudget
    )} tokens usados este mes.`;
  }

  get monthlyUsagePercent(): number {
    if (!this.monthlyTokenBudget) {
      return 0;
    }

    return Math.min(100, Math.round((this.monthlyTokensUsed / this.monthlyTokenBudget) * 100));
  }

  async loadCatalog(): Promise<void> {
    try {
      this.catalog = (await firstValueFrom(this._aiUsageService.getModelCatalog())) || null;
      this.selectedModel = this.catalog?.defaultModel || this.catalog?.models[0]?.id || '';
      this.statusMessage = this.catalog?.notice || '';
      this.monthlyTokenBudget = Number(this.catalog?.monthlyTokenBudget || 0);
      await this.loadMonthlyUsage();
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'No se pudo cargar el catálogo de modelos.';
    }
  }

  async generate(): Promise<void> {
    if (!this.selectedModel || !this.selectedAction) {
      return;
    }

    if (!this.assistantEnabled) {
      this.errorMessage =
        'El backend de IA todavía no está disponible en este ambiente. El catálogo mostrado es solo informativo.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this._aiUsageService.requestAssistance({
          surface: this.surface,
          action: this.selectedAction,
          model: this.selectedModel,
          instruction: this.instruction,
          webResearch: false,
          context: this.context,
        })
      );

      this.outputText = response?.outputText || '';
      this.estimatedCostUsd =
        (response?.usage?.estimatedModelCostUsd || 0) +
        (response?.usage?.estimatedWebSearchCostUsd || 0);
      await this.loadMonthlyUsage();
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'No se pudo generar la sugerencia.';
    } finally {
      this.loading = false;
    }
  }

  formatUsd(value: number | undefined): string {
    const amount = Math.abs(Number(value || 0)) <= 0.0000005 ? 0 : Number(value || 0);
    const decimals = amount > 0 && Math.abs(amount) < 0.01 ? 4 : 2;
    return `USD ${amount.toFixed(decimals)}`;
  }

  formatNumber(value: number | undefined): string {
    return Number(value || 0).toLocaleString('es-MX');
  }

  private async loadMonthlyUsage(): Promise<void> {
    try {
      const today = new Date();
      const usage = await firstValueFrom(
        this._aiUsageService.getAiUsage(
          this.toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
          this.toDateInput(today)
        )
      );
      this.monthlyTokensUsed =
        Number(usage?.totalInputTokens || 0) + Number(usage?.totalOutputTokens || 0);
      this.monthlyTokenBudget =
        Number(usage?.monthlyTokenBudget || 0) || this.monthlyTokenBudget;
      this.monthlyTokenBudgetEstimatedCostUsd = Number(
        usage?.monthlyTokenBudgetEstimatedCostUsd || 0
      );
      this.monthlyTokensUsedEstimatedCostUsd = Number(
        usage?.monthlyTokensUsedEstimatedCostUsd || usage?.estimatedModelCostUsd || 0
      );
      this.monthlyTokenBudgetPricingNote = usage?.monthlyTokenBudgetPricingNote || '';
    } catch {
      this.monthlyTokensUsed = 0;
    }
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
