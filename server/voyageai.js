// server/voyageai.js
// Atlas Model API client for VoyageAI multimodal embeddings (query only)

const ATLAS_MULTIMODAL_URL = 'https://ai.mongodb.com/v1/multimodalembeddings';
const MODEL = 'voyage-multimodal-3.5';

/**
 * Embed a text query for searching images/media
 * @param {string} text - Search query text
 * @param {string} apiKey - Atlas Model API key
 * @returns {Promise<number[]>} - 1024-dimensional embedding vector
 */
export async function embedQuery(text, apiKey) {
  if (!apiKey) {
    throw new Error('ATLAS_MODEL_API_KEY not configured');
  }

  const response = await fetch(ATLAS_MULTIMODAL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [{ content: [{ type: 'text', text }] }],
      model: MODEL,
      input_type: 'query'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Atlas Model API error ${response.status}: ${error}`);
  }

  const data = await response.json();

  if (!data?.data?.[0]?.embedding) {
    throw new Error('Unexpected response format: ' + JSON.stringify(data));
  }

  return data.data[0].embedding;
}
