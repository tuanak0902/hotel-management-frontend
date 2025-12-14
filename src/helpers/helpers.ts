export function formatMoney(value: number, locale: string = 'vi-VN'): string {
  return value.toLocaleString(locale);
}
export function stripDiacritics(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining marks
    .replace(/\u0111/g, 'd') // đ -> d
    .replace(/\u0110/g, 'D'); // Đ -> D
}
export function formatDateShort(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
export function formatDate(dateIso?: string) {
  if (!dateIso) return '-';
  const d = new Date(dateIso);
  return d.toLocaleDateString();
}
export function formatTime(dateIso?: string) {
  if (!dateIso) return '-';
  const d = new Date(dateIso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}