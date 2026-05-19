import { Component, DoCheck, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { NgxAngoraService } from 'ngx-angora-css';

// Services
import { ApiRuntime, GlobalMain, isAdminIdentity } from './services/global';
import { MainService } from './services/main.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { SharedService } from './services/shared.service';

// Models
import { Main } from './models/main';
@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements DoCheck, OnInit {
  public identity: any;
  public main!: Main;

  // Urls
  public urlMain: string = GlobalMain.url;

  // Console Settings
  public document: string = 'app.component.ts';
  public customConsoleCSS =
    'background-color: green; color: white; padding: 1em;';

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
    trdark25: 'rgba(0,0,0,0.25)'
  };

  // Utility
  public windowWidth = 0;
  public readonly fallbackLogoUrl = '/assets/images/M&RALowQuality.png';
  private cssCreateTimer?: ReturnType<typeof setTimeout>;
  private lastCssCreateAt = 0;
  private stylesheetsReady?: Promise<void>;

  constructor(
    private _mainService: MainService,
    private _userService: UserService,

    private _webService: WebService,
    private _angora: NgxAngoraService,
    private _location: Location,

    private _sharedService: SharedService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.windowWidth = isPlatformBrowser(this.platformId) ? window.innerWidth : 0;
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

    // Identity
    this.identity = this._userService.getIdentity();
    this._webService.consoleLog(
      this.identity,
      this.document + ' 58',
      this.customConsoleCSS
    );
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
          this._webService.consoleLog(
            main,
            this.document + ' 68',
            this.customConsoleCSS
          );
          this._webService.consoleLog(
            this.main,
            this.document + ' 74',
            this.customConsoleCSS
          );
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

            this._webService.consoleLog(
              newMain,
              this.document + ' 143',
              this.customConsoleCSS
            );

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
            this._webService.consoleLog(
              error,
              this.document + ' 168',
              this.customConsoleCSS
            );
          }
        } else {
          this._webService.consoleLog(
            e,
            this.document + ' 175',
            this.customConsoleCSS
          );
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
  }

  ngDoCheck(): void {
    this.identity = this._userService.getIdentity();
    this._sharedService.emitChange({
      from: 'app',
      to: 'all',
      property: 'main',
      thing: this.main,
    });
    this.scheduleCssCreate();
  }

  async testing() {
    try {
    } catch (e: any) {}
  }

  backClicked() {
    this._location.back();
  }

  isAdminUser(): boolean {
    return isAdminIdentity(this.identity);
  }

  headerLogoUrl(): string {
    const logo = this.main?.logo;
    if (!logo) {
      return this.fallbackLogoUrl;
    }

    return (
      logo.publicUrl ||
      this.absoluteApiFileUrl(logo.url) ||
      (logo.location
        ? `${ApiRuntime.url}/files/main/${encodeURIComponent(logo.location)}`
        : this.fallbackLogoUrl)
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

    const stylesheets = [
      'assets/css/angora-styles.css',
      'assets/css/angora-styles-responsive.css',
    ];

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
}
