import { Routes } from '@angular/router';

/* MainComponents */
import { HomeComponent } from './components/main/home/home.component';
import { WeComponent } from './components/main/we/we.component';
import { ErrorComponent } from './components/main/error/error.component';

/* Admin */
import { AdminComponent } from './admin/admin.component';
import { AdminModule } from './admin/admin.module';

/* PublicationComponents */
import { PublicationsComponent } from './components/publication/publications/publications.component';
import { PublicationComponent } from './components/publication/publication/publication.component';

/* Servicios */
import { ServiciosComponent } from './components/servicio/servicios/servicios.component';
import { ServicioComponent } from './components/servicio/servicio/servicio.component';

/* Blog */
import { BlogComponent } from './components/blog/blog/blog.component';
import { ArticleComponent } from './components/blog/article/article.component';

/* Casos */
import { CasesGuard } from './components/cases/cases.guard';

/* User */
import { ChangePasswordComponent } from './components/user/change-password/change-password.component';
import { AuthGuard } from './components/user/auth.guard';
import { LoginComponent } from './components/user/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'inicio', component: HomeComponent },

  // Admin
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.module').then(
        (adminModule) => adminModule.AdminModule
      ),
  },

  // Main
  { path: 'we', component: WeComponent },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./components/legal/contact.component').then((module) => module.ContactComponent),
  },
  {
    path: 'aviso-de-privacidad',
    loadComponent: () =>
      import('./components/legal/privacy-notice.component').then(
        (module) => module.PrivacyNoticeComponent
      ),
  },
  { path: 'privacidad', redirectTo: 'aviso-de-privacidad', pathMatch: 'full' },

  // Publication
  { path: 'publications', component: PublicationsComponent },
  { path: 'publications/:page', component: PublicationsComponent },
  { path: 'publications/:search', component: PublicationsComponent },
  { path: 'publications/:search/:page', component: PublicationsComponent },
  { path: 'publication', component: PublicationComponent },
  { path: 'publication/:id', component: PublicationComponent },

  // Servicio
  { path: 'soluciones', component: ServiciosComponent },
  { path: 'soluciones/:page', component: ServiciosComponent },
  { path: 'soluciones/:search', component: ServiciosComponent },
  { path: 'soluciones/:search/:page', component: ServiciosComponent },
  { path: 'solucion', component: ServicioComponent },
  { path: 'solucion/:id', component: ServicioComponent },

  // Blog
  { path: 'blog', component: BlogComponent },
  { path: 'blog/:page', component: BlogComponent },
  { path: 'blog/:search', component: BlogComponent },
  { path: 'blog/:search/:page', component: BlogComponent },
  { path: 'articulo', component: ArticleComponent },
  { path: 'articulo/:id', component: ArticleComponent },

  // Casos
  {
    path: 'casos',
    loadComponent: () =>
      import('./components/cases/cases-list.component').then(
        (module) => module.CasesListComponent
      ),
    canActivate: [CasesGuard],
  },
  {
    path: 'casos/:caseId',
    loadComponent: () =>
      import('./components/cases/case-detail.component').then(
        (module) => module.CaseDetailComponent
      ),
    canActivate: [CasesGuard],
  },
  {
    path: 'casos/:caseId/entrada/:entryId',
    loadComponent: () =>
      import('./components/cases/case-entry-detail.component').then(
        (module) => module.CaseEntryDetailComponent
      ),
    canActivate: [CasesGuard],
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./components/notifications/notification-center.component').then(
        (module) => module.NotificationCenterComponent
      ),
    canActivate: [CasesGuard],
  },
  {
    path: 'notificaciones/preferencias',
    loadComponent: () =>
      import('./components/notifications/notification-preferences.component').then(
        (module) => module.NotificationPreferencesComponent
      ),
    canActivate: [CasesGuard],
  },

  // User
  { path: 'login', component: LoginComponent },
  { path: 'cambiar-contrasena', component: ChangePasswordComponent },
  {
    path: 'mi-perfil',
    loadComponent: () =>
      import('./admin/users/admin-user-profile.component').then(
        (module) => module.AdminUserProfileComponent
      ),
    canActivate: [AuthGuard],
  },

  // Error
  { path: '**', component: ErrorComponent },
];
