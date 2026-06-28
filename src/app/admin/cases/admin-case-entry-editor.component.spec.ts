import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { AdminCaseEntryEditorComponent } from './admin-case-entry-editor.component';
import { CaseService } from '../../services/case.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('AdminCaseEntryEditorComponent', () => {
  let fixture: ComponentFixture<AdminCaseEntryEditorComponent>;
  let createEntrySpy: jasmine.Spy;
  let updateEntrySpy: jasmine.Spy;

  beforeEach(() => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
  });

  async function render(entryId = ''): Promise<void> {
    createEntrySpy = jasmine
      .createSpy('createEntry')
      .and.returnValue(of({ status: 'success', item: { id: 'entry-1' } }));
    updateEntrySpy = jasmine
      .createSpy('updateEntry')
      .and.returnValue(of({ status: 'success', item: { id: entryId || 'entry-1' } }));

    await TestBed.configureTestingModule({
      imports: [AdminCaseEntryEditorComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) =>
                  key === 'caseId' ? 'case-1' : key === 'entryId' ? entryId : null,
              },
            },
          },
        },
        {
          provide: CaseService,
          useValue: {
            getEntry: () =>
              of({
                status: 'success',
                item: {
                  id: entryId,
                  caseId: 'case-1',
                  title: 'Entrada existente',
                  text: '<p>Texto</p>',
                  visibility: { mode: 'case_members' },
                },
              }),
            createEntry: createEntrySpy,
            updateEntry: updateEntrySpy,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            identity: () => ({
              id: 'admin-1',
              email: 'admin@moyra.test',
              role: 'ROLE_ADMIN',
            }),
            isAdmin: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCaseEntryEditorComponent);
    fixture.detectChanges();
  }

  it('creates private case entries without SEO fields', async () => {
    await render();
    fixture.componentInstance.entry = { title: 'Nueva', text: '<p>Privada</p>' };
    fixture.componentInstance.visibilityMode = 'internal_only';

    fixture.componentInstance.save();

    expect(createEntrySpy).toHaveBeenCalledWith('case-1', {
      title: 'Nueva',
      text: '<p>Privada</p>',
      visibility: { mode: 'internal_only' },
    });
  });

  it('loads and updates existing entries', async () => {
    await render('entry-1');
    fixture.componentInstance.entry.title = 'Editada';

    fixture.componentInstance.save();

    expect(updateEntrySpy).toHaveBeenCalledWith('case-1', 'entry-1', {
      title: 'Editada',
      text: '<p>Texto</p>',
      visibility: { mode: 'case_members' },
    });
  });
});
