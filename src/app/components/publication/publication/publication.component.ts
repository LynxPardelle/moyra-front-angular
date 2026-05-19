import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { SafeHtmlPipe } from '../../../pipes/safe-html';
import { renderTemplateExpressions } from '../../../utils/template-value';
import { FileUploaderComponent } from '../../web-utility/file-uploader/file-uploader.component';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'app-publication',
  imports: [CommonModule, FormsModule, RouterLink, SafeHtmlPipe, FileUploaderComponent],
  templateUrl: './publication.component.html',
  styleUrls: ['./publication.component.scss'],
})
export class PublicationComponent implements OnInit {
  public publication: Publication = new Publication(
    '',
    '',
    [],
    '',
    null,
    [],
    '',
    new Date()
  );
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public editSwitch = false;
  public loading = true;
  public urlPublication: string = GlobalPublication.url;

  private readonly consoleStyle =
    'background-color: #244f7a; color: white; padding: 1em;';

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
          this.setSeo();
          return;
        }

        this._router.navigate(['/publications']);
        return;
      }

      const response = await this._publicationService
        .getPublication(publicationId)
        .toPromise();

      if (!response || !response.publication) {
        throw new Error('No hay publicación.');
      }

      this.publication = normalizePublication(response.publication);
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
        ? await this._publicationService
            .updatePublication(existingId, this.publication)
            .toPromise()
        : await this._publicationService
            .createPublication(this.publication)
            .toPromise();

      const savedPublication = response?.publication || response?.publicationUpdated;
      if (!savedPublication) {
        throw new Error('No se pudo guardar la publicación.');
      }

      this.publication = normalizePublication(savedPublication);
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
        err?.error?.message ||
        err?.error?.errorMessage ||
        err?.message ||
        'Error desconocido.';

      this._webService.consoleLog(
        err,
        'publication.component.ts onSubmit',
        this.consoleStyle
      );

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

  async pre_load() {
    await this.onSubmit();
    return this.publicationRecordId(this.publication);
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
  }

  publicationId(publication: any): string {
    return publication?.urltitle || publication?.slug || publication?._id || publication?.id || '';
  }

  publicationRecordId(publication: any): string {
    return publication?._id || publication?.id || '';
  }

  fileUrl(file: any): string {
    if (!file) {
      return '';
    }

    return file.publicUrl || (file.location ? this.urlPublication + 'get-file/' + file.location : '');
  }

  isImage(file: any): boolean {
    return ['gif', 'jpeg', 'jpg', 'png', 'webp'].includes(
      String(file?.type || '').toLowerCase()
    );
  }

  Linkify(
    text: string,
    textcolor: string = '#29303b',
    linkcolor: string = '#4b8ff5'
  ) {
    const value = this._webService.Linkify(text || '', textcolor, linkcolor);
    return value?.text || text || '';
  }

  valuefy(text: string) {
    return renderTemplateExpressions(text || '', {
      ...(this as unknown as Record<string, unknown>),
      publication: this.publication,
    });
  }

  insertionLines(): string {
    return Array.isArray(this.publication.insertions)
      ? this.publication.insertions.join('\n')
      : '';
  }

  updateInsertions(value: string) {
    this.publication.insertions = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private setSeo() {
    const isDetail = Boolean(this.publication.title);
    const title = isDetail
      ? `${this.publication.title} | Montaño & Reyes Arrazola S.C.`
      : 'Nueva publicación | Montaño & Reyes Arrazola S.C.';
    const description = isDetail
      ? excerpt(this.publication.text, 155)
      : 'Publicación legal de Montaño & Reyes Arrazola S.C.';
    const image = this.fileUrl(this.publication.mainFile);

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({
      name: 'keywords',
      content: `publicación legal, ${this.publication.title || 'derecho'}, asesoría legal`,
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
  const cleanText = stripHtml(text || '').replace(/\s+/g, ' ').trim();
  if (cleanText.length <= length) {
    return cleanText;
  }

  return cleanText.slice(0, length - 1).trimEnd() + '...';
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}
