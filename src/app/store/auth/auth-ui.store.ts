import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

type AuthUiState = {
  deniedAdminUrl: string | null;
};

export const AuthUiStore = signalStore(
  { providedIn: 'root' },
  withState<AuthUiState>({
    deniedAdminUrl: null,
  }),
  withComputed(({ deniedAdminUrl }) => ({
    hasDeniedAdminUrl: computed(() => Boolean(deniedAdminUrl())),
  })),
  withMethods((store) => ({
    markDeniedAdminUrl(url: string): void {
      patchState(store, { deniedAdminUrl: url });
    },
    clearDeniedAdminUrl(): void {
      patchState(store, { deniedAdminUrl: null });
    },
  }))
);
