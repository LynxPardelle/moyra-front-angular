import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { apiUrl } from './global';
import { AuthFacade } from '../store/auth/auth.facade';
import { CaseService } from './case.service';

function validToken(): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    'cognito:groups': ['ROLE_ADMIN'],
  };
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encodedPayload}.signature`;
}

describe('CaseService', () => {
  let service: CaseService;
  let http: HttpTestingController;
  let storeToken: string | null;

  beforeEach(() => {
    storeToken = validToken();
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        CaseService,
        {
          provide: AuthFacade,
          useValue: {
            token: () => storeToken,
          },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CaseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('lists cases with the current NgRx auth token', () => {
    service.listCases().subscribe((response) => {
      expect(response.items.length).toBe(1);
      expect(response.items[0].title).toBe('Expediente corporativo');
    });

    const req = http.expectOne(apiUrl('/cases'));
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(storeToken);
    req.flush({
      status: 'success',
      items: [{ id: 'case-1', title: 'Expediente corporativo', active: true }],
      nextToken: null,
    });
  });

  it('creates private case entries without forwarding public SEO fields', () => {
    service
      .createEntry('case-1', {
        title: 'Actualización privada',
        text: '<p>Contenido para el cliente</p>',
        visibility: 'external_visible',
        seoTitle: 'No debe salir',
        slug: 'publico',
        published: true,
      } as any)
      .subscribe((response) => {
        expect(response.item.id).toBe('entry-1');
      });

    const req = http.expectOne(apiUrl('/cases/case-1/entries'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Actualización privada',
      text: '<p>Contenido para el cliente</p>',
      visibility: 'external_visible',
    });
    req.flush({
      status: 'success',
      item: { id: 'entry-1', caseId: 'case-1', title: 'Actualización privada' },
    });
  });

  it('maps status, member, file, and notification calls to the private API contract', () => {
    service.updateCaseStatus('case-1', { statusId: 'status-review' }).subscribe();
    service.inviteMember('case-1', {
      email: 'cliente@moyra.org',
      displayName: 'Cliente Moyra',
      rolePreset: 'client',
      permissions: ['case.read'],
    }).subscribe();
    service.updateMemberPermissions('case-1', 'membership-1', {
      permissions: ['case.read', 'case.comment'],
    }).subscribe();
    service.presignCaseFile('case-1', {
      fileName: 'evidencia.pdf',
      contentType: 'application/pdf',
      size: 2048,
    }).subscribe();
    service.updateFileVisibility('case-1', 'file-1', {
      externalVisibilityStatus: 'approved',
      visibility: 'external_visible',
    }).subscribe();
    service.markNotificationRead('notification-1').subscribe();

    const statusReq = http.expectOne(apiUrl('/cases/case-1/status'));
    expect(statusReq.request.method).toBe('PUT');
    expect(statusReq.request.body).toEqual({ statusId: 'status-review' });
    statusReq.flush({ status: 'success', item: {} });

    const inviteReq = http.expectOne(apiUrl('/cases/case-1/invites'));
    expect(inviteReq.request.method).toBe('POST');
    expect(inviteReq.request.body.email).toBe('cliente@moyra.org');
    inviteReq.flush({ status: 'success', item: {} });

    const permissionsReq = http.expectOne(
      apiUrl('/cases/case-1/members/membership-1/permissions')
    );
    expect(permissionsReq.request.method).toBe('PUT');
    expect(permissionsReq.request.body.permissions).toEqual(['case.read', 'case.comment']);
    permissionsReq.flush({ status: 'success', item: {} });

    const presignReq = http.expectOne(apiUrl('/cases/case-1/files/presign'));
    expect(presignReq.request.method).toBe('POST');
    expect(presignReq.request.body.fileName).toBe('evidencia.pdf');
    presignReq.flush({ status: 'success', file: {}, upload: { method: 'PUT', url: 'signed' } });

    const visibilityReq = http.expectOne(apiUrl('/cases/case-1/files/file-1/visibility'));
    expect(visibilityReq.request.method).toBe('PUT');
    expect(visibilityReq.request.body.externalVisibilityStatus).toBe('approved');
    visibilityReq.flush({ status: 'success', item: {} });

    const notificationReq = http.expectOne(apiUrl('/case-notifications/notification-1/read'));
    expect(notificationReq.request.method).toBe('POST');
    notificationReq.flush({ status: 'success', item: {} });
  });
});
