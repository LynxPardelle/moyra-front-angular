import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { UserService } from '../../services/user.service';
import { ApiRuntime } from '../../services/global';
import { AuthFacade } from '../../store/auth/auth.facade';
import { AuthSession, createAuthSession } from '../../store/auth/auth.storage';
import { CasesFeatureService } from './cases-feature.service';

@Injectable({ providedIn: 'root' })
export class CasesGuard implements CanActivate {
  constructor(
    private _router: Router,
    private _authFacade: AuthFacade,
    private _userService: UserService,
    private _casesFeature: CasesFeatureService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.authorize(state.url);
  }

  authorize(url: string): Observable<boolean | UrlTree> {
    if (!this._casesFeature.isEnabled()) {
      return of(this._router.createUrlTree(['/'], { queryParams: { feature: 'cases' } }));
    }

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
              queryParams: {
                returnUrl: url,
              },
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
