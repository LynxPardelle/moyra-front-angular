import { Component, OnInit, DoCheck, Input } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

// Services
import { GlobalUser, GlobalMain } from '../../../services/global';
import { MainService } from '../../../services/main.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';
import { SharedService } from '../../../services/shared.service';

// Models
import { Main, Equip } from '../../../models/main';

// Extras
import Swal from 'sweetalert2';
@Component({
  selector: 'we',
  templateUrl: './we.component.html',
  styleUrls: ['./we.component.scss'],
})
export class WeComponent implements OnInit, DoCheck {
  public main!: Main;
  public equips!: Equip[];
  public equip: Equip = new Equip('', '', null, '', 0);
  public identity: any;

  // Urls
  public urlMain: string = GlobalMain.url;

  // Edit Settings
  public isAdmin: boolean = false;
  public canChange: boolean = false;
  public editSwitch: boolean = false;

  // Console Settings
  public document: string = 'we.component.ts';
  public customConsoleCSS =
    'background-color: yellow; color: black; padding: 1em;';
  constructor(
    private _mainService: MainService,
    private _userService: UserService,

    private _webService: WebService,
    private _sharedService: SharedService,
    private _route: ActivatedRoute,
    private _router: Router
  ) {
    _sharedService.changeEmitted$.subscribe((sharedContent) => {
      if (
        typeof sharedContent === 'object' &&
        sharedContent.from !== 'we' &&
        (sharedContent.to === 'we' || sharedContent.to === 'all')
      ) {
        switch (sharedContent.property) {
          case 'main':
            this.main = sharedContent.thing;
            this._webService.consoleLog(
              sharedContent.thing,
              this.document + ' 39',
              this.customConsoleCSS
            );
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
    if (this.identity && this.identity.role === 'ROLE_ADMIN') {
      this.canChange = true;
    }
  }

  ngOnInit(): void {
    this._sharedService.emitChange({
      from: 'we',
      to: 'all',
      property: 'onlyConsoleMessage',
      thing: 'Data from we',
    });

    (async () => {
      try {
        await this.getEquips();
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

  ngDoCheck(): void {}

  async getMain() {
    try {
      const main = await this._mainService.getMain().toPromise();

      if (!main || !main.main) {
        throw new Error('No se encuentra el main.');

        this.main = main.main;

        this._sharedService.emitChange({
          from: 'we',
          to: 'all',
          property: 'main',
          thing: this.main,
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

  async getEquips() {
    try {
      let equips = await this._mainService.getEquips().toPromise();

      if (!equips || !equips.equips) {
        throw new Error('No hay miembros del equipo');
      }

      this.equips = equips.equips;
      this._webService.consoleLog(
        this.equips,
        this.document + ' 79',
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

  async onSubmit(type: string = 'main') {
    try {
      switch (type) {
        case 'main':
          if (
            (this.main.key &&
              this.main.key !== '' &&
              this.main.keyOld &&
              this.main.keyOld !== '') ||
            ((!this.main.key || this.main.key === '') &&
              (!this.main.keyOld || this.main.keyOld === ''))
          ) {
            let result = await Swal.fire({
              title: '¿Seguro que quieres hacer los cambios?',
              showDenyButton: true,
              showCancelButton: true,
              confirmButtonText: 'Si',
              denyButtonText: `No`,
            });

            if (!result) {
              throw new Error('Error con la opción.');
            }

            if (result.isConfirmed) {
              const newMain = await this._mainService
                .updateMain(this.main)
                .toPromise();

              if (!newMain || !newMain.mainUpdated) {
                throw new Error('Main no actualizado.');
              }

              await this.getMain();

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
            throw new Error('Falta poner la llave vieja.');
          }
          break;
        case 'equip':
          if (this.equip.name !== '' || this.equip.desc !== '') {
            if (this.equip._id !== '') {
              let result = await Swal.fire({
                title:
                  '¿Seguro que quieres hacer los cambios en el miembro del equipo?',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Si',
                denyButtonText: `No`,
              });

              if (!result) {
                throw new Error('Error con la opción.');
              }

              if (result.isConfirmed) {
                const newEquip = await this._mainService
                  .updateEquip(this.equip._id, this.equip)
                  .toPromise();

                this._webService.consoleLog(
                  newEquip,
                  this.document + ' 108',
                  this.customConsoleCSS
                );

                if (!newEquip || !newEquip.equipUpdated) {
                  throw new Error('Miembro del equipo no actualizado.');
                }

                await this.getMain();
                await this.getEquips();

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
                title: '¿Seguro que quieres crear el miembro del equipo?',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Si',
                denyButtonText: `No`,
              });

              if (!result) {
                throw new Error('Error con la opción.');
              }

              if (result.isConfirmed) {
                const newEquip = await this._mainService
                  .createEquip(this.equip)
                  .toPromise();

                if (!newEquip || !newEquip.equip) {
                  throw new Error('Miembro del equipo no creado.');
                }

                await this.getMain();
                await this.getEquips();

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
            }
          } else {
            let falta =
              this.equip.name === '' && this.equip.desc === ''
                ? 'el nombre y la descripción'
                : this.equip.name === ''
                ? 'el nombre'
                : this.equip.desc === ''
                ? ' la descripción'
                : '';
            throw new Error(`Faltan datos.
            <br />
            Es necesario poner ${falta}.`);
          }
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
    }
  }

  async deleteEquip(equipId: string) {
    try {
      let result = await Swal.fire({
        title: '¿Seguro que quieres eliminar el miembro del equipo?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: `No`,
      });

      if (!result) {
        throw new Error('Error con la opción.');
      }

      if (result.isConfirmed) {
        const equipDeleted = await this._mainService
          .deleteEquip(equipId)
          .toPromise();

        if (!equipDeleted) {
          throw new Error('No hay miembro del equipo.');
        }

        await this.getEquips();

        this._webService.consoleLog(
          equipDeleted,
          this.document + ' 173',
          this.customConsoleCSS
        );

        Swal.fire({
          title: 'El miembro del equipo se ha eliminado con éxito',
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
          title: 'No se eliminó el miembro del equipo.',
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
    this.getMain();
  }

  async pre_load(event: any) {
    try {
      switch (event.type) {
        case 'main':
          //this.onSubmit('main');
          return this.main._id;
          break;
        case 'equip':
          await this.onSubmit('equip');
          return this.equip._id;
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
      this.canChange === true && this.isAdmin === true
        ? !this.editSwitch
        : false;
  }

  switchEquip(equip: Equip) {
    if (this.equip._id !== equip._id) {
      this.equip = equip;
    } else {
      this.equip = new Equip('', '', null, '', 0);
    }
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
