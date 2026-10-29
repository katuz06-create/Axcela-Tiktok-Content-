Axcela Content Engine V1.6 Practice Mode Demo

Files to replace/create in GitHub:
1. public/index.html -> REPLACE
2. netlify/functions/pronounce.mjs -> ADD NEW

Keep existing netlify/functions/generate.mjs and voice.mjs unchanged when V1.5 voice works. The included voice.mjs is only a backup.

Practice Mode is OFF by default. Toggle above generated result. Grant microphone permission on HTTPS. Record each sentence, click again to stop, and see feedback. No recording is stored server-side by this code.

Without additional settings, the existing OPENAI_API_KEY is used for transcription. Feedback percentage is WORD MATCH ONLY, not a pronunciation score.

For real pronunciation assessment set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in Netlify Environment Variables; then the same demo uses Azure scores. Azure service may incur charges. Test with Vietnamese-accent speakers and human teacher feedback before interpreting scores.

Do not upload the ZIP as a single GitHub source file. Upload its individual files at the exact paths.
