const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const levelMap = {
  "Elementary":"A1",
  "Pre-Intermediate":"A2",
  "Intermediate":"B1",
  "Upper-Intermediate":"B2",
  "Advanced":"C1"
};

const typeLabels = {
  one_to_one:"1-to-1 Conversation",
  meeting:"Meeting Conversation",
  interview:"Interview",
  common_mistakes:"Common Mistakes"
};

const schema = {
  type:"object",
  additionalProperties:false,
  properties:{
    title:{type:"string"},
    hook:{type:"string"},
    situation:{type:"string"},
    dialogue_lines:{
      type:"array",
      maxItems:10,
      items:{
        type:"object",
        additionalProperties:false,
        properties:{speaker:{type:"string"},text:{type:"string"}},
        required:["speaker","text"]
      }
    },
    interview_question:{type:"string"},
    weak_answer:{type:"string"},
    better_answer:{type:"string"},
    mistakes:{
      type:"array",
      maxItems:3,
      items:{
        type:"object",
        additionalProperties:false,
        properties:{
          dont:{type:"string"},
          why:{type:"string"},
          do:{type:"string"},
          alternatives:{type:"array",maxItems:3,items:{type:"string"}}
        },
        required:["dont","why","do","alternatives"]
      }
    },
    key_phrases:{
      type:"array",
      minItems:3,
      maxItems:4,
      items:{
        type:"object",
        additionalProperties:false,
        properties:{
          phrase:{type:"string"},
          meaning:{type:"string"},
          use_when:{type:"string"}
        },
        required:["phrase","meaning","use_when"]
      }
    },
    practice_prompt:{type:"string"},
    creator_note_vi:{type:"string"}
  },
  required:[
    "title","hook","situation","dialogue_lines","interview_question",
    "weak_answer","better_answer","mistakes","key_phrases",
    "practice_prompt","creator_note_vi"
  ]
};

function rulesForType(type){
  if(type==="one_to_one"){
    return `
CONTENT FORMAT: 1-to-1 Conversation
- Exactly 2 speakers.
- 6–8 short turns total.
- The exchange must contain a real communication problem or objective.
- Return exactly 3 useful transferable phrases that appear VERBATIM in the dialogue.
- interview_question, weak_answer, better_answer must be empty strings.
- mistakes must be an empty array.
`;
  }
  if(type==="meeting"){
    return `
CONTENT FORMAT: Meeting Conversation
- 2 or 3 speakers maximum.
- 8–10 concise turns.
- There must be one real meeting purpose: clarification, disagreement, decision, recommendation, objection, or trade-off.
- Return exactly 4 useful transferable phrases that appear VERBATIM in the dialogue.
- interview_question, weak_answer, better_answer must be empty strings.
- mistakes must be an empty array.
`;
  }
  if(type==="interview"){
    return `
CONTENT FORMAT: Interview
- Provide one realistic interviewer question.
- Provide one weak-but-common answer.
- Provide one clearly better answer that is concise and believable, not perfect or over-polished.
- dialogue_lines must be an empty array.
- mistakes must be an empty array.
- Return exactly 3 useful transferable phrases that appear VERBATIM in the better answer.
`;
  }
  return `
CONTENT FORMAT: Common Mistakes
- Focus primarily on formal vs informal, too direct vs professional, or natural vs awkward workplace communication.
- Do NOT call grammatically correct sentences "wrong" if the real issue is tone/context. Explain the context issue clearly.
- Provide exactly 2 mistake items.
- Each item needs DON'T, why it may not work, DO, and 2 short alternatives.
- dialogue_lines must be an empty array.
- interview_question, weak_answer, better_answer must be empty strings.
- Return exactly 3 useful transferable phrases that appear VERBATIM in the DO examples or alternatives.
`;
}

