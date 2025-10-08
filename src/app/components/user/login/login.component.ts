import {
  Component,
  OnInit,
  Input
} from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';


// Services
import { MainService } from '../../../services/main.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';
import { SharedService } from '../../../services/shared.service';

// Models
import { Main } from '../../../models/main';
import { User } from '../../../models/user';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public user: User = new User('', '', '', '', '', new Date());
  public identity: any;
  public token: any;

  // Console Settings
  public document: string = 'login.component.ts';
  public customConsoleCSS =
    'background-color: red; color: white; padding: 1em;';

  constructor(
    private _userService: UserService,

    private _route: ActivatedRoute,
    private _router: Router,
    private _webService: WebService
  ) {}

  ngOnInit(): void {}

  async onSubmit() {
    try {
      let user = await this._userService.login(this.user).toPromise();
      if (!user || !user.user) {
        throw new Error('No se encontró el usuario.');
      }

      let token = await this._userService.login(this.user, true).toPromise();
      if (!token || !token.token) {
        throw new Error('No se pudo conseguir el token.');
      }

      this.identity = user.user;
      this._webService.consoleLog(
        this.identity,
        this.document + ' 57',
        this.customConsoleCSS
      );
      this.token = token.token;
      this._webService.consoleLog(
        this.token,
        this.document + ' 63',
        this.customConsoleCSS
      );

      //LocalStorage del identity
      localStorage.setItem('identity', JSON.stringify(this.identity));

      //LocalStorage del token
      localStorage.setItem('token', this.token);

      this._router.navigate(['/inicio']);

      //Alerta
      Swal.fire({
        title: 'Usuario logueado correctamente',
        html: 'El usuario se ha identificado correctamente.',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-bg-whatsApp',
          closeButton: 'bg-whatsApp',
          confirmButton: 'bg-whatsApp',
        }
      });
    } catch (e: any) {
      this._webService.consoleLog(
        e,
        this.document + ' 59',
        this.customConsoleCSS
      );

      //Alerta
      Swal.fire({
        title: 'Usuario no logueado',
        html:
          'El usuario no se ha logueado correctamente. <br/> ' +
          e.error.message,
        icon: 'error',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-titleM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        }
      });
    }
  }
}
