const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const levelMap = {
  "Elementary": "A1",
  "Pre-Intermediate": "A2",
  "Intermediate": "B1",
  "Upper-Intermediate": "B2",
  "Advanced": "C1"
};

const typeLabels = {
  one_to_one: "1-to-1 Conversation",
  meeting: "Meeting Conversation",
  interview: "Interview",
  common_mistakes: "Common Mistakes",
  useful_vocab: "Useful Vocabulary",
  phrasal_verb: "Phrasal Verbs",
  idiom: "Idioms"
};

const languageTypes = new Set(["useful_vocab", "phrasal_verb", "idiom"]);

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    hook: { type: "string" },
    situation: { type: "string" },
    dialogue_lines: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          speaker: { type: "string" },
          text: { type: "string" }
        },
        required: ["speaker", "text"]
      }
    },
    mini_situations: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          situation: { type: "string" },
          dialogue_lines: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                speaker: { type: "string" },
                text: { type: "string" }
              },
              required: ["speaker", "text"]
            }
          }
        },
        required: ["title", "situation", "dialogue_lines"]
      }
    },
    interview_question: { type: "string" },
    weak_answer: { type: "string" },
    better_answer: { type: "string" },
    mistakes: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dont: { type: "string" },
          why: { type: "string" },
          do: { type: "string" },
          alternatives: {
            type: "array",
            maxItems: 3,
            items: { type: "string" }
          }
        },
        required: ["dont", "why", "do", "alternatives"]
      }
    },
    key_phrases: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          source_phrase: { type: "string" },
          phrase_frame: { type: "string" },
          meaning: { type: "string" },
          use_when: { type: "string" },
          another_workplace_example: { type: "string" },
          item_type: {
            type: "string",
            enum: ["useful_phrase", "phrasal_verb", "idiom", "useful_vocabulary"]
          }
        },
        required: [
          "source_phrase",
          "phrase_frame",
          "meaning",
          "use_when",
          "another_workplace_example",
          "item_type"
        ]
      }
    },
    practice_prompt: { type: "string" },
    creator_note_vi: { type: "string" }
  },
  required: [
    "title",
    "hook",
    "situation",
    "dialogue_lines",
    "mini_situations",
    "interview_question",
    "weak_answer",
    "better_answer",
    "mistakes",
    "key_phrases",
    "practice_prompt",
    "creator_note_vi"
  ]
};

function languageRules(cefr) {
  const rules = {
    A1: "Use very short sentences, high-frequency words, and highly reusable workplace chunks. Avoid idioms unless the selected content type is Idioms, in which case choose only an extremely common, transparent idiom.",
    A2: "Use short practical sentences, common workplace vocabulary, simple connectors, and reusable chunks. Avoid dense idioms and abstract language.",
    B1: "Use natural workplace English with moderate sentence length, common collocations, practical hedging, and common phrasal verbs. Avoid sophisticated corporate jargon.",
    B2: "Use nuanced but natural professional English, diplomatic disagreement, hedging, and moderately complex reasoning. Keep it speakable.",
    C1: "Use precise, flexible professional English with nuance and strong discourse control, but never sound scripted, obscure, or pretentious."
  };
  return rules[cefr];
}

function scenarioRules(type) {
  if (type === "one_to_one") {
    return `
CONTENT FORMAT: 1-to-1 Conversation
- Exactly 2 speakers and 6–8 short turns.
- Select exactly 3 high-value transferable language items FIRST, then construct the situation and dialogue so those items occur naturally.
- dialogue_lines contains the conversation.
- mini_situations must be an empty array.
- interview_question, weak_answer, better_answer must be empty strings.
- mistakes must be an empty array.
- key_phrases must contain exactly 3 items.
`;
  }
  if (type === "meeting") {
    return `
CONTENT FORMAT: Meeting Conversation
- 2 or 3 speakers maximum and 8–10 concise turns.
- The meeting must involve a real clarification, disagreement, decision, recommendation, objection, or trade-off.
- Select exactly 4 high-value transferable language items FIRST, then build the dialogue around them naturally.
- dialogue_lines contains the meeting.
- mini_situations must be an empty array.
- interview_question, weak_answer, better_answer must be empty strings.
- mistakes must be an empty array.
- key_phrases must contain exactly 4 items.
`;
  }
  if (type === "interview") {
    return `
CONTENT FORMAT: Interview
- Provide one realistic interviewer question.
- Provide one weak-but-common answer.
- Provide one concise, believable better answer.
- Select exactly 3 high-value transferable language items FIRST and make them appear naturally in the better answer.
- dialogue_lines and mini_situations must be empty arrays.
- mistakes must be an empty array.
- key_phrases must contain exactly 3 items.
`;
  }
  return `
CONTENT FORMAT: Common Mistakes
- Focus on formal vs informal, too direct vs professional, or natural vs awkward workplace communication.
- Do NOT call a grammatically correct sentence "wrong" when the real issue is tone or context.
- Provide exactly 2 mistake items.
- Each item needs DON'T, a short reason, DO, and 2 short alternatives.
- Select exactly 3 high-value transferable language items FIRST; make them appear in the DO examples or alternatives.
- dialogue_lines and mini_situations must be empty arrays.
- interview_question, weak_answer, better_answer must be empty strings.
- key_phrases must contain exactly 3 items.
`;
}

