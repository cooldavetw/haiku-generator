# Haiku Garden

A Next.js frontend and FastAPI backend for Japanese haiku with English translations. CopilotKit carries chat requests to the Python agent and streams frontend tool calls back to the browser, where React displays the poems.

## Layout

```text
haiku-generator/
├── main.py                    # FastAPI entry point
├── agent.py                   # Pydantic AI agent and instructions
├── requirements.txt
├── requirements-dev.txt
├── .env.example               # Backend model settings
├── tests/backend/             # Python tests and simulated model fixture
└── frontend/
    ├── app/                   # Next.js pages, global CSS, and API route
    ├── components/haiku-app.tsx
    ├── lib/                   # Haiku schema and backend readiness check
    ├── public/images/         # Original local SVG illustrations
    ├── tests/                 # TypeScript unit tests and browser tests
    ├── .env.example           # Backend address only
    ├── package.json
    ├── package-lock.json
    ├── next.config.ts
    ├── tsconfig.json
    └── playwright.config.ts
```

## Setup

Requires Python 3.10 or newer with venv support, Node.js 22 or newer, and npm. Run these commands from the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env.local
npm --prefix frontend ci
cp frontend/.env.example frontend/.env.local
```

Set `OPENAI_API_KEY` in the **root `.env.local`**. FastAPI loads this file. `HAIKU_MODEL` defaults to `openai:gpt-4.1-mini`; select another compatible OpenAI model if needed.

Next.js loads **`frontend/.env.local`**, which contains only `AGENT_URL` (default `http://127.0.0.1:8000/agent`). It checks FastAPI's `/health` endpoint to determine whether generation is configured. The model API key belongs only in the backend configuration. Exported environment variables take precedence over the corresponding files.

## Run

Start FastAPI from the repository root:

```sh
source .venv/bin/activate
python main.py
```

For automatic backend reload, use `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` instead.

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

In a second terminal, start Next.js:

```sh
cd frontend
npm run dev
```

Open http://localhost:3000 and use the chat button. Try “Write a haiku about the ocean.” New poems appear first; Previous and Next browse your collection.

If FastAPI is offline or has no API key, the homepage shows a sample poem and setup instructions. After configuring or starting FastAPI, refresh the page. Restart FastAPI after changing the root `.env.local`; restart Next.js after changing `frontend/.env.local`.

For a production frontend build, run `npm run build` followed by `npm start` inside `frontend/`, with FastAPI running separately.

## Request flow

```text
Browser → Next.js /api/copilotkit → FastAPI /agent → AI model
Browser ← streamed frontend tool calls ← FastAPI ← model output
```

`frontend/app/api/copilotkit/[[...slug]]/route.ts` registers an `HttpAgent` that forwards to FastAPI. `main.py` uses [Pydantic AI's AG-UI adapter](https://pydantic.dev/docs/ai/integrations/ui/ag-ui/) to expose the agent in `agent.py`. This follows [CopilotKit's HTTP agent integration](https://docs.copilotkit.ai/pydantic-ai).

The browser's `generate_haiku` tool validates model arguments using `frontend/lib/haiku.ts`, adds each poem to React state, and renders a card with a local illustration. The browser communicates with Next.js on the same origin, so local use needs no cross-origin configuration.

## Tests

Backend tests, from the repository root:

```sh
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pytest tests/backend -q
```

Frontend checks, from `frontend/`:

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests start Next.js and FastAPI test services automatically. They use the root `.venv` and require `requirements-dev.txt`. They cover missing-key setup, backend readiness without a frontend model key, agent discovery, streamed tool calls through the real Next.js-to-FastAPI connection, collection navigation, and mobile layout. Only the model is simulated; live generation requires your own API key.

The scoped npm override in `frontend/package.json` updates the older provider utility's `undici` dependency to a patched release.

## Current limits

The browser retains the latest 50 poems in memory; refresh clears the collection. The schema enforces three nonempty lines per language; poetic quality and Japanese mora counts depend on the model. Model calls may incur provider usage charges. The app is intended for local use; add authentication, usage limits, and persistence as needed before public deployment.
