/**
 * Cloudflare Pages Function: /api/publish
 * One-Click Artifact Publisher: stores artifact HTML in KV (or memory)
 * and generates a permanent live shareable URL.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { title, html, code, slug } = await request.json();
    const artifactId = slug || "art_" + Math.random().toString(36).substring(2, 9);
    const finalHtml = html || code || "";

    if (env.HUB_KV) {
      await env.HUB_KV.put(`artifact:${artifactId}`, JSON.stringify({
        title: title || "Interactive Artifact",
        html: finalHtml,
        publishedAt: Date.now()
      }));
    }

    const host = request.headers.get("host") || "freellm-hub.pages.dev";
    return new Response(JSON.stringify({
      status: "ok",
      id: artifactId,
      url: `https://${host}/view.html?id=${artifactId}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing artifact id" }), { status: 400 });
  }

  try {
    if (env.HUB_KV) {
      const data = await env.HUB_KV.get(`artifact:${id}`, { type: "json" });
      if (data) {
        return new Response(data.html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("<h3>Artifact not found or KV not bound</h3>", {
      status: 404,
      headers: { "Content-Type": "text/html" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
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
