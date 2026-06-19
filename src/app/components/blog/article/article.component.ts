import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

// Services
import { ArticleService } from '../../../services/article.service';
import { GlobalArticle, isAdminIdentity } from '../../../services/global';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// Models
import { Article, ArticleSection } from '../../../models/article';
import { SafeRichHtmlPipe } from '../../../pipes/safe-rich-html';
import { renderTemplateExpressions } from '../../../utils/template-value';
import { buildEmbedItems, EmbedItem, embedTrackKey } from '../../../utils/embeds';
import {
  FileKindBadge,
  fileKindBadges,
  fileKindIconClass,
  fileKindIconText,
  fileKindLabel,
  fileKindSummary,
  isImageFile,
} from '../../../utils/file-kind';
import {
  hasHtmlMarkup,
  richContentPlainText,
  richTextWordCount,
} from '../../../utils/rich-content';
import { FileUploaderComponent } from '../../web-utility/file-uploader/file-uploader.component';
import { AiAssistantPanelComponent } from '../../web-utility/ai-assistant-panel/ai-assistant-panel.component';
import { RichTextEditorComponent } from '../../web-utility/rich-text-editor/rich-text-editor.component';
import { SafeEmbedFrameComponent } from '../../web-utility/safe-embed-frame/safe-embed-frame.component';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'app-article',
  imports: [
    FormsModule,
    RouterLink,
    SafeRichHtmlPipe,
    SafeEmbedFrameComponent,
    FileUploaderComponent,
    AiAssistantPanelComponent,
    RichTextEditorComponent,
  ],
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.scss'],
})
export class ArticleComponent implements OnInit {
  public article: Article = new Article('', null, '', '', [], '', '', new Date());
  public articleSections: ArticleSection[] = [];
  public sectionDraft: ArticleSection = emptySection();
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public editSwitch = false;
  public loading = true;
  public urlArticle: string = GlobalArticle.url;
  public previewImage: any = null;

  private generatedSlug = '';
  private slugTouched = false;
  private readonly consoleStyle = 'background-color: #244f7a; color: white; padding: 1em;';

  constructor(
    private _articleService: ArticleService,
    private _userService: UserService,
    private _webService: WebService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _title: Title,
    private _meta: Meta
  ) {
    this.identity = this._userService.getIdentity();
    this.canChange = isAdminIdentity(this.identity);
  }

  ngOnInit(): void {
    this.isAdmin = this._router.routerState.snapshot.url.includes('admin');
    void this.loadArticle();
  }

  async loadArticle() {
    this.loading = true;
    try {
      const params = this._route.snapshot.params || {};
      const articleId = params['id'];

      if (!articleId) {
        if (this.isAdmin && this.canChange) {
          this.editSwitch = true;
          this.articleSections = [];
          this.sectionDraft = emptySection();
          this.generatedSlug = '';
          this.slugTouched = false;
          this.setSeo();
          return;
        }

        this._router.navigate(['/blog']);
        return;
      }

      const response = await this._articleService.getArticle(articleId).toPromise();
      if (!response || !response.article) {
        throw new Error('No hay artículo.');
      }

      this.article = normalizeArticle(response.article);
      this.generatedSlug = this.article.urltitle || '';
      this.slugTouched = true;
      await this.loadSections();
      this.editSwitch = this.shouldStartInEditMode();
      this.setSeo();
    } catch (err: any) {
      this._webService.consoleLog(err, 'article.component.ts loadArticle', this.consoleStyle);

      if (this.isAdmin && this.canChange) {
        this.editSwitch = true;
      } else {
        this._router.navigate(['**']);
      }
    } finally {
      this.loading = false;
    }
  }

  async loadSections() {
    const articleId = this.articleRecordId(this.article);
    if (!articleId) {
      this.articleSections = [];
      this.sectionDraft = emptySection();
      return;
    }

    const response = await this._articleService.getArticleSections(articleId).toPromise();
    this.articleSections = (response?.articleSections || [])
      .map((section: any) => normalizeArticleSection(section, articleId))
      .sort((left: ArticleSection, right: ArticleSection) => {
        return Number(left.order || 0) - Number(right.order || 0);
      });
    this.article.sections = this.articleSections;
    this.sectionDraft = emptySection(articleId, this.articleSections.length);
  }

