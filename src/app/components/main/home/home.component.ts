import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import { ArticleService } from '../../../services/article.service';
import { MainService } from '../../../services/main.service';
import { PublicationService } from '../../../services/publication.service';
import { ServicioService } from '../../../services/servicio.service';
import { WebService } from '../../../services/web.service';
import { PublicationsComponent } from '../../publication/publications/publications.component';
import { richContentPlainText } from '../../../utils/rich-content';

@Component({
  selector: 'app-home',
  imports: [RouterLink, PublicationsComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  public main: any;
  public services: any[] = [];
  public publications: any[] = [];
  public articles: any[] = [];
  public loading = true;

  private readonly consoleStyle = 'background-color: #29303b; color: white; padding: 1em;';

  constructor(
    private _mainService: MainService,
    private _servicioService: ServicioService,
    private _publicationService: PublicationService,
    private _articleService: ArticleService,
    private _webService: WebService,
    private _title: Title,
    private _meta: Meta
  ) {}

  ngOnInit(): void {
    this.setSeo();
    void this.loadHome();
  }

  async loadHome(): Promise<void> {
    this.loading = true;

    const [main, services, publications, articles] = await Promise.all([
      this.safeLoad(() => this._mainService.getMain().toPromise(), null, 'main'),
      this.safeLoad(() => this._servicioService.getServicios().toPromise(), null, 'services'),
      this.safeLoad(
        () => this._publicationService.getPublications().toPromise(),
        null,
        'publications'
      ),
      this.safeLoad(() => this._articleService.getArticles().toPromise(), null, 'articles'),
    ]);

    this.main = main?.main || null;
    this.services = (services?.servicios || []).slice(0, 3);
    this.publications = (publications?.publications || []).slice(0, 3);
    this.articles = (articles?.articles || []).slice(0, 3);
    this.loading = false;
  }

  itemId(item: any): string {
    return item?.urltitle || item?.slug || item?._id || item?.id || '';
  }

  fileUrl(file: any): string {
    return file?.publicUrl || '';
  }

  heroImage(): string {
    return this.fileUrl(this.main?.mainImg || this.main?.seoImg || this.main?.logo);
  }

  text(key: string, fallback: string): string {
    const value = this.main?.pageTexts?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  excerpt(text: string, length = 180): string {
    const cleanText = richContentPlainText(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanText.length <= length) {
      return cleanText;
    }

    return cleanText.slice(0, length - 1).trimEnd() + '...';
  }

  private async safeLoad<T>(
    load: () => Promise<T | undefined>,
    fallback: T,
    label: string
  ): Promise<T> {
    try {
      return (await load()) || fallback;
    } catch (error: any) {
      this._webService.consoleLog(error, `home.component.ts ${label}`, this.consoleStyle);
      return fallback;
    }
  }

  private setSeo(): void {
    const title = 'Montaño & Reyes Arrazola S.C. | Abogados en México';
    const description =
      'Firma legal para empresas y personas que necesitan asesoría jurídica clara, prevención de riesgos y defensa estratégica.';

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({
      name: 'keywords',
      content:
        'abogados en México, asesoría legal, derecho corporativo, derecho civil, derecho mercantil',
    });
    this._meta.updateTag({ property: 'og:title', content: title });
    this._meta.updateTag({ property: 'og:description', content: description });
    this._meta.updateTag({ property: 'og:type', content: 'website' });
    this._meta.updateTag({ name: 'twitter:title', content: title });
    this._meta.updateTag({ name: 'twitter:description', content: description });
  }
}
