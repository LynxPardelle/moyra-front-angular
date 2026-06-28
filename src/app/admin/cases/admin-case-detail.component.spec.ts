import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { AdminCaseDetailComponent } from './admin-case-detail.component';
import { CaseService } from '../../services/case.service';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('AdminCaseDetailComponent', () => {
  let fixture: ComponentFixture<AdminCaseDetailComponent>;
  let updateStatusSpy: jasmine.Spy;
  let updateCaseSpy: jasmine.Spy;
  let inviteMemberSpy: jasmine.Spy;
  let updateMemberSpy: jasmine.Spy;
  let updateMemberPermissionsSpy: jasmine.Spy;
  let removeMemberSpy: jasmine.Spy;
  let updateFileVisibilitySpy: jasmine.Spy;
  let createOneDriveLinkSpy: jasmine.Spy;

  beforeEach(async () => {
    updateStatusSpy = jasmine.createSpy('updateCaseStatus').and.returnValue(of({ status: 'success', item: {} }));
    updateCaseSpy = jasmine.createSpy('updateCase').and.returnValue(of({
      status: 'success',
      item: {
        id: 'case-1',
        title: 'Contrato corporativo editado',
        caseTypeId: 'corporate',
        statusId: 'draft',
      },
    }));
    inviteMemberSpy = jasmine.createSpy('inviteMember').and.returnValue(of({ status: 'success', item: {} }));
    updateMemberSpy = jasmine.createSpy('updateMember').and.returnValue(of({
      status: 'success',
      item: {
        id: 'member-1',
        caseId: 'case-1',
        displayName: 'Cliente editado',
        rolePreset: 'client',
        permissions: ['case.read'],
      },
    }));
    updateMemberPermissionsSpy = jasmine.createSpy('updateMemberPermissions').and.returnValue(of({
      status: 'success',
      item: {
        id: 'member-1',
        caseId: 'case-1',
        displayName: 'Cliente editado',
        rolePreset: 'client',
        permissions: ['case.read', 'case.comment'],
      },
    }));
    removeMemberSpy = jasmine.createSpy('removeMember').and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'member-1',
          caseId: 'case-1',
          displayName: 'Cliente',
          rolePreset: 'client',
          permissions: ['case.read'],
          status: 'removed',
        },
      })
    );
    updateFileVisibilitySpy = jasmine
      .createSpy('updateFileVisibility')
      .and.returnValue(of({ status: 'success', item: {} }));
    createOneDriveLinkSpy = jasmine
      .createSpy('createOneDriveLink')
      .and.returnValue(of({
        status: 'success',
        item: {
          id: 'file-link-1',
          caseId: 'case-1',
          entryId: 'entry-1',
          fileName: 'Contrato firmado',
          contentType: 'text/uri-list',
          storageProvider: 'onedrive',
          uploadStatus: 'linked',
          externalVisibilityStatus: 'approved',
          visibility: { mode: 'case_members' },
        },
      }));
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    await TestBed.configureTestingModule({
      imports: [AdminCaseDetailComponent],
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
          provide: CaseService,
          useValue: {
            listCases: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'case-1',
                    title: 'Contrato corporativo',
                    caseTypeId: 'corporate',
                    statusId: 'draft',
                  },
                ],
              }),
            getCase: () =>
              of({
                status: 'success',
                item: {
                  id: 'case-1',
                  title: 'Contrato corporativo',
                  caseTypeId: 'corporate',
                  statusId: 'draft',
                },
              }),
            listCaseTypes: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'corporate',
                    name: 'Corporativo',
                    statuses: [
                      { id: 'draft', name: 'Borrador' },
                      { id: 'review', name: 'En revisión' },
                    ],
                  },
                ],
              }),
            listEntries: () =>
              of({
                status: 'success',
                items: [{
                  id: 'entry-1',
                  caseId: 'case-1',
                  title: 'Primera entrada',
                  text: 'Texto',
                  visibility: { mode: 'case_members' },
                }],
              }),
            listMembers: () =>
              of({
                status: 'success',
                items: [{
                  id: 'member-1',
                  caseId: 'case-1',
                  userId: 'user-1',
                  displayName: 'Cliente',
                  email: 'cliente@moyra.org',
                  rolePreset: 'client',
                  permissions: ['case.read', 'case.comment'],
                }],
              }),
            listFiles: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'file-1',
                    caseId: 'case-1',
                    entryId: 'entry-1',
                    fileName: 'evidencia.pdf',
                    contentType: 'application/pdf',
                    externalVisibilityStatus: 'pending',
                    uploadStatus: 'uploaded',
                    visibility: 'internal_only',
                  },
                ],
              }),
            listAuditEvents: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'audit-1',
                    caseId: 'case-1',
                    action: 'case.created',
                    targetType: 'case',
                    actorDisplayName: 'Admin',
                    createdAt: '2026-06-18T20:00:00.000Z',
                  },
                  {
                    id: 'audit-2',
                    caseId: 'case-1',
                    actorUserId: 'user-1',
                    action: 'case.entry.created',
                    targetType: 'case-entry',
                    targetId: 'entry-1',
                    after: {
                      id: 'entry-1',
                      authorUserId: 'user-1',
                      title: 'Primera entrada',
                      visibility: { mode: 'case_members' },
                      text: '<p><em>Avance privado</em></p>',
                    },
                    createdAt: '2026-06-18T20:00:00.000Z',
                  },
                ],
              }),
            updateCaseStatus: updateStatusSpy,
            updateCase: updateCaseSpy,
            inviteMember: inviteMemberSpy,
            updateMember: updateMemberSpy,
            updateMemberPermissions: updateMemberPermissionsSpy,
            removeMember: removeMemberSpy,
            createOneDriveLink: createOneDriveLinkSpy,
            updateFileVisibility: updateFileVisibilitySpy,
          },
        },
        {
          provide: UserService,
          useValue: {
            getIdentity: () => ({
              id: 'admin-1',
              name: 'Admin actual',
              email: 'admin@moyra.org',
              role: 'ROLE_ADMIN',
            }),
            getUsers: () =>
              of({
                users: [
                  {
                    id: 'user-1',
                    name: 'Cliente',
                    email: 'cliente@moyra.org',
                    role: 'ROLE_USER',
                  },
                  {
                    id: 'legal-2',
                    name: 'Pasante Moyra',
                    email: 'pasante@moyra.org',
                    role: 'ROLE_LEGAL_STAFF',
                  },
                ],
              }),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            identity: () => ({
              id: 'admin-1',
              name: 'Admin actual',
              email: 'admin@moyra.org',
              role: 'ROLE_ADMIN',
            }),
            isAdmin: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCaseDetailComponent);
    fixture.detectChanges();
  });

  it('renders the case workspace sections', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Contrato corporativo');
    expect(text).toContain('Entradas');
    expect(text).toContain('Miembros');
    expect(text).toContain('Archivos');
    expect(text).toContain('Auditoría');
    expect(text).toContain('Enlace de OneDrive');
    expect(fixture.nativeElement.querySelector('a[href*="amazonaws"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.admin-case-file button')?.disabled).toBeFalse();
  });

  it('renders audit rows with readable actors, targets and details', () => {
    const text = fixture.nativeElement.textContent;
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>
    ).map((link) => link.getAttribute('href'));

    expect(text).toContain('Cliente (cliente@moyra.org)');
    expect(text).toContain('Primera entrada');
    expect(text).toContain('Autor: Cliente (cliente@moyra.org)');
    expect(text).toContain('Contenido: Avance privado');
    expect(text).toContain('Visibilidad: Visible para miembros del caso');
    expect(text).not.toContain('user-1');
    expect(links).toContain('/admin/usuarios/user-1');
    expect(links).toContain('/admin/casos/case-1/entradas/entry-1');
  });

  it('updates case details through the status notification route when needed', () => {
    fixture.componentInstance.selectedStatusId = 'review';
    fixture.componentInstance.caseDraft.title = 'Contrato corporativo editado';
    fixture.componentInstance.saveCaseDetails();

    expect(updateCaseSpy).toHaveBeenCalledWith('case-1', {
      title: 'Contrato corporativo editado',
      reference: '',
      description: '',
    });
    expect(updateStatusSpy).toHaveBeenCalledWith('case-1', { statusId: 'review' });
  });

  it('invites members and approves file visibility', () => {
    fixture.componentInstance.invite = {
      email: 'cliente@moyra.org',
      displayName: 'Cliente',
      rolePreset: 'client',
    };
    fixture.componentInstance.inviteMember();
    fixture.componentInstance.approveFile('file-1');

    expect(inviteMemberSpy).toHaveBeenCalledWith('case-1', {
      email: 'cliente@moyra.org',
      displayName: 'Cliente',
      rolePreset: 'client',
    });
    expect(updateFileVisibilitySpy).toHaveBeenCalledWith('case-1', 'file-1', {
      externalVisibilityStatus: 'approved',
      visibility: { mode: 'case_members' },
    });
  });

  it('adds existing users as case members with case role', () => {
    inviteMemberSpy.and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'member-2',
          caseId: 'case-1',
          userId: 'legal-2',
          displayName: 'Pasante Moyra',
          email: 'pasante@moyra.org',
          rolePreset: 'pasante',
          permissions: ['case.read'],
          status: 'active',
        },
      })
    );
    updateMemberSpy.and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'member-2',
          caseId: 'case-1',
          userId: 'legal-2',
          displayName: 'Pasante Moyra',
          email: 'pasante@moyra.org',
          rolePreset: 'pasante',
          permissions: ['case.read'],
          status: 'active',
        },
      })
    );

    fixture.componentInstance.existingMember = {
      userKey: 'legal-2',
      rolePreset: 'pasante',
    };
    fixture.componentInstance.addExistingMember();

    expect(inviteMemberSpy).toHaveBeenCalledWith('case-1', {
      email: 'pasante@moyra.org',
      displayName: 'Pasante Moyra',
      rolePreset: 'pasante',
    });
    expect(updateMemberSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.members.some((member) => member.id === 'member-2')).toBeTrue();
  });

  it('adds OneDrive links as case documents', () => {
    fixture.componentInstance.oneDriveLink = {
      entryId: 'entry-1',
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibilityMode: 'case_members',
    };

    fixture.componentInstance.addOneDriveLink();
    fixture.detectChanges();

    expect(createOneDriveLinkSpy).toHaveBeenCalledWith('case-1', {
      entryId: 'entry-1',
      fileName: 'Contrato firmado',
      linkUrl: 'https://moyra-my.sharepoint.com/documentos/contrato',
      visibility: { mode: 'case_members' },
    });
    expect(fixture.nativeElement.textContent).toContain('Contrato firmado');
  });

  it('removes a case membership without deleting the user', async () => {
    await fixture.componentInstance.removeMember(fixture.componentInstance.members[0]);

    expect(removeMemberSpy).toHaveBeenCalledWith('case-1', 'member-1');
    expect(fixture.componentInstance.members.length).toBe(0);
  });
});
