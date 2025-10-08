import { Component, OnInit, DoCheck, Input } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

// Services
import { GlobalUser, GlobalServicio } from '../../../services/global';
import { ServicioService } from '../../../services/servicio.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';
import { SharedService } from '../../../services/shared.service';

// Models
import { Servicio } from '../../../models/servicio';

// Extras
import Swal from 'sweetalert2';
@Component({
  selector: 'servicio',
  templateUrl: './servicio.component.html',
  styleUrls: ['./servicio.component.scss'],
})
export class ServicioComponent implements OnInit {
  public servicio: Servicio = new Servicio(
    '',
    '',
    null,
    '',
    '',
    '',
    new Date()
  );
  public servicios: Servicio[] = [];
  public identity: any;

  // Urls
  public urlServicio: string = GlobalServicio.url;

  // Edit Settings
  public isAdmin: boolean = false;
  public canChange: boolean = false;
  public editSwitch: boolean = false;

  // Console Settings
  public document: string = 'servicio.component.ts';
  public customConsoleCSS =
    'background-color: #db5600; color: black; padding: 1em;';

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
        sharedContent.from !== 'servicio' &&
        (sharedContent.to === 'servicio' || sharedContent.to === 'all')
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
        await this.checkRoute();
        await this.getServicio();
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

  async getServicio() {
    try {
      if (this._route.params || this.servicio.urltitle !== '') {
        let servicioId: string;
        if (this.servicio._id === '' && this.servicio.urltitle === '') {
          let params: any = await new Promise((resolve, reject) => {
            this._route.params.subscribe((params) => {
              resolve(params);
            });
          });

          if (!params) {
            if (this.isAdmin === true && this.canChange === true) {
              this.editSwitch = true;
            }
            throw new Error('No hay params.');
          }

          this._webService.consoleLog(
            params,
            this.document + ' 148',
            this.customConsoleCSS
          );

          if (!params.id) {
            if (this.isAdmin === true && this.canChange === true) {
              this.editSwitch = true;
            }
            throw new Error('No hay id.');
          }

          this._webService.consoleLog(
            params.id,
            this.document + ' 162',
            this.customConsoleCSS
          );

          servicioId = params.id;
        } else {
          servicioId = this.servicio.urltitle;
        }

        let servicio = await this._servicioService
          .getServicio(servicioId)
          .toPromise();

        if (!servicio || !servicio.servicio) {
          throw new Error('No hay solución.');
        }

        this.servicio = servicio.servicio;
        this._webService.consoleLog(
          this.servicio,
          this.document + ' 125',
          this.customConsoleCSS
        );
      }
    } catch (err) {
      this._webService.consoleLog(
        err,
        this.document + ' 85',
        this.customConsoleCSS
      );
      if (this.isAdmin === true && this.canChange === true) {
        this.editSwitch = true;
      } else {
        this._router.navigate(['**']);
      }
    }
  }

