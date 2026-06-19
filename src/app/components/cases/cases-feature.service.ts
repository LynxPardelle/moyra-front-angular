import { Inject, Injectable, InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

export const CASE_FEATURE_BROWSER_HOST = new InjectionToken<string>(
  'CASE_FEATURE_BROWSER_HOST',
  {
    providedIn: 'root',
    factory: () => (typeof window === 'undefined' ? '' : window.location.hostname),
  }
);

export const CASE_FEATURE_ENABLED_HOSTS = new InjectionToken<string[]>(
  'CASE_FEATURE_ENABLED_HOSTS',
  {
    providedIn: 'root',
    factory: () => environment.caseFeatureEnabledHosts || [],
  }
);

@Injectable({ providedIn: 'root' })
export class CasesFeatureService {
  constructor(
    @Inject(CASE_FEATURE_BROWSER_HOST) private _host: string,
    @Inject(CASE_FEATURE_ENABLED_HOSTS) private _enabledHosts: string[]
  ) {}

  isEnabled(): boolean {
    return (
      environment.casesFeatureEnabled === true ||
      this._enabledHosts.includes(this._host)
    );
  }
}
