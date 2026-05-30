export function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text || fallback;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value, fallback = "-") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value, fallback);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatMonth(value, fallback = "-") {
  if (!value) return fallback;
  const match = String(value).match(/^(\d{4})-(\d{2})/);
  if (!match) return String(value);
  return `${match[2]}/${match[1]}`;
}
