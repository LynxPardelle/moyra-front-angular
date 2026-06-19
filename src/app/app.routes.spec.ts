import { routes } from './app.routes';
import { CasesGuard } from './components/cases/cases.guard';
import { PublicationComponent } from './components/publication/publication/publication.component';
import { PublicationsComponent } from './components/publication/publications/publications.component';

function route(path: string) {
  return routes.find((item) => item.path === path);
}

describe('app routes privacy boundaries', () => {
  it('keeps public publication routes outside the private cases guard', () => {
    expect(route('publications')?.component).toBe(PublicationsComponent);
    expect(route('publications')?.canActivate).toBeUndefined();
    expect(route('publication/:id')?.component).toBe(PublicationComponent);
    expect(route('publication/:id')?.canActivate).toBeUndefined();
  });

  it('guards every private cases and notifications route with CasesGuard', () => {
    const privatePaths = [
      'casos',
      'casos/:caseId',
      'casos/:caseId/entrada/:entryId',
      'notificaciones',
      'notificaciones/preferencias',
    ];

    for (const path of privatePaths) {
      expect(route(path)?.canActivate).toEqual([CasesGuard]);
    }
  });
});
