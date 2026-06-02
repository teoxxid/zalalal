const baseUrl = import.meta.env.BASE_URL || '/';
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export const publicAssetUrl = (filename: string): string =>
  `${normalizedBaseUrl}minio-files/${filename.replace(/^\/+/, '')}`;

export const publicFileUrl = (filename: string): string =>
  `${normalizedBaseUrl}${filename.replace(/^\/+/, '')}`;

export const placeholderAssetUrl = publicFileUrl('placeholder.svg');