function languageContentRules(type) {
  const category =
    type === "useful_vocab" ? "Useful Vocabulary" :
    type === "phrasal_verb" ? "Phrasal Verb" :
    "Idiom";

  let selection = "";
  if (type === "useful_vocab") {
    selection = `
- Choose ONE common, useful, transferable workplace word or short lexical chunk.
- Prefer broad workplace language such as issue, concern, priority, workload, impact, requirement, approach, constraint, update, or similarly transferable vocabulary.
- Do NOT default to narrow industry jargon merely because the job function is technical.
- item_type must be "useful_vocabulary".`;
  } else if (type === "phrasal_verb") {
    selection = `
- Choose ONE common, natural workplace phrasal verb that native speakers genuinely use.
- Prefer transferable items such as follow up on, look into, bring up, go over, point out, work out, sort out, come up with, when they fit naturally.
- Never force a phrasal verb into the selected context.
- item_type must be "phrasal_verb".`;
  } else {
    selection = `
- Choose ONE common, natural workplace idiom that native speakers genuinely use.
- Avoid rare, cute, textbook, old-fashioned, or culturally obscure idioms.
- The idiom must be useful for working adults and appropriate to the selected CEFR level.
- item_type must be "idiom".`;
  }

  return `
CONTENT FORMAT: ${category}
${selection}
- The target language item comes FIRST. Build the examples around it.
- Create exactly TWO different mini_situations within the SAME selected context.
- Each mini_situation must represent a different practical situation/need inside that context.
- Each mini_situation contains EXACTLY 2 dialogue turns total: Speaker A says one line, Speaker B says one line.
- The target item must appear naturally in BOTH mini_situations.
- Do NOT create a long dialogue.
- dialogue_lines must be an empty array.
- interview_question, weak_answer, better_answer must be empty strings.
- mistakes must be an empty array.
- key_phrases must contain exactly ONE item: the target language item.
- source_phrase is the exact target item/chunk that appears in both mini dialogues, not a whole context-specific sentence.
- phrase_frame is the reusable pattern. Use “…” only where a replaceable slot is natural; a standalone vocabulary item or fixed idiom does not need a forced ellipsis.
- another_workplace_example must use a DIFFERENT workplace context or job function from the main brief whenever possible.
`;
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only." }, { status: 405 });
  }

  try {
    const body = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const jobFunction = String(body.job_function || "").trim();
    const context = String(body.context || "").trim();
    const goal = String(body.communication_goal || "").trim();
    const level = String(body.level || "Intermediate");
    const type = String(body.content_type || "one_to_one");

    if (!jobFunction || !context || !goal) {
      return Response.json({ error: "Missing content brief." }, { status: 400 });
    }
    if (!levelMap[level]) {
      return Response.json({ error: "Invalid level." }, { status: 400 });
    }
    if (!typeLabels[type]) {
      return Response.json({ error: "Invalid content type." }, { status: 400 });
    }

    const cefr = levelMap[level];
    const formatRules = languageTypes.has(type) ? languageContentRules(type) : scenarioRules(type);

    const instructions = `
You are Axcela's internal practical workplace English content engine.

AXCELA PURPOSE
Create short, practical communication content for Vietnamese working adults. The viewer should be able to understand the context quickly, notice useful language, and reuse that language in another job or workplace situation.

INPUT LANGUAGE
- The brief may be written in English, Vietnamese, or a natural mix of both.
- Understand Vietnamese by meaning; do not translate it mechanically.
- All learner-facing learning content must be natural English appropriate to the selected CEFR level.
- creator_note_vi is the only output field written in Vietnamese.

CONTENT BRIEF
- Job function: ${jobFunction}
- Context: ${context}
- Communication goal: ${goal}
- Audience level: ${level} (${cefr})
- Content type: ${typeLabels[type]}

CORE CONTENT PRINCIPLE — LANGUAGE FIRST, CONTEXT SECOND
For scenario-based formats, DO NOT write a dialogue first and then select whatever sentences happen to sound good.
Instead:
1. Select common, natural, transferable workplace language items that match the communication goal and CEFR level.
2. Then build the situation/dialogue so those language items appear naturally.

Every highlighted language item must pass ALL THREE tests:
- COMMON: native speakers genuinely use it in modern workplace English.
- TRANSFERABLE: it can be reused across multiple job functions or workplace contexts.
- FUNCTIONAL: it performs a clear communication function such as clarifying, disagreeing, suggesting, investigating, following up, summarising, defending, or deciding.

Avoid low-value generic takeaways such as “I think…”, “I agree”, “Thank you”, “That’s good”.
Do not choose a sentence merely because it is relevant to the specific topic.
Do not force phrasal verbs, idioms, or advanced vocabulary where they sound unnatural.

KEY PHRASE FIELDS
- source_phrase: the exact reusable chunk or target item that appears in the generated content. It should normally be shorter than the full sentence so it can be highlighted as the transferable language.
- phrase_frame: the reusable pattern the viewer can take away. For scenario-based useful phrases, use “…” for context-specific slots when natural.
- meaning: brief plain-English meaning/function.
- use_when: one short practical usage note.
- another_workplace_example: one natural example using the same language in a DIFFERENT workplace context or job function from the main content whenever possible.
- item_type: useful_phrase, phrasal_verb, idiom, or useful_vocabulary.

EXAMPLE OF TRANSFER
Main Marketing dialogue:
“It might be worth looking at the landing-page data before we change the campaign.”
source_phrase: “It might be worth looking at”
phrase_frame: “It might be worth looking at …”
another_workplace_example: “It might be worth looking at the customer feedback before we change the process.”

Main IT dialogue:
“I’ll follow up on the access issue this afternoon.”
source_phrase: “follow up on”
phrase_frame: “follow up on …”
another_workplace_example: “I’ll follow up on the payment issue with Finance tomorrow.”

PRACTICALITY
- Practical beats clever.
- Adult workplace situations only.
- Never write generic textbook conversations.
- Situations should feel like something a real employee could face tomorrow.
- Avoid long monologues, motivational filler, inflated corporate language, and unnecessary explanation.
- Do not make every speaker unnaturally polite.
- Show realistic tension when the goal is disagreement, persuasion, defence, negotiation, or feedback.
- Keep the language speakable.

CREATOR NOTE VOICE — STRICT
- creator_note_vi is for Axcela's content team.
- Natural Vietnamese, maximum 2 short sentences.
- It MUST sound like a real experienced colleague who cares about helping the audience communicate better.
- Voice: humble, warm, calm, restrained, practical, caregiver-like, trustworthy.
- Explain one useful nuance quietly and simply.
- NEVER sound like AI, a consultant, lecturer, marketer, salesperson, or motivational speaker.
- NEVER use grand claims, inflated language, generic inspiration, corporate jargon, or phrases such as “đây là chìa khóa”, “nâng tầm”, “tối ưu hóa”, “chinh phục”, “bứt phá”, “giúp bạn tự tin hơn”.
- Do not praise Axcela. Do not over-explain.
- Prefer modest phrasing such as “Ở tình huống này…”, “Cách nói này phù hợp khi…”, “Nếu muốn mềm hơn…”, “Điểm cần lưu ý là…”.
- Trust must come from restraint and usefulness.

LEVEL CONTROL
${languageRules(cefr)}

${formatRules}

OUTPUT LANGUAGE
- title, hook, situation, all dialogue, interview content, mistakes, key phrases, meanings, use_when, another_workplace_example, and practice_prompt must be in English.
- creator_note_vi must be in Vietnamese.

OUTPUT RULES
- title: short, specific, TikTok-friendly; no clickbait.
- hook: one short recognisable workplace problem or learning hook.
- situation: 1–2 concise sentences. For language-based formats, briefly explain what the target language helps the viewer do.
- practice_prompt: short and actionable. For scenario formats, ask the viewer to replace “…” with their own situation. For language-based formats, ask the viewer to reuse the target item in their own workplace example.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input: "Generate one Axcela content draft from the brief.",
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "axcela_content_draft_v13",
            strict: true,
            schema
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error?.message || "OpenAI request failed." },
        { status: response.status }
      );
    }

    const output = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("");

    if (!output) {
      return Response.json({ error: "No usable content returned." }, { status: 500 });
    }

    const result = JSON.parse(output);

    return Response.json({
      ...result,
      job_function: jobFunction,
      context,
      communication_goal: goal,
      level_label: `${level} (${cefr})`,
      content_type: type,
      content_type_label: typeLabels[type],
      is_language_based: languageTypes.has(type)
    });

  } catch (error) {
    return Response.json(
      { error: error?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}
