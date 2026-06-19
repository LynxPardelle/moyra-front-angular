import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminCasesConfigComponent } from './admin-cases-config.component';
import { CaseService } from '../../services/case.service';
import { CaseType } from '../../models/case';

describe('AdminCasesConfigComponent', () => {
  let fixture: ComponentFixture<AdminCasesConfigComponent>;
  let caseTypes: CaseType[];
  let createCaseTypeSpy: jasmine.Spy;
  let updateCaseTypeSpy: jasmine.Spy;
  let listFails: boolean;

  beforeEach(async () => {
    caseTypes = [
      {
        id: 'corporate',
        name: 'Corporativo',
        description: 'Contratos y sociedades',
        active: true,
        statuses: [
          {
            id: 'corporate:status:draft',
            label: 'Borrador',
            color: '#334155',
            order: 1,
            active: true,
            isDefault: true,
          },
          {
            id: 'corporate:status:closed',
            label: 'Cerrado',
            color: '#475569',
            order: 2,
            active: false,
          },
        ],
      },
    ];
    listFails = false;
    createCaseTypeSpy = jasmine.createSpy('createCaseType').and.callFake((body) =>
      of({
        status: 'success',
        item: {
          id: 'litigation',
          name: body.name,
          description: body.description,
          active: true,
          statuses: [
            {
              id: 'litigation:status:1',
              label: body.statuses[0].label,
              color: '#334155',
              order: 1,
              active: true,
              isDefault: true,
            },
          ],
        },
      })
    );
    updateCaseTypeSpy = jasmine.createSpy('updateCaseType').and.callFake((id, body) =>
      of({
        status: 'success',
        item: {
          id,
          name: body.name,
          description: body.description,
          active: body.active,
          statuses: body.statuses,
        },
      })
    );

    await TestBed.configureTestingModule({
      imports: [AdminCasesConfigComponent],
      providers: [
        provideRouter([]),
        {
          provide: CaseService,
          useValue: {
            listCaseTypes: () =>
              listFails
                ? throwError(() => new Error('falló'))
                : of({ status: 'success', items: caseTypes, nextToken: null }),
            createCaseType: createCaseTypeSpy,
            updateCaseType: updateCaseTypeSpy,
          },
        },
      ],
    }).compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(AdminCasesConfigComponent);
    fixture.detectChanges();
  }

  it('renders configurable case types and backend status labels', () => {
    render();

    const text = fixture.nativeElement.textContent || '';
    const statusLabels = fixture.componentInstance.editForm?.statuses.map(
      (status) => status.label
    );

    expect(text).toContain('Corporativo');
    expect(statusLabels).toContain('Borrador');
    expect(statusLabels).toContain('Cerrado');
    expect(text).toContain('1 estados activos');
  });

  it('creates a case type with a first attorney-defined status', () => {
    render();

    fixture.componentInstance.newTypeName = 'Litigio';
    fixture.componentInstance.newTypeDescription = 'Asuntos judiciales';
    fixture.componentInstance.newTypeStatusLabel = 'En revisión';
    fixture.componentInstance.createCaseType();

    expect(createCaseTypeSpy).toHaveBeenCalledWith({
      name: 'Litigio',
      description: 'Asuntos judiciales',
      active: true,
      statuses: [
        {
          label: 'En revisión',
          color: '#334155',
          order: 1,
          active: true,
          isDefault: true,
        },
      ],
    });
  });

  it('updates a case type without dropping inactive statuses', () => {
    render();

    fixture.componentInstance.editForm!.statuses[0].label = 'En análisis';
    fixture.componentInstance.editForm!.statuses[1].active = false;
    fixture.componentInstance.saveSelectedCaseType();

    expect(updateCaseTypeSpy).toHaveBeenCalled();
    const [, body] = updateCaseTypeSpy.calls.mostRecent().args;
    expect(body.statuses[0].label).toBe('En análisis');
    expect(body.statuses[1].label).toBe('Cerrado');
    expect(body.statuses[1].active).toBeFalse();
  });

  it('shows a retryable error state when configuration cannot load', () => {
    listFails = true;

    render();

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudo cargar la configuración de casos'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="cases-config-retry"]')).not.toBeNull();
  });
});
