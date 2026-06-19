import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CaseDetailComponent } from './case-detail.component';
import { CaseService } from '../../services/case.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('CaseDetailComponent', () => {
  let fixture: ComponentFixture<CaseDetailComponent>;
  let createCommentSpy: jasmine.Spy;
  let uploadCaseFileSpy: jasmine.Spy;
  let permissions: string[];
  let uploadFails: boolean;

  beforeEach(async () => {
    permissions = ['case.read', 'case.comment', 'case.upload_file', 'case.download_file'];
    uploadFails = false;
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
    uploadCaseFileSpy = jasmine.createSpy('uploadCaseFile').and.callFake(() =>
      uploadFails
        ? throwError(() => new Error('falló upload'))
        : of({
            status: 'success',
            item: {
              id: 'file-new',
              caseId: 'case-1',
              fileName: 'prueba.pdf',
              contentType: 'application/pdf',
              externalVisibilityStatus: 'pending',
              uploadStatus: 'uploaded',
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
            identity: () => ({ id: 'client-1', email: 'cliente@moyra.org' }),
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
                  caseTypeId: 'corporate',
                  statusId: 'review',
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
            uploadCaseFile: uploadCaseFileSpy,
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
    expect(text).toContain('Actualización visible');
    expect(text).toContain('Texto para cliente');
    expect(text).toContain('Comentario visible');
    expect(text).not.toContain('Nota interna');
    expect(text).not.toContain('Comentario interno');
    expect(text).toContain('aprobado.pdf');
    expect(text).toContain('mi-envio.pdf');
    expect(text).toContain('En revisión interna');
    expect(text).not.toContain('pendiente-otro.pdf');
    expect(compiled.querySelector('a[href*="/publication"]')).toBeNull();
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

  it('uploads a selected document and keeps it in internal review state', () => {
    render();

    const file = new File(['contenido'], 'prueba.pdf', { type: 'application/pdf' });
    fixture.componentInstance.handleFileSelection({ target: { files: [file] } } as any);
    fixture.componentInstance.uploadSelectedFile();
    fixture.detectChanges();

    expect(uploadCaseFileSpy).toHaveBeenCalledWith('case-1', file);
    expect(fixture.nativeElement.textContent).toContain('prueba.pdf');
    expect(fixture.nativeElement.textContent).toContain('100%');
    expect(fixture.nativeElement.textContent).toContain('En revisión interna');
  });
});
