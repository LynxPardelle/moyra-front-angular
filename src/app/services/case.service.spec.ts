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

  it('loads the admin cases operations summary from the private API', () => {
    service.getOperationsSummary().subscribe((response) => {
      expect(response.item.files.pendingExternalReview).toBe(1);
      expect(response.item.notifications.webPush['failed']).toBe(2);
    });

    const req = http.expectOne(apiUrl('/case-operations/summary'));
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(storeToken);
    req.flush({
      status: 'success',
      item: {
        generatedAt: '2026-06-18T20:00:00.000Z',
        cases: { total: 2, active: 1, archived: 1 },
        files: {
          total: 3,
          pendingUpload: 0,
          pendingExternalReview: 1,
        },
        notifications: {
          total: 2,
          email: { skipped: 2 },
          webPush: { failed: 2 },
        },
        queues: {
          staleUploads: [],
          pendingExternalFiles: [],
          pendingInvites: [],
        },
        recentAuditEvents: [],
      },
    });
  });

  it('creates private case entries without forwarding public SEO fields', () => {
    service
      .createEntry('case-1', {
        title: 'Actualización privada',
        text: '<p>Contenido para el cliente</p>',
        visibility: 'case_members',
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
      visibility: { mode: 'case_members' },
    });
    req.flush({
      status: 'success',
      item: { id: 'entry-1', caseId: 'case-1', title: 'Actualización privada' },
    });
  });

  it('normalizes internal visibility strings before sending private content to the API', () => {
    service
      .createEntry('case-1', {
        title: 'Nota interna',
        text: '<p>No visible para cliente</p>',
        visibility: 'internal_only',
      })
      .subscribe();

    const req = http.expectOne(apiUrl('/cases/case-1/entries'));
    expect(req.request.body.visibility).toEqual({ mode: 'internal_only' });
    req.flush({
      status: 'success',
      item: { id: 'entry-1', caseId: 'case-1', title: 'Nota interna' },
    });
  });

  it('maps status, member, file, and notification calls to the private API contract', () => {
    service
      .createCaseType({
        name: 'Litigio',
        description: 'Casos judiciales',
        active: true,
        statuses: [{ label: 'En revisión', color: '#334155', active: true, isDefault: true }],
      })
      .subscribe();
    service
      .updateCaseType('type-1', {
        name: 'Litigio actualizado',
        statuses: [{ id: 'status-1', label: 'Activo', active: true }],
      })
      .subscribe();
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
    service.removeMember('case-1', 'membership-1').subscribe();
    service.presignCaseFile('case-1', {
      fileName: 'evidencia.pdf',
      contentType: 'application/pdf',
      size: 2048,
    }).subscribe();
    service.createOneDriveLink('case-1', {
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibility: 'case_members',
    }).subscribe();
    service.updateFileVisibility('case-1', 'file-1', {
      externalVisibilityStatus: 'approved',
      visibility: 'case_members',
    }).subscribe();
    service.markNotificationRead('notification-1').subscribe();
    service.getUnreadNotificationCount().subscribe();
    service.markAllNotificationsRead().subscribe();

    const createCaseTypeReq = http.expectOne(apiUrl('/case-types'));
    expect(createCaseTypeReq.request.method).toBe('POST');
    expect(createCaseTypeReq.request.body.statuses[0].label).toBe('En revisión');
    createCaseTypeReq.flush({ status: 'success', item: {} });

    const updateCaseTypeReq = http.expectOne(apiUrl('/case-types/type-1'));
    expect(updateCaseTypeReq.request.method).toBe('PUT');
    expect(updateCaseTypeReq.request.body.statuses[0].label).toBe('Activo');
    updateCaseTypeReq.flush({ status: 'success', item: {} });

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

    const removeMemberReq = http.expectOne(apiUrl('/cases/case-1/members/membership-1'));
    expect(removeMemberReq.request.method).toBe('DELETE');
    removeMemberReq.flush({ status: 'success', item: {} });

    const presignReq = http.expectOne(apiUrl('/cases/case-1/files/presign'));
    expect(presignReq.request.method).toBe('POST');
    expect(presignReq.request.body.fileName).toBe('evidencia.pdf');
    presignReq.flush({ status: 'success', file: {}, upload: { method: 'PUT', url: 'signed' } });

    const oneDriveReq = http.expectOne(apiUrl('/cases/case-1/files/onedrive-link'));
    expect(oneDriveReq.request.method).toBe('POST');
    expect(oneDriveReq.request.body).toEqual({
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibility: { mode: 'case_members' },
    });
    oneDriveReq.flush({ status: 'success', item: {} });

    const visibilityReq = http.expectOne(apiUrl('/cases/case-1/files/file-1/visibility'));
    expect(visibilityReq.request.method).toBe('PUT');
    expect(visibilityReq.request.body.externalVisibilityStatus).toBe('approved');
    expect(visibilityReq.request.body.visibility).toEqual({ mode: 'case_members' });
    visibilityReq.flush({ status: 'success', item: {} });

    const notificationReq = http.expectOne(apiUrl('/case-notifications/notification-1/read'));
    expect(notificationReq.request.method).toBe('POST');
    notificationReq.flush({ status: 'success', item: {} });

    const unreadReq = http.expectOne(apiUrl('/case-notifications/unread-count'));
    expect(unreadReq.request.method).toBe('GET');
    unreadReq.flush({ status: 'success', count: 2 });

    const readAllReq = http.expectOne(apiUrl('/case-notifications/read-all'));
    expect(readAllReq.request.method).toBe('POST');
    readAllReq.flush({ status: 'success', updatedCount: 2 });
  });

  it('uploads a case file through presigned PUT and completes metadata without exposing raw S3 links', () => {
    const file = new File(['contenido'], 'evidencia.pdf', { type: 'application/pdf' });

    service.uploadCaseFile('case-1', file).subscribe((response) => {
      expect(response.item.id).toBe('file-1');
      expect(response.item.uploadStatus).toBe('uploaded');
    });

    const presignReq = http.expectOne(apiUrl('/cases/case-1/files/presign'));
    expect(presignReq.request.method).toBe('POST');
    expect(presignReq.request.body).toEqual({
      fileName: 'evidencia.pdf',
      contentType: 'application/pdf',
      size: file.size,
    });
    expect(presignReq.request.headers.get('Authorization')).toBe(storeToken);
    presignReq.flush({
      status: 'success',
      file: {
        id: 'file-1',
        caseId: 'case-1',
        fileName: 'evidencia.pdf',
        contentType: 'application/pdf',
        externalVisibilityStatus: 'pending',
        uploadStatus: 'pending_upload',
      },
      upload: {
        method: 'PUT',
        url: 'https://signed.example.test/case-upload',
        headers: {
          'content-type': 'application/pdf',
        },
      },
    });

    const uploadReq = http.expectOne('https://signed.example.test/case-upload');
    expect(uploadReq.request.method).toBe('PUT');
    expect(uploadReq.request.headers.get('Authorization')).toBeNull();
    expect(uploadReq.request.headers.get('content-type')).toBe('application/pdf');
    uploadReq.flush('', { status: 200, statusText: 'OK' });

    const completeReq = http.expectOne(apiUrl('/cases/case-1/files/complete'));
    expect(completeReq.request.method).toBe('POST');
    expect(completeReq.request.body).toEqual({ fileId: 'file-1' });
    completeReq.flush({
      status: 'success',
      item: {
        id: 'file-1',
        caseId: 'case-1',
        fileName: 'evidencia.pdf',
        contentType: 'application/pdf',
        externalVisibilityStatus: 'pending',
        uploadStatus: 'uploaded',
      },
    });
  });

  it('maps notification preferences and push subscription calls to private authenticated APIs', () => {
    service.getNotificationPreferences().subscribe((response) => {
      expect(response.item.email.available).toBeTrue();
    });
    service
      .updateNotificationPreferences({
        email: {
          enabled: true,
          entryCreated: true,
          commentCreated: false,
          fileVisibilityApproved: true,
          statusChanged: true,
        },
        webPush: { enabled: false },
      })
      .subscribe();
    service
      .registerPushSubscription({
        endpoint: 'https://push.example.test/endpoint',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        userAgent: 'Chrome',
      })
      .subscribe();
    service.deletePushSubscription('push-1').subscribe();

    const preferenceRequests = http.match(apiUrl('/case-notification-preferences'));
    const getPrefsReq = preferenceRequests.find((req) => req.request.method === 'GET')!;
    expect(getPrefsReq.request.method).toBe('GET');
    expect(getPrefsReq.request.headers.get('Authorization')).toBe(storeToken);
    getPrefsReq.flush({
      status: 'success',
      item: {
        id: 'client-1',
        email: {
          available: true,
          enabled: false,
          entryCreated: true,
          commentCreated: true,
          fileVisibilityApproved: true,
          statusChanged: true,
        },
        webPush: { available: false, enabled: false },
      },
    });

    const savePrefsReq = preferenceRequests.find((req) => req.request.method === 'PUT')!;
    expect(savePrefsReq.request.method).toBe('PUT');
    expect(savePrefsReq.request.body.email.commentCreated).toBeFalse();
    expect(savePrefsReq.request.body.webPush.enabled).toBeFalse();
    savePrefsReq.flush({ status: 'success', item: savePrefsReq.request.body });

    const pushCreateReq = http.expectOne(apiUrl('/case-push-subscriptions'));
    expect(pushCreateReq.request.method).toBe('POST');
    expect(pushCreateReq.request.body.endpoint).toBe('https://push.example.test/endpoint');
    expect(pushCreateReq.request.body.keys).toEqual({ p256dh: 'p256dh-key', auth: 'auth-key' });
    pushCreateReq.flush({
      status: 'success',
      item: {
        id: 'push-1',
        userId: 'client-1',
        endpointHash: 'hash',
        status: 'active',
      },
    });

    const pushDeleteReq = http.expectOne(apiUrl('/case-push-subscriptions/push-1'));
    expect(pushDeleteReq.request.method).toBe('DELETE');
    pushDeleteReq.flush({
      status: 'success',
      item: {
        id: 'push-1',
        userId: 'client-1',
        endpointHash: 'hash',
        status: 'disabled',
      },
    });
  });
});
