export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(
  text: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

export function downloadJson(
  data: unknown,
  filename: string,
  options: { pretty?: boolean } = {}
): void {
  const { pretty = true } = options;
  const text = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  downloadText(text, filename, 'application/json');
}

