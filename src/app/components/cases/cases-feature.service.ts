import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CasesFeatureService {
  isEnabled(): boolean {
    return environment.casesFeatureEnabled === true;
  }
}
