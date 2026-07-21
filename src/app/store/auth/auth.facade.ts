import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, filter, take } from 'rxjs';
import { AuthActions } from './auth.actions';
import { AuthState } from './auth.reducer';
import {
  selectAuthHydrated,
  selectAuthIdentity,
  selectAuthState,
  selectAuthToken,
  selectIsAdmin,
  selectIsAuthenticated,
  selectIsLegalStaff,
} from './auth.selectors';

@Injectable({
  providedIn: 'root',
})
export class AuthFacade {
  private readonly store = inject(Store);

  readonly state$ = this.store.select(selectAuthState);
  readonly identity = this.store.selectSignal(selectAuthIdentity);
  readonly token = this.store.selectSignal(selectAuthToken);
  readonly hydrated = this.store.selectSignal(selectAuthHydrated);
  readonly isAuthenticated = this.store.selectSignal(selectIsAuthenticated);
  readonly isAdmin = this.store.selectSignal(selectIsAdmin);
  readonly isLegalStaff = this.store.selectSignal(selectIsLegalStaff);

  hydrate(): void {
    this.store.dispatch(AuthActions.hydrateRequested());
  }

  hydratedOnce$(): Observable<boolean> {
    if (!this.hydrated()) {
      this.hydrate();
    }

    return this.store.select(selectAuthHydrated).pipe(
      filter(Boolean),
      take(1)
    );
  }

  setCredentials(identity: any, token: string): void {
    this.store.dispatch(AuthActions.loginSucceeded({ identity, token }));
  }

  logout(): void {
    this.store.dispatch(AuthActions.logoutRequested());
  }

  authStateOnceAfterHydration$(): Observable<AuthState> {
    if (!this.hydrated()) {
      this.hydrate();
    }

    return this.state$.pipe(
      filter((state) => state.hydrated),
      take(1)
    );
  }
}
