import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { ApiRuntime } from '../../services/global';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';
import { AuthSession, createAuthSession } from '../../store/auth/auth.storage';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private _router: Router,
    private _authFacade: AuthFacade,
    private _userService: UserService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this._authFacade.authStateOnceAfterHydration$().pipe(
      switchMap((authState) => {
        if (authState.isAuthenticated) {
          return of(true);
        }

        return this.tryRefreshSession().pipe(
          map((session) => {
            if (session) {
              return true;
            }

            return this._router.createUrlTree(['/login'], {
              queryParams: { returnUrl: state.url },
            });
          })
        );
      })
    );
  }

  private tryRefreshSession(): Observable<AuthSession | null> {
    if (!ApiRuntime.isV2) {
      return of(null);
    }

    return this._userService.refreshSession().pipe(
      map((response: any) => {
        const session = createAuthSession(response?.user, response?.token);
        if (!session) {
          return null;
        }

        this._authFacade.setCredentials(session.identity, session.token);
        return session;
      }),
      catchError(() => of(null))
    );
  }
}
