import { Component, Input } from '@angular/core';

import { SafeEmbedUrlPipe } from '../../../pipes/safe-embed-url';
import { EmbedItem } from '../../../utils/embeds';

@Component({
  selector: 'safe-embed-frame',
  standalone: true,
  imports: [SafeEmbedUrlPipe],
  templateUrl: './safe-embed-frame.component.html',
  styleUrls: ['./safe-embed-frame.component.scss'],
})
export class SafeEmbedFrameComponent {
  readonly defaultExternalAllow =
    'clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share';
  readonly defaultExternalSandbox =
    'allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts';
  @Input() compact = false;
  @Input() embed: EmbedItem | null = null;
}
