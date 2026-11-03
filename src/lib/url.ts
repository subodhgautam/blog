const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function href(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE}${clean}`.replace(/\/{2,}/g, '/');
  return url === '' ? '/' : url;
}

export function absoluteUrl(path = '/'): string {
  const site = import.meta.env.SITE;
  return new URL(href(path), site).href;
}
