AXCELA CONTENT ENGINE — MVP V1
================================

PURPOSE
-------
Internal tool for Axcela's TikTok/content team.

The team enters:
1. Job Function
2. Context
3. Communication Goal
4. Level
5. Content Type

The system generates content inside one of four controlled Axcela formats:
- 1-to-1 Conversation
- Meeting Conversation
- Interview
- Common Mistakes

Useful phrases are highlighted automatically.

LEVEL MAPPING
-------------
Elementary = A1
Pre-Intermediate = A2
Intermediate = B1
Upper-Intermediate = B2
Advanced = C1

FILES
-----
index.html
api/generate.mjs
vercel.json
README.txt

DEPLOYMENT
----------
This package is Vercel-ready and independent from all existing Axcela demo sites.

Recommended:
1. Create a NEW GitHub repo, for example:
   axcela-content-engine
2. Upload the contents of this ZIP to the ROOT of that repo.
3. Import that repo into Vercel.
4. Add Environment Variables:
   OPENAI_API_KEY = your OpenAI API key
   OPENAI_MODEL = gpt-6-luna (optional; this is the default)
5. Deploy.

Do not put the API key inside index.html.

CURRENT MVP FEATURES
--------------------
- Five controlled inputs
- Four fixed content formats
- CEFR level mapping
- Practical workplace scenario rules
- Key phrase highlighting
- Copy full script
- Editable text area for creator revisions

NOT YET INCLUDED
----------------
Intentionally left for V2:
- Login / user accounts
- Save / history
- Content library
- Search/filter
- Approve/reject workflow
- Regenerate one section only
- Export to Google Sheets
- TikTok caption/shot-list templates
- Shared phrase library
- Usage analytics

OPENAI
------
Uses the Responses API with structured JSON output.
Default model: gpt-6-luna.
