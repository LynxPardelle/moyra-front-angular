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
                    contentType: 'application/pdf',
                    externalVisibilityStatus: 'approved',
                    uploadStatus: 'uploaded',
                    visibility: { mode: 'case_members' },
                  },
                  {
                    id: 'file-own-pending',
                    caseId: 'case-1',
                    fileName: 'mi-envio.pdf',
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
                    memberType: 'external',
                    rolePreset: 'client',
                    permissions,
                    status: 'active',
                  },
                ],
              }),
            createComment: createCommentSpy,
            createOneDriveLink: createOneDriveLinkSpy,
            getUnreadNotificationCount: () => of({ status: 'success', count: 3 }),
          },
        },
      ],
    }).compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(CaseDetailComponent);
    fixture.detectChanges();
  }

  it('renders visible timeline, comments, and documents without public SEO routes', () => {
    render();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';

    expect(text).toContain('Contrato corporativo');
    expect(text).toContain('Descripción visible para el cliente');
    expect(text).toContain('Última actividad');
    expect(text).toContain('Actualización visible');
    expect(text).toContain('Texto para cliente');
    expect(text).toContain('Comentario visible');
    expect(text).toContain('Cliente · Cliente / Cliente o invitado externo');
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

    const compiled = fixture.nativeElement as HTMLElement;
    const commentEditor = compiled.querySelector('app-rich-text-editor') as HTMLElement | null;
    const commentLabel = commentEditor?.querySelector(
      '.rich-editor__label'
    ) as HTMLSpanElement | null;
    const entryTitle = compiled.querySelector('.case-entry__title') as HTMLAnchorElement | null;

    expect(commentLabel?.textContent).toContain('Escribe un comentario');
    expect(entryTitle?.textContent).toContain('Actualización visible');
  });

  it('submits a client comment and appends the successful API response', () => {
    render();

    fixture.componentInstance.commentDrafts['entry-1'] = 'Comentario enviado';
    fixture.componentInstance.submitComment('entry-1');
    fixture.detectChanges();

    expect(createCommentSpy).toHaveBeenCalledWith('case-1', 'entry-1', {
      text: 'Comentario enviado',
      visibility: { mode: 'case_members' },
    });
    expect(fixture.nativeElement.textContent).toContain('Comentario enviado');
  });

  it('shows disabled comment and upload controls when membership lacks permissions', () => {
    permissions = ['case.read'];

    render();

    expect(fixture.nativeElement.textContent).toContain('Los comentarios no están habilitados');
    expect(fixture.nativeElement.textContent).toContain('La carga de documentos no está habilitada');
    expect(fixture.nativeElement.querySelector('[data-testid="case-comment-submit"]')?.disabled).toBeTrue();
  });

  it('fails closed when the authenticated user has no loaded case membership', () => {
    identity = { id: 'client-missing', email: 'missing@moyra.org' };

    render();

    expect(fixture.componentInstance.canComment()).toBeFalse();
    expect(fixture.componentInstance.canUpload()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Los comentarios no están habilitados');
    expect(fixture.nativeElement.textContent).toContain('La carga de documentos no está habilitada');
  });

  it('lets a permitted member add a OneDrive document link', () => {
    render();

    fixture.componentInstance.oneDriveLink = {
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
    };
    fixture.componentInstance.addOneDriveLink();
    fixture.detectChanges();

    expect(createOneDriveLinkSpy).toHaveBeenCalledWith('case-1', {
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibility: { mode: 'case_members' },
    });
    expect(fixture.nativeElement.textContent).toContain('Contrato firmado');
    expect(fixture.nativeElement.textContent).toContain('Abrir documento');
  });

  it('explains invalid document links instead of silently blocking submit', () => {
    render();

    fixture.componentInstance.oneDriveLink = {
      fileName: 'Video externo',
      linkUrl: 'https://youtu.be/no-es-onedrive',
    };
    fixture.componentInstance.addOneDriveLink();
    fixture.detectChanges();

    expect(createOneDriveLinkSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('OneDrive o SharePoint');
  });

  it('enables comments and document links for global admins on the client route', () => {
    isAdmin = true;
    identity = { id: 'admin-1', email: 'admin@moyra.org' };
    permissions = ['case.read'];

    render();

    expect(fixture.componentInstance.canComment()).toBeTrue();
    expect(fixture.componentInstance.canUpload()).toBeTrue();
    expect(fixture.nativeElement.textContent).not.toContain('Los comentarios no están habilitados');
  });
});
