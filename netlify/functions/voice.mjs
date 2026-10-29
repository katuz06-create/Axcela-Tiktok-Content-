// Axcela TikTok Content Engine V1.5 — audio-only reliability fix.
// This function keeps the same request/response contract as V1.4.
// A dedicated text-to-speech endpoint prevents chat-style spoken introductions.

const TTS_MODEL = "gpt-4o-mini-tts";

export default async function handler(req) {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only." }, { status: 405 });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const body = await req.json();
    const text = String(body.text || "").trim();
    const accent = String(body.accent || "american").toLowerCase();
    const gender = String(body.gender || "female").toLowerCase();
    const voice = gender === "male" ? "cedar" : "marin";

    if (!text) {
      return Response.json({ error: "Text is required." }, { status: 400 });
    }
    if (text.length > 1500) {
      return Response.json({ error: "Text is too long for a single audio clip." }, { status: 400 });
    }

    const accentInstruction = accent === "british"
      ? "Use natural contemporary British English pronunciation."
      : "Use natural contemporary General American English pronunciation.";

    // This is a delivery instruction, NOT spoken content.
    const instructions = [
      "Speak only the supplied input text. Do not add any introduction, acknowledgement, commentary, or closing words.",
      "Never say phrases such as 'Sure', 'Here is the recording', or 'I'll read it for you' unless they are literally part of the input text.",
      accentInstruction,
      "Use a natural adult workplace speaking style with normal native conversational pace.",
      "Do not slow down for English learners. Preserve natural linking, reductions, stress, rhythm, and intonation.",
      "Be clear, calm, human, and professional. Do not over-enunciate.",
      "If the input contains '…' or '...', pause naturally; do not pronounce punctuation aloud."
    ].join(" ");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: text,
        voice,
        instructions,
        response_format: "mp3",
        speed: 1.0
      })
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = "Audio generation failed.";
      try { message = JSON.parse(raw)?.error?.message || message; } catch {}
      return Response.json({ error: message }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return Response.json({ error: "Audio service returned an unexpected response." }, { status: 502 });
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length) {
      return Response.json({ error: "No audio was returned." }, { status: 502 });
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Axcela-Audio-Disclosure": "AI-generated voice"
      }
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unexpected audio error." },
      { status: 500 }
    );
  }
}
