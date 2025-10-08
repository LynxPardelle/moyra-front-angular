import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalArticle } from './global';

@Injectable()
export class ArticleService {
  public urlArticle: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlArticle = GlobalArticle.url;
  }

  // Pruebas
  pruebas() {
    return 'Soy el servicio de article.';
  }

  // Create
  createArticle(article: any): Observable<any> {
    let body = JSON.stringify(article);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.post(this.urlArticle + 'article', body, {
      headers: headers,
    });
  }

  createArticleSection(
    articleSection: any,
    articleId: string
  ): Observable<any> {
    let body = JSON.stringify(articleSection);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.post(
      this.urlArticle + 'article-section' + articleId,
      body,
      {
        headers: headers,
      }
    );
  }

  // Get
  getArticles(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    var articles = 'articles/' + page + '/' + ipp + '/' + sort;

    return this._http.get(this.urlArticle + articles);
  }

  getArticle(id: string): Observable<any> {
    return this._http.get(this.urlArticle + 'article/' + id);
  }

  // Put
  updateArticle(id: string, article: any): Observable<any> {
    let body = JSON.stringify(article);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlArticle + 'article/' + id, body, {
      headers: headers,
    });
  }

  updateArticleSection(id: string, articleSection: any): Observable<any> {
    let body = JSON.stringify(articleSection);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlArticle + 'article-section/' + id, body, {
      headers: headers,
    });
  }

  // Delete
  deleteArticle(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.delete(this.urlArticle + 'article/' + id, {
      headers: headers,
    });
  }

  deleteArticleSection(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.delete(this.urlArticle + 'article-section/' + id, {
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
