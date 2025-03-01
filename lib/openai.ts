import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function createEmbedding(content: string) {
  const { data } = await client.embeddings.create({
    input: content,
    model: 'text-embedding-3-small'
  });

  return data[0].embedding;
}
