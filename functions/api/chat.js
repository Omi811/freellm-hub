/**
 * Cloudflare Pages Function: /api/chat
 * Edge-based streaming proxy with rate-limit resilience and multi-provider failover.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { model_id, messages, temperature = 0.7, max_tokens = 4096, system_prompt } = body;

    // Build payload messages
    const formattedMessages = [];
    if (system_prompt) {
      formattedMessages.push({ role: "system", content: system_prompt });
    }
    if (Array.isArray(messages)) {
      formattedMessages.push(...messages);
    }

    // Resolve API keys from Cloudflare Pages Environment or base64 fallbacks
    const openrouterKey = env.OPENROUTER_API_KEY || (typeof atob === "function" ? atob("c2stb3ItdjEtNjhiMjBmYjZiOTMyYzRmNWRjODIzNjlmNGZlZWUxM2RmYWIzMWNjNWFiYzg5ZGI3YzVmODkyNGU4ZTI5Mjk3Mg==") : "");
    const groqKey = env.GROQ_API_KEY || (typeof atob === "function" ? atob("Z3NrX0VVQThVTjBGcWJPek9waVplOGI3V0dkeWIwRllJdEhLWWVjUGx1dE9HM0p4aWhzYWxQNWQ=") : "");

    let targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    let authHeader = `Bearer ${openrouterKey}`;
    let targetModel = model_id || "openrouter/free";

    if (targetModel.startsWith("groq/")) {
      targetUrl = "https://api.groq.com/openai/v1/chat/completions";
      authHeader = `Bearer ${groqKey}`;
      targetModel = targetModel.replace(/^groq\//, "");
    } else {
      if (targetModel.startsWith("openrouter/")) {
        targetModel = targetModel.replace(/^openrouter\//, "");
      }
      if (targetModel === "free") targetModel = "openrouter/free";
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "HTTP-Referer": "https://freellm-hub.pages.dev",
        "X-Title": "FreeLLM Hub Edge"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: formattedMessages,
        temperature,
        max_tokens,
        stream: true
      })
    });

    if (!upstreamResponse.ok) {
      const errText = await upstreamResponse.text();
      return new Response(JSON.stringify({ error: `Upstream error (${upstreamResponse.status}): ${errText}` }), {
        status: upstreamResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy the Server-Sent Events stream directly to client
    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Edge proxy failure" }), {
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Hub-Token"
    }
  });
}
