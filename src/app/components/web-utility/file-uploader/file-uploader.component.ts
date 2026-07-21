import {
  Component,
  OnInit,
  Input,
  Output,
  TemplateRef,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpRequest,
  HttpHeaders,
  HttpResponse,
  HttpHeaderResponse,
  HttpEventType,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Services
import {
  ApiRuntime,
  Global,
  apiUrl,
  jsonAuthHeaders,
  toLegacyFile,
} from '../../../services/global';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

// NGX-Bootstrap
import { BsDropdownConfig } from 'ngx-bootstrap/dropdown';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

// NGXUploader
import {
  UploadOutput,
  UploadInput,
  UploadFile,
  humanizeBytes,
  UploaderOptions,
  NgxUploaderModule,
} from 'ngx-uploader';

// Extras
import Swal from 'sweetalert2';

const ACCEPTED_FILE_EXTENSIONS = [
  '.csv',
  '.doc',
  '.docx',
  '.eml',
  '.gif',
  '.jpeg',
  '.jpg',
  '.msg',
  '.pdf',
  '.png',
  '.ppt',
  '.pptx',
  '.rtf',
  '.txt',
  '.webp',
  '.xls',
  '.xlsx',
  '.zip',
];

@Component({
  selector: 'app-file-uploader',
  imports: [CommonModule, NgxUploaderModule],
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
  providers: [WebService],
})
export class FileUploaderComponent implements OnInit {
  // Identity
  public identity: any;
  public token: any;

  // Urls
  public url: string;

  // NGX_Bootstrap
  modalRef!: BsModalRef;

  // Inputs
  @Input() public thing!: any;
  @Input() public thingInside!: boolean;
  @Input() public id!: string;
  @Input() public type!: string;
  @Input() public typeMeta!: string;
  @Input() public typeThingComRes!: string;

  // Output
  @Output() pre_loader: any = new EventEmitter<any>();
  @Output() recoverThing: any = new EventEmitter<any>();

  // NGXUploader
  public optionsMulti: UploaderOptions;
  public optionsOne: UploaderOptions;
  public files: UploadFile[];
  public uploadInput: EventEmitter<UploadInput>;
  public humanizeBytes: Function;
  public dragOver: boolean;
  public messagesErrorFiles: string[];
  public fileProgress: UploadFile[];
  public doneUploading: boolean;
  public acceptedFileTypes = ACCEPTED_FILE_EXTENSIONS.join(',');
  public acceptedFileSummary =
    'PDF, Word, Excel, PowerPoint, imágenes, TXT, RTF, CSV, ZIP y correos .eml/.msg. Máximo 50 MB por archivo.';
  constructor(
    private _userService: UserService,
    private _webService: WebService,
    private modalService: BsModalService,

    private _http: HttpClient
  ) {
    // Identity
    this.identity = this._userService.getIdentity();
    this.token = this._userService.getToken();

    // Urls
    this.url = Global.url;

    // NGXUploader
    this.optionsMulti = {
      concurrency: 10,
      maxUploads: 10,
      maxFileSize: 50000000,
    };
    this.optionsOne = {
      concurrency: 1,
      maxUploads: 1,
      maxFileSize: 50000000,
    };
    this.files = []; // local uploading files array
    this.uploadInput = new EventEmitter<UploadInput>(); // input events, we use this to emit data to ngx-uploader
    this.humanizeBytes = humanizeBytes;
    this.dragOver = false;
    this.messagesErrorFiles = [];
    this.fileProgress = [];
    this.doneUploading = false;
  }

  // Basic
  ngOnInit(): void {}

  // Utility
  toLinearGradientProgress(color: string, progress: number) {
    return this._webService.toLinearGradientProgress(color, progress);
  }

  toKBorMB(size: number) {
    return this._webService.toKBorMB(size);
  }

  // NGX_Bootstrap
  openModal(template: TemplateRef<any>): void {
    void this.openModalWhenReady(template);
  }

  private async openModalWhenReady(template: TemplateRef<any>): Promise<void> {
    if (!this.validEntityId()) {
      if (!this.pre_loader.observed) {
        await this.showMissingEntityError();
        return;
      }

      const id = await new Promise<string>((complete) => {
        this.pre_loader.emit({
          type: this.type,
          typeMeta: this.typeMeta,
          typeThingComRes: this.typeThingComRes,
          thing: this.thing,
          id: this.id,
          complete,
        });
      });
      this.id = typeof id === 'string' ? id.trim() : '';
    }

    if (!this.validEntityId()) {
      await this.showMissingEntityError();
      return;
    }

    this.modalRef = this.modalService.show(template);
  }

  private validEntityId(): string {
    return typeof this.id === 'string' ? this.id.trim() : '';
  }

  private async showMissingEntityError(): Promise<void> {
    await Swal.fire({
      title: 'Guarda el contenido primero',
      text: 'No se pudo obtener un identificador para asociar el archivo.',
      icon: 'error',
    });
  }

  // NGXUploader
  onUploadOutput(output: UploadOutput | any): void {
    this._webService.consoleLog(
      output,
      'file-uploader.component.ts 142',
      'background-color: red; color: white; padding: 1em;'
    );
    switch (output.type) {
      case 'rejected':
        if (typeof output.file !== 'undefined') {
          let messagesErrorFiles: any;
          messagesErrorFiles = [];

          this._webService.consoleLog(
            output.file,
            'file-uploader.component.ts 149',
            'background-color: red; color: white; padding: 1em;'
          );

          if (
            output.file.nativeFile &&
            output.file.nativeFile.size &&
            output.file.nativeFile.name
          ) {
            messagesErrorFiles.push(
              'Error, el archivo ' +
                output.file.nativeFile.name +
                ' es muy grande  con un tamaño de ' +
                this._webService.toKBorMB(output.file.nativeFile.size) +
                ' que posiblemente supera los 47.7mb que se pueden subir por archivo o no se acepta el tipo de archivo ' +
                output.file.nativeFile.type
            );
          } else {
            messagesErrorFiles.push(
              'Error, el archivo es más grande que los 47.7mb que se pueden subir por archivo o no se acepta el tipo de archivo '
            );
          }
          this.messagesErrorFiles.push(messagesErrorFiles);
          this._webService.consoleLog(
            messagesErrorFiles,
            'file-uploader.component.ts 170',
            'background-color: red; color: white; padding: 1em;'
          );
        }
        break;
      case 'allAddedToQueue':
        // uncomment this if you want to auto upload files when added
        // const event: UploadInput = {
        //   type: 'uploadAll',
        //   url: '/upload',
        //   method: 'POST',
        //   data: { foo: 'bar' }
        // };
        // this.uploadInput.emit(event);
        break;
      case 'addedToQueue':
        if (typeof output.file !== 'undefined') {
          this.files.push(output.file);
          this._webService.consoleLog(
            this.files,
            'file-uploader.component.ts 186',
            'background-color: red; color: white; padding: 1em;'
          );
        }
        break;
      case 'uploading':
        this._webService.consoleLog(
          output,
          'file-uploader.component.ts 190',
          'background-color: red; color: white; padding: 1em;'
        );
        if (typeof output.file !== 'undefined') {
          this.fileProgress = this.files;
          this._webService.consoleLog(
            this.fileProgress,
            'file-uploader.component.ts 192',
            'background-color: red; color: white; padding: 1em;'
          );

          // update current data in files array for uploading file
          const index = this.files.findIndex(
            (file: any) =>
              typeof output.file !== 'undefined' && file.id === output.file.id
          );
          this.files[index] = output.file;
        }
        break;
      case 'removed':
        // remove file from array when removed
        this.files = this.files.filter(
          (file: UploadFile) => file !== output.file
        );
        break;
      case 'dragOver':
        this.dragOver = true;
        break;
      case 'dragOut':
      case 'drop':
        this.dragOver = false;
        break;
      case 'done':
        // The file is downloaded
        this._webService.consoleLog(
          output,
          'file-uploader.component.ts 217',
          'background-color: red; color: white; padding: 1em;'
        );
        if (output.file) {
          this._webService.consoleLog(
            output.file,
            'file-uploader.component.ts 219',
            'background-color: red; color: white; padding: 1em;'
          );
          if (output.file.response) {
            this._webService.consoleLog(
              output.file.response,
              'file-uploader.component.ts 221',
              'background-color: red; color: white; padding: 1em;'
            );
            if (output.file.response.status) {
              this._webService.consoleLog(
                output.file.response.status,
                'file-uploader.component.ts 223',
                'background-color: red; color: white; padding: 1em;'
              );
              if (output.file.response.status == 'success') {
                let recoverThing: any;
                switch (this.typeMeta) {
                  case 'multi':
                    for (
                      let i = 0;
                      i < output.file.response.files.length;
                      i++
                    ) {
                      this._webService.consoleLog(
                        output.file.response.files,
                        'file-uploader.component.ts 233',
                        'background-color: red; color: white; padding: 1em;'
                      );
                      if (this.thingInside && this.thingInside === true) {
                        this.thing.push(output.file.response.files[i]._id);
                      } else {
                        this.thing.files.push(
                          output.file.response.files[i]._id
                        );
                      }
                    }
                    if (this.files.length === this.thing.files.length) {
                      recoverThing = {
                        type: this.type,
                        typeMeta: this.typeMeta,
                        typeThingComRes: this.typeThingComRes,
                        thing: this.thing,
                        id: this.id,
                      };
                      this.recoverThing.emit(recoverThing);
                      this.files = [];
                      this.doneUploading = true;
                    }
                    break;
                  case 'one':
                    if (this.thingInside && this.thingInside === true) {
                      this.thing = output.file.response.file._id;
                    } else {
                      this.thing.file = output.file.response.file._id;
                    }
                    recoverThing = {
                      type: this.type,
                      typeMeta: this.typeMeta,
                      typeThingComRes: this.typeThingComRes,
                      thing: this.thing,
                      id: this.id,
                    };
                    this.recoverThing.emit(recoverThing);
                    this.files = [];
                    this.doneUploading = true;
                    break;
                }
              } else {
                this.files = [];
                this.doneUploading = true;
                this._webService.consoleLog(
                  output.file,
                  'file-uploader.component.ts 149',
                  'background-color: red; color: white; padding: 1em;'
                );

                if (output.file.response.message) {
                  this.messagesErrorFiles.push(output.file.response.message);
                }
                if (output.file.response.error_message) {
                  this.messagesErrorFiles.push(
                    output.file.response.error_message
                  );
                }
                this._webService.consoleLog(
                  this.messagesErrorFiles,
                  'file-uploader.component.ts 170',
                  'background-color: red; color: white; padding: 1em;'
                );
              }
            }
          }
        }

        break;
    }
  }

  changeDoneUploading() {
    this.doneUploading = !this.doneUploading;
  }

  dropMessageErrorFiles() {
    this.messagesErrorFiles = [];
  }

  startUpload() {
    if (ApiRuntime.isV2) {
      void this.startV2Upload();
      return;
    }

    this._webService.consoleLog(
      this.files,
      'file-uploader.component.ts 291',
      'background-color: red; color: white; padding: 1em;'
    );
    let url: string;

    url =
      this.url +
      '/' +
      this.type +
      '/upload-file-' +
      this.typeThingComRes +
      '/' +
      this.id;
    let event: UploadInput = {
      type: 'uploadAll',
      url: url,
      method: 'POST',
      headers: { Authorization: this._userService.getToken() },
      data: { foo: 'bar' },
    };

    this._webService.consoleLog(
      event,
      'file-uploader.component.ts 310',
      'background-color: red; color: white; padding: 1em;'
    );
    this.uploadInput.emit(event);
  }

  private async startV2Upload() {
    try {
      this._webService.consoleLog(
        this.files,
        'file-uploader.component.ts v2 upload',
        'background-color: red; color: white; padding: 1em;'
      );

      const uploadedFiles: any[] = [];
      for (const queuedFile of this.files) {
        const nativeFile = (queuedFile as any).nativeFile as File | undefined;
        if (!nativeFile) {
          throw new Error('No se encontró el archivo local para subir.');
        }

        const presign = await firstValueFrom(
          this._http.post<any>(
            apiUrl('/uploads/presign'),
            {
              category: this.uploadCategory(),
              fileName: nativeFile.name,
              contentType: nativeFile.type,
              size: nativeFile.size,
            },
            {
              headers: new HttpHeaders(
                jsonAuthHeaders(this._userService.getToken())
              ),
            }
          )
        );

        await firstValueFrom(
          this._http.put(presign.upload.url, nativeFile, {
            headers: new HttpHeaders(presign.upload.headers || {}),
            responseType: 'text' as 'json',
          })
        );

        uploadedFiles.push(toLegacyFile(presign.file));
      }

      await this.attachV2UploadedFiles(uploadedFiles);
      this.emitV2UploadResult(uploadedFiles);
      this.files = [];
      this.fileProgress = [];
      this.doneUploading = true;
    } catch (err: any) {
      this.files = [];
      this.fileProgress = [];
      this.doneUploading = true;
      const message = err?.error?.message || err?.message || 'Error al subir archivo.';
      this.messagesErrorFiles.push(message);
      this._webService.consoleLog(
        err,
        'file-uploader.component.ts v2 upload error',
        'background-color: red; color: white; padding: 1em;'
      );
    }
  }

  private async attachV2UploadedFiles(uploadedFiles: any[]) {
    if (uploadedFiles.length === 0) {
      return;
    }

    const fileIds = uploadedFiles
      .map((file) => file.id || file._id)
      .filter((id) => typeof id === 'string' && id !== '');
    const firstFileId = fileIds[0];
    const headers = new HttpHeaders(jsonAuthHeaders(this._userService.getToken()));

    if (this.type === 'main' && this.typeThingComRes === 'main') {
      await firstValueFrom(
        this._http.put(
          apiUrl('/main'),
          { [this.id]: firstFileId },
          { headers }
        )
      );
      return;
    }

    if (this.type === 'main' && this.typeThingComRes === 'equip') {
      await firstValueFrom(
        this._http.put(apiUrl(`/team/${this.id}`), { photo: firstFileId }, { headers })
      );
      return;
    }

    if (this.type === 'servicio') {
      await firstValueFrom(
        this._http.put(
          apiUrl(`/services/${this.id}`),
          { mainImg: firstFileId },
          { headers }
        )
      );
      return;
    }

    if (this.type === 'article' && this.typeThingComRes === 'article-section') {
      const articleId = this.thing?.articleId || this.thing?.article;
      if (!articleId) {
        throw new Error('No se encontró el artículo de esta sección.');
      }

      await firstValueFrom(
        this._http.put(
          apiUrl(`/articles/${articleId}/sections/${this.id}`),
          this.typeMeta === 'multi'
            ? { files: this.mergeFileIds(fileIds) }
            : { mainFile: firstFileId },
          { headers }
        )
      );
      return;
    }

    if (this.type === 'article' && this.typeThingComRes === 'article') {
      await firstValueFrom(
        this._http.put(
          apiUrl(`/articles/${this.id}`),
          { mainImg: firstFileId },
          { headers }
        )
      );
      return;
    }

    if (this.type === 'publication') {
      await firstValueFrom(
        this._http.put(
          apiUrl(`/publications/${this.id}`),
          this.typeMeta === 'multi'
            ? { files: this.mergeFileIds(fileIds) }
            : { mainFile: firstFileId },
          { headers }
        )
      );
    }
  }

  private emitV2UploadResult(uploadedFiles: any[]) {
    const recoverThing = {
      type: this.type,
      typeMeta: this.typeMeta,
      typeThingComRes: this.typeThingComRes,
      thing: this.thing,
      id: this.id,
    };

    if (this.typeMeta === 'multi') {
      const legacyResponse = {
        status: 'success',
        files: uploadedFiles,
      };
      this._webService.consoleLog(
        legacyResponse,
        'file-uploader.component.ts v2 multi result',
        'background-color: red; color: white; padding: 1em;'
      );
    } else {
      const legacyResponse = {
        status: 'success',
        file: uploadedFiles[0],
      };
      this._webService.consoleLog(
        legacyResponse,
        'file-uploader.component.ts v2 single result',
        'background-color: red; color: white; padding: 1em;'
      );
    }

    this.recoverThing.emit(recoverThing);
  }

  private uploadCategory(): string {
    switch (this.type) {
      case 'servicio':
        return 'servicio';
      case 'article':
        return 'article';
      case 'publication':
        return 'publication';
      default:
        return 'main';
    }
  }

  private mergeFileIds(fileIds: string[]): string[] {
    const currentFiles = this.thing?.files;
    if (!Array.isArray(currentFiles)) {
      return fileIds;
    }

    const existingIds = currentFiles
      .map((file: any) =>
        typeof file === 'string' ? file : file?.id || file?._id || null
      )
      .filter((id: any) => typeof id === 'string' && id !== '');

    return [...existingIds, ...fileIds];
  }

  cancelUpload(id: string): void {
    this.uploadInput.emit({ type: 'cancel', id: id });
  }

  removeFile(id: string): void {
    this.uploadInput.emit({ type: 'remove', id: id });
  }

  removeAllFiles(): void {
    this.uploadInput.emit({ type: 'removeAll' });
  }

  closeEnd(modalRef: any) {
    this.changeDoneUploading();
    this.dropMessageErrorFiles();
    this.removeAllFiles();
    this.fileProgress = [];
    modalRef.hide();
  }
}
