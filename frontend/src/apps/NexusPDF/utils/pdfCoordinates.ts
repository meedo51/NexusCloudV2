export function getPageEl(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-page-container]') as HTMLElement | null;
}

export function viewportToPage(
  clientX: number, clientY: number,
  pageEl: HTMLElement, zoom: number
) {
  const pr = pageEl.getBoundingClientRect();
  return {
    x: (clientX - pr.left) / zoom,
    y: (clientY - pr.top) / zoom,
  };
}

export function pageToViewport(
  pageX: number, pageY: number,
  pageEl: HTMLElement, zoom: number
) {
  const pr = pageEl.getBoundingClientRect();
  return {
    x: pr.left + pageX * zoom,
    y: pr.top + pageY * zoom,
  };
}

export function rectsViewportToPage(
  viewportRects: DOMRect[],
  pageEl: HTMLElement,
  zoom: number
) {
  const pr = pageEl.getBoundingClientRect();
  return Array.from(viewportRects).map(r => ({
    x: (r.left - pr.left) / zoom,
    y: (r.top - pr.top) / zoom,
    width: r.width / zoom,
    height: r.height / zoom,
  }));
}

export function getToolbarPosition(
  range: Range,
  offsetAbove = 8
): { x: number; y: number } {
  const rect = range.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top - offsetAbove,
  };
}
