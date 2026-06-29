import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CaseDetailComponent } from './case-detail.component';
import { CaseService } from '../../services/case.service';
import { MainService } from '../../services/main.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('CaseDetailComponent', () => {
  let fixture: ComponentFixture<CaseDetailComponent>;
  let createCommentSpy: jasmine.Spy;
  let createOneDriveLinkSpy: jasmine.Spy;
  let markNotificationReadSpy: jasmine.Spy;
  let permissions: string[];
  let linkFails: boolean;
  let identity: { id: string; email: string };
  let isAdmin: boolean;

  beforeEach(async () => {
    permissions = ['case.read', 'case.comment', 'case.upload_file', 'case.download_file'];
    linkFails = false;
    identity = { id: 'client-1', email: 'cliente@moyra.org' };
    isAdmin = false;
    createCommentSpy = jasmine.createSpy('createComment').and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'comment-new',
          caseId: 'case-1',
          entryId: 'entry-1',
          text: 'Comentario enviado',
          visibility: { mode: 'case_members' },
        },
      })
    );
    createOneDriveLinkSpy = jasmine.createSpy('createOneDriveLink').and.callFake(() =>
      linkFails
        ? throwError(() => new Error('falló enlace'))
        : of({
            status: 'success',
            item: {
              id: 'file-link-new',
              caseId: 'case-1',
              entryId: 'entry-1',
              fileName: 'Contrato firmado',
              contentType: 'text/uri-list',
              storageProvider: 'onedrive',
              linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
              externalVisibilityStatus: 'approved',
              uploadStatus: 'linked',
              uploadedByUserId: 'client-1',
              visibility: { mode: 'case_members' },
            },
          })
    );
    markNotificationReadSpy = jasmine.createSpy('markNotificationRead').and.callFake((id: string) =>
      of({
        status: 'success',
        item: {
          id,
          recipientUserId: 'client-1',
          caseId: 'case-1',
          eventType: 'case.entry.created',
          targetType: 'case-entry',
          targetId: 'entry-1',
          title: 'Nueva actualización',
          body: 'Hay una actualización nueva.',
          link: { path: '/casos/case-1?entryId=entry-1' },
          readAt: '2026-06-26T20:10:00.000Z',
          delivery: {
            inApp: { status: 'created' },
            email: { status: 'skipped' },
            webPush: { status: 'skipped' },
          },
        },
      })
    );

    await TestBed.configureTestingModule({
      imports: [CaseDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'caseId' ? 'case-1' : null),
              },
            },
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            identity: () => identity,
            isAdmin: () => isAdmin,
          },
        },
        {
          provide: MainService,
          useValue: {
            getMain: () =>
              of({
                main: {
                  pageTexts: {
                    casesListTitle: 'Expedientes',
                    casesNotificationsButtonLabel: 'Avisos',
                  },
                },
              }),
          },
        },
        {
          provide: CaseService,
          useValue: {
            getCase: () =>
              of({
                status: 'success',
                item: {
                  id: 'case-1',
                  title: 'Contrato corporativo',
                  reference: 'MRA-001',
                  description: '<p>Descripción visible para el cliente</p>',
                  caseTypeId: 'corporate',
                  statusId: 'review',
                  updatedAt: '2026-06-26T20:00:00.000Z',
                },
              }),
            listEntries: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'entry-1',
                    caseId: 'case-1',
                    title: 'Actualización visible',
                    text: '<p>Texto para cliente</p>',
                    visibility: { mode: 'case_members' },
                    commentPolicy: { read: 'case_members', write: 'case_members' },
                    authorUserId: 'admin-1',
                    authorDisplayName: 'Administrador',
                    createdAt: '2026-06-26T19:00:00.000Z',
                  },
                  {
                    id: 'entry-internal',
                    caseId: 'case-1',
                    title: 'Nota interna',
                    text: '<p>No debe verse</p>',
                    visibility: { mode: 'internal_only' },
                  },
                ],
              }),
            listComments: (_caseId: string, entryId: string) =>
              of({
                status: 'success',
                items:
                  entryId === 'entry-1'
                    ? [
                        {
                          id: 'comment-1',
                          caseId: 'case-1',
                          entryId,
                          text: 'Comentario visible',
                          authorUserId: 'client-1',
                          authorDisplayName: 'Cliente',
                          createdAt: '2026-06-26T20:00:00.000Z',
                          visibility: { mode: 'case_members' },
                        },
                        {
                          id: 'comment-internal',
                          caseId: 'case-1',
                          entryId,
                          text: 'Comentario interno',
                          visibility: { mode: 'internal_only' },
                        },
                      ]
                    : [],
              }),
            listFiles: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'file-approved',
                    caseId: 'case-1',
                    fileName: 'aprobado.pdf',
                    entryId: 'entry-1',
                    contentType: 'application/pdf',
                    externalVisibilityStatus: 'approved',
                    uploadStatus: 'uploaded',
                    visibility: { mode: 'case_members' },
                  },
                  {
                    id: 'file-own-pending',
                    caseId: 'case-1',
                    fileName: 'mi-envio.pdf',
                    entryId: 'entry-1',
                    contentType: 'application/pdf',
                    externalVisibilityStatus: 'pending',
                    uploadStatus: 'uploaded',
                    uploadedByUserId: 'client-1',
                    visibility: { mode: 'case_members' },
                  },
                  {
                    id: 'file-own-zip',
                    caseId: 'case-1',
                    fileName: 'mi-envio.zip',
                    entryId: 'entry-1',
                    contentType: 'application/zip',
                    externalVisibilityStatus: 'pending',
                    uploadStatus: 'uploaded',
                    uploadedByUserId: 'client-1',
                    visibility: { mode: 'case_members' },
                  },
                  {
                    id: 'file-onedrive',
                    caseId: 'case-1',
                    fileName: 'Poder firmado',
                    entryId: 'entry-1',
                    contentType: 'text/uri-list',
                    storageProvider: 'onedrive',
                    externalVisibilityStatus: 'approved',
                    uploadStatus: 'linked',
                    visibility: { mode: 'case_members' },
                  },
                  {
                    id: 'file-other-pending',
                    caseId: 'case-1',
                    fileName: 'pendiente-otro.pdf',
                    entryId: 'entry-1',
                    contentType: 'application/pdf',
                    externalVisibilityStatus: 'pending',
                    uploadStatus: 'uploaded',
                    uploadedByUserId: 'client-2',
                    visibility: { mode: 'case_members' },
                  },
                ],
              }),
            listMembers: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'member-1',
                    caseId: 'case-1',
                    userId: 'client-1',
                    displayName: 'Cliente',
                    rolePreset: 'client',
                    permissions,
                    status: 'active',
                  },
                ],
              }),
            createComment: createCommentSpy,
            createOneDriveLink: createOneDriveLinkSpy,
            getUnreadNotificationCount: () => of({ status: 'success', count: 3 }),
            listNotifications: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'notification-auto',
                    recipientUserId: 'client-1',
                    caseId: 'case-1',
                    eventType: 'case.entry.created',
                    targetType: 'case-entry',
                    targetId: 'entry-1',
                    title: 'Nueva actualización',
                    body: 'Hay una actualización nueva.',
                    link: { path: '/casos/case-1?entryId=entry-1' },
                    delivery: {
                      inApp: { status: 'created' },
                      email: { status: 'skipped' },
                      webPush: { status: 'skipped' },
                    },
                  },
                  {
                    id: 'notification-manual',
                    recipientUserId: 'client-1',
                    caseId: 'case-1',
                    eventType: 'case.comment.created',
                    targetType: 'case-comment',
                    targetId: 'comment-1',
                    title: 'Comentario',
                    body: 'Hay un comentario nuevo.',
                    link: { path: '/casos/case-1?commentId=comment-1' },
                    manualUnreadAt: '2026-06-26T20:05:00.000Z',
                    delivery: {
                      inApp: { status: 'created' },
                      email: { status: 'skipped' },
                      webPush: { status: 'skipped' },
                    },
                  },
                ],
                nextToken: null,
              }),
            markNotificationRead: markNotificationReadSpy,
          },
        },
      ],
    }).compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(CaseDetailComponent);
    fixture.detectChanges();
  }

  function expandEntry(entryId = 'entry-1', expandComments = true): void {
    fixture.componentInstance.toggleEntry(entryId);
    if (expandComments) {
      fixture.componentInstance.toggleComments(entryId);
    }
    fixture.detectChanges();
  }

  it('renders visible timeline, comments, and documents without public SEO routes', () => {
    render();
    expandEntry();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';

    expect(text).toContain('Contrato corporativo');
    expect(text).toContain('Descripción visible para el cliente');
    expect(text).toContain('Última actividad');
    expect(text).toContain('Actualización visible');
    expect(text).toContain('Texto para cliente');
    expect(text).toContain('Comentario visible');
    expect(text).toContain('Cliente · Cliente');
    expect(text).toContain('26 jun 2026');
    expect(text).not.toContain('Nota interna');
    expect(text).not.toContain('Comentario interno');
    expect(text).toContain('aprobado.pdf');
    expect(text).toContain('mi-envio.pdf');
    expect(text).toContain('mi-envio.zip');
    expect(text).toContain('Poder firmado');
    expect(text).toContain('Avisos');
    expect(text).toContain('En revisión interna');
    expect(text).not.toContain('pendiente-otro.pdf');
    expect(compiled.querySelector('a[href*="file-own-zip"]')).not.toBeNull();
    expect(compiled.querySelector('a[href*="/publication"]')).toBeNull();
  });

  it('labels comment inputs and keeps long entry titles as wrapping text links', () => {
    render();
    expandEntry();

    const compiled = fixture.nativeElement as HTMLElement;
    const commentEditor = compiled.querySelector('app-rich-text-editor') as HTMLElement | null;
    const commentLabel = commentEditor?.querySelector(
      '.rich-editor__label'
    ) as HTMLSpanElement | null;
    const entryTitle = compiled.querySelector('.case-entry__title') as HTMLAnchorElement | null;

    expect(commentLabel?.textContent).toContain('Escribe un comentario');
    expect(entryTitle?.textContent).toContain('Actualización visible');
  });

  it('marks unread case notifications automatically but respects manual unread flags', () => {
    render();

    expect(markNotificationReadSpy).toHaveBeenCalledOnceWith('notification-auto');
  });

  it('submits a client comment and appends the successful API response', () => {
    render();
    expandEntry();

    expect(fixture.componentInstance.canComment(fixture.componentInstance.entries[0])).toBeTrue();
    fixture.componentInstance.commentDrafts['entry-1'] = 'Comentario enviado';
    fixture.componentInstance.submitComment('entry-1');
    fixture.detectChanges();

    expect(createCommentSpy).toHaveBeenCalledWith('case-1', 'entry-1', {
      text: 'Comentario enviado',
      visibility: { mode: 'case_members' },
    });
    expect(fixture.nativeElement.textContent).toContain('Comentario enviado');
  });

  it('does not render document links when the member lacks download permission', () => {
    permissions = ['case.read', 'case.comment', 'case.upload_file'];

    render();
    expandEntry();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('aprobado.pdf');
    expect(compiled.querySelector('a[href*="file-approved"]')).toBeNull();
    expect(compiled.querySelector('a[href*="file-own-zip"]')).toBeNull();
  });

  it('shows disabled comment and upload controls when membership lacks read permissions', () => {
    permissions = [];

    render();

    expect(fixture.componentInstance.entries.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Aún no hay actualizaciones visibles');
    expect(fixture.nativeElement.querySelector('[data-testid="case-comment-submit"]')).toBeNull();
  });

  it('fails closed when the authenticated user has no loaded case membership', () => {
    identity = { id: 'client-missing', email: 'missing@moyra.org' };

    render();

    expect(fixture.componentInstance.entries.length).toBe(0);
    expect(fixture.componentInstance.canUpload()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Aún no hay actualizaciones visibles');
  });

  it('lets a permitted member add a OneDrive document link', () => {
    render();
    expandEntry('entry-1', false);

    fixture.componentInstance.oneDriveDrafts['entry-1'] = {
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibilityMode: 'case_members',
    };
    fixture.componentInstance.addOneDriveLink('entry-1');
    fixture.detectChanges();

    expect(createOneDriveLinkSpy).toHaveBeenCalledWith('case-1', {
      fileName: 'Contrato firmado',
      entryId: 'entry-1',
      entryIds: ['entry-1'],
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibility: { mode: 'case_members' },
    });
    expect(fixture.nativeElement.textContent).toContain('Contrato firmado');
    expect(fixture.nativeElement.textContent).toContain('Abrir documento');
  });

  it('explains invalid document links instead of silently blocking submit', () => {
    render();
    expandEntry('entry-1', false);

    fixture.componentInstance.oneDriveDrafts['entry-1'] = {
      fileName: 'Video externo',
      linkUrl: 'https://youtu.be/no-es-onedrive',
      visibilityMode: 'case_members',
    };
    fixture.componentInstance.addOneDriveLink('entry-1');
    fixture.detectChanges();

    expect(createOneDriveLinkSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('OneDrive o SharePoint');
  });

  it('enables comments and document links for global admins on the client route', () => {
    isAdmin = true;
    identity = { id: 'admin-1', email: 'admin@moyra.org' };
    permissions = ['case.read'];

    render();

    expect(fixture.componentInstance.canComment(fixture.componentInstance.entries[0])).toBeTrue();
    expect(fixture.componentInstance.canUpload()).toBeTrue();
    expect(fixture.nativeElement.textContent).not.toContain('Los comentarios no están habilitados');
  });
});
