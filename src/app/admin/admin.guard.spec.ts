import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { AdminGuard } from './admin.guard';
import { AuthEffects } from '../store/auth/auth.effects';
import { authFeatureKey, authReducer } from '../store/auth/auth.reducer';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideStore({ [authFeatureKey]: authReducer }),
        provideEffects([AuthEffects]),
      ],
    });
    guard = TestBed.inject(AdminGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
