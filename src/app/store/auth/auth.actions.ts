import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AuthSession } from './auth.storage';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Hydrate Requested': emptyProps(),
    Hydrated: props<{ session: AuthSession | null }>(),
    'Login Succeeded': props<{ identity: any; token: string }>(),
    'Logout Requested': emptyProps(),
    'Logged Out': emptyProps(),
  },
});
