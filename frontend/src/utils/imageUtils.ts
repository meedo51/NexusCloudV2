const token = () => localStorage.getItem('token');

export async function fetchImageBlob(fileId: string): Promise<Blob> {
  const res = await fetch(`/api/files/${fileId}/preview`, {
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return res.blob();
}

export async function fetchImageAsObjectUrl(fileId: string): Promise<string> {
  const blob = await fetchImageBlob(fileId);
  return URL.createObjectURL(blob);
}

export async function fetchImageAsDataUrl(fileId: string): Promise<string> {
  const blob = await fetchImageBlob(fileId);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}
