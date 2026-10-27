const VOICE_MODEL = process.env.OPENAI_VOICE_MODEL || "gpt-audio-1.5";

const allowedVoices = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable",
  "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"
]);

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
    const requestedVoice = String(body.voice || "marin").toLowerCase();
    const voice = allowedVoices.has(requestedVoice) ? requestedVoice : "marin";

    if (!text) {
      return Response.json({ error: "Text is required." }, { status: 400 });
    }
    if (text.length > 1500) {
      return Response.json({ error: "Text is too long for a single audio clip." }, { status: 400 });
    }

    const accentInstruction = accent === "british"
      ? "Use natural contemporary British English pronunciation."
      : "Use natural contemporary General American English pronunciation.";

    const systemInstruction = `
You are producing a short English voice clip for Axcela workplace-English content.

READING RULES — STRICT
- Read EXACTLY the text supplied by the user. Do not add, remove, explain, answer, paraphrase, introduce, or conclude.
- ${accentInstruction}
- Speak at a NORMAL NATIVE CONVERSATIONAL PACE.
- Do NOT slow down because the audience is learning English.
- Keep natural linking, reductions, sentence stress, rhythm, and intonation.
- Be clear and professional, but never sound like a language-learning recording that is artificially slow or over-enunciated.
- If the text contains the ellipsis character “…” or "...", make a short natural pause. Never say the word "ellipsis" or "dot dot dot".
- Keep the delivery human, calm, and appropriate to a modern workplace.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: VOICE_MODEL,
        modalities: ["text", "audio"],
        audio: {
          voice,
          format: "mp3"
        },
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: text }
        ],
        store: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error?.message || "Audio generation failed." },
        { status: response.status }
      );
    }

    const base64 = data?.choices?.[0]?.message?.audio?.data;
    if (!base64) {
      return Response.json({ error: "No audio was returned." }, { status: 500 });
    }

    const bytes = Uint8Array.from(Buffer.from(base64, "base64"));

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
