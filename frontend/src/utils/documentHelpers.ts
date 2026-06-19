export function countWords(text: string): number {
  const words = text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/);
  return words.length === 1 && words[0] === '' ? 0 : words.length;
}

export function countCharacters(text: string): number {
  return text.replace(/<[^>]*>/g, '').length;
}

export function estimateReadingTime(text: string): number {
  const wpm = 200;
  return Math.max(1, Math.ceil(countWords(text) / wpm));
}

export function documentToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
