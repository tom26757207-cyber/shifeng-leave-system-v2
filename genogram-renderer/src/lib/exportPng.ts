import domtoimage from 'dom-to-image-more';

export async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined') return;
  const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) {
    await fonts.ready;
  }
}

export async function exportPng(
  el: HTMLElement,
  filename: string,
): Promise<void> {
  await waitForFonts();
  const dpr = Math.max(2, window.devicePixelRatio || 2);
  const rect = el.getBoundingClientRect();
  const dataUrl = await domtoimage.toPng(el, {
    bgcolor: '#ffffff',
    width: rect.width * dpr,
    height: rect.height * dpr,
    style: {
      transform: `scale(${dpr})`,
      transformOrigin: 'top left',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    },
    cacheBust: true,
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
