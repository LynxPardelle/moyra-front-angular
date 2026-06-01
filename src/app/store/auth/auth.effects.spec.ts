import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';

import { UserService } from '../../services/user.service';
import { AuthActions } from './auth.actions';
import { AuthEffects } from './auth.effects';

describe('AuthEffects', () => {
  let actions$: Observable<any>;
  let effects: AuthEffects;
  let router: jasmine.SpyObj<Router>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    userService = jasmine.createSpyObj<UserService>('UserService', ['logoutSession']);
    userService.logoutSession.and.returnValue(of({ status: 'ok' }));

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService },
      ],
    });

    effects = TestBed.inject(AuthEffects);
  });

  it('navigates to login after server logout completes', (done) => {
    actions$ = of(AuthActions.logoutRequested());

    effects.revokeServerSession$.subscribe((action) => {
      expect(action).toEqual(AuthActions.loggedOut());
      expect(userService.logoutSession).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { auth: 'loggedout' },
      });
      done();
    });
  });
});
