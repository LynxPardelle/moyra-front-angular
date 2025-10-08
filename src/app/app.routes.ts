import { Routes } from '@angular/router';

/* MainComponents */
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

/* User */
import { LoginComponent } from './components/user/login/login.component';

export const routes: Routes = [
  { path: '', component: WeComponent },
  { path: 'inicio', component: WeComponent },

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

  // User
  { path: 'login', component: LoginComponent },

  // Error
  { path: '**', component: ErrorComponent },
];
