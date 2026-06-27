import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

import { AdminCasesListComponent } from './admin-cases-list.component';
import { CaseService } from '../../services/case.service';
import { CaseRecord, CaseType } from '../../models/case';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('AdminCasesListComponent', () => {
  let fixture: ComponentFixture<AdminCasesListComponent>;
  let cases: CaseRecord[];
  let caseTypes: CaseType[];
  let createCaseSpy: jasmine.Spy;
  let inviteMemberSpy: jasmine.Spy;
  let listCasesFails: boolean;

  beforeEach(async () => {
    cases = [
      {
        id: 'case-1',
        title: 'Contrato corporativo',
        reference: 'MRA-001',
        caseTypeId: 'corporate',
        statusId: 'review',
        active: true,
        updatedAt: '2026-06-18T20:00:00.000Z',
        lastActivityAt: '2026-06-18T20:00:00.000Z',
      },
      {
        id: 'case-2',
        title: 'Litigio civil',
        reference: 'MRA-002',
        caseTypeId: 'litigation',
        statusId: 'draft',
        active: true,
        updatedAt: '2026-06-17T20:00:00.000Z',
      },
    ];
    caseTypes = [
      {
        id: 'corporate',
        name: 'Corporativo',
        statuses: [
          { id: 'draft', name: 'Borrador' },
          { id: 'review', name: 'En revisión' },
        ],
      },
      {
        id: 'litigation',
        name: 'Litigio',
        statuses: [{ id: 'draft', name: 'Borrador' }],
      },
    ];
    createCaseSpy = jasmine
      .createSpy('createCase')
      .and.returnValue(of({ status: 'success', item: cases[0] }));
    inviteMemberSpy = jasmine
      .createSpy('inviteMember')
      .and.returnValue(
        of({
          status: 'success',
          item: {
            id: 'membership-1',
            caseId: 'case-1',
            email: 'betan.pamela@gmail.com',
            displayName: 'Pamela Betancourt',
            memberType: 'internal',
            rolePreset: 'attorney',
            permissions: ['view_case'],
            status: 'invited',
          },
        })
      );
    listCasesFails = false;
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);

    await TestBed.configureTestingModule({
      imports: [AdminCasesListComponent],
      providers: [
        provideRouter([]),
        {
          provide: CaseService,
          useValue: {
            listCases: () =>
              listCasesFails
                ? throwError(() => new Error('falló'))
                : of({ status: 'success', items: cases, nextToken: null }),
            listCaseTypes: () => of({ status: 'success', items: caseTypes, nextToken: null }),
            getOperationsSummary: () =>
              of({
                status: 'success',
                item: {
                  generatedAt: '2026-06-18T20:00:00.000Z',
                  cases: { total: 2, active: 2, archived: 0 },
                  files: {
                    total: 3,
                    pendingUpload: 1,
                    pendingExternalReview: 1,
                  },
                  notifications: {
                    total: 1,
                    email: { skipped: 1 },
                    webPush: { failed: 1 },
                  },
                  queues: {
                    staleUploads: [],
                    pendingExternalFiles: [],
                    pendingInvites: [],
                  },
                  recentAuditEvents: [],
                },
            }),
            createCase: createCaseSpy,
            inviteMember: inviteMemberSpy,
            listMembers: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'membership-pamela',
                    caseId: 'case-1',
                    userId: 'legal-2',
                    email: 'betan.pamela@gmail.com',
                    displayName: 'Pamela Betancourt',
                    memberType: 'internal',
                    rolePreset: 'attorney',
                    permissions: ['case.read'],
                    status: 'active',
                  },
                ],
              }),
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
                    id: 'attorney-1',
                    name: 'Abogado Moyra',
                    email: 'abogado@moyra.org',
                    role: 'ROLE_LEGAL_STAFF',
                  },
                  {
                    id: 'client-1',
                    name: 'Cliente',
                    email: 'cliente@moyra.org',
                    role: 'ROLE_USER',
                  },
                ],
              }),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            hydratedOnce$: () => of(true),
            identity: () => ({
              id: 'admin-1',
              name: 'Admin actual',
              email: 'admin@moyra.org',
              role: 'ROLE_ADMIN',
            }),
          },
        },
      ],
    }).compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(AdminCasesListComponent);
    fixture.detectChanges();
  }

  it('renders cases and filters by status and case type', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain('Contrato corporativo');
    expect(fixture.nativeElement.textContent).toContain('Litigio civil');
    expect(fixture.nativeElement.textContent).toContain('Carga pendiente');
    expect(fixture.nativeElement.textContent).not.toContain('Lanzar protección');

    fixture.componentInstance.statusFilter = 'review';
    fixture.componentInstance.caseTypeFilter = 'corporate';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Contrato corporativo');
    expect(fixture.nativeElement.textContent).not.toContain('Litigio civil');
  });

  it('shows an actionable error state', () => {
    listCasesFails = true;
    render();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los casos');
    expect(fixture.nativeElement.querySelector('[data-testid="admin-cases-retry"]')).not.toBeNull();
  });

  it('creates a case with the selected type and status', () => {
    render();

    fixture.componentInstance.newCase = {
      title: 'Nuevo asunto',
      reference: 'MRA-003',
      caseTypeId: 'corporate',
      statusId: 'draft',
      description: 'Alta inicial',
      attorneyUserId: 'attorney-1',
      newAttorneyEmail: '',
      newAttorneyName: '',
    };

    fixture.componentInstance.createCase();

    expect(createCaseSpy).toHaveBeenCalledWith({
      title: 'Nuevo asunto',
      reference: 'MRA-003',
      caseTypeId: 'corporate',
      statusId: 'draft',
      description: 'Alta inicial',
      leadUserId: 'attorney-1',
      initialAttorney: {
        email: 'abogado@moyra.org',
        displayName: 'Abogado Moyra',
        userId: 'attorney-1',
      },
    });
  });

  it('keeps the selected responsible attorney and invites the new attorney after creating the case', () => {
    render();

    fixture.componentInstance.newCase = {
      title: 'Nuevo asunto',
      reference: 'MRA-004',
      caseTypeId: 'corporate',
      statusId: 'draft',
      description: 'Alta inicial',
      attorneyUserId: 'admin-1',
      newAttorneyEmail: 'betan.pamela@gmail.com',
      newAttorneyName: 'Pamela Betancourt',
    };

    fixture.componentInstance.createCase();

    expect(createCaseSpy).toHaveBeenCalledWith({
      title: 'Nuevo asunto',
      reference: 'MRA-004',
      caseTypeId: 'corporate',
      statusId: 'draft',
      description: 'Alta inicial',
      leadUserId: 'admin-1',
      initialAttorney: {
        email: 'admin@moyra.org',
        displayName: 'Admin actual',
        userId: 'admin-1',
      },
    });
    expect(inviteMemberSpy).toHaveBeenCalledWith('case-1', {
      email: 'betan.pamela@gmail.com',
      displayName: 'Pamela Betancourt',
      rolePreset: 'attorney',
    });
  });

  it('requires an existing responsible attorney even when inviting a new attorney', () => {
    render();

    fixture.componentInstance.newCase = {
      title: 'Nuevo asunto',
      reference: 'MRA-005',
      caseTypeId: 'corporate',
      statusId: 'draft',
      description: 'Alta inicial',
      attorneyUserId: '',
      newAttorneyEmail: 'betan.pamela@gmail.com',
      newAttorneyName: 'Pamela Betancourt',
    };

    fixture.componentInstance.createCase();

    expect(createCaseSpy).not.toHaveBeenCalled();
    expect(inviteMemberSpy).not.toHaveBeenCalled();
  });

  it('keeps the current admin available as responsible attorney', () => {
    render();

    expect(fixture.componentInstance.availableAttorneys.map((user) => user.email)).toContain(
      'admin@moyra.org'
    );
    expect(fixture.componentInstance.availableAttorneys.map((user) => user.email)).toContain(
      'betan.pamela@gmail.com'
    );
    expect(fixture.componentInstance.availableAttorneys[0].email).toBe('admin@moyra.org');
    expect(fixture.componentInstance.newCase.attorneyUserId).toBe('admin-1');
  });

});
