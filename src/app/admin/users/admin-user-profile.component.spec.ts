import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminUserProfileComponent } from './admin-user-profile.component';
import { CaseService } from '../../services/case.service';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

describe('AdminUserProfileComponent', () => {
  let fixture: ComponentFixture<AdminUserProfileComponent>;
  let updateUserSpy: jasmine.Spy;
  let updateMemberSpy: jasmine.Spy;
  let isAdmin: boolean;

  beforeEach(async () => {
    isAdmin = true;
    updateUserSpy = jasmine.createSpy('updateUser').and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'legal-1',
          name: 'Abogada actualizada',
          displayName: 'Abogada actualizada',
          email: 'abogada@moyra.org',
          role: 'ROLE_LEGAL_STAFF',
          relationship: 'Equipo Moyra',
        },
      })
    );
    updateMemberSpy = jasmine.createSpy('updateMember').and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'membership-1',
          caseId: 'case-1',
          userId: 'legal-1',
          displayName: 'Abogada Moyra',
          email: 'abogada@moyra.org',
          rolePreset: 'attorney',
          memberType: 'external',
          permissions: ['case.read', 'case.write_entry'],
          status: 'active',
        },
      })
    );

    await TestBed.configureTestingModule({
      imports: [AdminUserProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'userId' ? 'legal-1' : null),
              },
            },
          },
        },
        {
          provide: UserService,
          useValue: {
            getIdentity: () => ({
              id: 'legal-1',
              name: 'Abogada Moyra',
              email: 'abogada@moyra.org',
              role: 'ROLE_LEGAL_STAFF',
            }),
            updateUser: updateUserSpy,
            getUsers: () =>
              of({
                users: [
                  {
                    id: 'legal-1',
                    name: 'Abogada Moyra',
                    email: 'abogada@moyra.org',
                    role: 'ROLE_LEGAL_STAFF',
                    relationship: 'Equipo Moyra',
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
              id: 'legal-1',
              name: 'Abogada Moyra',
              email: 'abogada@moyra.org',
              role: 'ROLE_LEGAL_STAFF',
            }),
            isAdmin: () => isAdmin,
          },
        },
        {
          provide: CaseService,
          useValue: {
            listCases: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'case-1',
                    title: 'Contrato corporativo',
                    reference: 'MRA-001',
                    caseTypeId: 'corporate',
                    statusId: 'review',
                  },
                ],
              }),
            listMembers: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'membership-1',
                    caseId: 'case-1',
                    userId: 'legal-1',
                    displayName: 'Abogada Moyra',
                    email: 'abogada@moyra.org',
                    rolePreset: 'attorney',
                    memberType: 'internal',
                    permissions: ['case.read', 'case.write_entry'],
                    status: 'active',
                  },
                ],
              }),
            updateMember: updateMemberSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUserProfileComponent);
    fixture.detectChanges();
  });

  it('renders the user profile with assigned cases', () => {
    const text = fixture.nativeElement.textContent;
    const caseLink = fixture.nativeElement.querySelector(
      'a[href="/admin/casos/case-1"]'
    ) as HTMLAnchorElement | null;

    expect(text).toContain('Abogada Moyra');
    expect(text).toContain('Equipo legal');
    expect(text).toContain('Contrato corporativo');
    expect(text).toContain('Publicar entradas');
    expect(caseLink?.textContent).toContain('Contrato corporativo');
  });

  it('updates basic profile data', () => {
    fixture.componentInstance.profileDraft.displayName = 'Abogada actualizada';
    fixture.componentInstance.profileDraft.relationship = 'Equipo Moyra';
    fixture.componentInstance.saveProfile();
    fixture.detectChanges();

    expect(updateUserSpy).toHaveBeenCalledWith('legal-1', {
      name: 'Abogada actualizada',
      displayName: 'Abogada actualizada',
      email: 'abogada@moyra.org',
      relationship: 'Equipo Moyra',
      role: 'ROLE_LEGAL_STAFF',
    });
    expect(fixture.nativeElement.textContent).toContain('Perfil guardado');
  });

  it('keeps global role readonly for non-admin viewers', () => {
    isAdmin = false;
    fixture = TestBed.createComponent(AdminUserProfileComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select[name="profileRole"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Equipo legal');
  });
});
