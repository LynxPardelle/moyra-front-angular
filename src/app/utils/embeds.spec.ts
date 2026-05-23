import { buildEmbedItems } from './embeds';

describe('buildEmbedItems', () => {
  it('normalizes YouTube videos to the privacy embed host', () => {
    const [embed] = buildEmbedItems(['https://youtu.be/YXIHXQjbtl8']);

    expect(embed.kind).toBe('youtube');
    expect(embed.embedUrl).toBe('https://www.youtube-nocookie.com/embed/YXIHXQjbtl8');
    expect(embed.allow).toContain('picture-in-picture');
    expect(embed.sandbox).toContain('allow-scripts');
    expect(embed.sandbox).not.toContain('allow-forms');
  });

  it('allows forms only for approved iframe providers that need them', () => {
    const [embed] = buildEmbedItems([
      'https://docs.google.com/forms/d/e/example-form/viewform',
    ]);

    expect(embed.kind).toBe('iframe');
    expect(embed.title).toBe('Google Forms');
    expect(embed.embedUrl).toContain('embedded=true');
    expect(embed.sandbox).toContain('allow-forms');
  });
});
