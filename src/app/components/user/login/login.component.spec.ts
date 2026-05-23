import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthFacade } from '../../../store/auth/auth.facade';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: UserService,
          useValue: {
            login: () => of({ user: {}, token: 'token' }),
          },
        },
        {
          provide: WebService,
          useValue: {
            consoleLog: () => undefined,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            setCredentials: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the page title as the only login heading level one', () => {
    const loginHeading = fixture.nativeElement.querySelector(
      '.login-panel__title'
    ) as HTMLHeadingElement | null;
    expect(loginHeading?.tagName).toBe('H1');
    expect(loginHeading?.textContent).toContain('Acceso');
  });
});
