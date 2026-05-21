import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { UserService } from '../../services/user.service';
import { AuthActions } from './auth.actions';
import {
  clearStoredAuthSession,
  persistAuthSession,
  readStoredAuthSession,
} from './auth.storage';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly userService = inject(UserService);

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

  readonly revokeServerSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logoutRequested),
      switchMap(() =>
        this.userService.logoutSession().pipe(
          map(() => AuthActions.loggedOut()),
          catchError(() => of(AuthActions.loggedOut()))
        )
      )
    )
  );
}
