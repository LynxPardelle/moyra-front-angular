import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AdminCaseDetailComponent } from './admin-case-detail.component';
import { CaseService } from '../../services/case.service';

describe('AdminCaseDetailComponent', () => {
  let fixture: ComponentFixture<AdminCaseDetailComponent>;
  let updateStatusSpy: jasmine.Spy;
  let createEntrySpy: jasmine.Spy;
  let inviteMemberSpy: jasmine.Spy;
  let updateFileVisibilitySpy: jasmine.Spy;

  beforeEach(async () => {
    updateStatusSpy = jasmine.createSpy('updateCaseStatus').and.returnValue(of({ status: 'success', item: {} }));
    createEntrySpy = jasmine.createSpy('createEntry').and.returnValue(of({ status: 'success', item: {} }));
    inviteMemberSpy = jasmine.createSpy('inviteMember').and.returnValue(of({ status: 'success', item: {} }));
    updateFileVisibilitySpy = jasmine
      .createSpy('updateFileVisibility')
      .and.returnValue(of({ status: 'success', item: {} }));

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
                items: [{ id: 'entry-1', caseId: 'case-1', title: 'Primera entrada' }],
              }),
            listMembers: () =>
              of({
                status: 'success',
                items: [{ id: 'member-1', caseId: 'case-1', displayName: 'Cliente' }],
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
                    visibility: 'internal_only',
                  },
                ],
              }),
            listAuditEvents: () =>
              of({
                status: 'success',
                items: [{ id: 'audit-1', caseId: 'case-1', action: 'case.created', targetType: 'case' }],
              }),
            updateCaseStatus: updateStatusSpy,
            createEntry: createEntrySpy,
            inviteMember: inviteMemberSpy,
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
    expect(fixture.nativeElement.querySelector('a[href*="amazonaws"]')).toBeNull();
  });

  it('updates status and creates internal entries', () => {
    fixture.componentInstance.selectedStatusId = 'review';
    fixture.componentInstance.updateStatus();
    fixture.componentInstance.newEntry = {
      title: 'Actualización interna',
      text: '<p>Texto privado</p>',
      visibility: { mode: 'internal_only' },
    };
    fixture.componentInstance.createEntry();

    expect(updateStatusSpy).toHaveBeenCalledWith('case-1', { statusId: 'review' });
    expect(createEntrySpy).toHaveBeenCalledWith('case-1', {
      title: 'Actualización interna',
      text: '<p>Texto privado</p>',
      visibility: { mode: 'internal_only' },
    });
  });

  it('invites members and approves file visibility', () => {
    fixture.componentInstance.invite = {
      email: 'cliente@moyra.org',
      displayName: 'Cliente',
      rolePreset: 'client',
      permissions: ['case.read'],
    };
    fixture.componentInstance.inviteMember();
    fixture.componentInstance.approveFile('file-1');

    expect(inviteMemberSpy).toHaveBeenCalledWith('case-1', {
      email: 'cliente@moyra.org',
      displayName: 'Cliente',
      rolePreset: 'client',
      permissions: ['case.read'],
    });
    expect(updateFileVisibilitySpy).toHaveBeenCalledWith('case-1', 'file-1', {
      externalVisibilityStatus: 'approved',
      visibility: { mode: 'case_members' },
    });
  });
});
