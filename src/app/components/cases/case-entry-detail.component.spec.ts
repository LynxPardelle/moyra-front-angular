import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { CaseEntryDetailComponent } from './case-entry-detail.component';
import { CaseService } from '../../services/case.service';
import { MainService } from '../../services/main.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('CaseEntryDetailComponent', () => {
  let fixture: ComponentFixture<CaseEntryDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseEntryDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) =>
                  key === 'caseId' ? 'case-1' : key === 'entryId' ? 'entry-1' : null,
              },
            },
          },
        },
        {
          provide: CaseService,
          useValue: {
            listEntries: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'entry-1',
                    caseId: 'case-1',
                    title: 'Entrada privada',
                    text: '<p>Contenido autorizado</p>',
                    visibility: { mode: 'case_members' },
                  },
                ],
              }),
            listComments: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'comment-1',
                    caseId: 'case-1',
                    entryId: 'entry-1',
                    text: 'Comentario autorizado',
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
                    userId: 'user-1',
                    email: 'cliente@moyra.org',
                    displayName: 'Cliente',
                    rolePreset: 'client',
                    memberType: 'external',
                    status: 'active',
                    permissions: ['case.read', 'case.comment'],
                  },
                ],
              }),
            createComment: () =>
              of({
                status: 'success',
                item: {
                  id: 'comment-2',
                  caseId: 'case-1',
                  entryId: 'entry-1',
                  text: 'Nuevo comentario',
                  visibility: { mode: 'case_members' },
                },
              }),
          },
        },
        {
          provide: MainService,
          useValue: {
            getMain: () => of({ main: { pageTexts: {} } }),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            isAdmin: () => false,
            identity: () => ({ id: 'user-1', email: 'cliente@moyra.org' }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders a private entry without exposing publication URLs', () => {
    fixture = TestBed.createComponent(CaseEntryDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';

    expect(text).toContain('Entrada privada');
    expect(text).toContain('Contenido autorizado');
    expect(text).toContain('Comentario autorizado');
    expect(compiled.querySelector('a[href*="/publication"]')).toBeNull();
  });
});
