import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileService } from '../services/file.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'admin-archivos',
  imports: [FormsModule],
  templateUrl: './archivos.component.html',
  styleUrls: ['./archivos.component.scss'],
})
export class ArchivosComponent implements OnInit {
  public files: any[] = [];
  public filter = '';
  public loading = true;

  constructor(private _fileService: FileService) {}

  ngOnInit(): void {
    void this.loadFiles();
  }

  async loadFiles(): Promise<void> {
    this.loading = true;
    try {
      const response = await this._fileService.getFiles().toPromise();
      this.files = response?.files || [];
    } catch (error: any) {
      await Swal.fire({
        title: 'Error',
        html: `No se pudo cargar el inventario de archivos.<br/>${
          error?.error?.message || error?.message || 'Error desconocido.'
        }`,
        icon: 'error',
      });
      this.files = [];
    } finally {
      this.loading = false;
    }
  }

  visibleFiles(): any[] {
    const query = this.filter.trim().toLowerCase();
    if (!query) {
      return this.files;
    }

    return this.files.filter((file) => {
      const searchable = [
        file.title,
        file.location,
        file.category,
        file.id,
        ...(file.usages || []).map(
          (usage: any) => `${usage.resource} ${usage.label} ${usage.field}`
        ),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }

  async deleteFile(file: any): Promise<void> {
    const usageCount = Number(file.usageCount || 0);
    const warning =
      usageCount > 0
        ? `Este archivo se usa en ${usageCount} lugar(es). Si continúas, se limpiarán esas referencias.`
        : 'El archivo se eliminará del bucket.';

    const result = await Swal.fire({
      title: '¿Eliminar archivo?',
      html: warning,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: usageCount > 0 ? 'Eliminar y limpiar referencias' : 'Eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await this._fileService.deleteFile(file.id, usageCount > 0).toPromise();
      await this.loadFiles();
      await Swal.fire({
        title: 'Archivo eliminado',
        icon: 'success',
      });
    } catch (error: any) {
      const blockedByUsage = error?.status === 409;
      await Swal.fire({
        title: blockedByUsage ? 'El archivo está en uso' : 'Error',
        html: error?.error?.message || error?.message || 'No se pudo eliminar el archivo.',
        icon: blockedByUsage ? 'info' : 'error',
      });
    }
  }

  fileSize(file: any): string {
    const size = Number(file.size || 0);
    if (size <= 0) {
      return '-';
    }
    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    }
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
}
