import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiRuntime,
  GlobalServicio,
  apiUrl,
  jsonAuthHeaders,
  storedToken,
  toApiPayload,
  toLegacyEntity,
} from './global';

@Injectable()
export class ServicioService {
  public urlServicio: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlServicio = GlobalServicio.url;
  }

  pruebas() {
    return 'Soy el servicio de servicio.';
  }

  createServicio(servicio: any): Observable<any> {
    const body = JSON.stringify(toApiPayload(servicio, ['mainImg']));
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.post(apiUrl('/services'), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          servicio: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.post(this.urlServicio + 'servicio', body, {
      headers: headers,
    });
  }

  getServicios(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl('/services')).pipe(
        map((response: any) => {
          const servicios = toLegacyEntity(response.items || []);
          return {
            ...response,
            total_items: servicios.length,
            pages: 1,
            servicios,
          };
        })
      );
    }

    const servicios = 'servicios/' + page + '/' + ipp + '/' + sort;
    return this._http.get(this.urlServicio + servicios);
  }

  getServicio(id: string): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl(`/services/${id}`)).pipe(
        map((response: any) => ({
          ...response,
          servicio: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.get(this.urlServicio + 'servicio/' + id);
  }

  updateServicio(id: string, servicio: any): Observable<any> {
    const body = JSON.stringify(toApiPayload(servicio, ['mainImg']));
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.put(apiUrl(`/services/${id}`), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          servicio: toLegacyEntity(response.item),
          servicioUpdated: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.put(this.urlServicio + 'servicio/' + id, body, {
      headers: headers,
    });
  }

  deleteServicio(id: string): Observable<any> {
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.delete(apiUrl(`/services/${id}`), { headers });
    }

    return this._http.delete(this.urlServicio + 'servicio/' + id, {
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
