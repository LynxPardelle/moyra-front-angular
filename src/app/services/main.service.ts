import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalMain } from './global';

@Injectable()
export class MainService {
  public urlMain: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlMain = GlobalMain.url;
  }

  // Pruebas
  pruebas() {
    return 'Soy el servicio de main.';
  }

  // Create
  createMain(main: any): Observable<any> {
    let body = JSON.stringify(main);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this._http.post(this.urlMain + 'main', body, {
      headers: headers,
    });
  }

  createEquip(equip: any): Observable<any> {
    let body = JSON.stringify(equip);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.post(this.urlMain + 'equip', body, {
      headers: headers,
    });
  }

  // Get
  getEquips(): Observable<any> {
    return this._http.get(this.urlMain + 'equips');
  }

  getMain(): Observable<any> {
    return this._http.get(this.urlMain + 'main');
  }

  getEquip(id: string): Observable<any> {
    return this._http.get(this.urlMain + 'equip/' + id);
  }

  // Put
  updateMain(main: any): Observable<any> {
    let body = JSON.stringify(main);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlMain + 'main', body, {
      headers: headers,
    });
  }

  updateEquip(id: string, equip: any): Observable<any> {
    let body = JSON.stringify(equip);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlMain + 'equip/' + id, body, {
      headers: headers,
    });
  }

  // Delete
  deleteEquip(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.delete(this.urlMain + 'equip/' + id, {
      headers: headers,
    });
  }

  // LocalStorage
  getToken() {
    this.token = localStorage.getItem('token');

    if (!this.token) {
      this.token = sessionStorage.getItem('token');
    }

    return this.token;
  }
}
