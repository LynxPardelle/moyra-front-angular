import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState, authFeatureKey } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectAuthIdentity = createSelector(
  selectAuthState,
  (state) => state.identity
);

export const selectAuthToken = createSelector(
  selectAuthState,
  (state) => state.token
);

export const selectAuthHydrated = createSelector(
  selectAuthState,
  (state) => state.hydrated
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated
);

export const selectIsAdmin = createSelector(
  selectAuthState,
  (state) => state.isAdmin
);
