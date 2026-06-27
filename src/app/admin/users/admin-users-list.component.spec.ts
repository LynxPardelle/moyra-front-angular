import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminUsersListComponent } from './admin-users-list.component';
import { CaseService } from '../../services/case.service';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('AdminUsersListComponent', () => {
  let fixture: ComponentFixture<AdminUsersListComponent>;
  let getUsersFails: boolean;

  beforeEach(async () => {
    getUsersFails = false;
    await TestBed.configureTestingModule({
      imports: [AdminUsersListComponent],
      providers: [
        provideRouter([]),
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
              getUsersFails
                ? throwError(() => new Error('falló'))
                : of({
                    users: [
                      {
                        id: 'legal-1',
                        name: 'Abogada Moyra',
                        email: 'abogada@moyra.org',
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
          provide: CaseService,
          useValue: {
            listCases: () =>
              of({
                status: 'success',
                items: [{ id: 'case-1', title: 'Contrato corporativo' }],
              }),
            listMembers: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'membership-1',
                    caseId: 'case-1',
                    userId: 'client-from-case',
                    displayName: 'Cliente del caso',
                    email: 'cliente-caso@moyra.org',
                    rolePreset: 'client',
                    memberType: 'external',
                    permissions: ['case.read'],
                    status: 'active',
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

    fixture = TestBed.createComponent(AdminUsersListComponent);
    fixture.detectChanges();
  });

  it('renders users with profile links and global role labels', () => {
    const text = fixture.nativeElement.textContent;
    const profileLink = fixture.nativeElement.querySelector(
      'a[href="/admin/usuarios/legal-1"]'
    ) as HTMLAnchorElement | null;

    expect(text).toContain('Abogada Moyra');
    expect(text).toContain('Equipo legal');
    expect(profileLink?.textContent).toContain('Ver perfil');
  });

  it('filters users by search term', () => {
    fixture.componentInstance.searchTerm = 'cliente';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Cliente');
    expect(text).not.toContain('Abogada Moyra');
  });

  it('includes the current authenticated user when the API list omits it', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Admin actual');
    expect(text).toContain('admin@moyra.org');
  });

  it('keeps current user and case members when the users API fails', () => {
    getUsersFails = true;
    fixture = TestBed.createComponent(AdminUsersListComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Admin actual');
    expect(text).toContain('Cliente del caso');
    expect(text).toContain('cliente-caso@moyra.org');
  });
});
