import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AdminCaseDetailComponent } from './admin-case-detail.component';
import { CaseService } from '../../services/case.service';

describe('AdminCaseDetailComponent', () => {
  let fixture: ComponentFixture<AdminCaseDetailComponent>;
  let updateStatusSpy: jasmine.Spy;
  let updateCaseSpy: jasmine.Spy;
  let inviteMemberSpy: jasmine.Spy;
  let updateMemberSpy: jasmine.Spy;
  let updateMemberPermissionsSpy: jasmine.Spy;
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
        memberType: 'external',
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
        memberType: 'external',
        permissions: ['case.read', 'case.comment'],
      },
    }));
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
          fileName: 'Contrato firmado',
          contentType: 'text/uri-list',
          storageProvider: 'onedrive',
          uploadStatus: 'linked',
          externalVisibilityStatus: 'approved',
          visibility: { mode: 'case_members' },
        },
      }));

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
                  displayName: 'Cliente',
                  email: 'cliente@moyra.org',
                  rolePreset: 'client',
                  memberType: 'external',
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
                items: [{
                  id: 'audit-1',
                  caseId: 'case-1',
                  action: 'case.created',
                  targetType: 'case',
                  actorDisplayName: 'Admin',
                  createdAt: '2026-06-18T20:00:00.000Z',
                }],
              }),
            updateCaseStatus: updateStatusSpy,
            updateCase: updateCaseSpy,
            inviteMember: inviteMemberSpy,
            updateMember: updateMemberSpy,
            updateMemberPermissions: updateMemberPermissionsSpy,
            createOneDriveLink: createOneDriveLinkSpy,
            updateFileVisibility: updateFileVisibilitySpy,
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

  it('adds OneDrive links as case documents', () => {
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
  });
});
