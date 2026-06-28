import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CasesListComponent } from './cases-list.component';
import { CaseRecord, CaseNotification, CaseType } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { MainService } from '../../services/main.service';

describe('CasesListComponent', () => {
  let fixture: ComponentFixture<CasesListComponent>;
  let cases: CaseRecord[];
  let caseTypes: CaseType[];
  let notifications: CaseNotification[];
  let listCasesFails: boolean;

  beforeEach(async () => {
    cases = [
      {
        id: 'case-1',
        title: 'Contrato corporativo',
        reference: 'MRA-001',
        caseTypeId: 'corporate',
        statusId: 'review',
        createdAt: '2026-06-16T18:00:00.000Z',
        createdByDisplayName: 'Pamela Betancourt',
        createdByEmail: 'betan.pamela@gmail.com',
        lastActivityAt: '2026-06-18T20:00:00.000Z',
      },
      {
        id: 'case-2',
        title: 'Consulta migratoria',
        reference: 'MRA-002',
        caseTypeId: 'immigration',
        statusId: 'draft',
        createdAt: '2026-06-15T18:00:00.000Z',
        createdByEmail: 'hugo@moyra.org',
        updatedAt: '2026-06-17T20:00:00.000Z',
      },
    ];
    notifications = [
      notification('notification-1', 'case-1', null),
      notification('notification-2', 'case-1', null),
      notification('notification-3', 'case-2', '2026-06-18T21:00:00.000Z'),
    ];
    caseTypes = [
      {
        id: 'corporate',
        name: 'Corporativo',
        statuses: [
          { id: 'draft', label: 'Borrador' },
          { id: 'review', label: 'En revisión' },
        ],
      },
      {
        id: 'immigration',
        name: 'Migratorio',
        statuses: [{ id: 'draft', label: 'Nuevo' }],
      },
    ];
    listCasesFails = false;

    await TestBed.configureTestingModule({
      imports: [CasesListComponent],
      providers: [
        provideRouter([]),
        {
          provide: CaseService,
          useValue: {
            listCases: () =>
              listCasesFails
                ? throwError(() => new Error('falló'))
                : of({ status: 'success', items: cases, nextToken: null }),
            listCaseTypes: () =>
              of({ status: 'success', items: caseTypes, nextToken: null }),
            listNotifications: () =>
              of({ status: 'success', items: notifications, nextToken: null }),
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
                    casesOpenCaseButtonLabel: 'Entrar al expediente',
                  },
                },
              }),
          },
        },
      ],
    }).compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(CasesListComponent);
    fixture.detectChanges();
  }

  it('renders assigned cases with status, unread count, and private links', () => {
    render();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';

    expect(text).toContain('Contrato corporativo');
    expect(text).toContain('Expedientes');
    expect(text).toContain('En revisión');
    expect(text).toContain('Creado');
    expect(text).toContain('Pamela Betancourt');
    expect(text).toContain('2 sin leer');
    expect(text).toContain('Revisar novedades');
    expect(text).toContain('Consulta migratoria');
    expect(compiled.querySelector('a[href="/casos/case-1"]')).not.toBeNull();
    expect(compiled.querySelector('a[href*="/publication"]')).toBeNull();
  });

  it('shows an empty state when the client has no assigned cases', () => {
    cases = [];

    render();

    expect(fixture.nativeElement.textContent).toContain('No tienes casos asignados');
  });

  it('shows a retryable error state when cases cannot load', () => {
    listCasesFails = true;

    render();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar tus casos');
    expect(fixture.nativeElement.querySelector('[data-testid="cases-retry"]')).not.toBeNull();
  });
});

function notification(id: string, caseId: string, readAt: string | null): CaseNotification {
  return {
    id,
    recipientUserId: 'client-1',
    caseId,
    eventType: 'case.entry.created',
    targetType: 'case-entry',
    targetId: 'entry-1',
    title: 'Nueva actualización',
    body: 'Hay una nueva actualización.',
    link: { path: `/casos/${caseId}` },
    readAt: readAt || undefined,
    delivery: {
      inApp: { status: 'created' },
      email: { status: 'skipped' },
      webPush: { status: 'skipped' },
    },
  };
}
