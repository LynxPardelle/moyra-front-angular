import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AiUsageService,
  AiUsageSummary,
  AwsCostSummary,
  COST_REFRESH_INTERVALS,
  CostRefreshInterval,
} from '../services/ai-usage.service';

@Component({
  selector: 'admin-uso',
  imports: [CommonModule, FormsModule],
  templateUrl: './uso.component.html',
  styleUrls: ['./uso.component.scss'],
})
export class UsoComponent implements OnInit {
  public readonly intervals = COST_REFRESH_INTERVALS;

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

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const dashboard = await this._aiUsageService
        .getDashboard(this.from, this.to)
        .toPromise();
      this.usage = dashboard?.usage || null;
      this.awsCost = dashboard?.awsCost || null;
      this.selectedInterval = dashboard?.settings?.awsCostRefreshInterval || '6 hours';
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message ||
        error?.message ||
        'No se pudo cargar el dashboard de uso.';
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
        error?.error?.message ||
        error?.message ||
        'No se pudo actualizar el intervalo de costos.';
    } finally {
      this.savingInterval = false;
    }
  }

  async refreshAwsCosts(): Promise<void> {
    this.refreshingCosts = true;
    this.errorMessage = '';

    try {
      const awsCost = await this._aiUsageService
        .refreshAwsCosts(this.from, this.to)
        .toPromise();
      this.awsCost = awsCost || this.awsCost;
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message ||
        error?.message ||
        'No se pudo refrescar Cost Explorer.';
    } finally {
      this.refreshingCosts = false;
    }
  }

  get billableServices() {
    return (this.awsCost?.services || []).filter((service) => {
      return Math.abs(Number(service.amountUsd || 0)) >= 0.005;
    });
  }

  get computedServices() {
    return (this.awsCost?.computedServices || []).filter((service) => {
      return Math.abs(Number(service.amountUsd || 0)) >= 0.005;
    });
  }

  formatUsd(value: number | undefined): string {
    const amount = Math.abs(Number(value || 0)) < 0.005 ? 0 : Number(value || 0);
    return `USD ${amount.toFixed(2)}`;
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
