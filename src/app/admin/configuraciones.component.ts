import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainService } from '../services/main.service';
import Swal from 'sweetalert2';

type ConfigField = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  multiline?: boolean;
  section: string;
};

type ConfigFieldGroup = {
  section: string;
  description: string;
  fields: ConfigField[];
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  'Inicio - bloque principal':
    'Textos de la primera zona visible de la página de inicio, junto a la imagen principal y los botones principales.',
  'Inicio - soluciones destacadas':
    'Textos que aparecen sobre las tarjetas de soluciones legales en la página de inicio.',
  'Inicio - blog':
    'Textos que aparecen sobre la lista de artículos recientes en la página de inicio.',
  'Inicio - publicaciones':
    'Textos que aparecen sobre las publicaciones recientes en la página de inicio.',
  Soluciones:
    'Textos del encabezado de la página donde se listan todas las áreas de apoyo legal.',
  Blog:
    'Textos del encabezado de la página pública del blog legal.',
  Publicaciones:
    'Textos del encabezado de la página pública de publicaciones y recursos.',
  'Nosotros - criterios de trabajo':
    'Textos de las tres tarjetas que aparecen debajo de la presentación principal de la página Nosotros.',
};

const PAGE_TEXT_FIELDS: ConfigField[] = [
  {
    section: 'Inicio - bloque principal',
    key: 'homeHeroEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título grande en la primera pantalla de la página de inicio.',
    defaultValue: 'Firma legal en México',
  },
  {
    section: 'Inicio - bloque principal',
    key: 'homeHeroTitle',
    label: 'Título principal',
    description: 'Es el título grande que presenta al despacho en la página de inicio.',
    defaultValue: 'Montaño & Reyes Arrazola S.C.',
  },
  {
    section: 'Inicio - bloque principal',
    key: 'homeHeroServicesCta',
    label: 'Botón hacia soluciones',
    description: 'Texto del botón principal que lleva a la página de soluciones legales.',
    defaultValue: 'Ver soluciones',
  },
  {
    section: 'Inicio - bloque principal',
    key: 'homeHeroAboutCta',
    label: 'Botón hacia nosotros',
    description: 'Texto del botón secundario que lleva a la página Nosotros.',
    defaultValue: 'Nosotros',
  },
  {
    section: 'Inicio - soluciones destacadas',
    key: 'homeServicesEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título de las soluciones destacadas en la página de inicio.',
    defaultValue: 'Soluciones',
  },
  {
    section: 'Inicio - soluciones destacadas',
    key: 'homeServicesTitle',
    label: 'Título de la sección',
    description: 'Encabezado que presenta las tarjetas de soluciones legales destacadas.',
    defaultValue: 'Áreas de apoyo legal',
  },
  {
    section: 'Inicio - blog',
    key: 'homeBlogEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título de artículos recientes en la página de inicio.',
    defaultValue: 'Blog',
  },
  {
    section: 'Inicio - blog',
    key: 'homeBlogTitle',
    label: 'Título de la sección',
    description: 'Encabezado que presenta los artículos recientes en la página de inicio.',
    defaultValue: 'Análisis y criterios prácticos',
  },
  {
    section: 'Inicio - publicaciones',
    key: 'homePublicationsEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título de publicaciones recientes en la página de inicio.',
    defaultValue: 'Contenido legal',
  },
  {
    section: 'Inicio - publicaciones',
    key: 'homePublicationsTitle',
    label: 'Título de la sección',
    description: 'Encabezado que presenta las publicaciones recientes en la página de inicio.',
    defaultValue: 'Publicaciones recientes',
  },
  {
    section: 'Soluciones',
    key: 'servicesEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título principal de la página Soluciones.',
    defaultValue: 'Soluciones',
  },
  {
    section: 'Soluciones',
    key: 'servicesTitle',
    label: 'Título principal',
    description: 'Título grande de la página donde se muestran todas las soluciones legales.',
    defaultValue: 'Áreas de apoyo legal',
  },
  {
    section: 'Soluciones',
    key: 'servicesCopy',
    label: 'Texto introductorio',
    description: 'Párrafo breve debajo del título principal de la página Soluciones.',
    multiline: true,
    defaultValue:
      'Servicios jurídicos estructurados para prevenir riesgos, ordenar decisiones y atender procedimientos con claridad.',
  },
  {
    section: 'Blog',
    key: 'blogEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título principal de la página Blog.',
    defaultValue: 'Blog legal',
  },
  {
    section: 'Blog',
    key: 'blogTitle',
    label: 'Título principal',
    description: 'Título grande de la página donde se listan los artículos del blog.',
    defaultValue: 'Criterios para decidir con ventaja',
  },
  {
    section: 'Blog',
    key: 'blogCopy',
    label: 'Texto introductorio',
    description: 'Párrafo breve debajo del título principal de la página Blog.',
    multiline: true,
    defaultValue:
      'Análisis legal y criterios prácticos para anticipar riesgos y tomar decisiones informadas.',
  },
  {
    section: 'Publicaciones',
    key: 'publicationsEyebrow',
    label: 'Texto pequeño superior',
    description: 'Aparece arriba del título principal de la página Publicaciones.',
    defaultValue: 'Biblioteca legal',
  },
  {
    section: 'Publicaciones',
    key: 'publicationsTitle',
    label: 'Título principal',
    description: 'Título grande de la página donde se listan publicaciones y recursos.',
    defaultValue: 'Publicaciones y recursos',
  },
  {
    section: 'Publicaciones',
    key: 'publicationsCopy',
    label: 'Texto introductorio',
    description: 'Párrafo breve debajo del título principal de la página Publicaciones.',
    multiline: true,
    defaultValue: 'Recursos legales y criterios prácticos para apoyar decisiones con certeza jurídica.',
  },
  {
    section: 'Nosotros - criterios de trabajo',
    key: 'wePrinciple1Title',
    label: 'Primera tarjeta - título',
    description: 'Título de la primera tarjeta debajo del texto principal de la página Nosotros.',
    defaultValue: 'Certeza jurídica',
  },
  {
    section: 'Nosotros - criterios de trabajo',
    key: 'wePrinciple1Copy',
    label: 'Primera tarjeta - texto',
    description: 'Texto breve que explica el primer criterio de trabajo.',
    multiline: true,
    defaultValue: 'Instrumentos legales claros para proteger bienes, derechos y obligaciones.',
  },
  {
    section: 'Nosotros - criterios de trabajo',
    key: 'wePrinciple2Title',
    label: 'Segunda tarjeta - título',
    description: 'Título de la segunda tarjeta debajo del texto principal de la página Nosotros.',
    defaultValue: 'Atención especializada',
  },
  {
    section: 'Nosotros - criterios de trabajo',
    key: 'wePrinciple2Copy',
    label: 'Segunda tarjeta - texto',
    description: 'Texto breve que explica el segundo criterio de trabajo.',
    multiline: true,
    defaultValue: 'Equipo actualizado en las áreas legales que sostienen decisiones relevantes.',
  },
  {
    section: 'Nosotros - criterios de trabajo',
    key: 'wePrinciple3Title',
    label: 'Tercera tarjeta - título',
    description: 'Título de la tercera tarjeta debajo del texto principal de la página Nosotros.',
    defaultValue: 'Criterio actual',
  },
  {
    section: 'Nosotros - criterios de trabajo',
    key: 'wePrinciple3Copy',
    label: 'Tercera tarjeta - texto',
    description: 'Texto breve que explica el tercer criterio de trabajo.',
    multiline: true,
    defaultValue: 'Soluciones con técnicas transparentes y enfoque práctico para empresas y personas.',
  },
];

