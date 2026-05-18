import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiRuntime,
  GlobalPublication,
  apiUrl,
  jsonAuthHeaders,
  storedToken,
  toApiPayload,
  toLegacyEntity,
} from './global';

@Injectable()
export class PublicationService {
  public urlPublication: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlPublication = GlobalPublication.url;
  }

  pruebas() {
    return 'Soy el servicio de publication.';
  }

  createPublication(publication: any): Observable<any> {
    const body = JSON.stringify(
      toApiPayload(publication, ['mainFile'], ['files', 'insertions'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.post(apiUrl('/publications'), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          publication: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.post(this.urlPublication + 'publication', body, {
      headers: headers,
    });
  }

  getPublications(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl('/publications')).pipe(
        map((response: any) => {
          const publications = toLegacyEntity(response.items || []);
          return {
            ...response,
            total_items: publications.length,
            pages: 1,
            publications,
          };
        })
      );
    }

    const publications = 'publications/' + page + '/' + ipp + '/' + sort;
    return this._http.get(this.urlPublication + publications);
  }

  getPublication(id: string): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl(`/publications/${id}`)).pipe(
        map((response: any) => ({
          ...response,
          publication: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.get(this.urlPublication + 'publication/' + id);
  }

  updatePublication(id: string, publication: any): Observable<any> {
    const body = JSON.stringify(
      toApiPayload(publication, ['mainFile'], ['files', 'insertions'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http
        .put(apiUrl(`/publications/${id}`), body, { headers })
        .pipe(
          map((response: any) => ({
            ...response,
            publication: toLegacyEntity(response.item),
            publicationUpdated: toLegacyEntity(response.item),
          }))
        );
    }

    return this._http.put(this.urlPublication + 'publication/' + id, body, {
      headers: headers,
    });
  }

  deletePublication(id: string): Observable<any> {
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.delete(apiUrl(`/publications/${id}`), { headers });
    }

    return this._http.delete(this.urlPublication + 'publication/' + id, {
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
