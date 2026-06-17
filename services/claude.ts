const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

export type IdeaTag = 'idea' | 'task' | 'feeling' | 'question';
export type IdeaPriority = 'high' | 'medium' | 'low';

export interface ExtractionResult {
  summary: string;
  actionItems: string[];
  tags: IdeaTag[];
  priority: IdeaPriority;
}

const SYSTEM_PROMPT =
  'Extract structured data from a voice transcript. ' +
  'Respond with ONLY a valid JSON object containing:\n' +
  '- "summary": 1-2 sentence summary\n' +
  '- "actionItems": array of concrete next actions (empty array if none)\n' +
  '- "tags": array using ONLY values from ["idea","task","feeling","question"] (at least one required)\n' +
  '- "priority": exactly one of "high","medium","low"\n' +
  'No markdown fences. No explanation. Only the JSON object.';

const VALID_TAGS: IdeaTag[] = ['idea', 'task', 'feeling', 'question'];
const VALID_PRIORITIES: IdeaPriority[] = ['high', 'medium', 'low'];

export async function extractFromTranscript(transcript: string): Promise<ExtractionResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'REPLACE_WITH_VALUE') {
    throw new Error('Anthropic API key not configured');
  }

  const response = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content[0]?.text ?? '{}';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: unknown;
      actionItems?: unknown;
      tags?: unknown;
      priority?: unknown;
    };
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      actionItems: Array.isArray(parsed.actionItems)
        ? (parsed.actionItems as unknown[]).filter((a): a is string => typeof a === 'string')
        : [],
      tags: Array.isArray(parsed.tags)
        ? (parsed.tags as unknown[]).filter((t): t is IdeaTag => VALID_TAGS.includes(t as IdeaTag))
        : ['idea'],
      priority: VALID_PRIORITIES.includes(parsed.priority as IdeaPriority)
        ? (parsed.priority as IdeaPriority)
        : 'medium',
    };
  } catch {
    return {
      summary: transcript.slice(0, 120),
      actionItems: [],
      tags: ['idea'],
      priority: 'medium',
    };
  }
}
