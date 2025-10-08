import { Subscription } from 'rxjs';
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpRequest,
  HttpHeaders,
  HttpResponse,
  HttpHeaderResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';

// Services
import { UserService } from './user.service';

//Extras
import { parse } from 'tldts';

@Injectable()
export class WebService {
  // Identity
  public identity: any = null;

  constructor(
    private _http: HttpClient,

    private _userService: UserService
  ) {}

  // Pruebas
  pruebas() {
    return 'Soy el servicio de web';
  }

  toKBorMB(size: number) {
    let nSize: any;
    switch (true) {
      case size < 1024:
        nSize = size.toFixed(2) + 'bytes';
        return nSize;
        break;
      case size > 1024 && size < 1048576:
        nSize = size / 1024;
        nSize = nSize.toFixed(2) + 'kb';
        return nSize;
        break;
      case size > 1048576 && size < 1073741824:
        nSize = size / 1048576;
        nSize = nSize.toFixed(2) + 'mb';
        return nSize;
        break;
      case size > 1073741824:
        nSize = size / 1048576;
        nSize = nSize.toFixed(2) + 'gb';
        return nSize;
        break;
    }
  }

  hexToRGB(hex: string) {
    let R = hexToR(hex);
    let G = hexToG(hex);
    let B = hexToB(hex);

    let rgb = R + ', ' + G + ', ' + B;
    console.log(rgb);

    return rgb;

    function hexToR(h: any) {
      return parseInt(cutHex(h).substring(0, 2), 16);
    }
    function hexToG(h: any) {
      return parseInt(cutHex(h).substring(2, 4), 16);
    }
    function hexToB(h: any) {
      return parseInt(cutHex(h).substring(4, 6), 16);
    }
    function cutHex(h: any) {
      return h.charAt(0) == '#' ? h.substring(1, 7) : h;
    }
  }

  toLinearGradientProgress(color: string, progress: number) {
    let progress_5 = progress + 5;
    if (progress_5 >= 100) {
      let progress_5 = 100;
    }
    let lG =
      'linear-gradient( 90deg, rgba(' +
      this.hexToRGB(color) +
      ', 1) 0%, rgba(' +
      this.hexToRGB(color) +
      ', 1) ' +
      progress +
      '%, rgba(' +
      this.hexToRGB(color) +
      ', 0) ' +
      progress_5 +
      '%, rgba(0, 0, 0, 0) 100%)';

    return lG;
  }

  /*
  webSrapper(body: any) {
    let body = JSON.stringify(body);
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this._http.post(this.urlWeb + 'scrapper', body, {
      headers: headers,
    });
  }
  */

