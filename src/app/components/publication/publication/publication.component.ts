import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

// Services
import { GlobalPublication, isAdminIdentity } from '../../../services/global';
import { PublicationService } from '../../../services/publication.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// Models
import { Publication } from '../../../models/publication';
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
  normalizeRichContentHtml,
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
  selector: 'app-publication',
  imports: [
    FormsModule,
    RouterLink,
    SafeRichHtmlPipe,
    SafeEmbedFrameComponent,
    FileUploaderComponent,
    AiAssistantPanelComponent,
    RichTextEditorComponent,
  ],
  templateUrl: './publication.component.html',
  styleUrls: ['./publication.component.scss'],
})
export class PublicationComponent implements OnInit {
  public publication: Publication = new Publication('', '', [], '', null, [], '', new Date());
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public editSwitch = false;
  public loading = true;
  public urlPublication: string = GlobalPublication.url;
  public previewImage: any = null;
  public embeds: EmbedItem[] = [];

  private generatedSlug = '';
  private slugTouched = false;
  private readonly consoleStyle = 'background-color: #244f7a; color: white; padding: 1em;';

  constructor(
    private _publicationService: PublicationService,
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
    void this.loadPublication();
  }

  async loadPublication() {
    this.loading = true;
    try {
      const params = this._route.snapshot.params || {};
      const publicationId = params['id'];

      if (!publicationId) {
        if (this.isAdmin && this.canChange) {
          this.editSwitch = true;
          this.generatedSlug = '';
          this.slugTouched = false;
          this.setSeo();
          return;
        }

        this._router.navigate(['/publications']);
        return;
      }

      const response = await this._publicationService.getPublication(publicationId).toPromise();

      if (!response || !response.publication) {
        throw new Error('No hay publicación.');
      }

      this.publication = normalizePublication(response.publication);
      this.generatedSlug = this.publication.urltitle || '';
      this.slugTouched = true;
      this.refreshEmbedItems();
      this.editSwitch = this.shouldStartInEditMode();
      this.setSeo();
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'publication.component.ts loadPublication',
        this.consoleStyle
      );

      if (this.isAdmin && this.canChange) {
        this.editSwitch = true;
      } else {
        this._router.navigate(['**']);
      }
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    try {
      this.publication.title = String(this.publication.title || '').trim();
      this.publication.text = String(this.publication.text || '').trim();
      this.publication.seoTitle = String(this.publication.seoTitle || '').trim();
      this.publication.seoDescription = String(this.publication.seoDescription || '').trim();
      this.publication.seoKeywords = String(this.publication.seoKeywords || '').trim();
      this.publication.urltitle = normalizeSlug(
        this.publication.urltitle || this.publication.title
      );

      if (!this.publication.title || !this.publication.text || !this.publication.urltitle) {
        throw new Error(
          'Es necesario poner título, contenido y link-de-la-publicacion-sin-acentos-ni-espacios.'
        );
      }

      const existingId = this.publicationRecordId(this.publication);
      const result = await Swal.fire({
        title: existingId
          ? '¿Seguro que quieres editar la publicación?'
          : '¿Seguro que quieres crear la publicación?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: 'No',
      });

      if (!result.isConfirmed) {
        return;
      }

      const response = existingId
        ? await this._publicationService.updatePublication(existingId, this.publication).toPromise()
        : await this._publicationService.createPublication(this.publication).toPromise();

      const savedPublication = response?.publication || response?.publicationUpdated;
      if (!savedPublication) {
        throw new Error('No se pudo guardar la publicación.');
      }

      this.publication = normalizePublication(savedPublication);
      this.generatedSlug = this.publication.urltitle || '';
      this.slugTouched = true;
      this.refreshEmbedItems();
      this.editSwitch = false;
      this.setSeo();

      await Swal.fire({
        title: existingId
          ? 'Los cambios se han realizado con éxito'
          : 'La publicación se ha creado con éxito',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-textM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        },
      });

      if (this.isAdmin) {
        this._router.navigate(['/admin/publication', this.publicationId(this.publication)]);
      }
    } catch (err: any) {
      const errorMessage =
        err?.error?.message || err?.error?.errorMessage || err?.message || 'Error desconocido.';

      this._webService.consoleLog(err, 'publication.component.ts onSubmit', this.consoleStyle);

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

  async deletePublication(publicationId: string) {
    try {
      const result = await Swal.fire({
        title: '¿Seguro que quieres eliminar la publicación?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Si',
        denyButtonText: 'No',
      });

      if (!result.isConfirmed) {
        return;
      }

      await this._publicationService.deletePublication(publicationId).toPromise();
      await Swal.fire({
        title: 'La publicación se ha eliminado con éxito',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-textM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        },
      });
      this._router.navigate([this.isAdmin ? '/admin/publications' : '/publications']);
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

  async clearMainFile() {
    await this.updatePublicationFiles(() => {
      this.publication.mainFile = null;
    }, 'La imagen principal se quitó de la publicación.');
  }

  async removeRelatedFile(file: any) {
    const fileId = file?.id || file?._id || file;
    await this.updatePublicationFiles(() => {
      this.publication.files = (this.publication.files || []).filter((item: any) => {
        return (item?.id || item?._id || item) !== fileId;
      });
    }, 'El archivo se quitó de la publicación.');
  }

  recoverThingFather() {
    void this.loadPublication();
  }

  private async updatePublicationFiles(update: () => void, successTitle: string) {
    const publicationId = this.publicationRecordId(this.publication);
    if (!publicationId) {
      return;
    }

    const result = await Swal.fire({
      title: '¿Quitar referencia?',
      text: 'Esto no borra el archivo del bucket. Para borrarlo definitivamente usa Administración > Archivos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) {
      return;
    }

    update();
    await this._publicationService.updatePublication(publicationId, this.publication).toPromise();
    await this.loadPublication();
    await Swal.fire({
      title: successTitle,
      icon: 'success',
    });
  }

  async pre_load(event: any) {
    let id = '';
    try {
      await this.onSubmit();
      id = this.publicationRecordId(this.publication);
      return id;
    } finally {
      event.complete?.(id);
    }
  }

  switchEdit() {
    this.editSwitch =
      this.canChange === true &&
      this.isAdmin === true &&
      this.publicationRecordId(this.publication) !== ''
        ? !this.editSwitch
        : this.canChange === true &&
          this.isAdmin === true &&
          this.publicationRecordId(this.publication) === ''
        ? true
        : false;

    if (this.editSwitch === false) {
      this.refreshEmbedItems();
    }
  }

  publicationId(publication: any): string {
    return publication?.urltitle || publication?.slug || publication?._id || publication?.id || '';
  }

  updateTitle(value: string): void {
    this.publication.title = value;
    if (this.publicationRecordId(this.publication) || this.slugTouched) {
      return;
    }

    this.generatedSlug = normalizeSlug(value);
    this.publication.urltitle = this.generatedSlug;
  }

  updateSlug(value: string): void {
    this.slugTouched = true;
    this.publication.urltitle = normalizeSlug(value);
  }

  publicationRecordId(publication: any): string {
    return publication?._id || publication?.id || '';
  }

  fileUrl(file: any): string {
    if (!file) {
      return '';
    }

    return (
      file.publicUrl || (file.location ? this.urlPublication + 'get-file/' + file.location : '')
    );
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

  fileKindLabel(file: any): string {
    return fileKindLabel(file);
  }

  fileKindIconText(file: any): string {
    return fileKindIconText(file);
  }

  fileKindIconClass(file: any): string {
    return fileKindIconClass(file);
  }

  publicationFiles(): any[] {
    return [
      this.publication?.mainFile,
      ...(Array.isArray(this.publication?.files) ? this.publication.files : []),
    ].filter(Boolean);
  }

  publicationFileSummary(): string {
    return fileKindSummary(this.publicationFiles());
  }

  publicationFileBadges(): FileKindBadge[] {
    return fileKindBadges(this.publicationFiles());
  }

  trackFileBadge(index: number, badge: FileKindBadge): string {
    return badge.kind || badge.icon || String(index);
  }

  Linkify(text: string, textcolor: string = '#29303b', linkcolor: string = '#4b8ff5') {
    const value = this._webService.Linkify(text || '', textcolor, linkcolor);
    return value?.text || text || '';
  }

  valuefy(text: string) {
    return renderTemplateExpressions(text || '', {
      ...(this as unknown as Record<string, unknown>),
      publication: this.publication,
    });
  }

  richContent(text: string): string {
    const content = normalizeRichContentHtml(this.valuefy(text));
    return hasHtmlMarkup(content) ? content : this.Linkify(content, '#29303b', '#4b8ff5');
  }

  trackEmbedItem(index: number, embed: EmbedItem): string {
    return embedTrackKey(embed, index);
  }

  insertionLines(): string {
    return Array.isArray(this.publication.insertions) ? this.publication.insertions.join('\n') : '';
  }

  updateInsertions(value: string) {
    this.publication.insertions = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    this.refreshEmbedItems();
  }

  updateYoutube(value: string) {
    this.publication.youtube = value;
    this.refreshEmbedItems();
  }

  editorSteps(): Array<{ label: string; detail: string; complete: boolean }> {
    const hasPublication = Boolean(this.publicationRecordId(this.publication));
    return [
      {
        label: 'Datos',
        detail: !this.publication.title
          ? 'Falta título'
          : this.publication.urltitle
          ? 'Título y liga listos'
          : 'Falta liga',
        complete: Boolean(this.publication.title && this.publication.urltitle),
      },
      {
        label: 'Contenido',
        detail: this.publication.text
          ? `${this.readingMinutes()} min de lectura`
          : 'Falta contenido',
        complete: Boolean(this.publication.text),
      },
      {
        label: 'SEO',
        detail: `${this.seoScore()}% completo`,
        complete: this.seoScore() >= 75,
      },
      {
        label: 'Multimedia',
        detail: hasPublication ? this.publicationFileSummary() : 'Disponible al guardar',
        complete: hasPublication && this.publicationFiles().length > 0,
      },
    ];
  }

  seoChecks(): Array<{ label: string; detail: string; complete: boolean }> {
    const titleLength = this.effectiveSeoTitle().length;
    const descriptionLength = this.effectiveSeoDescription().length;
    const slug = this.publicationId(this.publication);
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
        detail: this.fileUrl(this.publication.mainFile) ? 'Imagen principal lista' : 'Pendiente',
        complete: Boolean(this.fileUrl(this.publication.mainFile)),
      },
    ];
  }

  seoScore(): number {
    const checks = this.seoChecks();
    const complete = checks.filter((check) => check.complete).length;
    return Math.round((complete / checks.length) * 100);
  }

  contentWordCount(): number {
    return richTextWordCount(this.publication.text);
  }

  readingMinutes(): number {
    return Math.max(1, Math.ceil(this.contentWordCount() / 220));
  }

  shareUrl(): string {
    const slug = this.publicationId(this.publication) || 'link-de-la-publicacion';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://moyra.org';
    return `${origin}/publication/${slug}`;
  }

  aiContext(): Record<string, unknown> {
    return {
      title: this.publication.title,
      slug: this.publication.urltitle,
      text: this.publication.text,
      youtube: this.publication.youtube,
      insertions: this.publication.insertions,
      seoTitle: this.publication.seoTitle,
      seoDescription: this.publication.seoDescription,
      seoKeywords: this.publication.seoKeywords,
      seoScore: this.seoScore(),
      shareUrl: this.shareUrl(),
      readingMinutes: this.readingMinutes(),
      fileSummary: this.publicationFileSummary(),
      files: Array.isArray(this.publication.files) ? this.publication.files.length : 0,
      hasMainFile: Boolean(this.fileUrl(this.publication.mainFile)),
    };
  }

  effectiveSeoTitle(): string {
    return (
      String(this.publication.seoTitle || '').trim() ||
      (this.publication.title
        ? `${this.publication.title} | Montaño & Reyes Arrazola S.C.`
        : 'Publicación legal | Montaño & Reyes Arrazola S.C.')
    );
  }

  effectiveSeoDescription(): string {
    return (
      String(this.publication.seoDescription || '').trim() ||
      excerpt(this.publication.text || 'Publicación legal de Montaño & Reyes Arrazola S.C.', 155)
    );
  }

  effectiveSeoKeywords(): string {
    return (
      String(this.publication.seoKeywords || '').trim() ||
      `publicación legal, ${this.publication.title || 'derecho'}, asesoría legal`
    );
  }

  private setSeo() {
    const isDetail = Boolean(this.publication.title);
    const title = isDetail
      ? this.effectiveSeoTitle()
      : 'Nueva publicación | Montaño & Reyes Arrazola S.C.';
    const description = isDetail
      ? this.effectiveSeoDescription()
      : 'Publicación legal de Montaño & Reyes Arrazola S.C.';
    const image = this.fileUrl(this.publication.mainFile);

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

  private refreshEmbedItems(): void {
    this.embeds = buildEmbedItems([
      this.publication.youtube,
      ...(Array.isArray(this.publication.insertions) ? this.publication.insertions : []),
    ]);
  }

  private shouldStartInEditMode(): boolean {
    return (
      this.isAdmin === true &&
      this.canChange === true &&
      this._route.snapshot.queryParamMap.get('edit') === 'true'
    );
  }
}

function normalizePublication(publication: any): Publication {
  return {
    ...publication,
    files: Array.isArray(publication?.files) ? publication.files : [],
    insertions: Array.isArray(publication?.insertions) ? publication.insertions : [],
    urltitle: publication?.urltitle || publication?.slug || '',
    _id: publication?._id || publication?.id || '',
  } as Publication;
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
