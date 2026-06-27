import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminUsersListComponent } from './admin-users-list.component';
import { UserService } from '../../services/user.service';

describe('AdminUsersListComponent', () => {
  let fixture: ComponentFixture<AdminUsersListComponent>;

  beforeEach(async () => {
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
              of({
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
});
