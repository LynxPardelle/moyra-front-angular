import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminCasesListComponent } from './admin-cases-list.component';
import { CaseService } from '../../services/case.service';
import { CaseMalwareProtectionStatus, CaseRecord, CaseType } from '../../models/case';

describe('AdminCasesListComponent', () => {
  let fixture: ComponentFixture<AdminCasesListComponent>;
  let cases: CaseRecord[];
  let caseTypes: CaseType[];
  let malwareProtection: CaseMalwareProtectionStatus;
  let createCaseSpy: jasmine.Spy;
  let launchMalwareProtectionSpy: jasmine.Spy;
  let disableMalwareProtectionSpy: jasmine.Spy;
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
    malwareProtection = {
      id: 'case-settings:malware-protection',
      provider: 'guardduty_s3',
      status: 'disabled',
      enabled: false,
      infrastructureAvailable: true,
      costNotice:
        'GuardDuty puede generar costo: 1,000 objetos y 1 GB al mes sin cargo; después USD 0.09 por GB.',
      pricing: {
        provider: 'guardduty_s3',
        region: 'us-east-1',
        freeTierObjectsPerMonth: 1000,
        freeTierScannedGbPerMonth: 1,
        scannedGbUsd: 0.09,
        objectsEvaluatedUsdPerThousand: 0.215,
      },
    };
    createCaseSpy = jasmine
      .createSpy('createCase')
      .and.returnValue(of({ status: 'success', item: cases[0] }));
    launchMalwareProtectionSpy = jasmine
      .createSpy('launchMalwareProtection')
      .and.returnValue(
        of({
          status: 'success',
          item: { ...malwareProtection, enabled: true, status: 'enabled' },
        })
      );
    disableMalwareProtectionSpy = jasmine
      .createSpy('disableMalwareProtection')
      .and.returnValue(
        of({
          status: 'success',
          item: { ...malwareProtection, enabled: false, status: 'disabled' },
        })
      );
    listCasesFails = false;

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
                    pendingUpload: 0,
                    pendingExternalReview: 1,
                    malwareScanPending: 1,
                    malwareScanBlocked: 1,
                  },
                  notifications: {
                    total: 1,
                    email: { skipped: 1 },
                    webPush: { failed: 1 },
                  },
                  queues: {
                    staleUploads: [],
                    pendingExternalFiles: [],
                    malwareBlockedFiles: [
                      {
                        id: 'file-blocked',
                        caseId: 'case-1',
                        fileName: 'riesgo.zip',
                        externalVisibilityStatus: 'pending',
                        uploadStatus: 'uploaded',
                        malwareScan: { required: true, status: 'blocked' },
                      },
                    ],
                    pendingInvites: [],
                  },
                  recentAuditEvents: [],
                },
              }),
            getMalwareProtectionStatus: () =>
              of({
                status: 'success',
                item: malwareProtection,
              }),
            createCase: createCaseSpy,
            launchMalwareProtection: launchMalwareProtectionSpy,
            disableMalwareProtection: disableMalwareProtectionSpy,
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
    expect(fixture.nativeElement.textContent).toContain('Escaneo pendiente');
    expect(fixture.nativeElement.textContent).toContain('riesgo.zip');
    expect(fixture.nativeElement.textContent).toContain('Protección opcional');
    expect(fixture.nativeElement.textContent).toContain('USD 0.09');

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
    };

    fixture.componentInstance.createCase();

    expect(createCaseSpy).toHaveBeenCalledWith({
      title: 'Nuevo asunto',
      reference: 'MRA-003',
      caseTypeId: 'corporate',
      statusId: 'draft',
      description: 'Alta inicial',
    });
  });

  it('launches GuardDuty only after cost acknowledgement', () => {
    render();

    fixture.componentInstance.launchMalwareProtection();
    expect(launchMalwareProtectionSpy).not.toHaveBeenCalled();

    fixture.componentInstance.malwareProtectionCostAccepted = true;
    fixture.componentInstance.launchMalwareProtection();

    expect(launchMalwareProtectionSpy).toHaveBeenCalled();
  });
});
