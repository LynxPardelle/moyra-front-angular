import { Component, signal, DoCheck, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';

// Services
import { GlobalUser, GlobalMain } from './services/global';
import { MainService } from './services/main.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { BefService } from './services/bef.service';
import { SharedService } from './services/shared.service';

// Models
import { Main } from './models/main';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
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

  // BEF
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
  public windowWidth = window.innerWidth;

  constructor(
    private _mainService: MainService,
    private _userService: UserService,

    private _webService: WebService,
    private _befService: BefService,
    private _location: Location,

    private _sharedService: SharedService
  ) {
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
    //BEF
    this._befService.pushColors(this.colors);
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

            console.log(newMain);

            if (!newMain || !newMain.main) {
              throw new Error('No se pudo crear el main.');
            }

            this.main = newMain.main;
            this._befService.cssCreate();
            this._sharedService.emitChange({
              from: 'app',
              to: 'all',
              property: 'main',
              thing: this.main,
            });
          } catch (error: any) {
            console.error(error);
          }
        } else {
          console.error(e);
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
    this._befService.cssCreate();
  }

  ngDoCheck(): void {
    this.identity = this._userService.getIdentity();
    this._sharedService.emitChange({
      from: 'app',
      to: 'all',
      property: 'main',
      thing: this.main,
    });
    this._befService.cssCreate();
  }

  async testing() {
    try {
    } catch (e: any) {}
  }

  backClicked() {
    this._location.back();
  }
}
