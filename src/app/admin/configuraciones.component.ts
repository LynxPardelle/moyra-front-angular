import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainService } from '../services/main.service';
import { AiAssistantPanelComponent } from '../components/web-utility/ai-assistant-panel/ai-assistant-panel.component';
import { RichTextEditorComponent } from '../components/web-utility/rich-text-editor/rich-text-editor.component';
import { DEFAULT_PRIVACY_NOTICE_BODY_HTML } from '../utils/privacy-notice-content';
import Swal from 'sweetalert2';

type ConfigField = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  multiline?: boolean;
  richText?: boolean;
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
  Soluciones: 'Textos del encabezado de la página donde se listan todas las áreas de apoyo legal.',
  Blog: 'Textos del encabezado de la página pública del blog legal.',
  Publicaciones: 'Textos del encabezado de la página pública de publicaciones y recursos.',
  Casos:
    'Textos del portal privado de casos, botones de comunicación y etiquetas de documentos.',
  'Aviso de privacidad':
    'Contenido legal que aparece en la página pública de aviso de privacidad.',
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
    defaultValue:
      'Recursos legales y criterios prácticos para apoyar decisiones con certeza jurídica.',
  },
  {
    section: 'Casos',
    key: 'casesNavLabel',
    label: 'Nombre en el menú',
    description: 'Texto del acceso principal al portal privado en el menú del sitio.',
    defaultValue: 'Casos',
  },
  {
    section: 'Casos',
    key: 'casesListTitle',
    label: 'Título de la lista',
    description: 'Título grande de la pantalla donde el cliente ve sus casos asignados.',
    defaultValue: 'Casos',
  },
  {
    section: 'Casos',
    key: 'casesBackLabel',
    label: 'Regresar a lista',
    description: 'Texto del enlace para volver del detalle de un caso a la lista.',
    defaultValue: 'Casos',
  },
  {
    section: 'Casos',
    key: 'casesNotificationsButtonLabel',
    label: 'Botón de notificaciones',
    description: 'Texto del botón que abre el centro de notificaciones del portal privado.',
    defaultValue: 'Notificaciones',
  },
  {
    section: 'Casos',
    key: 'casesUpdatesTitle',
    label: 'Título de actualizaciones',
    description: 'Encabezado de la lista de entradas privadas dentro de un caso.',
    defaultValue: 'Actualizaciones',
  },
  {
    section: 'Casos',
    key: 'casesCommentsTitle',
    label: 'Título de comentarios',
    description: 'Encabezado del bloque de comentarios en entradas de caso.',
    defaultValue: 'Comentarios',
  },
  {
    section: 'Casos',
    key: 'casesCommentSubmitLabel',
    label: 'Botón para comentar',
    description: 'Texto del botón que envía un comentario dentro de una entrada de caso.',
    defaultValue: 'Comentar',
  },
  {
    section: 'Casos',
    key: 'casesDocumentsTitle',
    label: 'Título de documentos',
    description: 'Encabezado del panel de documentos privados del caso.',
    defaultValue: 'Documentos',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveSubmitLabel',
    label: 'Botón para enlace OneDrive',
    description: 'Texto del botón que guarda un enlace de OneDrive o SharePoint en el caso.',
    defaultValue: 'Agregar enlace',
  },
  {
    section: 'Casos',
    key: 'casesOpenDocumentLabel',
    label: 'Abrir documento',
    description: 'Texto del enlace que abre un documento del caso.',
    defaultValue: 'Abrir documento',
  },
  {
    section: 'Casos',
    key: 'casesOpenCaseButtonLabel',
    label: 'Abrir caso',
    description: 'Texto del botón para entrar a un caso sin novedades pendientes.',
    defaultValue: 'Abrir caso',
  },
  {
    section: 'Casos',
    key: 'casesReviewUpdatesButtonLabel',
    label: 'Revisar novedades',
    description: 'Texto del botón para entrar a un caso con notificaciones pendientes.',
    defaultValue: 'Revisar novedades',
  },
  {
    section: 'Casos',
    key: 'casesRetryButtonLabel',
    label: 'Botón de reintento',
    description: 'Texto del botón que vuelve a intentar cargar casos o detalle.',
    defaultValue: 'Reintentar',
  },
  {
    section: 'Casos',
    key: 'casesEmptyTitle',
    label: 'Lista vacía - título',
    description: 'Título cuando el cliente todavía no tiene casos asignados.',
    defaultValue: 'No tienes casos asignados',
  },
  {
    section: 'Casos',
    key: 'casesListLoadingLabel',
    label: 'Cargando lista',
    description: 'Texto mostrado mientras se carga la lista de casos.',
    defaultValue: 'Cargando casos...',
  },
  {
    section: 'Casos',
    key: 'casesLoadingLabel',
    label: 'Cargando detalle',
    description: 'Texto mostrado mientras se carga el detalle de un caso.',
    defaultValue: 'Cargando caso...',
  },
  {
    section: 'Casos',
    key: 'casesListErrorMessage',
    label: 'Error lista',
    description: 'Mensaje cuando no se puede cargar la lista de casos.',
    multiline: true,
    defaultValue: 'No se pudieron cargar tus casos',
  },
  {
    section: 'Casos',
    key: 'casesAssignedLabel',
    label: 'Etiqueta lista asignada',
    description: 'Etiqueta accesible de la lista de casos asignados.',
    defaultValue: 'Casos asignados',
  },
  {
    section: 'Casos',
    key: 'casesStatusLabel',
    label: 'Etiqueta estado',
    description: 'Etiqueta del estado de cada caso en la lista.',
    defaultValue: 'Estado',
  },
  {
    section: 'Casos',
    key: 'casesLastActivityLabel',
    label: 'Etiqueta última actividad',
    description: 'Etiqueta de la última actividad de cada caso en la lista.',
    defaultValue: 'Última actividad',
  },
  {
    section: 'Casos',
    key: 'casesUnreadLabel',
    label: 'Etiqueta novedades',
    description: 'Etiqueta del contador de notificaciones pendientes por caso.',
    defaultValue: 'Novedades',
  },
  {
    section: 'Casos',
    key: 'casesUnreadSuffix',
    label: 'Sufijo sin leer',
    description: 'Texto que acompaña el número de notificaciones pendientes.',
    defaultValue: 'sin leer',
  },
  {
    section: 'Casos',
    key: 'casesEmptyMessage',
    label: 'Lista vacía - mensaje',
    description: 'Texto cuando el cliente todavía no tiene casos asignados.',
    multiline: true,
    defaultValue: 'Cuando el despacho te agregue a un caso, aparecerá en esta sección.',
  },
  {
    section: 'Casos',
    key: 'casesEmptyUpdatesMessage',
    label: 'Sin actualizaciones',
    description: 'Texto cuando un caso no tiene entradas visibles para el cliente.',
    multiline: true,
    defaultValue: 'Aún no hay actualizaciones visibles para este caso.',
  },
  {
    section: 'Casos',
    key: 'casesCommentsDisabledMessage',
    label: 'Comentarios deshabilitados',
    description: 'Mensaje mostrado cuando el usuario no tiene permiso para comentar.',
    multiline: true,
    defaultValue: 'Los comentarios no están habilitados para tu acceso actual.',
  },
  {
    section: 'Casos',
    key: 'casesDocumentsDisabledMessage',
    label: 'Documentos deshabilitados',
    description: 'Mensaje mostrado cuando el usuario no puede agregar documentos al caso.',
    multiline: true,
    defaultValue: 'La carga de documentos no está habilitada para tu acceso actual.',
  },
  {
    section: 'Casos',
    key: 'casesCommentLabel',
    label: 'Etiqueta comentario',
    description: 'Etiqueta sobre el campo donde se escribe un comentario.',
    defaultValue: 'Escribe un comentario',
  },
  {
    section: 'Casos',
    key: 'casesCommentPlaceholder',
    label: 'Placeholder comentario',
    description: 'Texto guía dentro del campo de comentario.',
    defaultValue: 'Escribe un comentario',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveNameLabel',
    label: 'Etiqueta nombre documento',
    description: 'Etiqueta del campo de nombre al agregar un enlace de OneDrive.',
    defaultValue: 'Nombre del documento',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveNamePlaceholder',
    label: 'Placeholder nombre documento',
    description: 'Texto guía del campo de nombre al agregar un enlace de OneDrive.',
    defaultValue: 'Ej. Contrato firmado',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveUrlLabel',
    label: 'Etiqueta enlace OneDrive',
    description: 'Etiqueta del campo donde se pega el enlace de OneDrive o SharePoint.',
    defaultValue: 'Enlace de OneDrive',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveUrlPlaceholder',
    label: 'Placeholder enlace OneDrive',
    description: 'Texto guía del campo donde se pega el enlace de OneDrive o SharePoint.',
    defaultValue: 'https://...sharepoint.com/...',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveHelpText',
    label: 'Ayuda OneDrive',
    description: 'Texto corto de advertencia sobre permisos del enlace de OneDrive.',
    multiline: true,
    defaultValue: 'Usa un enlace compartido de OneDrive o SharePoint con permisos revisados.',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveSavingLabel',
    label: 'Guardando enlace',
    description: 'Texto temporal del botón mientras se guarda un enlace de OneDrive.',
    defaultValue: 'Guardando...',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveInvalidMessage',
    label: 'Enlace inválido',
    description: 'Mensaje cuando el enlace pegado no parece de OneDrive o SharePoint.',
    multiline: true,
    defaultValue: 'Revisa el nombre y usa un enlace de OneDrive o SharePoint válido.',
  },
  {
    section: 'Casos',
    key: 'casesOneDriveErrorMessage',
    label: 'Error enlace OneDrive',
    description: 'Mensaje cuando no se pudo guardar el enlace.',
    multiline: true,
    defaultValue: 'No se pudo agregar el enlace de OneDrive',
  },
  {
    section: 'Casos',
    key: 'casesFileVisibleLabel',
    label: 'Documento visible',
    description: 'Estado mostrado cuando el documento ya puede verlo el cliente.',
    defaultValue: 'Visible para el cliente',
  },
  {
    section: 'Casos',
    key: 'casesFileReviewLabel',
    label: 'Documento en revisión',
    description: 'Estado mostrado cuando el documento aún no está aprobado para todos.',
    defaultValue: 'En revisión interna',
  },
  {
    section: 'Casos',
    key: 'casesDownloadDocumentLabel',
    label: 'Descargar documento',
    description: 'Texto del enlace para documentos heredados guardados en S3.',
    defaultValue: 'Descargar',
  },
  {
    section: 'Casos',
    key: 'casesEntryBackLabel',
    label: 'Volver al caso',
    description: 'Texto del enlace para regresar desde una entrada al detalle del caso.',
    defaultValue: 'Volver al caso',
  },
  {
    section: 'Casos',
    key: 'casesEntryNotFoundMessage',
    label: 'Entrada no encontrada',
    description: 'Mensaje cuando la entrada solicitada no existe o no es visible.',
    multiline: true,
    defaultValue: 'No se encontró la entrada solicitada.',
  },
  {
    section: 'Casos',
    key: 'casesEntryLoadingLabel',
    label: 'Cargando entrada',
    description: 'Texto mostrado mientras se carga una entrada específica del caso.',
    defaultValue: 'Cargando entrada...',
  },
  {
    section: 'Aviso de privacidad',
    key: 'privacyNoticeBodyHtml',
    label: 'Contenido del aviso',
    description:
      'Texto enriquecido público de /aviso-de-privacidad. Requiere revisión legal antes de publicar cambios sensibles.',
    richText: true,
    defaultValue: DEFAULT_PRIVACY_NOTICE_BODY_HTML,
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
    defaultValue:
      'Soluciones con técnicas transparentes y enfoque práctico para empresas y personas.',
  },
];

@Component({
  selector: 'admin-configuraciones',
  imports: [FormsModule, AiAssistantPanelComponent, RichTextEditorComponent],
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

  aiContext(): Record<string, unknown> {
    return {
      pageTexts: this.pageTexts,
      groups: this.groupedFields.map((group) => ({
        section: group.section,
        description: group.description,
        fields: group.fields.map((field) => ({
          key: field.key,
          label: field.label,
          description: field.description,
          value: this.pageTexts[field.key],
        })),
      })),
    };
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
    return this.fields.reduce(
      (result: Record<string, string>, field) => {
        const value = result[field.key];
        if (typeof value !== 'string' || value.trim() === '') {
          result[field.key] = field.defaultValue;
        }
        return result;
      },
      { ...texts }
    );
  }
}