@Component({
  selector: 'admin-configuraciones',
  imports: [CommonModule, FormsModule],
  templateUrl: './configuraciones.component.html',
  styleUrls: ['./configuraciones.component.scss'],
})
export class ConfiguracionesComponent implements OnInit {
  public fields = PAGE_TEXT_FIELDS;
  public groupedFields: ConfigFieldGroup[] = [];
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
      this.pageTexts = this.withDefaultTexts(this.main.pageTexts || {});
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
      this.pageTexts = this.withDefaultTexts(this.main.pageTexts || cleanTexts);

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

  private groupFields(): ConfigFieldGroup[] {
    return this.fields.reduce((groups: ConfigFieldGroup[], field) => {
      let group = groups.find((item) => item.section === field.section);
      if (!group) {
        group = {
          section: field.section,
          description: SECTION_DESCRIPTIONS[field.section] || '',
          fields: [],
        };
        groups.push(group);
      }
      group.fields.push(field);
      return groups;
    }, []);
  }

  private withDefaultTexts(texts: Record<string, string>): Record<string, string> {
    return this.fields.reduce((result: Record<string, string>, field) => {
      const value = result[field.key];
      if (typeof value !== 'string' || value.trim() === '') {
        result[field.key] = field.defaultValue;
      }
      return result;
    }, { ...texts });
  }
}
