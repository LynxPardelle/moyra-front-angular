import {
  Component,
  OnInit,
  Input,
  Output,
  TemplateRef,
  EventEmitter,
} from '@angular/core';
import {
  HttpClient,
  HttpRequest,
  HttpHeaders,
  HttpResponse,
  HttpHeaderResponse,
  HttpEventType,
} from '@angular/common/http';

// Services
import { Global } from '../../../services/global';
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
} from 'ngx-uploader';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'app-file-uploader',
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
  openModal(template: TemplateRef<any>) {
    (async () => {
      await (async () => {
        if (this.id === '') {
          let recoverThing: any = {
            type: this.type,
            typeMeta: this.typeMeta,
            typeThingComRes: this.typeThingComRes,
            thing: this.thing,
            id: this.id,
          };
          this.id = await this.pre_loader.emit(recoverThing);
        }
      })();
      if (this.id !== '') {
        this.modalRef = this.modalService.show(template);
      } else {
        Swal.fire('No hay id', 'error');
      }
    })();
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
