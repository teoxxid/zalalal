import { pipeline, env } from '@huggingface/transformers';

// Отключаем лишние логи библиотеки
env.allowLocalModels = false;
env.useBrowserCache = true;
env.remoteHost = 'https://cdn.jsdelivr.net/npm/@huggingface/';
env.remotePathTemplate = '{model}/{file}';

let extractor: any = null;

export async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    // Загрузка модели (без лишних опций)
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magA * magB === 0 ? 0 : dotProduct / (magA * magB);
}
