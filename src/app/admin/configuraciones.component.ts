import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainService } from '../services/main.service';
import Swal from 'sweetalert2';

type ConfigField = {
  key: string;
  label: string;
  multiline?: boolean;
  section: string;
};

const PAGE_TEXT_FIELDS: ConfigField[] = [
  { section: 'Inicio', key: 'homeHeroEyebrow', label: 'Etiqueta del hero' },
  { section: 'Inicio', key: 'homeHeroTitle', label: 'Título del hero' },
  { section: 'Inicio', key: 'homeHeroServicesCta', label: 'Botón a soluciones' },
  { section: 'Inicio', key: 'homeHeroPublicationsCta', label: 'Botón a publicaciones' },
  { section: 'Inicio', key: 'homeServicesEyebrow', label: 'Etiqueta de soluciones' },
  { section: 'Inicio', key: 'homeServicesTitle', label: 'Título de soluciones' },
  { section: 'Inicio', key: 'homeBlogEyebrow', label: 'Etiqueta de blog' },
  { section: 'Inicio', key: 'homeBlogTitle', label: 'Título de blog' },
  { section: 'Inicio', key: 'homePublicationsEyebrow', label: 'Etiqueta de publicaciones' },
  { section: 'Inicio', key: 'homePublicationsTitle', label: 'Título de publicaciones' },
  { section: 'Soluciones', key: 'servicesEyebrow', label: 'Etiqueta' },
  { section: 'Soluciones', key: 'servicesTitle', label: 'Título' },
  { section: 'Soluciones', key: 'servicesCopy', label: 'Descripción', multiline: true },
  { section: 'Blog', key: 'blogEyebrow', label: 'Etiqueta' },
  { section: 'Blog', key: 'blogTitle', label: 'Título' },
  { section: 'Blog', key: 'blogCopy', label: 'Descripción', multiline: true },
  { section: 'Publicaciones', key: 'publicationsEyebrow', label: 'Etiqueta' },
  { section: 'Publicaciones', key: 'publicationsTitle', label: 'Título' },
  { section: 'Publicaciones', key: 'publicationsCopy', label: 'Descripción', multiline: true },
];

@Component({
  selector: 'admin-configuraciones',
  imports: [CommonModule, FormsModule],
  templateUrl: './configuraciones.component.html',
  styleUrls: ['./configuraciones.component.scss'],
})
export class ConfiguracionesComponent implements OnInit {
  public fields = PAGE_TEXT_FIELDS;
  public groupedFields: { section: string; fields: ConfigField[] }[] = [];
  public main: any = null;
  public pageTexts: Record<string, string> = {};
  public loading = true;
  public saving = false;

  constructor(private _mainService: MainService) {}

  ngOnInit(): void {
    this.groupedFields = this.groupFields();
    void this.loadMain();
  }

  async loadMain(): Promise<void> {
    this.loading = true;
    try {
      const response = await this._mainService.getMain().toPromise();
      this.main = response?.main || {};
      this.pageTexts = { ...(this.main.pageTexts || {}) };
    } catch (error: any) {
      await Swal.fire({
        title: 'Error',
        html: `No se pudieron cargar las configuraciones.<br/>${
          error?.error?.message || error?.message || 'Error desconocido.'
        }`,
        icon: 'error',
      });
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    try {
      const cleanTexts = Object.entries(this.pageTexts).reduce(
        (result: Record<string, string>, [key, value]) => {
          result[key] = String(value || '').trim();
          return result;
        },
        {}
      );

      const response = await this._mainService
        .updateMain({ ...this.main, pageTexts: cleanTexts })
        .toPromise();
      this.main = response?.mainUpdated || response?.main || this.main;
      this.pageTexts = { ...(this.main.pageTexts || cleanTexts) };

      await Swal.fire({
        title: 'Configuraciones guardadas',
        icon: 'success',
      });
    } catch (error: any) {
      await Swal.fire({
        title: 'Error',
        html: `No se pudieron guardar las configuraciones.<br/>${
          error?.error?.message || error?.message || 'Error desconocido.'
        }`,
        icon: 'error',
      });
    } finally {
      this.saving = false;
    }
  }

  private groupFields(): { section: string; fields: ConfigField[] }[] {
    return this.fields.reduce((groups: { section: string; fields: ConfigField[] }[], field) => {
      let group = groups.find((item) => item.section === field.section);
      if (!group) {
        group = { section: field.section, fields: [] };
        groups.push(group);
      }
      group.fields.push(field);
      return groups;
    }, []);
  }
}