  async onSubmit() {
    try {
      if (
        this.servicio.title !== '' ||
        this.servicio.desc !== '' ||
        this.servicio.urltitle !== ''
      ) {
        if (this.servicio._id !== '') {
          let result = await Swal.fire({
            title: '¿Seguro que quieres hacer los cambios en la solución?',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Si',
            denyButtonText: `No`,
          });

          if (!result) {
            throw new Error('Error con la opción.');
          }

          if (result.isConfirmed) {
            const newServicio = await this._servicioService
              .updateServicio(this.servicio._id, this.servicio)
              .toPromise();

            if (!newServicio) {
              throw new Error('Solución no actualizada.');
            }

            this.servicio = newServicio.servicio;

            Swal.fire({
              title: 'Los cambios se han realizado con éxito',
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
              title: 'No se hicieron los cambios.',
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
        } else {
          let result = await Swal.fire({
            title: '¿Seguro que quieres crear la solución?',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Si',
            denyButtonText: `No`,
          });

          if (!result) {
            throw new Error('Error con la opción.');
          }

          if (result.isConfirmed) {
            const newServicio = await this._servicioService
              .createServicio(this.servicio)
              .toPromise();

            if (!newServicio) {
              throw new Error('Servicio no creado.');
            }

            this.servicio = newServicio.servicio;

            Swal.fire({
              title: 'La creación de la solución se han realizado con éxito',
              text: '',
              icon: 'success',
              customClass: {
                popup: 'bg-bg1M',
                title: 'text-textM',
                closeButton: 'bg-titleM',
                confirmButton: 'bg-titleM',
              },
            });
            this._router.navigate(['/admin/solucion/', this.servicio.urltitle]);
          } else if (result.isDenied) {
            Swal.fire({
              title: 'No se hicieron los cambios.',
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
        }
      } else {
        let falta =
          this.servicio.title === '' &&
          this.servicio.desc === '' &&
          this.servicio.urltitle === ''
            ? 'el título, la descripción y el link-de-la-solucion-sin-acentos-ni-espacios'
            : this.servicio.title === '' && this.servicio.desc === ''
            ? 'el título y la descripción'
            : this.servicio.title === '' && this.servicio.urltitle === ''
            ? 'el título y el link-del-servicio'
            : this.servicio.urltitle === '' && this.servicio.desc === ''
            ? 'el link-del-servicio y la descripción'
            : this.servicio.title === ''
            ? 'el título'
            : this.servicio.desc === ''
            ? ' la descripción'
            : this.servicio.urltitle === ''
            ? ' el link-de-la-solucion-sin-acentos-ni-espacios'
            : '';
        throw new Error(`Faltan datos.
        <br />
        Es necesario poner ${falta}.`);
      }
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        this.document + ' 203',
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

  async deleteServicio(servicioId: string) {
    try {
      let result = await Swal.fire({
        title: '¿Seguro que quieres eliminar la solución?',
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
          throw new Error('No hay solución.');
        }

        await this.getServicio();

        this._webService.consoleLog(
          servicioDeleted,
          this.document + ' 173',
          this.customConsoleCSS
        );

        Swal.fire({
          title: 'La solución se ha eliminado con éxito',
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
          title: 'No se eliminó la solución.',
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

  recoverThingFather(event: any) {
    this.getServicio();
  }

  async pre_load(event: any) {
    try {
      switch (event.type) {
        case 'servicio':
          await this.onSubmit();
          return this.servicio.urltitle;
          break;
        default:
          return '';
          break;
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

      return '';
    }
  }

  switchEdit() {
    this.editSwitch =
      this.canChange === true &&
      this.isAdmin === true &&
      this.servicio._id !== ''
        ? !this.editSwitch
        : this.canChange === true &&
          this.isAdmin === true &&
          this.servicio._id === ''
        ? true
        : false;
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
    let matches = text.match(
      /{{+[-a-zA-Z0-9\[\]\(\)\"\'\<\>\=\+\-.]{2,256}[\S]}}/gi
    );

    if (matches) {
      let i = 0;
      let match: any;
      for (match of matches) {
        let oldMatch = match;
        match = match.replace('{{', '');
        match = match.replace('}}', '');

        if (!match.includes('this.')) {
          match = 'this.' + match;
        }

        let nmatches = match.match(
          /this.[-a-zA-Z0-9\[\]\(\)\"\'\<\>\=\+\-]{2,256}.[-a-zA-Z0-9\[\]\(\)\"\'\<\>\=\+\-]{2,256}/gi
        );

        if (nmatches) {
          match = match.split('.');

          let i = 0;
          let nmatch: any = '';
          let error: boolean = false;
          for (let m of match) {
            if (i === 0) {
              nmatch = m;
            } else {
              if (nmatch !== undefined) {
                let nmatchEval = nmatch + '.' + m;
                let matchEval = eval(nmatchEval);

                if (matchEval !== undefined) {
                  nmatch = nmatch + '.' + m;
                } else {
                  nmatch = undefined;
                  error = true;
                }
              }
            }
            i++;

            if (i >= match.length) {
              if (error === false) {
                let matchEval = eval(nmatch);

                if (matchEval !== undefined && matchEval !== null) {
                  text = text.replace(oldMatch, matchEval);
                } else {
                  text = text.replace(oldMatch, '');
                }
              } else {
                text = text.replace(oldMatch, '');
              }
            }
          }
        } else {
          let matchEval = eval(match);

          if (matchEval !== undefined && matchEval !== null) {
            text = text.replace(oldMatch, matchEval);
          } else {
            text = text.replace(oldMatch, '');
          }
        }

        i++;
      }

      return text;
    } else {
      return text;
    }
  }
}
