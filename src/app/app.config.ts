import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { IMAGE_CONFIG } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ModalModule } from 'ngx-bootstrap/modal';
import { provideQuillConfig } from 'ngx-quill/config';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { ArticleService } from './services/article.service';
import { FileService } from './services/file.service';
import { MainService } from './services/main.service';
import { PublicationService } from './services/publication.service';
import { ServicioService } from './services/servicio.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { AuthEffects } from './store/auth/auth.effects';
import { authRefreshInterceptor } from './store/auth/auth-refresh.interceptor';
import { authFeatureKey, authReducer } from './store/auth/auth.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    ...(environment.caseServiceWorkerEnabled
      ? [
          provideServiceWorker('ngsw-worker.js', {
            enabled: environment.production,
            registrationStrategy: 'registerWhenStable:30000',
          }),
        ]
      : []),
    provideHttpClient(withFetch(), withInterceptors([authRefreshInterceptor])),
    provideStore({ [authFeatureKey]: authReducer }),
    provideEffects([AuthEffects]),
    ...(environment.production
      ? []
      : [
          provideStoreDevtools({
            maxAge: 25,
            logOnly: environment.production,
          }),
        ]),
    provideQuillConfig({
      suppressGlobalRegisterWarning: true,
    }),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
      },
    },
    importProvidersFrom(ModalModule),
    ArticleService,
    FileService,
    MainService,
    PublicationService,
    ServicioService,
    UserService,
    WebService,
  ],
};
