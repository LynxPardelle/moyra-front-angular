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
  public webResearch = false;
  public outputText = '';
  public loading = false;
  public errorMessage = '';
  public statusMessage = '';
  public estimatedCostUsd = 0;

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

  get webResearchAvailable(): boolean {
    return this.catalog?.webSearch?.enabled === true;
  }

  async loadCatalog(): Promise<void> {
    try {
      this.catalog = (await firstValueFrom(this._aiUsageService.getModelCatalog())) || null;
      this.selectedModel = this.catalog?.defaultModel || this.catalog?.models[0]?.id || '';
      this.statusMessage = this.catalog?.notice || '';
      this.webResearch = this.webResearchAvailable ? this.webResearch : false;
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
          webResearch: this.webResearchAvailable ? this.webResearch : false,
          context: this.context,
        })
      );

      this.outputText = response?.outputText || '';
      this.estimatedCostUsd =
        (response?.usage?.estimatedModelCostUsd || 0) +
        (response?.usage?.estimatedWebSearchCostUsd || 0);
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'No se pudo generar la sugerencia.';
    } finally {
      this.loading = false;
    }
  }

  formatUsd(value: number | undefined): string {
    return `USD ${Number(value || 0).toFixed(2)}`;
  }
}
