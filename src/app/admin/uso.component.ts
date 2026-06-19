import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AiUsageService,
  AiUsageSummary,
  AwsCostSummary,
  COST_REFRESH_INTERVAL_LABELS,
  COST_REFRESH_INTERVALS,
  CostRefreshInterval,
} from '../services/ai-usage.service';

// Hidden while the public/admin AI assistant remains disabled by Bedrock quota limits.
// Keep the cost dashboard operational without calling AI usage endpoints.
export const AI_USAGE_DASHBOARD_FEATURE_ENABLED = false;

@Component({
  selector: 'admin-uso',
  imports: [FormsModule],
  templateUrl: './uso.component.html',
  styleUrls: ['./uso.component.scss'],
})
export class UsoComponent implements OnInit {
  public readonly intervals = COST_REFRESH_INTERVALS;
  public readonly intervalLabels = COST_REFRESH_INTERVAL_LABELS;
  public readonly aiUsageEnabled = AI_USAGE_DASHBOARD_FEATURE_ENABLED;

  public from = '';
  public to = '';
  public selectedInterval: CostRefreshInterval = '6 hours';
  public usage: AiUsageSummary | null = null;
  public awsCost: AwsCostSummary | null = null;
  public loading = true;
  public savingInterval = false;
  public refreshingCosts = false;
  public errorMessage = '';

  constructor(private _aiUsageService: AiUsageService) {
    const today = new Date();
    this.to = this.toDateInput(today);
    this.from = this.toDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  ngOnInit(): void {
    void this.loadDashboard();
  }

  get hasDashboardData(): boolean {
    return Boolean(this.usage || this.awsCost);
  }

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.usage = null;
    this.awsCost = null;

    try {
      const dashboard = this.aiUsageEnabled
        ? await this._aiUsageService.getDashboard(this.from, this.to).toPromise()
        : await this._aiUsageService.getCostDashboard(this.from, this.to).toPromise();
      this.usage = this.aiUsageEnabled ? (dashboard as any)?.usage || null : null;
      this.awsCost = dashboard?.awsCost || null;
      this.selectedInterval = dashboard?.settings?.awsCostRefreshInterval || '6 hours';
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'No se pudo cargar el dashboard de uso.';
    } finally {
      this.loading = false;
    }
  }

  async saveRefreshInterval(): Promise<void> {
    this.savingInterval = true;
    this.errorMessage = '';

    try {
      const settings = await this._aiUsageService
        .updateCostRefreshInterval(this.selectedInterval)
        .toPromise();
      this.selectedInterval = settings?.awsCostRefreshInterval || this.selectedInterval;
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'No se pudo actualizar el intervalo de costos.';
    } finally {
      this.savingInterval = false;
    }
  }

  async refreshAwsCosts(): Promise<void> {
    this.refreshingCosts = true;
    this.errorMessage = '';

    try {
      const awsCost = await this._aiUsageService.refreshAwsCosts(this.from, this.to).toPromise();
      this.awsCost = awsCost || this.awsCost;
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'No se pudo refrescar Cost Explorer.';
    } finally {
      this.refreshingCosts = false;
    }
  }

  get billableServices() {
    return (this.awsCost?.services || []).filter((service) => {
      return Math.abs(Number(service.amountUsd || 0)) > 0.0000005;
    });
  }

  get computedServices() {
    return (this.awsCost?.computedServices || []).filter((service) => {
      return Math.abs(Number(service.amountUsd || 0)) > 0.0000005;
    });
  }

  get computedEnvironments() {
    return (this.awsCost?.computedEnvironments || []).filter((environment) => {
      return Math.abs(Number(environment.totalUsd || 0)) > 0.0000005;
    });
  }

  get usedTokenCost(): number {
    return (
      Number(this.usage?.monthlyTokensUsedEstimatedCostUsd) ||
      Number(this.usage?.estimatedModelCostUsd) ||
      0
    );
  }

  formatUsd(value: number | undefined): string {
    const rawAmount = Number(value || 0);
    if (rawAmount > 0 && rawAmount < 0.0001) {
      return '< USD 0.0001';
    }
    const amount = Math.abs(rawAmount) < 0.00005 ? 0 : rawAmount;
    const decimals = amount > 0 && Math.abs(amount) < 0.01 ? 4 : 2;
    return `USD ${amount.toFixed(decimals)}`;
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
