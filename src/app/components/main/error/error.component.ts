import { Component, OnInit } from '@angular/core';

// Services
import { GlobalUser, GlobalMain } from '../../../services/global';
import { MainService } from '../../../services/main.service';
import { WebService } from '../../../services/web.service';
import { SharedService } from '../../../services/shared.service';

// Models
import { Main } from '../../../models/main';
import { SafeRichHtmlPipe } from '../../../pipes/safe-rich-html';
import { renderTemplateExpressions } from '../../../utils/template-value';

@Component({
  selector: 'app-error',
  imports: [SafeRichHtmlPipe],
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss'],
})
export class ErrorComponent implements OnInit {
  public main!: Main;

  // Console Settings
  public document: string = 'app.component.ts';
  public customConsoleCSS = 'background-color: green; color: white; padding: 1em;';
  constructor(
    private _webService: WebService,

    private _sharedService: SharedService
  ) {
    _sharedService.changeEmitted$.subscribe((sharedContent) => {
      if (
        typeof sharedContent === 'object' &&
        sharedContent.from !== 'app' &&
        (sharedContent.to === 'app' || sharedContent.to === 'all')
      ) {
        switch (sharedContent.property) {
          case 'main':
            this.main = sharedContent.thing;
            break;
          case 'onlyConsoleMessage':
            this._webService.consoleLog(
              sharedContent.thing,
              this.document + ' 45',
              this.customConsoleCSS
            );
            break;
        }
      }
    });
  }

  ngOnInit(): void {}

  Linkify(text: string, textcolor: string = '#ffffff', linkcolor: string = '#f9c24f') {
    let value: any;
    value = {
      text: '',
      matches: [],
    };

    value = this._webService.Linkify(text, textcolor, linkcolor);

    if (value.text) {
      /* this._webService.consoleLog(
        value.matches,
        this.document + ' 105',
        this.customConsoleCSS
      ); */
      return value.text;
    } else {
      return text;
    }
  }

  // Complex functions
  valuefy(text: string) {
    return renderTemplateExpressions(text, this as unknown as Record<string, unknown>);
  }
}
