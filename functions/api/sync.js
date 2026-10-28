/**
 * Cloudflare Pages Function: /api/sync
 * Personal Cross-Device State Sync via Cloudflare KV (100k free operations/day).
 * Syncs chats and personas across phone, laptop, and desktop.
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (!env.HUB_KV) {
      return new Response(JSON.stringify({ status: "local_only", message: "Cloudflare KV not bound. Operating in offline/IndexedDB mode." }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const data = await env.HUB_KV.get("personal_hub_state", { type: "json" });
    return new Response(JSON.stringify(data || { chats: [], settings: {} }), {
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.HUB_KV) {
      return new Response(JSON.stringify({ status: "local_only", message: "Cloudflare KV not bound." }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const body = await request.json();
    await env.HUB_KV.put("personal_hub_state", JSON.stringify(body));

    return new Response(JSON.stringify({ status: "ok", syncedAt: Date.now() }), {
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
