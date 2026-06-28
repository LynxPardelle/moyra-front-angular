import { RenderMode } from '@angular/ssr';

import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  it('keeps private authenticated routes client-rendered so browser host and auth can decide access', () => {
    expect(routeMode('casos')).toBe(RenderMode.Client);
    expect(routeMode('casos/**')).toBe(RenderMode.Client);
    expect(routeMode('notificaciones')).toBe(RenderMode.Client);
    expect(routeMode('notificaciones/**')).toBe(RenderMode.Client);
    expect(routeMode('mi-perfil')).toBe(RenderMode.Client);
  });
});

function routeMode(path: string): RenderMode | undefined {
  return serverRoutes.find((route) => route.path === path)?.renderMode;
}
