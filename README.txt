AXCELA CONTENT ENGINE — NETLIFY MVP V1

Upload these items to the ROOT of the GitHub repo:
- public
- netlify
- netlify.toml
- README.txt

NETLIFY BUILD SETTINGS
Base directory: leave blank
Build command: leave blank
Publish directory: public
Functions directory: netlify/functions

ENVIRONMENT VARIABLES
OPENAI_API_KEY = your OpenAI API key
OPENAI_MODEL = gpt-6-luna

After adding or changing environment variables, redeploy.


V1.1 UPDATE
-----------
Useful phrases now have two separate fields:
- source_phrase: full phrase used to highlight the sentence inside the script
- phrase_frame: reusable takeaway pattern with “…” placeholders

Example:
source_phrase:
Let's look at the landing-page data before we change the campaign.

phrase_frame:
Let's look at … before we …

The footer now shows "Useful phrase patterns" and displays phrase_frame, not the full sentence.
