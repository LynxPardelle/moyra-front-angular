import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ModalModule } from 'ngx-bootstrap/modal';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { ArticleService } from './services/article.service';
import { MainService } from './services/main.service';
import { PublicationService } from './services/publication.service';
import { ServicioService } from './services/servicio.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    importProvidersFrom(ModalModule.forRoot()),
    ArticleService,
    MainService,
    PublicationService,
    ServicioService,
    UserService,
    WebService
  ]
};
