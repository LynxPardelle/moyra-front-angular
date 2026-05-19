import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl, jsonAuthHeaders, storedToken } from './global';

@Injectable()
export class FileService {
  public token: any;

  constructor(private _http: HttpClient) {}

  getFiles(): Observable<any> {
    return this._http.get(apiUrl('/files'), { headers: this.authHeaders() });
  }

  deleteFile(id: string, force = false): Observable<any> {
    const url = `${apiUrl(`/files/${encodeURIComponent(id)}`)}${force ? '?force=true' : ''}`;
    return this._http.delete(url, { headers: this.authHeaders() });
  }

  getToken() {
    this.token = storedToken();
    return this.token;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(jsonAuthHeaders(this.getToken()));
  }
}
