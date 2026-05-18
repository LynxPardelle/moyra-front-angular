import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiRuntime,
  GlobalMain,
  apiUrl,
  jsonAuthHeaders,
  storedToken,
  toApiPayload,
  toLegacyEntity,
} from './global';

@Injectable()
export class MainService {
  public urlMain: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlMain = GlobalMain.url;
  }

  pruebas() {
    return 'Soy el servicio de main.';
  }

  createMain(main: any): Observable<any> {
    const body = JSON.stringify(main);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this._http.post(this.urlMain + 'main', body, {
      headers: headers,
    });
  }

  createEquip(equip: any): Observable<any> {
    const body = JSON.stringify(toApiPayload(equip, ['photo']));
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.post(apiUrl('/team'), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          equip: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.post(this.urlMain + 'equip', body, {
      headers: headers,
    });
  }

  getEquips(): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl('/team')).pipe(
        map((response: any) => ({
          ...response,
          equips: toLegacyEntity(response.items || []),
        }))
      );
    }

    return this._http.get(this.urlMain + 'equips');
  }

  getMain(): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl('/main')).pipe(
        map((response: any) => ({
          ...response,
          main: toLegacyEntity(response.main),
        }))
      );
    }

    return this._http.get(this.urlMain + 'main');
  }

  getEquip(id: string): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl(`/team/${id}`)).pipe(
        map((response: any) => ({
          ...response,
          equip: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.get(this.urlMain + 'equip/' + id);
  }

  updateMain(main: any): Observable<any> {
    const body = JSON.stringify(
      toApiPayload(main, ['logo', 'mainImg', 'seoImg'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.put(apiUrl('/main'), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          main: toLegacyEntity(response.main),
          mainUpdated: toLegacyEntity(response.main),
        }))
      );
    }

    return this._http.put(this.urlMain + 'main', body, {
      headers: headers,
    });
  }

  updateEquip(id: string, equip: any): Observable<any> {
    const body = JSON.stringify(toApiPayload(equip, ['photo']));
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.put(apiUrl(`/team/${id}`), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          equip: toLegacyEntity(response.item),
          equipUpdated: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.put(this.urlMain + 'equip/' + id, body, {
      headers: headers,
    });
  }

  deleteEquip(id: string): Observable<any> {
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.delete(apiUrl(`/team/${id}`), { headers });
    }

    return this._http.delete(this.urlMain + 'equip/' + id, {
      headers: headers,
    });
  }

  getToken() {
    this.token = storedToken();
    return this.token;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(jsonAuthHeaders(this.getToken()));
  }
}
