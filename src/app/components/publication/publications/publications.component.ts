import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

// Services
import { GlobalPublication } from '../../../services/global';
import { PublicationService } from '../../../services/publication.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// Models
import { Publication } from '../../../models/publication';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'publications',
  imports: [CommonModule, RouterLink],
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.scss']
})
export class PublicationsComponent implements OnInit {
  public publications: Publication[] = [];
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public loading = true;
  public urlPublication: string = GlobalPublication.url;

  constructor(
    private _publicationService: PublicationService,
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
    void this.getPublications();
  }

  async getPublications() {
    this.loading = true;
    try {
      const response = await this._publicationService.getPublications().toPromise();
      this.publications = response?.publications || [];
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'publications.component.ts getPublications',
        'background-color: #244f7a; color: white; padding: 1em;'
      );
      this.publications = [];
    } finally {
      this.loading = false;
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

      if (result.isConfirmed) {
        await this._publicationService.deletePublication(publicationId).toPromise();
        await this.getPublications();
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

  excerpt(text: string, length: number = 220): string {
    const cleanText = stripHtml(text || '').replace(/\s+/g, ' ').trim();
    if (cleanText.length <= length) {
      return cleanText;
    }

    return cleanText.slice(0, length - 1).trimEnd() + '...';
  }

  private setSeo() {
    const title = 'Publicaciones legales | Montaño & Reyes Arrazola S.C.';
    const description =
      'Publicaciones y recursos legales de Montaño & Reyes Arrazola S.C. para empresas y personas que buscan certeza jurídica.';

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({
      name: 'keywords',
      content: 'publicaciones legales, derecho corporativo, derecho civil, derecho mercantil, asesoría legal',
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
