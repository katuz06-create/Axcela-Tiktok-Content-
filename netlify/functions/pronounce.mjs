// Axcela Content Engine V1.6 — optional pronunciation assessment.
// With AZURE_SPEECH_KEY and AZURE_SPEECH_REGION: pronunciation scoring.
// Without Azure: OpenAI transcription and WORD MATCH ONLY (not a pronunciation score).
const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const tokens = text => String(text || '').toLowerCase().normalize('NFKC').replace(/[^a-z0-9'\s-]/g, ' ').replace(/[-\s]+/g, ' ').trim().split(' ').filter(Boolean);
function compare(reference, actual) {
  const a = tokens(reference), b = tokens(actual), dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? 1 + dp[i+1][j+1] : Math.max(dp[i+1][j], dp[i][j+1]);
  const matched = dp[0][0], score = a.length ? Math.round(100 * matched / a.length) : 0;
  const missing = []; let i=0,j=0;
  while (i < a.length) { if (j < b.length && a[i] === b[j]) { i++; j++; } else if (j < b.length && dp[i][j+1] >= dp[i+1][j]) j++; else { missing.push(a[i]); i++; } }
  return { score, focus: [...new Set(missing)].slice(0, 4) };
}
export default async function handler(req) {
  if (req.method !== 'POST') return reply({error:'POST only.'}, 405);
  try {
    const payload = await req.json();
    const reference = String(payload.text || '').trim();
    const encoded = String(payload.audio || '');
    if (!reference || reference.length > 500) return reply({error:'Please record a single sentence (up to 500 characters).'}, 400);
    if (!encoded || encoded.length > 1800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return reply({error:'Audio is missing or too large.'}, 400);
    const wav = Buffer.from(encoded, 'base64');
    if (wav.length < 50 || wav.toString('ascii',0,4) !== 'RIFF' || wav.toString('ascii',8,12) !== 'WAVE') return reply({error:'Invalid WAV recording.'}, 400);
    const locale = payload.accent === 'british' ? 'en-GB' : 'en-US';
    const azureKey = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
    if (azureKey && region) {
      const params = {ReferenceText:reference,GradingSystem:'HundredMark',Granularity:'Word',Dimension:'Comprehensive',EnableProsodyAssessment:'True'};
      const assessment = Buffer.from(JSON.stringify(params)).toString('base64');
      const url = `https://${encodeURIComponent(region)}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=detailed`;
      const response = await fetch(url,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':azureKey,'Content-Type':'audio/wav; codecs=audio/pcm; samplerate=16000','Pronunciation-Assessment':assessment},body:wav});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) return reply({error:'Pronunciation service rejected the request. Check Azure Speech region/key.'},502);
      if(result.RecognitionStatus !== 'Success' || !result.NBest?.length) return reply({error:'Speech was not recognized. Try again in a quieter place.'},422);
      const best=result.NBest[0], evals=best.PronunciationAssessment||{};
      const issues=(best.Words||[]).filter(w=>w.PronunciationAssessment?.ErrorType && w.PronunciationAssessment.ErrorType!=='None' || (w.PronunciationAssessment?.AccuracyScore??100)<65).slice(0,3).map(w=>w.Word);
      return reply({mode:'pronunciation',score:Math.round(evals.PronScore??evals.AccuracyScore??0),accuracy:Math.round(evals.AccuracyScore??0),fluency:Math.round(evals.FluencyScore??0),transcript:best.Display||result.DisplayText||'',focus:issues,note:'Azure pronunciation estimate; a Vietnamese accent alone is not a mistake. Review flagged words by listening.'});
    }
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey) return reply({error:'No assessment provider configured. Set OPENAI_API_KEY, or Azure Speech credentials.'},500);
    const form=new FormData();form.append('model','gpt-transcribe');form.append('file',new Blob([wav],{type:'audio/wav'}),'sentence.wav');
    const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)return reply({error:'Transcription unavailable. Check your OpenAI API settings.'},502);
    const transcript=String(result.text||'');
    const match=compare(reference,transcript);
    return reply({mode:'word_match',score:match.score,transcript,focus:match.focus,note:'This compares recognized words with the script. It cannot confirm individual sounds, word stress or fluency. Differences can be recognition errors; try again or ask a teacher.'});
  } catch(err) {return reply({error:'Could not process this recording. Please try a shorter sentence.'},500);}
}
