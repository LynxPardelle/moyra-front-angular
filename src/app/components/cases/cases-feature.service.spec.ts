import { TestBed } from '@angular/core/testing';

import {
  CASE_FEATURE_BROWSER_HOST,
  CASE_FEATURE_ENABLED_HOSTS,
  CasesFeatureService,
} from './cases-feature.service';

describe('CasesFeatureService', () => {
  function serviceFor(host: string, enabledHosts: string[]): CasesFeatureService {
    TestBed.configureTestingModule({
      providers: [
        CasesFeatureService,
        { provide: CASE_FEATURE_BROWSER_HOST, useValue: host },
        { provide: CASE_FEATURE_ENABLED_HOSTS, useValue: enabledHosts },
      ],
    });

    return TestBed.inject(CasesFeatureService);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('enables cases on approved rollout hosts even when the global flag stays false', () => {
    expect(serviceFor('test.moyra.org', ['test.moyra.org']).isEnabled()).toBeTrue();
  });

  it('keeps cases hidden on production hosts unless explicitly allowed', () => {
    expect(serviceFor('moyra.org', ['test.moyra.org']).isEnabled()).toBeFalse();
  });
});
