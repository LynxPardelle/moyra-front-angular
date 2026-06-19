import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'casos',
    renderMode: RenderMode.Client,
  },
  {
    path: 'casos/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'notificaciones',
    renderMode: RenderMode.Client,
  },
  {
    path: 'notificaciones/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
