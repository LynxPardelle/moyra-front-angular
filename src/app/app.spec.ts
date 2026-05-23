import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { App } from './app';
import { MainService } from './services/main.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { SharedService } from './services/shared.service';
import { AuthFacade } from './store/auth/auth.facade';
import { NgxAngoraService } from 'ngx-angora-css';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: MainService,
          useValue: {
            getMain: () => of({ main: {} }),
            createMain: () => of({ main: {} }),
          },
        },
        {
          provide: UserService,
          useValue: {
            refreshSession: () => of(null),
          },
        },
        {
          provide: WebService,
          useValue: {
            consoleLog: () => undefined,
          },
        },
        {
          provide: SharedService,
          useValue: {
            changeEmitted$: EMPTY,
            emitChange: () => undefined,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            hydrate: () => undefined,
            isAdmin: () => false,
            authStateOnceAfterHydration$: () => of({ isAuthenticated: false }),
          },
        },
        {
          provide: NgxAngoraService,
          useValue: {
            pushColors: () => undefined,
            cssCreate: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the brand title without consuming the page h1', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-header h1')).toBeNull();
    expect(compiled.querySelector('.titleMontano__name')?.textContent).toContain(
      'Montaño'
    );
  });
});
