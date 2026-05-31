const baseUrl = import.meta.env.BASE_URL || '/';
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export const publicAssetUrl = (filename: string): string =>
  `${normalizedBaseUrl}minio-files/${filename.replace(/^\/+/, '')}`;
