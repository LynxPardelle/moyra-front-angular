import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthFacade } from '../store/auth/auth.facade';
import { AuthUiStore } from '../store/auth/auth-ui.store';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {
  private readonly _authUiStore = inject(AuthUiStore);

  constructor(
    private _router: Router,
    private _authFacade: AuthFacade
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
      map((authState) => {
        if (authState.isAuthenticated && authState.isAdmin) {
          this._authUiStore.clearDeniedAdminUrl();
          return true;
        }

        this._authUiStore.markDeniedAdminUrl(url);
        return this._router.createUrlTree(['/login'], {
          queryParams: { returnUrl: url },
        });
      })
    );
  }
}
