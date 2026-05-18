import { Component, OnInit, DoCheck, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, Params, RouterLink } from '@angular/router';

// Services
import { GlobalUser, GlobalServicio } from '../../../services/global';
import { ServicioService } from '../../../services/servicio.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';
import { SharedService } from '../../../services/shared.service';

// Models
import { Servicio } from '../../../models/servicio';
import { SafeHtmlPipe } from '../../../pipes/safe-html';
import { renderTemplateExpressions } from '../../../utils/template-value';

// Extras
import Swal from 'sweetalert2';
@Component({
  selector: 'servicios',
  imports: [CommonModule, RouterLink, SafeHtmlPipe],
  templateUrl: './servicios.component.html',
  styleUrls: ['./servicios.component.scss'],
})
export class ServiciosComponent implements OnInit {
  public servicios: Servicio[] = [];
  public identity: any;

  // Urls
  public urlServicio: string = GlobalServicio.url;

  // Edit Settings
  public isAdmin: boolean = false;
  public canChange: boolean = false;
  public editSwitch: boolean = false;

  // Console Settings
  public document: string = 'servicios.component.ts';
  public customConsoleCSS =
    'background-color: #db8642; color: black; padding: 1em;';
  constructor(
    private _servicioService: ServicioService,
    private _userService: UserService,

    private _webService: WebService,
    private _sharedService: SharedService,
    private _route: ActivatedRoute,
    private _router: Router
  ) {
    _sharedService.changeEmitted$.subscribe((sharedContent) => {
      if (
        typeof sharedContent === 'object' &&
        sharedContent.from !== 'servicios' &&
        (sharedContent.to === 'servicios' || sharedContent.to === 'all')
      ) {
        switch (sharedContent.property) {
          /* case 'main':
            this.main = sharedContent.thing;
            this._webService.consoleLog(
              sharedContent.thing,
              this.document + ' 39',
              this.customConsoleCSS
            );
            break; */
          case 'onlyConsoleMessage':
            this._webService.consoleLog(
              sharedContent.thing,
              this.document + ' 61',
              this.customConsoleCSS
            );
            break;
        }
      }
    });

    // Identity
    this.identity = this._userService.getIdentity();
    if (this.identity && this.identity.role === 'ROLE_ADMIN') {
      this.canChange = true;
    }
  }

  ngOnInit(): void {
    this._sharedService.emitChange({
      from: 'servicios',
      to: 'all',
      property: 'onlyConsoleMessage',
      thing: 'Data from servicios',
    });

    (async () => {
      try {
        await this.getServicios();
        await this.checkRoute();
      } catch (err: any) {
        this._webService.consoleLog(
          err,
          this.document + ' 84',
          this.customConsoleCSS
        );
      }
    })();
  }

  async checkRoute() {
    try {
      // console.log(this._route.snapshot);
      // console.log(this._router.routerState.snapshot.url);
      const url = this._router.routerState.snapshot.url;

      if (!url) {
        throw new Error('¿No hay ruta?');
      }

      if (url.includes('admin')) {
        this.isAdmin = true;
      }

      this._webService.consoleLog(
        this.isAdmin,
        this.document + ' 88',
        this.customConsoleCSS
      );
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        this.document + ' 98',
        this.customConsoleCSS
      );
    }
  }

  async getServicios() {
    try {
      let servicios = await this._servicioService.getServicios().toPromise();

      if (!servicios || !servicios.servicios) {
        throw new Error('No hay servicios.');
      }

      this.servicios = servicios.servicios;
      this._webService.consoleLog(
        this.servicios,
        this.document + ' 125',
        this.customConsoleCSS
      );
    } catch (err) {
      this._webService.consoleLog(
        err,
        this.document + ' 85',
        this.customConsoleCSS
      );
    }
  }

  async deleteServicio(servicioId: string) {
    try {
      let result = await Swal.fire({
        title: '¿Seguro que quieres eliminar el servicio?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: `No`,
      });

      if (!result) {
        throw new Error('Error con la opción.');
      }

      if (result.isConfirmed) {
        const servicioDeleted = await this._servicioService
          .deleteServicio(servicioId)
          .toPromise();

        if (!servicioDeleted) {
          throw new Error('No hay servicio.');
        }

        await this.getServicios();

        this._webService.consoleLog(
          servicioDeleted,
          this.document + ' 173',
          this.customConsoleCSS
        );

        Swal.fire({
          title: 'El servicio se ha eliminado con éxito',
          text: '',
          icon: 'success',
          customClass: {
            popup: 'bg-bg1M',
            title: 'text-textM',
            closeButton: 'bg-titleM',
            confirmButton: 'bg-titleM',
          },
        });
      } else if (result.isDenied) {
        Swal.fire({
          title: 'No se eliminó el servicio.',
          text: '',
          icon: 'info',
          customClass: {
            popup: 'bg-bg1M',
            title: 'text-textM',
            closeButton: 'bg-titleM',
            confirmButton: 'bg-titleM',
          },
        });
      }
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        this.document + ' 108',
        this.customConsoleCSS
      );

      let errorMessage = '';
      if (err.error) {
        errorMessage = err.error.message;
        if (err.error.errorMessage) {
          errorMessage += '<br/>' + err.error.errorMessage;
        }
      } else {
        errorMessage = err.message;
      }

      //Alerta
      Swal.fire({
        title: 'Error',
        html: `Fallo en la petición.
          <br/>
          ${errorMessage}`,
        icon: 'error',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-titleM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        },
      });
    }
  }

  reduceFy(thing: string){
    let reduced: string;
    if(thing.includes('\n') && thing.split('\n')[0].length <= 550){
      reduced = thing.split('\n')[0];
    } else {
      reduced = thing.substring(0, 550) + '...';
    }
    return reduced;
  }

  Linkify(
    text: string,
    textcolor: string = '#ffffff',
    linkcolor: string = '#f9c24f'
  ) {
    let value: any;
    value = {
      text: '',
      matches: [],
    };

    value = this._webService.Linkify(text, textcolor, linkcolor);

    if (value.text) {
      /* this._webService.consoleLog(
        value.matches,
        this.document + ' 105',
        this.customConsoleCSS
      ); */
      return value.text;
    } else {
      return text;
    }
  }

  // Complex functions
  valuefy(text: string) {
    return renderTemplateExpressions(text, this as unknown as Record<string, unknown>);
  }
}
