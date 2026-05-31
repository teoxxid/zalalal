let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.remoteHost = 'https://cdn.jsdelivr.net/npm/@huggingface/';
    env.remotePathTemplate = '{model}/{file}';
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const featureExtractor = await getExtractor();
  const output = await featureExtractor(text, {
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
