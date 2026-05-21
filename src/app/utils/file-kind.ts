export type FileKind =
  | 'archive'
  | 'csv'
  | 'email'
  | 'file'
  | 'image'
  | 'pdf'
  | 'presentation'
  | 'spreadsheet'
  | 'text'
  | 'word';

type FileKindMeta = {
  icon: string;
  label: string;
  pluralLabel: string;
};

const FILE_KIND_META: Record<FileKind, FileKindMeta> = {
  archive: { icon: 'ZIP', label: 'Comprimido', pluralLabel: 'comprimidos' },
  csv: { icon: 'CSV', label: 'CSV', pluralLabel: 'CSV' },
  email: { icon: 'EML', label: 'Correo', pluralLabel: 'correos' },
  file: { icon: 'FILE', label: 'Archivo', pluralLabel: 'archivos' },
  image: { icon: 'IMG', label: 'Imagen', pluralLabel: 'imagenes' },
  pdf: { icon: 'PDF', label: 'PDF', pluralLabel: 'PDF' },
  presentation: { icon: 'PPT', label: 'Presentacion', pluralLabel: 'presentaciones' },
  spreadsheet: { icon: 'XLS', label: 'Hoja de calculo', pluralLabel: 'hojas de calculo' },
  text: { icon: 'TXT', label: 'Texto', pluralLabel: 'textos' },
  word: { icon: 'DOC', label: 'Word', pluralLabel: 'Word' },
};

const KIND_ORDER: FileKind[] = [
  'image',
  'pdf',
  'word',
  'spreadsheet',
  'csv',
  'presentation',
  'email',
  'archive',
  'text',
  'file',
];

const IMAGE_EXTENSIONS = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp']);

export type FileKindBadge = FileKindMeta & {
  className: string;
  count: number;
  kind: FileKind;
};

export function fileExtension(file: any): string {
  const explicitType = String(file?.type || '').toLowerCase().replace(/^\./, '');
  if (explicitType) {
    return explicitType;
  }

  const source = String(
    file?.location || file?.title || file?.fileName || file?.name || ''
  ).toLowerCase();
  const match = source.match(/\.([a-z0-9]+)(?:[?#].*)?$/);
  return match?.[1] || '';
}

export function fileKind(file: any): FileKind {
  const extension = fileExtension(file);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (extension === 'pdf') {
    return 'pdf';
  }

  if (['doc', 'docx', 'rtf'].includes(extension)) {
    return 'word';
  }

  if (['xls', 'xlsx'].includes(extension)) {
    return 'spreadsheet';
  }

  if (extension === 'csv') {
    return 'csv';
  }

  if (['ppt', 'pptx'].includes(extension)) {
    return 'presentation';
  }

  if (['eml', 'msg'].includes(extension)) {
    return 'email';
  }

  if (['zip', 'rar', '7z'].includes(extension)) {
    return 'archive';
  }

  if (['md', 'txt'].includes(extension)) {
    return 'text';
  }

  return 'file';
}

export function fileKindLabel(file: any): string {
  return FILE_KIND_META[fileKind(file)].label;
}

export function fileKindIconText(file: any): string {
  return FILE_KIND_META[fileKind(file)].icon;
}

export function fileKindIconClass(file: any): string {
  return `file-type-icon file-type-icon--${fileKind(file)}`;
}

export function isImageFile(file: any): boolean {
  return fileKind(file) === 'image';
}

export function fileKindBadges(files: any[]): FileKindBadge[] {
  const counts = new Map<FileKind, number>();

  for (const file of files.filter(Boolean)) {
    const kind = fileKind(file);
    counts.set(kind, (counts.get(kind) || 0) + 1);
  }

  return KIND_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
    ...FILE_KIND_META[kind],
    className: `file-type-icon file-type-icon--${kind}`,
    count: counts.get(kind) || 0,
    kind,
  }));
}

export function fileKindSummary(files: any[]): string {
  const badges = fileKindBadges(files);
  const total = badges.reduce((sum, badge) => sum + badge.count, 0);

  if (total === 0) {
    return 'Sin archivos';
  }

  const details = badges
    .map((badge) => {
      const label = badge.count === 1 ? badge.label : badge.pluralLabel;
      return `${badge.count} ${label}`;
    })
    .join(', ');

  return `${total} ${total === 1 ? 'archivo' : 'archivos'}: ${details}`;
}
