import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

// Services
import { GlobalPublication, isAdminIdentity } from '../../../services/global';
import { MainService } from '../../../services/main.service';
import { PublicationService } from '../../../services/publication.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// Models
import { Publication } from '../../../models/publication';
import { SafeEmbedUrlPipe } from '../../../pipes/safe-embed-url';
import { SafeRichHtmlPipe } from '../../../pipes/safe-rich-html';
import { buildEmbedItems, EmbedItem, embedTrackKey } from '../../../utils/embeds';
import { FileKindBadge, fileKindBadges, fileKindSummary } from '../../../utils/file-kind';
import { hasHtmlMarkup } from '../../../utils/rich-content';

// Extras
import Swal from 'sweetalert2';

type PublicationListItem = {
  publication: Publication;
  id: string;
  recordId: string;
  mainFileUrl: string;
  mainFileAlt: string;
  richContent: string;
  embeds: EmbedItem[];
  fileSummary: string;
  fileBadges: FileKindBadge[];
};

@Component({
  selector: 'publications',
  imports: [CommonModule, RouterLink, SafeRichHtmlPipe, SafeEmbedUrlPipe],
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.scss']
})
export class PublicationsComponent implements OnChanges, OnInit {
  @Input() embedded = false;
  @Input() maxItems = 0;
  @Input() publicationsInput: Publication[] | null = null;
  @Input() showEmptyState = true;
  @Input() showHeading = true;

  public publications: Publication[] = [];
  public publicationItems: PublicationListItem[] = [];
  public main: any = null;
  public identity: any;
  public isAdmin = false;
  public canChange = false;
  public loading = true;
  public urlPublication: string = GlobalPublication.url;

  constructor(
    private _mainService: MainService,
    private _publicationService: PublicationService,
    private _userService: UserService,
    private _webService: WebService,
    private _router: Router,
    private _title: Title,
    private _meta: Meta
  ) {
    this.identity = this._userService.getIdentity();
    this.canChange = isAdminIdentity(this.identity);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['publicationsInput'] ||
      changes['maxItems'] ||
      changes['embedded']
    ) {
      this.syncPublicationInput();
    }
  }

  ngOnInit(): void {
    this.isAdmin = this._router.routerState.snapshot.url.includes('admin');
    if (!this.embedded) {
      this.setSeo();
    }

    if (this.showHeading) {
      void this.loadMainTexts();
    }

    if (this.publicationsInput) {
      this.syncPublicationInput();
      return;
    }

    void this.getPublications();
  }

  async loadMainTexts(): Promise<void> {
    try {
      const response = await this._mainService.getMain().toPromise();
      this.main = response?.main || null;
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'publications.component.ts loadMainTexts',
        'background-color: #244f7a; color: white; padding: 1em;'
      );
    }
  }

  async getPublications() {
    this.loading = true;
    try {
      const response = await this._publicationService.getPublications().toPromise();
      this.setPublications(response?.publications || []);
    } catch (err: any) {
      this._webService.consoleLog(
        err,
        'publications.component.ts getPublications',
        'background-color: #244f7a; color: white; padding: 1em;'
      );
      this.publications = [];
      this.publicationItems = [];
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

  richContent(text: string): string {
    const content = String(text || '');
    if (hasHtmlMarkup(content)) {
      return content;
    }

    const linked = this._webService.Linkify(content, '#29303b', '#4b8ff5');
    return linked?.text || content;
  }

  embedItems(publication: any): EmbedItem[] {
    return buildEmbedItems([
      publication?.youtube,
      ...(Array.isArray(publication?.insertions) ? publication.insertions : []),
    ]);
  }

  publicationFiles(publication: any): any[] {
    return [
      publication?.mainFile,
      ...(Array.isArray(publication?.files) ? publication.files : []),
    ].filter(Boolean);
  }

  fileSummary(publication: any): string {
    return fileKindSummary(this.publicationFiles(publication));
  }

  fileBadges(publication: any): FileKindBadge[] {
    return fileKindBadges(this.publicationFiles(publication));
  }

  trackPublicationItem(index: number, item: PublicationListItem): string {
    return item.id || item.recordId || String(index);
  }

  trackEmbedItem(index: number, embed: EmbedItem): string {
    return embedTrackKey(embed, index);
  }

  trackFileBadge(index: number, badge: FileKindBadge): string {
    return badge.kind || badge.icon || String(index);
  }

  text(key: string, fallback: string): string {
    const value = this.main?.pageTexts?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
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

  private buildPublicationItem(publication: Publication): PublicationListItem {
    const files = this.publicationFiles(publication);
    const id = this.publicationId(publication);

    return {
      publication,
      id,
      recordId: this.publicationRecordId(publication),
      mainFileUrl: this.fileUrl(publication?.mainFile),
      mainFileAlt: publication?.mainFile?.title || publication?.title || 'Publicación',
      richContent: this.richContent(publication?.text || ''),
      embeds: this.embedItems(publication),
      fileSummary: fileKindSummary(files),
      fileBadges: fileKindBadges(files),
    };
  }

  private setPublications(publications: Publication[]): void {
    this.publications = Array.isArray(publications) ? publications : [];
    const visiblePublications =
      this.maxItems > 0 ? this.publications.slice(0, this.maxItems) : this.publications;

    this.publicationItems = visiblePublications.map((publication) =>
      this.buildPublicationItem(publication)
    );
  }

  private syncPublicationInput(): void {
    if (!this.publicationsInput) {
      return;
    }

    this.setPublications(this.publicationsInput);
    this.loading = false;
  }

}
