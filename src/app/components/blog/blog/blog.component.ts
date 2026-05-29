import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

// Services
import { ArticleService } from '../../../services/article.service';
import { GlobalArticle, isAdminIdentity } from '../../../services/global';
import { MainService } from '../../../services/main.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// Models
import { Article, ArticleSection } from '../../../models/article';
import { SafeRichHtmlPipe } from '../../../pipes/safe-rich-html';
import { SafeEmbedFrameComponent } from '../../web-utility/safe-embed-frame/safe-embed-frame.component';
import { buildEmbedItems, EmbedItem, embedTrackKey } from '../../../utils/embeds';
import { FileKindBadge, fileKindBadges, fileKindSummary } from '../../../utils/file-kind';
import { hasHtmlMarkup, richContentPlainText, richTextWordCount } from '../../../utils/rich-content';

// Extras
import Swal from 'sweetalert2';

type ArticleListItem = {
  article: Article;
  id: string;
  recordId: string;
  mainFileUrl: string;
  mainFileAlt: string;
  richContent: string;
  embeds: EmbedItem[];
  fileSummary: string;
  fileBadges: FileKindBadge[];
  readingMinutes: number;
};

@Component({
  selector: 'app-blog',
  imports: [CommonModule, RouterLink, SafeRichHtmlPipe, SafeEmbedFrameComponent],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss'],
})
export class BlogComponent implements OnInit {
  public articles: Article[] = [];
  public articleItems: ArticleListItem[] = [];
  public main: any = null;
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public loading = true;
  public urlArticle: string = GlobalArticle.url;

  constructor(
    private _articleService: ArticleService,
    private _mainService: MainService,
    private _userService: UserService,
    private _webService: WebService,
    private _router: Router,
    private _title: Title,
    private _meta: Meta
  ) {
    this.identity = this._userService.getIdentity();
    this.canChange = isAdminIdentity(this.identity);
  }

  ngOnInit(): void {
    this.isAdmin = this._router.routerState.snapshot.url.includes('admin');
    this.setSeo();
    void this.loadMainTexts();
    void this.getArticles();
  }

