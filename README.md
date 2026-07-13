# SolarFX RAMS Generator

A functional Next.js application for creating a combined site-specific Risk Assessment and Method Statement, importing site details from PDFs, uploading site photographs, reviewing AI-assisted hazard suggestions, and downloading a branded PDF.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set:

- `RAMS_ACCESS_CODE=1812`
- `SESSION_SECRET=` a long random value
- `OPENAI_API_KEY=` your key
- `USE_MOCK_AI=true` for local testing without OpenAI

## Netlify

Connect the GitHub repository in Netlify. Build command is `npm run build`. Add the environment variables in Netlify Site configuration. Do not commit `.env.local`.

## Important safety model

AI suggestions never enter the final RAMS until accepted by the assessor. The software does not certify a site as safe and does not replace competent-person assessment.

## Current implementation

- Four-digit server-side login with signed cookie
- Local autosave
- PDF text extraction and optional AI field extraction
- Image uploads
- AI/mock hazard suggestions
- Manual accept/reject workflow
- Risk assessment rows and matrix scoring
- Editable method statement and emergency details
- Branded combined PDF export

## Production notes

Before widespread use, complete a formal security review, privacy review, accessibility test, PDF print test and competent H&S review of all default wording and hazard controls.
