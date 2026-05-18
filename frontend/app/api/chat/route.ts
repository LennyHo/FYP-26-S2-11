import { NextResponse } from 'next/server';

interface SourcePreview {
  title: string;
  url: string;
  snippet?: string;
  sourceName?: string;
  favicon?: string;
}

const TRUSTED_SOURCE_HOSTS = [
  'hpb.gov.sg',
  'moh.gov.sg',
  'nus.edu.sg',
  'ntu.edu.sg',
  'sph.com.sg',
  'channelnewsasia.com',
  'todayonline.com',
  'straitstimes.com',
];

function getFaviconUrl(hostname: string): string {
  return `https://www.google.com/s2/favicons?sz=48&domain=${encodeURIComponent(hostname)}`;
}

function isTrustedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return TRUSTED_SOURCE_HOSTS.some(
    trustedHost => normalized === trustedHost || normalized.endsWith(`.${trustedHost}`)
  );
}

function toSafeSourceList(value: unknown): SourcePreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupe = new Set<string>();

  return value
    .map((item): SourcePreview | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const rawUrl = typeof record.url === 'string' ? record.url.trim() : '';
      const snippet = typeof record.snippet === 'string' ? record.snippet.trim() : '';
      const sourceName = typeof record.sourceName === 'string' ? record.sourceName.trim() : '';

      if (!title || !rawUrl || dedupe.has(rawUrl)) {
        return null;
      }

      try {
        const parsed = new URL(rawUrl);
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !isTrustedHost(parsed.hostname)) {
          return null;
        }
      } catch {
        return null;
      }

      dedupe.add(rawUrl);
      return {
        title,
        url: rawUrl,
        snippet: snippet || undefined,
        sourceName: sourceName || undefined,
        favicon: getFaviconUrl(new URL(rawUrl).hostname),
      };
    })
    .filter((source): source is SourcePreview => Boolean(source))
    .slice(0, 3);
}

function extractQuestion(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }

  const message = (body as Record<string, unknown>).message;
  return typeof message === 'string' ? message.trim() : '';
}

function shouldEnrichSources(question: string, reply: string): boolean {
  if (!question || question.length < 5) {
    return false;
  }

  const lowerReply = reply.toLowerCase();
  if (lowerReply.includes('hidden-cart-data')) {
    return false;
  }

  if (lowerReply.includes('connection failed') || lowerReply.includes('error connecting')) {
    return false;
  }

  return true;
}

function validateSourceRelevance(title: string, snippet: string, question: string): boolean {
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const contentText = `${title} ${snippet}`.toLowerCase();
  
  // Check if at least some key words from the question appear in the content
  const matchedWords = questionWords.filter(word => contentText.includes(word));
  return matchedWords.length >= Math.min(2, questionWords.length);
}

async function fetchSingaporeHealthSources(question: string): Promise<SourcePreview[]> {
  try {
    const hpbSearchUrl = `https://www.hpb.gov.sg/search?search=${encodeURIComponent(question)}`;
    const response = await fetch(hpbSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    
    // Extract article links from HPB search results
    // Look for links in the search results format
    const linkRegex = /<a[^>]*href=["']([^"']*hpb\.gov\.sg[^"']*?)["'][^>]*title=["']?([^"'>]*)/gi;
    const results: SourcePreview[] = [];
    const seenUrls = new Set<string>();
    
    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < 3) {
      let url = match[1];
      const title = match[2]?.trim() || question;

      // Skip search pages and filter duplicates
      if (url.includes('/search') || seenUrls.has(url)) {
        continue;
      }

      // Normalize URL
      if (!url.startsWith('http')) {
        url = 'https://www.hpb.gov.sg' + (url.startsWith('/') ? url : '/' + url);
      }

      try {
        new URL(url);
        
        // Fetch the article content to validate relevance
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          cache: 'no-store',
        });

        if (!articleResponse.ok) {
          continue;
        }

        const articleHtml = await articleResponse.text();
        
        // Extract a snippet from the article content
        const contentMatch = articleHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        const snippet = contentMatch?.[1] || 'Health information from Singapore Health Promotion Board';
        
        // Validate that the article is actually relevant
        if (validateSourceRelevance(title, snippet, question)) {
          seenUrls.add(url);
          results.push({
            title,
            url,
            snippet,
            sourceName: 'HPB Singapore',
            favicon: getFaviconUrl('hpb.gov.sg'),
          });
        }
      } catch (e) {
        console.error('[API] Error processing HPB article:', e);
        continue;
      }
    }

    if (results.length > 0) {
      console.log('[API] Found HPB articles:', results.map(r => r.url));
      return results;
    }
  } catch (error) {
    console.error('[API] HPB fetch failed:', error);
  }
  
  return [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const configuredBase = process.env.DRIPTEA_API_BASE?.trim();
    const backendBases = [
      configuredBase,
      // done by "HDC" - deployed frontend chat proxy falls back to Render backend instead of localhost.
      'https://fyp-26-s2-11.onrender.com',
      // Local development fallbacks, commented out for deployment safety:
      // 'http://127.0.0.1:4000',
      // 'http://localhost:4000',
      // 'http://127.0.0.1:5000',
      // 'http://localhost:5000',
      // end done by "HDC"
    ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

    let backendResponse: Response | null = null;
    let lastNetworkError: unknown = null;

    for (const backendBase of backendBases) {
      try {
        backendResponse = await fetch(`${backendBase}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          cache: 'no-store',
        });
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }

    if (!backendResponse) {
      throw lastNetworkError instanceof Error
        ? lastNetworkError
        : new Error('Unable to connect to the DripTea backend.');
    }

    const text = await backendResponse.text();
    // Debug log: print backend's raw response
    console.log('[API] Raw backend response:', text);

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        reply: text || 'Backend returned a non-JSON response.',
        system_action: { ui_navigation: 'none' },
      };
    }

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      const backendSources = toSafeSourceList(record.sources);
      const replyText = typeof record.reply === 'string' ? record.reply : '';
      const question = extractQuestion(body);
      let enrichedSources = backendSources;
      if (enrichedSources.length === 0 && shouldEnrichSources(question, replyText)) {
        console.log('[API] Enriching sources for question:', question);
        const singaporeSources = await fetchSingaporeHealthSources(question);
        enrichedSources = singaporeSources;
        console.log('[API] Enriched Singapore sources result:', enrichedSources);
      }

      payload = {
        ...record,
        sources: enrichedSources,
      };
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to connect to DripTea backend';

    return NextResponse.json(
      {
        reply: `Connection failed: ${message}. Start the DripTea backend in c:\\FYP\\FYP-26-S2-11\\DripTea_V1 and set DRIPTEA_API_BASE if your backend uses a different host or port.`,
        system_action: { ui_navigation: 'none' },
      },
      { status: 502 }
    );
  }
}
