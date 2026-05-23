import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { SafeEmbedUrlPipe } from '../../../pipes/safe-embed-url';
import { EmbedItem } from '../../../utils/embeds';

@Component({
  selector: 'safe-embed-frame',
  standalone: true,
  imports: [CommonModule, SafeEmbedUrlPipe],
  templateUrl: './safe-embed-frame.component.html',
  styleUrls: ['./safe-embed-frame.component.scss'],
})
export class SafeEmbedFrameComponent {
  @Input() compact = false;
  @Input() embed: EmbedItem | null = null;
}
