import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';

import { ApiRuntime } from '../../services/global';
import { UserService } from '../../services/user.service';
import { AuthFacade } from './auth.facade';
import { createAuthSession } from './auth.storage';

const AUTH_REFRESH_ATTEMPTED = new HttpContextToken<boolean>(() => false);

export const authRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  if (shouldSkipRefresh(request)) {
    return next(request);
  }

  const userService = inject(UserService);
  const authFacade = inject(AuthFacade);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return userService.refreshSession().pipe(
        catchError(() => of(null)),
        switchMap((response: any) => {
          const session = createAuthSession(response?.user, response?.token);
          if (!session) {
            authFacade.logout();
            return throwError(() => error);
          }

          authFacade.setCredentials(session.identity, session.token);
          return next(
            request.clone({
              context: request.context.set(AUTH_REFRESH_ATTEMPTED, true),
              setHeaders: {
                Authorization: session.token,
              },
            })
          );
        })
      );
    })
  );
};

function shouldSkipRefresh(request: HttpRequest<unknown>): boolean {
  return (
    request.context.get(AUTH_REFRESH_ATTEMPTED) ||
    !request.url.startsWith(ApiRuntime.url) ||
    request.url.includes('/auth/')
  );
}