  async loadMainTexts(): Promise<void> {
    try {
      const response = await this._mainService.getMain().toPromise();
      this.main = response?.main || null;
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'blog.component.ts loadMainTexts',
        'background-color: #244f7a; color: white; padding: 1em;'
      );
    }
  }

  async getArticles() {
    this.loading = true;
    try {
      const response = await this._articleService.getArticles().toPromise();
      this.setArticles(response?.articles || []);
      await this.hydrateArticleSections();
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'blog.component.ts getArticles',
        'background-color: #244f7a; color: white; padding: 1em;'
      );
      this.articles = [];
      this.articleItems = [];
    } finally {
      this.loading = false;
    }
  }

  async deleteArticle(articleId: string) {
    try {
      const result = await Swal.fire({
        title: '¿Seguro que quieres eliminar el artículo?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: 'No',
      });

      if (result.isConfirmed) {
        await this._articleService.deleteArticle(articleId).toPromise();
        await this.getArticles();
        await Swal.fire({
          title: 'El artículo se ha eliminado con éxito',
          icon: 'success',
          customClass: {
            popup: 'bg-bg1M',
            title: 'text-textM',
            closeButton: 'bg-titleM',
            confirmButton: 'bg-titleM',
          },
        });
      }
    } catch (err: any) {
      const errorMessage = err?.error?.message || err?.message || 'Error desconocido.';
      await Swal.fire({
        title: 'Error',
        html: `Fallo en la petición.<br/>${errorMessage}`,
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

  articleId(article: any): string {
    return article?.urltitle || article?.slug || article?._id || article?.id || '';
  }

  articleRecordId(article: any): string {
    return article?._id || article?.id || '';
  }

  fileUrl(file: any): string {
    if (!file) {
      return '';
    }

    return file.publicUrl || (file.location ? this.urlArticle + 'get-file/' + file.location : '');
  }

  richContent(text: string): string {
    const content = String(text || '');
    if (hasHtmlMarkup(content)) {
      return content;
    }

    const linked = this._webService.Linkify(content, '#29303b', '#4b8ff5');
    return linked?.text || content;
  }

  articleFiles(article: any): any[] {
    const sections = this.articleSections(article);
    return [
      article?.mainImg,
      ...sections.flatMap((section) => [
        section?.mainFile,
        ...(Array.isArray(section?.files) ? section.files : []),
      ]),
    ].filter(Boolean);
  }

  articleSections(article: any): ArticleSection[] {
    return Array.isArray(article?.sections)
      ? article.sections.filter((section: any) => section && typeof section === 'object')
      : [];
  }

  embedItems(article: any): EmbedItem[] {
    return buildEmbedItems(
      this.articleSections(article).flatMap((section) =>
        Array.isArray(section?.insertions) ? section.insertions : []
      )
    );
  }

  trackArticleItem(index: number, item: ArticleListItem): string {
    return item.id || item.recordId || String(index);
  }

  trackEmbedItem(index: number, embed: EmbedItem): string {
    return embedTrackKey(embed, index);
  }

  trackFileBadge(index: number, badge: FileKindBadge): string {
    return badge.kind || badge.icon || String(index);
  }

  excerpt(text: string, length: number = 220): string {
    const cleanText = richContentPlainText(text).replace(/\s+/g, ' ').trim();
    if (cleanText.length <= length) {
      return cleanText;
    }

    return cleanText.slice(0, length - 1).trimEnd() + '...';
  }

  text(key: string, fallback: string): string {
    const value = this.main?.pageTexts?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private async hydrateArticleSections(): Promise<void> {
    await Promise.all(
      this.articles.map(async (article) => {
        const articleId = this.articleRecordId(article);
        if (!articleId) {
          return;
        }

        try {
          const response = await this._articleService.getArticleSections(articleId).toPromise();
          article.sections = (response?.articleSections || [])
            .map((section: any) => normalizeArticleSection(section, articleId))
            .sort((left: ArticleSection, right: ArticleSection) => {
              return Number(left.order || 0) - Number(right.order || 0);
            });
        } catch (err: any) {
          this._webService.consoleLog(
            err,
            'blog.component.ts hydrateArticleSections',
            'background-color: #244f7a; color: white; padding: 1em;'
          );
          article.sections = this.articleSections(article);
        }
      })
    );

    this.articleItems = this.articles.map((article) => this.buildArticleItem(article));
  }

  private buildArticleItem(article: Article): ArticleListItem {
    const files = this.articleFiles(article);
    const id = this.articleId(article);
    const sections = this.articleSections(article);
    const richContent = [
      article?.intro,
      ...sections.map((section) =>
        section?.title
          ? `<h4>${escapeHtml(section.title)}</h4>${section.text || ''}`
          : section?.text || ''
      ),
      article?.outro,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      article,
      id,
      recordId: this.articleRecordId(article),
      mainFileUrl: this.fileUrl(article?.mainImg),
      mainFileAlt: article?.mainImg?.title || article?.title || 'Artículo',
      richContent: this.richContent(richContent),
      embeds: this.embedItems(article),
      fileSummary: fileKindSummary(files),
      fileBadges: fileKindBadges(files),
      readingMinutes: readingMinutes(richContent),
    };
  }

  private setArticles(articles: Article[]): void {
    this.articles = Array.isArray(articles)
      ? articles.map((article: any) => ({
          ...article,
          sections: Array.isArray(article?.sections) ? article.sections : [],
          urltitle: article?.urltitle || article?.slug || '',
          _id: article?._id || article?.id || '',
        }) as Article)
      : [];
    this.articleItems = this.articles.map((article) => this.buildArticleItem(article));
  }

  private setSeo() {
    const title = 'Blog legal | Montaño & Reyes Arrazola S.C.';
    const description =
      'Artículos legales de Montaño & Reyes Arrazola S.C. sobre derecho corporativo, civil, mercantil y criterios prácticos para tomar decisiones jurídicas.';

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({
      name: 'keywords',
      content: 'blog legal, artículos legales, derecho corporativo, derecho civil, derecho mercantil, abogados en México',
    });
    this._meta.updateTag({ property: 'og:title', content: title });
    this._meta.updateTag({ property: 'og:description', content: description });
    this._meta.updateTag({ property: 'og:type', content: 'website' });
    this._meta.updateTag({ name: 'twitter:title', content: title });
    this._meta.updateTag({ name: 'twitter:description', content: description });
  }
}

function normalizeArticleSection(section: any, articleId: string): ArticleSection {
  return {
    ...section,
    files: Array.isArray(section?.files) ? section.files : [],
    insertions: Array.isArray(section?.insertions) ? section.insertions : [],
    article: section?.article || section?.articleId || articleId,
    articleId: section?.articleId || section?.article || articleId,
    _id: section?._id || section?.id || '',
    order: Number.isFinite(Number(section?.order)) ? Number(section.order) : 0,
  } as ArticleSection;
}

function readingMinutes(text: string): number {
  const words = richTextWordCount(text);
  return Math.max(1, Math.ceil(words / 220));
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