  async onSubmit() {
    try {
      this.article.title = String(this.article.title || '').trim();
      this.article.intro = String(this.article.intro || '').trim();
      this.article.outro = String(this.article.outro || '').trim();
      this.article.tags = String(this.article.tags || '').trim();
      this.article.seoTitle = String(this.article.seoTitle || '').trim();
      this.article.seoDescription = String(this.article.seoDescription || '').trim();
      this.article.seoKeywords = String(this.article.seoKeywords || '').trim();
      this.article.urltitle = normalizeSlug(this.article.urltitle || this.article.title);
      this.article.sections = this.articleSections
        .map((section: any) => this.articleSectionRecordId(section))
        .filter(Boolean);

      if (!this.article.title || !this.article.intro || !this.article.urltitle) {
        throw new Error(
          'Es necesario poner título, introducción y link-del-articulo-sin-acentos-ni-espacios.'
        );
      }

      const existingId = this.articleRecordId(this.article);
      const result = await Swal.fire({
        title: existingId
          ? '¿Seguro que quieres editar el artículo?'
          : '¿Seguro que quieres crear el artículo?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: 'No',
      });

      if (!result.isConfirmed) {
        return;
      }

      const response = existingId
        ? await this._articleService.updateArticle(existingId, this.article).toPromise()
        : await this._articleService.createArticle(this.article).toPromise();

      const savedArticle = response?.article || response?.articleUpdated;
      if (!savedArticle) {
        throw new Error('No se pudo guardar el artículo.');
      }

      this.article = normalizeArticle(savedArticle);
      this.generatedSlug = this.article.urltitle || '';
      this.slugTouched = true;
      await this.loadSections();
      this.editSwitch = false;
      this.setSeo();

      await Swal.fire({
        title: existingId
          ? 'Los cambios se han realizado con éxito'
          : 'El artículo se ha creado con éxito',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-textM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        },
      });

      if (this.isAdmin) {
        this._router.navigate(['/admin/articulo', this.articleId(this.article)]);
      }
    } catch (err: any) {
      const errorMessage =
        err?.error?.message || err?.error?.errorMessage || err?.message || 'Error desconocido.';

      this._webService.consoleLog(err, 'article.component.ts onSubmit', this.consoleStyle);

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

  async saveSection(section: ArticleSection) {
    try {
      const articleId = this.articleRecordId(this.article);
      if (!articleId) {
        throw new Error('Primero guarda el artículo.');
      }

      const normalizedSection = normalizeArticleSection(section, articleId);
      normalizedSection.title = String(normalizedSection.title || '').trim();
      normalizedSection.text = String(normalizedSection.text || '').trim();
      normalizedSection.insertions = Array.isArray(normalizedSection.insertions)
        ? normalizedSection.insertions
        : [];

      if (!normalizedSection.title || !normalizedSection.text) {
        throw new Error('Es necesario poner título y contenido en la sección.');
      }

      const sectionId = this.articleSectionRecordId(normalizedSection);
      const response = sectionId
        ? await this._articleService.updateArticleSection(sectionId, normalizedSection).toPromise()
        : await this._articleService.createArticleSection(normalizedSection, articleId).toPromise();

      const savedSection = response?.articleSection || response?.articleSectionUpdated;
      if (!savedSection) {
        throw new Error('No se pudo guardar la sección.');
      }

      await this.loadSections();
      await this.syncArticleSectionIds();
      await Swal.fire({
        title: sectionId
          ? 'La sección se ha actualizado con éxito'
          : 'La sección se ha creado con éxito',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-textM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        },
      });
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

  async deleteSection(section: ArticleSection) {
    try {
      const articleId = this.articleRecordId(this.article);
      const sectionId = this.articleSectionRecordId(section);
      if (!articleId || !sectionId) {
        throw new Error('No se encontró la sección.');
      }

      const result = await Swal.fire({
        title: '¿Seguro que quieres eliminar la sección?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: 'No',
      });

      if (!result.isConfirmed) {
        return;
      }

      await this._articleService.deleteArticleSection(articleId, sectionId).toPromise();
      await this.loadSections();
      await this.syncArticleSectionIds();
      await Swal.fire({
        title: 'La sección se ha eliminado con éxito',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-textM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        },
      });
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

  async deleteArticle(articleId: string) {
    try {
      const result = await Swal.fire({
        title: '¿Seguro que quieres eliminar el artículo?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: 'No',
      });

      if (!result.isConfirmed) {
        return;
      }

      await this._articleService.deleteArticle(articleId).toPromise();
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
      this._router.navigate([this.isAdmin ? '/admin/blog' : '/blog']);
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

  async clearArticleImage() {
    const articleId = this.articleRecordId(this.article);
    if (!articleId) {
      return;
    }

    const confirmed = await this.confirmFileDetach();
    if (!confirmed) {
      return;
    }

    this.article.mainImg = null;
    await this._articleService.updateArticle(articleId, this.article).toPromise();
    await this.loadArticle();
    await Swal.fire({ title: 'La imagen principal se quitó del artículo', icon: 'success' });
  }

  async clearSectionMainFile(section: ArticleSection) {
    const confirmed = await this.confirmFileDetach();
    if (!confirmed) {
      return;
    }

    section.mainFile = null;
    await this.saveSection(section);
  }

  async removeSectionFile(section: ArticleSection, file: any) {
    const confirmed = await this.confirmFileDetach();
    if (!confirmed) {
      return;
    }

    const fileId = file?.id || file?._id || file;
    section.files = (section.files || []).filter((item: any) => {
      return (item?.id || item?._id || item) !== fileId;
    });
    await this.saveSection(section);
  }

  recoverThingFather() {
    void this.loadArticle();
  }

  private async confirmFileDetach(): Promise<boolean> {
    const result = await Swal.fire({
      title: '¿Quitar referencia?',
      text: 'Esto no borra el archivo del bucket. Para borrarlo definitivamente usa Administración > Archivos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    });

    return result.isConfirmed;
  }

  async pre_load() {
    await this.onSubmit();
    return this.articleRecordId(this.article);
  }

  switchEdit() {
    this.editSwitch =
      this.canChange === true && this.isAdmin === true && this.articleRecordId(this.article) !== ''
        ? !this.editSwitch
        : this.canChange === true &&
          this.isAdmin === true &&
          this.articleRecordId(this.article) === ''
        ? true
        : false;
  }

  articleId(article: any): string {
    return article?.urltitle || article?.slug || article?._id || article?.id || '';
  }

  updateTitle(value: string): void {
    this.article.title = value;
    if (this.articleRecordId(this.article) || this.slugTouched) {
      return;
    }

    this.generatedSlug = normalizeSlug(value);
    this.article.urltitle = this.generatedSlug;
  }

  updateSlug(value: string): void {
    this.slugTouched = true;
    this.article.urltitle = normalizeSlug(value);
  }

  articleRecordId(article: any): string {
    return article?._id || article?.id || '';
  }

  articleSectionRecordId(section: any): string {
    return section?._id || section?.id || '';
  }

  fileUrl(file: any): string {
    if (!file) {
      return '';
    }

    return file.publicUrl || (file.location ? this.urlArticle + 'get-file/' + file.location : '');
  }

  isImage(file: any): boolean {
    return isImageFile(file);
  }

  openImagePreview(file: any): void {
    if (file && this.isImage(file) && this.fileUrl(file)) {
      this.previewImage = file;
    }
  }

  closeImagePreview(): void {
    this.previewImage = null;
  }

  Linkify(text: string, textcolor: string = '#29303b', linkcolor: string = '#4b8ff5') {
    const value = this._webService.Linkify(text || '', textcolor, linkcolor);
    return value?.text || text || '';
  }

  valuefy(text: string, section?: ArticleSection) {
    return renderTemplateExpressions(text || '', {
      ...(this as unknown as Record<string, unknown>),
      article: this.article,
      section,
    });
  }

  richContent(text: string, section?: ArticleSection): string {
    const content = this.valuefy(text, section);
    return hasHtmlMarkup(content) ? content : this.Linkify(content, '#29303b', '#4b8ff5');
  }

  sectionEmbedItems(section: ArticleSection): EmbedItem[] {
    return buildEmbedItems(Array.isArray(section.insertions) ? section.insertions : []);
  }

  allEmbedItems(): EmbedItem[] {
    return this.articleSections.flatMap((section) => this.sectionEmbedItems(section));
  }

  trackEmbedItem(index: number, embed: EmbedItem): string {
    return embedTrackKey(embed, index);
  }

  trackFileBadge(index: number, badge: FileKindBadge): string {
    return badge.kind || badge.icon || String(index);
  }

  insertionLines(section: ArticleSection): string {
    return Array.isArray(section.insertions) ? section.insertions.join('\n') : '';
  }

  updateInsertions(section: ArticleSection, value: string) {
    section.insertions = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  fileKindLabel(file: any): string {
    return fileKindLabel(file);
  }

  fileKindIconText(file: any): string {
    return fileKindIconText(file);
  }

  fileKindIconClass(file: any): string {
    return fileKindIconClass(file);
  }

  articleFiles(): any[] {
    return [
      this.article?.mainImg,
      ...this.articleSections.flatMap((section) => [
        section?.mainFile,
        ...(Array.isArray(section?.files) ? section.files : []),
      ]),
    ].filter(Boolean);
  }

  articleFileSummary(): string {
    return fileKindSummary(this.articleFiles());
  }

  articleFileBadges(): FileKindBadge[] {
    return fileKindBadges(this.articleFiles());
  }

  sectionFiles(section: ArticleSection): any[] {
    return [section?.mainFile, ...(Array.isArray(section?.files) ? section.files : [])].filter(
      Boolean
    );
  }

  sectionFileSummary(section: ArticleSection): string {
    return fileKindSummary(this.sectionFiles(section));
  }

  sectionFileBadges(section: ArticleSection): FileKindBadge[] {
    return fileKindBadges(this.sectionFiles(section));
  }

  editorSteps(): Array<{ label: string; detail: string; complete: boolean }> {
    const hasArticle = Boolean(this.articleRecordId(this.article));
    return [
      {
        label: 'Datos',
        detail: !this.article.title
          ? 'Falta título'
          : this.article.urltitle
          ? 'Título y liga listos'
          : 'Falta liga',
        complete: Boolean(this.article.title && this.article.urltitle),
      },
      {
        label: 'Contenido',
        detail: this.article.intro
          ? `${this.readingMinutes()} min de lectura`
          : 'Falta introducción',
        complete: Boolean(this.article.intro),
      },
      {
        label: 'SEO',
        detail: `${this.seoScore()}% completo`,
        complete: this.seoScore() >= 75,
      },
      {
        label: 'Multimedia',
        detail: hasArticle ? this.articleFileSummary() : 'Disponible al guardar',
        complete: hasArticle && this.articleFiles().length > 0,
      },
    ];
  }

  seoChecks(): Array<{ label: string; detail: string; complete: boolean }> {
    const titleLength = this.effectiveSeoTitle().length;
    const descriptionLength = this.effectiveSeoDescription().length;
    const slug = this.articleId(this.article);
    return [
      {
        label: 'Título para buscadores',
        detail: `${titleLength} caracteres`,
        complete: titleLength >= 35 && titleLength <= 70,
      },
      {
        label: 'Descripción para compartir',
        detail: `${descriptionLength} caracteres`,
        complete: descriptionLength >= 90 && descriptionLength <= 165,
      },
      {
        label: 'Liga legible',
        detail: slug || 'Sin liga',
        complete: Boolean(slug && slug.length <= 80),
      },
      {
        label: 'Imagen social',
        detail: this.fileUrl(this.article.mainImg) ? 'Imagen principal lista' : 'Pendiente',
        complete: Boolean(this.fileUrl(this.article.mainImg)),
      },
    ];
  }

  seoScore(): number {
    const checks = this.seoChecks();
    const complete = checks.filter((check) => check.complete).length;
    return Math.round((complete / checks.length) * 100);
  }

  contentWordCount(): number {
    const content = [
      this.article.intro,
      ...this.articleSections.map((section) => section.text),
      this.article.outro,
    ].join(' ');
    return richTextWordCount(content);
  }

  readingMinutes(): number {
    return Math.max(1, Math.ceil(this.contentWordCount() / 220));
  }

  shareUrl(): string {
    const slug = this.articleId(this.article) || 'link-del-articulo';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://moyra.org';
    return `${origin}/articulo/${slug}`;
  }

  aiContext(): Record<string, unknown> {
    return {
      title: this.article.title,
      slug: this.article.urltitle,
      intro: this.article.intro,
      outro: this.article.outro,
      tags: this.article.tags,
      seoTitle: this.article.seoTitle,
      seoDescription: this.article.seoDescription,
      seoKeywords: this.article.seoKeywords,
      seoScore: this.seoScore(),
      shareUrl: this.shareUrl(),
      readingMinutes: this.readingMinutes(),
      fileSummary: this.articleFileSummary(),
      sections: this.articleSections.map((section) => ({
        title: section.title,
        text: section.text,
        insertions: Array.isArray(section.insertions) ? section.insertions : [],
        files: Array.isArray(section.files) ? section.files.length : 0,
      })),
    };
  }

  effectiveSeoTitle(): string {
    return (
      String(this.article.seoTitle || '').trim() ||
      (this.article.title
        ? `${this.article.title} | Montaño & Reyes Arrazola S.C.`
        : 'Artículo legal | Montaño & Reyes Arrazola S.C.')
    );
  }

  effectiveSeoDescription(): string {
    return (
      String(this.article.seoDescription || '').trim() ||
      excerpt(
        this.article.intro ||
          this.article.outro ||
          'Artículo legal de Montaño & Reyes Arrazola S.C.',
        155
      )
    );
  }

  effectiveSeoKeywords(): string {
    return (
      String(this.article.seoKeywords || '').trim() ||
      `${this.article.tags || 'blog legal, derecho'}, asesoría legal`
    );
  }

  private async syncArticleSectionIds() {
    const articleId = this.articleRecordId(this.article);
    if (!articleId) {
      return;
    }

    const sectionIds = this.articleSections
      .map((section: any) => this.articleSectionRecordId(section))
      .filter(Boolean);
    this.article.sections = sectionIds;
    await this._articleService.updateArticle(articleId, this.article).toPromise();
  }

  private setSeo() {
    const isDetail = Boolean(this.article.title);
    const title = isDetail
      ? this.effectiveSeoTitle()
      : 'Nuevo artículo | Montaño & Reyes Arrazola S.C.';
    const description = isDetail
      ? this.effectiveSeoDescription()
      : 'Artículo legal de Montaño & Reyes Arrazola S.C.';
    const image = this.fileUrl(this.article.mainImg);

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({
      name: 'keywords',
      content: this.effectiveSeoKeywords(),
    });
    this._meta.updateTag({ property: 'og:title', content: title });
    this._meta.updateTag({ property: 'og:description', content: description });
    this._meta.updateTag({ property: 'og:type', content: 'article' });
    this._meta.updateTag({ name: 'twitter:title', content: title });
    this._meta.updateTag({ name: 'twitter:description', content: description });

    if (image) {
      this._meta.updateTag({ property: 'og:image', content: image });
      this._meta.updateTag({ name: 'twitter:image', content: image });
    }
  }

  private shouldStartInEditMode(): boolean {
    return (
      this.isAdmin === true &&
      this.canChange === true &&
      this._route.snapshot.queryParamMap.get('edit') === 'true'
    );
  }
}

function normalizeArticle(article: any): Article {
  return {
    ...article,
    sections: Array.isArray(article?.sections) ? article.sections : [],
    urltitle: article?.urltitle || article?.slug || '',
    _id: article?._id || article?.id || '',
  } as Article;
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

function emptySection(articleId: string = '', order: number = 0): ArticleSection {
  return {
    title: '',
    text: '',
    mainFile: null,
    files: [],
    order,
    insertions: [],
    article: articleId,
    articleId,
  } as ArticleSection;
}

function normalizeSlug(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function excerpt(text: string, length: number): string {
  const cleanText = richContentPlainText(text).replace(/\s+/g, ' ').trim();
  if (cleanText.length <= length) {
    return cleanText;
  }

  return cleanText.slice(0, length - 1).trimEnd() + '...';
}
