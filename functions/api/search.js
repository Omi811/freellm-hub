/**
 * Cloudflare Pages Function: /api/search
 * Serverless Real-Time Web & News Search Proxy.
 * Extracts live articles, dates, and snippets with zero rate limits or API keys.
 */

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || url.searchParams.get("query") || "";

  return handleSearch(query);
}

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const body = await request.json();
    const query = body.q || body.query || "";
    return handleSearch(query);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }
}

async function handleSearch(query) {
  const cleanQuery = query.trim().replace(/^@web\s*/i, "").replace(/^\/search\s*/i, "");
  if (!cleanQuery) {
    return new Response(JSON.stringify({ query: "", results: [], count: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const results = [];
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const resp = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FreeLLMHub/2.0)" }
    });

    if (resp.ok) {
      const xmlText = await resp.text();
      // Match XML items
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xmlText)) !== null && results.length < 5) {
        const itemContent = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
        const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);
        const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
        const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(itemContent);

        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "News Article";
        const link = linkMatch ? linkMatch[1].trim() : "";
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";
        let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim() : "";
        if (desc.length > 220) desc = desc.substring(0, 220) + "...";

        if (title && link) {
          results.append ? results.append() : results.push({
            title: title,
            url: link,
            snippet: pubDate ? `[${pubDate}] ${desc}` : desc
          });
        }
      }
    }
  } catch (err) {
    console.warn("Serverless search fetch error:", err);
  }

  // Format context string
  const formattedSnippets = results.map((r, i) => `[${i + 1}] [${r.title}](${r.url})\n${r.snippet}`);
  const contextStr = formattedSnippets.join("\n\n");

  return new Response(JSON.stringify({
    query: cleanQuery,
    results,
    context: contextStr,
    count: results.length
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60"
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