  Linkify(
    text: string,
    textcolor: string = 'white',
    linkcolor: string = '#f4e945',
    customEmojis: any = null
  ) {
    if (text.includes('\n')) {
      let cuts = text.split('\n');

      let textcuttedOld = '';
      let textcutted = '';
      let i = 0;
      for (let cut of cuts) {
        i++;
        if (i == 0) {
          textcutted = cut + ' <br /> ';
        } else {
          textcutted = textcuttedOld + cut + ' <br /> ';
        }

        textcuttedOld = textcutted;
      }

      text = textcutted;
    }

    let matches = text.match(
      /\b([A-Z])+[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?\S/gi
    );

    let realMatches = [];

    if (matches) {
      let textsplits = '';

      let harshes = [];

      let noImg = false;

      for (let i = 0; i < matches.length; i++) {
        if (matches[i] == matches[0]) {
          textsplits = '<div style="color: ' + textcolor + ' !important;" >';
        }

        let harshN = this.Harshify(16);

        harshes.push(harshN);

        if (
          matches[i].includes('.jpg') ||
          matches[i].includes('.png') ||
          matches[i].includes('.gif') ||
          matches[i].includes('.webp') ||
          matches[i].includes('.apng') ||
          matches[i].includes('.ico') ||
          matches[i].includes('.cur') ||
          matches[i].includes('.jfif') ||
          matches[i].includes('.pjpeg') ||
          matches[i].includes('.pjp') ||
          matches[i].includes('.svg')
        ) {
          let imagestypes = [
            '.jpg',
            '.png',
            '.gif',
            '.webp',
            '.jpeg',
            '.apng',
            '.ico',
            '.cur',
            '.jfif',
            '.pjpeg',
            '.pjp',
            '.svg',
          ];
          let iIMG = 0;
          let match = matches[i];
          for (let imgtype of imagestypes) {
            if (match.includes(imgtype)) {
              let index = match.indexOf(imgtype);

              let endOfMatch = match.length - imgtype.length;

              if (index == endOfMatch) {
                textsplits =
                  textsplits +
                  text.replace(
                    match,
                    '<a href="' +
                      harshes[i] +
                      '1' +
                      '" target="_blank" title="' +
                      harshes[i] +
                      '2' +
                      '" >' +
                      '<img src="' +
                      harshes[i] +
                      '3' +
                      '" alt="' +
                      harshes[i] +
                      '4' +
                      '" width="90%" style="display: block; margin: 0 auto;" />' +
                      '</a>'
                  );
              } else if (iIMG >= imagestypes.length) {
                noImg = true;
              }
            } else if (iIMG >= imagestypes.length) {
              noImg = true;
            }
          }
        } else {
          noImg = true;
        }

        if (noImg == true) {
          if (this.CheckForDomainsuffix(matches[i]) == true) {
            if (matches[i] == matches[0]) {
              let index = text.indexOf(matches[i]);

              let textsplit = text.split(matches[i]);

              if (index == 0) {
                textsplits =
                  textsplits +
                  '<a style="color: ' +
                  linkcolor +
                  ' !important;" href="' +
                  harshes[0] +
                  '1' +
                  '" title="' +
                  harshes[0] +
                  '2' +
                  '" target="_blank">' +
                  harshes[0] +
                  '3' +
                  '</a>' +
                  textsplit[0];
              } else {
                textsplits =
                  textsplits +
                  textsplit[0] +
                  '<a style="color: ' +
                  linkcolor +
                  ' !important;" href="' +
                  harshes[0] +
                  '1' +
                  '" title="' +
                  harshes[0] +
                  '2' +
                  '" target="_blank">' +
                  harshes[0] +
                  '3' +
                  '</a>';
              }

              if (textsplit[1]) {
                textsplits = textsplits + textsplit[1];
              }
            }

            if (matches[i] != matches[0]) {
              let textsplit = text.split(matches[i]);

              textsplits =
                textsplit[0] +
                '<a style="color: ' +
                linkcolor +
                ' !important;" href="' +
                harshes[i] +
                '1' +
                '" title="' +
                harshes[i] +
                '2' +
                '" target="_blank">' +
                harshes[i] +
                '3' +
                '</a>';

              if (textsplit[1]) {
                textsplits = textsplits + textsplit[1];
              }
            }

            realMatches.push(matches[i]);
          } else {
            let textsplit = text.split(matches[i]);
            textsplits = textsplit[0] + harshes[i] + '1';
            if (textsplit[1]) {
              textsplits = textsplits + textsplit[1];
            }
          }
        }

        if (i >= matches.length - 1) {
          textsplits = textsplits + '</div>';
        }

        text = textsplits;
      }

      for (let i = 0; i < harshes.length; i++) {
        text = text.replace(harshes[i] + '1', matches[i]);
        text = text.replace(harshes[i] + '2', matches[i]);
        text = text.replace(harshes[i] + '3', matches[i]);
        text = text.replace(harshes[i] + '4', matches[i]);
      }
    } else {
      text =
        '<div style="color: ' + textcolor + ' !important;" >' + text + '</div>';
    }

    if (customEmojis != null) {
      text = this.Emojify(text, customEmojis);
    }

    return { text, matches: realMatches };
  }

  CheckForDomainsuffix(string: string) {
    let stringparsed = parse(string);

    if (stringparsed.isIcann == true) {
      return true;
    } else {
      return false;
    }
  }

  Harshify(length: number) {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -+/*%$#!&/()=.,{}´+¨*[]:;_¡?¿|°';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  Emojify(text: string, customEmojis: any) {
    /*
    let matches = text.match(
      /:+[-a-zA-Z0-9_~#?&//=]{3,20}\w+:(:skin-tone-:)?/gi
    );

    if (matches) {
      let textsplitsOld = '';
      let textsplits = '';

      for (let i = 0; i < matches.length; i++) {
        let emoji = { name: '', imageUrl: '' };

        for (let Cemoji of customEmojis) {
          if (Cemoji.colons == matches[i]) {
            emoji = Cemoji;
          }
        }

        if (matches[i] == matches[0]) {
          let index = text.indexOf(matches[i]);

          let textsplit = text.split(matches[i]);

          if (index == 0) {
            textsplits =
              '<span class="emoji-mart-emoji emoji-mart-emoji-native emoji-mart-emoji-custom ng-star-inserted" title="' +
              emoji.name +
              '" aria-label="' +
              emoji.name +
              '" >' +
              `<span style="width: 24px; height: 24px; display: inline-block; background-image: url('` +
              emoji.imageUrl +
              `'); background-size: contain;" >` +
              '</span>' +
              '</span>' +
              textsplit[0];

            textsplitsOld = textsplits;
          } else {
            textsplits =
              textsplit[0] +
              '<span class="emoji-mart-emoji emoji-mart-emoji-native emoji-mart-emoji-custom ng-star-inserted" title="' +
              emoji.name +
              '" aria-label="' +
              emoji.name +
              '" >' +
              `<span style="width: 24px; height: 24px; display: inline-block; background-image: url('` +
              emoji.imageUrl +
              `'); background-size: contain;" >` +
              '</span>' +
              '</span>';

            textsplitsOld = textsplits;
          }

          if (textsplit[1]) {
            textsplits = textsplitsOld + textsplit[1];
          } else {
            textsplits = textsplitsOld;
          }
          textsplitsOld = textsplits;
        }

        if (matches[i] != matches[0]) {
          let textsplit = text.split(matches[i]);

          textsplits =
            textsplitsOld +
            '<span class="emoji-mart-emoji emoji-mart-emoji-native emoji-mart-emoji-custom ng-star-inserted" title="' +
            emoji.name +
            '" aria-label="' +
            emoji.name +
            '" >' +
            `<span style="width: 24px; height: 24px; display: inline-block; background-image: url('` +
            emoji.imageUrl +
            `'); background-size: contain;" >` +
            '</span>' +
            '</span';
          textsplitsOld = textsplits;

          if (textsplit[1]) {
            textsplits = textsplitsOld + textsplit[1];
          } else {
            textsplits = textsplitsOld;
          }
          textsplitsOld = textsplits;
        }

        text = textsplits;
      }
    }
    */

    return text;
  }

  uploadFiles(files: File[], url: string): Observable<any> {
    let formData = new FormData();

    console.log(files);

    let i = 0;

    for (let file of files) {
      console.log(file);
      formData.append('file' + i, file);
      console.log(formData);
      i++;
    }

    return this._http.post(url, formData, {
      observe: 'events',
      reportProgress: true,
    });
  }

  cuttingText(text: string, element: any, lines: number) {
    /*
    while (text.length <= 2000) {
      text =
      text + ' Lorem ipsum dolor, sit amet consectetur adipisicing elit.';
    }
    */

    element = document.getElementById(element);
    let style = window.getComputedStyle(element);
    let font_size = window.getComputedStyle(element).fontSize;
    let font_family = window.getComputedStyle(element).fontFamily;
    let font = font_size + ' ' + font_family;
    let padding_adding: number;
    padding_adding = 0;
    if (
      window.getComputedStyle(element).paddingRight ||
      window.getComputedStyle(element).paddingLeft
    ) {
      if (
        window.getComputedStyle(element).paddingRight &&
        window.getComputedStyle(element).paddingLeft
      ) {
        padding_adding =
          parseInt(
            window.getComputedStyle(element).paddingRight.replace(/\D/g, '')
          ) +
          parseInt(
            window.getComputedStyle(element).paddingLeft.replace(/\D/g, '')
          );
      } else if (
        window.getComputedStyle(element).paddingRight &&
        !window.getComputedStyle(element).paddingLeft
      ) {
        padding_adding = parseInt(
          window.getComputedStyle(element).paddingRight
        );
      } else if (
        window.getComputedStyle(element).paddingLeft &&
        !window.getComputedStyle(element).paddingRight
      ) {
        padding_adding = parseInt(window.getComputedStyle(element).paddingLeft);
      }
    } else if (window.getComputedStyle(element).padding) {
      let difPads = window.getComputedStyle(element).padding.split(' ');
      if (difPads[0] && !difPads[1]) {
        padding_adding = parseInt(difPads[0].replace(/\D/g, ''));
      } else if (difPads[0] && difPads[1] && !difPads[2] && !difPads[3]) {
        padding_adding =
          parseInt(difPads[1].replace(/\D/g, '')) +
          parseInt(difPads[1].replace(/\D/g, ''));
      } else if (difPads[0] && difPads[1] && difPads[2] && difPads[3]) {
        padding_adding =
          parseInt(difPads[1].replace(/\D/g, '')) +
          parseInt(difPads[3].replace(/\D/g, ''));
      }
    }
    let element_width: number;
    element_width = parseInt(element.clientWidth);
    element_width = element_width - padding_adding;
    element_width = element_width * lines;
    let posibleSpaces = padding_adding * (lines / 2);
    element_width = element_width - posibleSpaces;

    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    if (context) {
      context.font = font;
      let width = context.measureText(text).width;
      let isTooLong: boolean;
      if (width >= element_width) {
        text = text.slice(0, text.length - 6) + '...';
        isTooLong = true;
      } else {
        isTooLong = false;
      }

      while (isTooLong == true) {
        let Ncanvas = document.createElement('canvas');
        let Ncontext = Ncanvas.getContext('2d');
        if (Ncontext) {
          Ncontext.font = font;
          let Nwidth = Ncontext.measureText(text).width;
          if (Nwidth >= element_width) {
            text = text.slice(0, text.length - 6) + '...';
            isTooLong = true;
          } else {
            isTooLong = false;
          }
        } else {
          isTooLong = false;
        }
      }
    }
    return text;
  }

  checkWindowWidth(downUp: string, width: number) {
    let windowWidth = window.innerWidth;
    if (windowWidth >= width) {
      if (downUp === 'up') {
        return true;
      } else {
        return false;
      }
    } else {
      if (downUp === 'down') {
        return true;
      } else {
        return false;
      }
    }
  }

  consoleLog(thing: any, line: string = '', style: string = 'padding: 1em;') {
    this.identity = this._userService.getIdentity();

    /*
    if (
      this.identity &&
      this.identity.role &&
      this.identity.role === 'ROLE_ADMIN'
      */
    if (true) {
      if (line && line !== '') {
        console.log('%cline: ' + line + ' = ', style);
      } else {
        console.groupCollapsed('Trace');
        console.trace();
        console.groupEnd();
      }
      if (typeof thing !== 'object') {
        console.log(`%c${thing}`, style);
      } else {
        console.dir(thing);
      }
    }

    /*
    if (line && line !== '') {
      console.log('%cline ' + line + ' = ', style);
    }
    if (typeof thing !== 'object') {
      console.log(`%c${thing}`, style);
    } else {
      console.dir(`%c${thing}`, style);
    }
    */
  }

  random(min: number = 0, max: number = 50) {
    let num = Math.random() * (max - min) + min;

    return Math.round(num);
  }
}
