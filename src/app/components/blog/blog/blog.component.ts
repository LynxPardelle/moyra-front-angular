import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

// Services
import { ArticleService } from '../../../services/article.service';
import { GlobalArticle } from '../../../services/global';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// Models
import { Article } from '../../../models/article';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'app-blog',
  imports: [CommonModule, RouterLink],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss'],
})
export class BlogComponent implements OnInit {
  public articles: Article[] = [];
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public loading = true;
  public urlArticle: string = GlobalArticle.url;

  constructor(
    private _articleService: ArticleService,
    private _userService: UserService,
    private _webService: WebService,
    private _router: Router,
    private _title: Title,
    private _meta: Meta
  ) {
    this.identity = this._userService.getIdentity();
    this.canChange = Boolean(this.identity && this.identity.role === 'ROLE_ADMIN');
  }

  ngOnInit(): void {
    this.isAdmin = this._router.routerState.snapshot.url.includes('admin');
    this.setSeo();
    void this.getArticles();
  }

  async getArticles() {
    this.loading = true;
    try {
      const response = await this._articleService.getArticles().toPromise();
      this.articles = response?.articles || [];
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'blog.component.ts getArticles',
        'background-color: #244f7a; color: white; padding: 1em;'
      );
      this.articles = [];
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

  excerpt(text: string, length: number = 220): string {
    const cleanText = stripHtml(text || '').replace(/\s+/g, ' ').trim();
    if (cleanText.length <= length) {
      return cleanText;
    }

    return cleanText.slice(0, length - 1).trimEnd() + '...';
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

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}
