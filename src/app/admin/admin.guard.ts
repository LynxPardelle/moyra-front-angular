import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AuthFacade } from '../store/auth/auth.facade';
import { AuthUiStore } from '../store/auth/auth-ui.store';
import { AuthSession, consumeAuthStorageFailureReason, createAuthSession } from '../store/auth/auth.storage';
import { ApiRuntime } from '../services/global';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {
  private readonly _authUiStore = inject(AuthUiStore);

  constructor(
    private _router: Router,
    private _authFacade: AuthFacade,
    private _userService: UserService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      return this.authorize(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authorize(state.url);
  }

  private authorize(url: string): Observable<boolean | UrlTree> {
    return this._authFacade.authStateOnceAfterHydration$().pipe(
      switchMap((authState) => {
        if (authState.isAuthenticated && authState.isAdmin) {
          this._authUiStore.clearDeniedAdminUrl();
          return of(true);
        }

        if (authState.isAuthenticated && authState.isLegalStaff) {
          return of(this.legalStaffDecision(url));
        }

        const authReason = consumeAuthStorageFailureReason();
        return this.tryRefreshSession().pipe(
          map((session) => {
            if (session?.role === 'ROLE_ADMIN') {
              this._authUiStore.clearDeniedAdminUrl();
              return true;
            }

            if (session?.role === 'ROLE_LEGAL_STAFF') {
              return this.legalStaffDecision(url);
            }

            return this.deniedAdminTree(url, authReason);
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

  private deniedAdminTree(url: string, authReason: string | null): UrlTree {
    this._authUiStore.markDeniedAdminUrl(url);
    return this._router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: url,
        ...(authReason ? { auth: authReason } : {}),
      },
    });
  }

  private legalStaffDecision(url: string): true | UrlTree {
    if (url.startsWith('/admin/casos')) {
      this._authUiStore.clearDeniedAdminUrl();
      return true;
    }

    return this._router.createUrlTree(['/admin/casos']);
  }
}