function languageRules(cefr){
  const rules={
    A1:"Use very short sentences, high-frequency words, simple present/past where natural, and highly reusable phrases. Avoid idioms and complex clauses.",
    A2:"Use short practical sentences, common workplace vocabulary, simple connectors, and reusable chunks. Avoid dense idioms and abstract language.",
    B1:"Use natural workplace English with moderate sentence length, common collocations, and practical hedging. Avoid overly sophisticated corporate jargon.",
    B2:"Use nuanced but natural professional English, diplomatic disagreement, hedging, and moderately complex reasoning. Keep it speakable.",
    C1:"Use precise, flexible professional English with nuance and strong discourse control, but avoid sounding scripted or pretentious."
  };
  return rules[cefr];
}

export default async function handler(req){
  if(req.method!=="POST"){
    return Response.json({error:"POST only."},{status:405});
  }

  try{
    const body=await req.json();
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey) return Response.json({error:"OPENAI_API_KEY is missing."},{status:500});

    const jobFunction=String(body.job_function||"").trim();
    const context=String(body.context||"").trim();
    const goal=String(body.communication_goal||"").trim();
    const level=String(body.level||"Intermediate");
    const type=String(body.content_type||"one_to_one");

    if(!jobFunction||!context||!goal){
      return Response.json({error:"Missing content brief."},{status:400});
    }
    if(!levelMap[level]) return Response.json({error:"Invalid level."},{status:400});
    if(!typeLabels[type]) return Response.json({error:"Invalid content type."},{status:400});

    const cefr=levelMap[level];

    const instructions=`
You are Axcela's internal practical workplace English content engine.

Axcela's goal:
Create short, useful communication content for Vietnamese working adults. Viewers should be able to watch the content, replace the situation with their own context, and practise immediately.

CONTENT BRIEF
- Job function: ${jobFunction}
- Context: ${context}
- Communication goal: ${goal}
- Audience level: ${level} (${cefr})
- Content type: ${typeLabels[type]}

NON-NEGOTIABLE AXCELA RULES
- Practical beats clever.
- Adult workplace situations only.
- Never write generic textbook conversations.
- The scenario must feel like something a real employee could face tomorrow.
- Useful phrases must be transferable to other similar situations.
- Avoid long monologues.
- Avoid motivational filler.
- Avoid unnecessary explanation.
- Do not make every speaker unnaturally polite.
- Do not overuse business buzzwords.
- Do not use slang unless the context genuinely requires it.
- If the communication goal involves disagreement, persuasion, defence or feedback, show a realistic amount of tension.
- Highlight phrases are not decorative: each phrase must have a clear communication function.
- creator_note_vi is for Axcela's content team, not the learner. Write it in natural Vietnamese, maximum 2 short sentences, explaining why this scenario/phrasing is useful or what tone nuance matters.

LEVEL CONTROL
${languageRules(cefr)}

${rulesForType(type)}

OUTPUT RULES
- title: short, TikTok-friendly, specific.
- hook: one short opening line that creates a recognisable problem. No clickbait.
- situation: 1–2 concise sentences.
- key_phrases meaning: brief plain English meaning.
- key_phrases use_when: one short practical usage note.
- practice_prompt: tell the viewer to replace one detail with their own situation and say it aloud.
`;

    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${apiKey}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:MODEL,
        instructions,
        input:"Generate one content draft from the brief.",
        text:{
          verbosity:"low",
          format:{
            type:"json_schema",
            name:"axcela_content_draft",
            strict:true,
            schema
          }
        }
      })
    });

    const data=await response.json();

    if(!response.ok){
      return Response.json({
        error:data?.error?.message||"OpenAI request failed."
      },{status:response.status});
    }

    const output=(data.output||[])
      .flatMap(item=>item.content||[])
      .filter(item=>item.type==="output_text")
      .map(item=>item.text)
      .join("");

    if(!output){
      return Response.json({error:"No usable content returned."},{status:500});
    }

    const result=JSON.parse(output);

    return Response.json({
      ...result,
      job_function:jobFunction,
      context,
      communication_goal:goal,
      level_label:`${level} (${cefr})`,
      content_type_label:typeLabels[type]
    });

  }catch(error){
    return Response.json({error:error?.message||"Unexpected error."},{status:500});
  }
}
