import {
  Component,
  HostListener,
  Inject,
  Injector,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { isPlatformBrowser, Location } from '@angular/common';
import { NgxAngoraService } from 'ngx-angora-css';
import { Subscription, catchError, filter, map, of, switchMap } from 'rxjs';

// Services
import { ApiRuntime, GlobalMain } from './services/global';
import { MainService } from './services/main.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { SharedService } from './services/shared.service';
import { AuthFacade } from './store/auth/auth.facade';
import {
  consumeAuthStorageFailureReason,
  createAuthSession,
} from './store/auth/auth.storage';
import { CasesFeatureService } from './components/cases/cases-feature.service';
import { NotificationBellComponent } from './components/notifications/notification-bell.component';

// Models
import { Main } from './models/main';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy, OnInit {
  public identity: any;
  public main!: Main;

  // Urls
  public urlMain: string = GlobalMain.url;

  // Console Settings
  public document: string = 'app.component.ts';
  public customConsoleCSS = 'background-color: green; color: white; padding: 1em;';

  // ank
  public colors: any = {
    titleM: '#29303b',
    textM: '#29303b',
    linkM: '#4b8ff5',
    bg1M: '#ffffff',
    bg2M: '#88eff9',
    rgbTxtM: 'rgb(41, 48, 59)',
    facebook: '#0a58ca',
    whatsApp: '#48C02D',
    twitter: '#1C9BEA',
    gmail: '#CF4B3B',
    linkedIn: '#2465AA',
    udark: '#050505',
    tdark: '#000000',
    ulight: '#f5f5f5',
    tlight: '#ffffff',
    trdark25: 'rgba(0,0,0,0.25)',
  };

  // Utility
  public windowWidth = 0;
  public readonly fallbackLogoUrl = '/assets/images/M&RALowQuality.png?v=20260710-serverless';
  private cssCreateTimer?: ReturnType<typeof setTimeout>;
  private lastCssCreateAt = 0;
  private stylesheetsReady?: Promise<void>;
  private routeEventsSubscription?: Subscription;
  private refreshSessionSubscription?: Subscription;
  private notificationClickRoutingStarted = false;

  constructor(
    private _mainService: MainService,

    private _webService: WebService,
    private _angora: NgxAngoraService,
    private _location: Location,
    private _router: Router,

    private _sharedService: SharedService,
    private _userService: UserService,
    private _authFacade: AuthFacade,
    private _casesFeature: CasesFeatureService,
    private _injector: Injector,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.windowWidth = isPlatformBrowser(this.platformId) ? window.innerWidth : 0;
    this._authFacade.hydrate();
    this.routeEventsSubscription = this._router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.shareMain();
        this.scrollMainToTop();
        this.scheduleCssCreate(true);
      });

    _sharedService.changeEmitted$.subscribe((sharedContent) => {
      if (
        typeof sharedContent === 'object' &&
        sharedContent.from !== 'app' &&
        (sharedContent.to === 'app' || sharedContent.to === 'all')
      ) {
        switch (sharedContent.property) {
          case 'main':
            this.main = sharedContent.thing;
            break;
          case 'windowWidth':
            this.windowWidth = sharedContent.thing;
            break;
          case 'onlyConsoleMessage':
            this._webService.consoleLog(
              sharedContent.thing,
              this.document + ' 45',
              this.customConsoleCSS
            );
            break;
        }
      }
    });

    //ank
    this._angora.pushColors(this.colors);
    (async () => {
      try {
        let main = await this._mainService.getMain().toPromise();

        if (main && main.main) {
          this.main = main.main;
          this._sharedService.emitChange({
            from: 'app',
            to: 'all',
            property: 'main',
            thing: this.main,
          });
          this._webService.consoleLog(main, this.document + ' 68', this.customConsoleCSS);
          this._webService.consoleLog(this.main, this.document + ' 74', this.customConsoleCSS);
        }
      } catch (e: any) {
        if (e.error.errorMessage === 'No hay main.') {
          try {
            let newMain = await this._mainService
              .createMain(
                new Main(
                  '',
                  'Buffete de abogados',
                  null,
                  null,
                  'https://www.facebook.com/montanoyreyesarrazola',
                  '5554127879',
                  'https://twitter.com/HughieMontagne',
                  'montanohugo@hotmail.com',
                  'https://www.linkedin.com/in/hugo-monta%C3%B1o-495aa331/',
                  '5554127879',
                  '',
                  '',
                  'Error 404: <br/> No se ha encontrado la página que buscabas.',
                  'abogado, buffete de abogados, contrato, ciudad de México, México',
                  null
                )
              )
              .toPromise();

            this._webService.consoleLog(newMain, this.document + ' 143', this.customConsoleCSS);

            if (!newMain || !newMain.main) {
              throw new Error('No se pudo crear el main.');
            }

            this.main = newMain.main;
            this.scheduleCssCreate(true);
            this._sharedService.emitChange({
              from: 'app',
              to: 'all',
              property: 'main',
              thing: this.main,
            });
          } catch (error: any) {
            this._webService.consoleLog(error, this.document + ' 168', this.customConsoleCSS);
          }
        } else {
          this._webService.consoleLog(e, this.document + ' 175', this.customConsoleCSS);
        }
      }
    })();

    this.testing;
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.windowWidth = event.target.innerWidth;
    this._sharedService.emitChange({
      from: 'app',
      to: 'all',
      property: 'windowWidth',
      thing: this.windowWidth,
    });
  }

  ngOnInit(): void {
    this._sharedService.emitChange({
      from: 'app',
      to: 'all',
      property: 'onlyConsoleMessage',
      thing: 'Data from app',
    });
    this.scheduleCssCreate(true);
    this.refreshSessionFromCookie();
    if (this.casesFeatureEnabled()) {
      void this.startCaseNotificationClickRouting();
    }
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent) {
    if (event.key === 'identity' || event.key === 'token') {
      this._authFacade.hydrate();
    }
  }

  ngOnDestroy(): void {
    this.routeEventsSubscription?.unsubscribe();
    this.refreshSessionSubscription?.unsubscribe();
    if (this.cssCreateTimer) {
      clearTimeout(this.cssCreateTimer);
    }
  }

  async testing() {
    try {
    } catch (e: any) {}
  }

  backClicked() {
    this._location.back();
  }

  isAdminUser(): boolean {
    return this._authFacade.isAdmin();
  }

  isAuthenticatedUser(): boolean {
    return this._authFacade.isAuthenticated();
  }

  casesFeatureEnabled(): boolean {
    return this._casesFeature.isEnabled();
  }

  logout(): void {
    this._authFacade.logout();
  }

  private refreshSessionFromCookie(): void {
    if (!isPlatformBrowser(this.platformId) || !ApiRuntime.isV2) {
      return;
    }

    this.refreshSessionSubscription = this._authFacade
      .authStateOnceAfterHydration$()
      .pipe(
        switchMap((state) => {
          if (state.isAuthenticated) {
            return of(null);
          }

          if (consumeAuthStorageFailureReason() !== 'expired') {
            return of(null);
          }

          return this._userService.refreshSession().pipe(
            map((response: any) => createAuthSession(response?.user, response?.token)),
            catchError(() => of(null))
          );
        })
      )
      .subscribe((session) => {
        if (session) {
          this._authFacade.setCredentials(session.identity, session.token);
        }
      });
  }

  headerLogoUrl(): string {
    const logo = this.main?.logo;
    if (!logo) {
      return this.fallbackLogoUrl;
    }

    return (
      this.stableHeaderLogoUrl(logo.publicUrl) ||
      this.stableHeaderLogoUrl(this.absoluteApiFileUrl(logo.url)) ||
      this.fallbackLogoUrl
    );
  }

  headerLogoAlt(): string {
    return this.main?.logo?.title || 'Montaño & Reyes Arrazola S.C.';
  }

  useFallbackLogo(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (image && image.src !== this.fallbackLogoUrl) {
      image.src = this.fallbackLogoUrl;
    }
  }

  private scheduleCssCreate(force = false): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (force && this.cssCreateTimer) {
      clearTimeout(this.cssCreateTimer);
      this.cssCreateTimer = undefined;
    }

    if (this.cssCreateTimer) {
      return;
    }

    const elapsed = Date.now() - this.lastCssCreateAt;
    const wait = force ? 0 : Math.max(0, 250 - elapsed);

    this.cssCreateTimer = setTimeout(() => {
      this.cssCreateTimer = undefined;
      this.lastCssCreateAt = Date.now();
      void this.runCssCreate(force);
    }, wait);
  }

  private async runCssCreate(force = false): Promise<void> {
    await this.ensureAngoraStylesheets();
    this._angora.cssCreate(undefined, force);
  }

  private ensureAngoraStylesheets(): Promise<void> {
    if (this.stylesheetsReady) {
      return this.stylesheetsReady;
    }

    const stylesheets = ['assets/css/angora-styles.css', 'assets/css/angora-styles-responsive.css'];

    this.stylesheetsReady = Promise.all(
      stylesheets.map((href) => this.ensureStylesheetLoaded(href))
    ).then(() => undefined);

    return this.stylesheetsReady;
  }

  private ensureStylesheetLoaded(href: string): Promise<void> {
    const selector = `link[href$="${href}"]`;
    const existingLink = document.querySelector<HTMLLinkElement>(selector);
    const link = existingLink || document.createElement('link');

    if (!existingLink) {
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    if (link.sheet) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finish = () => resolve();
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', finish, { once: true });
      setTimeout(finish, 1500);
    });
  }

  private absoluteApiFileUrl(pathOrUrl: string | null | undefined): string {
    if (!pathOrUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    const apiOrigin = ApiRuntime.url.replace(/\/api\/v2$/, '');
    return pathOrUrl.startsWith('/')
      ? `${apiOrigin}${pathOrUrl}`
      : `${ApiRuntime.url}/${pathOrUrl.replace(/^\/+/, '')}`;
  }

  private stableHeaderLogoUrl(pathOrUrl: string | null | undefined): string {
    if (!pathOrUrl) {
      return '';
    }

    const trimmed = pathOrUrl.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.startsWith(`${ApiRuntime.url}/files/`)) {
      return '';
    }

    return trimmed;
  }

  private shareMain(): void {
    if (!this.main) {
      return;
    }

    this._sharedService.emitChange({
      from: 'app',
      to: 'all',
      property: 'main',
      thing: this.main,
    });
  }

  private scrollMainToTop(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.querySelector<HTMLElement>('.site-main')?.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }

  private async startCaseNotificationClickRouting(): Promise<void> {
    if (this.notificationClickRoutingStarted) {
      return;
    }

    this.notificationClickRoutingStarted = true;
    try {
      const { CaseWebPushService } = await import(
        './components/notifications/case-web-push.service'
      );
      this._injector.get(CaseWebPushService).startNotificationClickRouting();
    } catch (error: any) {
      this._webService.consoleLog(
        error,
        this.document + ' notification-click-routing',
        this.customConsoleCSS
      );
    }
  }
}
