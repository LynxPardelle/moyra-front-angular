import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthRole, createAuthSession } from './auth.storage';

export const authFeatureKey = 'auth';

export type AuthState = {
  identity: any | null;
  token: string | null;
  role: AuthRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLegalStaff: boolean;
  hydrated: boolean;
  expiresAt: number | null;
};

export const initialAuthState: AuthState = {
  identity: null,
  token: null,
  role: 'ROLE_USER',
  isAuthenticated: false,
  isAdmin: false,
  isLegalStaff: false,
  hydrated: false,
  expiresAt: null,
};

export const authReducer = createReducer(
  initialAuthState,
  on(AuthActions.hydrated, (_state, { session }) => stateFromSession(session, true)),
  on(AuthActions.loginSucceeded, (_state, { identity, token }) =>
    stateFromSession(createAuthSession(identity, token), true)
  ),
  on(AuthActions.logoutRequested, () => stateFromSession(null, true)),
  on(AuthActions.loggedOut, () => stateFromSession(null, true))
);

function stateFromSession(
  session: ReturnType<typeof createAuthSession>,
  hydrated: boolean
): AuthState {
  if (!session) {
    return {
      ...initialAuthState,
      hydrated,
    };
  }

  return {
    identity: session.identity,
    token: session.token,
    role: session.role,
    isAuthenticated: true,
    isAdmin: session.role === 'ROLE_ADMIN',
    isLegalStaff: session.role === 'ROLE_LEGAL_STAFF',
    hydrated,
    expiresAt: session.expiresAt,
  };
}
