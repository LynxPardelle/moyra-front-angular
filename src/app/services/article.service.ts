import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiRuntime,
  GlobalArticle,
  apiUrl,
  jsonAuthHeaders,
  storedToken,
  toApiPayload,
  toLegacyEntity,
} from './global';

@Injectable()
export class ArticleService {
  public urlArticle: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlArticle = GlobalArticle.url;
  }

  pruebas() {
    return 'Soy el servicio de article.';
  }

  createArticle(article: any): Observable<any> {
    const body = JSON.stringify(
      toApiPayload(article, ['mainImg'], ['sections'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.post(apiUrl('/articles'), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          article: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.post(this.urlArticle + 'article', body, {
      headers: headers,
    });
  }

  createArticleSection(
    articleSection: any,
    articleId: string
  ): Observable<any> {
    const body = JSON.stringify(
      toApiPayload(articleSection, ['mainFile'], ['files', 'insertions'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http
        .post(apiUrl(`/articles/${articleId}/sections`), body, { headers })
        .pipe(
          map((response: any) => ({
            ...response,
            articleSection: toLegacyEntity(response.item),
          }))
        );
    }

    return this._http.post(
      this.urlArticle + 'article-section' + articleId,
      body,
      {
        headers: headers,
      }
    );
  }

  getArticles(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl('/articles')).pipe(
        map((response: any) => {
          const articles = toLegacyEntity(response.items || []);
          return {
            ...response,
            total_items: articles.length,
            pages: 1,
            articles,
          };
        })
      );
    }

    const articles = 'articles/' + page + '/' + ipp + '/' + sort;
    return this._http.get(this.urlArticle + articles);
  }

  getArticle(id: string): Observable<any> {
    if (ApiRuntime.isV2) {
      return this._http.get(apiUrl(`/articles/${id}`)).pipe(
        map((response: any) => ({
          ...response,
          article: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.get(this.urlArticle + 'article/' + id);
  }

  updateArticle(id: string, article: any): Observable<any> {
    const body = JSON.stringify(
      toApiPayload(article, ['mainImg'], ['sections'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.put(apiUrl(`/articles/${id}`), body, { headers }).pipe(
        map((response: any) => ({
          ...response,
          article: toLegacyEntity(response.item),
          articleUpdated: toLegacyEntity(response.item),
        }))
      );
    }

    return this._http.put(this.urlArticle + 'article/' + id, body, {
      headers: headers,
    });
  }

  updateArticleSection(id: string, articleSection: any): Observable<any> {
    const articleId = articleSection.articleId || articleSection.article || id;
    const body = JSON.stringify(
      toApiPayload(articleSection, ['mainFile'], ['files', 'insertions'])
    );
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http
        .put(apiUrl(`/articles/${articleId}/sections/${id}`), body, { headers })
        .pipe(
          map((response: any) => ({
            ...response,
            articleSection: toLegacyEntity(response.item),
            articleSectionUpdated: toLegacyEntity(response.item),
          }))
        );
    }

    return this._http.put(this.urlArticle + 'article-section/' + id, body, {
      headers: headers,
    });
  }

  deleteArticle(id: string): Observable<any> {
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.delete(apiUrl(`/articles/${id}`), { headers });
    }

    return this._http.delete(this.urlArticle + 'article/' + id, {
      headers: headers,
    });
  }

  deleteArticleSection(id: string): Observable<any> {
    const headers = this.authHeaders();

    if (ApiRuntime.isV2) {
      return this._http.delete(apiUrl(`/articles/${id}/sections/${id}`), {
        headers,
      });
    }

    return this._http.delete(this.urlArticle + 'article-section/' + id, {
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
