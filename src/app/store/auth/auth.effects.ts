import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, tap } from 'rxjs';
import { AuthActions } from './auth.actions';
import {
  clearStoredAuthSession,
  persistAuthSession,
  readStoredAuthSession,
} from './auth.storage';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);

  readonly hydrate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.hydrateRequested),
      map(() => AuthActions.hydrated({ session: readStoredAuthSession() }))
    )
  );

  readonly persistLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSucceeded),
        tap(({ identity, token }) => {
          persistAuthSession(identity, token);
        })
      ),
    { dispatch: false }
  );

  readonly clearSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutRequested, AuthActions.loggedOut),
        tap(() => {
          clearStoredAuthSession();
        })
      ),
    { dispatch: false }
  );
}
