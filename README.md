# Haiku Garden

A React frontend and FastAPI backend for Japanese haiku with English translations. The browser talks to the Python agent over [AG-UI](https://docs.ag-ui.com/); the agent calls the browser's `generate_haiku` tool, and React displays the poems. An OpenAI image model then paints an illustration for each poem. FastAPI serves the built frontend and the API together on one port, which is how the app runs in a Segma FastAPI container.

## Layout

```text
haiku-generator/
├── main.py                    # FastAPI: /health, /agent (AG-UI), and the built frontend
├── agent.py                   # Pydantic AI agent and instructions
├── illustration.py            # Image model client and prompt
├── requirements.txt
├── requirements-dev.txt
├── .env.example               # Backend model settings
├── tests/backend/             # Python tests and simulated model services
└── frontend/
    ├── index.html             # Vite entry page
    ├── src/
    │   ├── haiku-app.tsx      # Garden page and poem collection
    │   ├── chat.tsx           # Chat panel; runs the AG-UI conversation
    │   ├── haiku-card.tsx
    │   └── lib/               # Haiku schema, frontend tool, illustrations, backend URLs and readiness
    ├── public/images/         # Original local SVG illustrations
    ├── tests/                 # TypeScript unit tests and browser tests
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
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
```

Set `OPENAI_API_KEY` in the root `.env.local`. Exported environment variables take precedence over the file. The key stays in the backend; the frontend has no configuration.

| Variable | Default | Meaning |
| --- | --- | --- |
| `HAIKU_MODEL` | `openai:gpt-4.1-mini` | Chat model that writes the poems |
| `HAIKU_IMAGE_MODEL` | `gpt-image-1-mini` | OpenAI image model that illustrates each poem; empty turns illustrations off |
| `HAIKU_IMAGE_QUALITY` | `low` | `low`, `medium`, `high` or `auto`; higher is slower and costs more |

## Run

Build the frontend, then start FastAPI from the repository root:

```sh
npm --prefix frontend run build
source .venv/bin/activate
python main.py
```

Open http://127.0.0.1:8000 and use the chat button. Try “Write a haiku about the ocean.” New poems appear first; Previous and Next browse your collection. Interactive API docs are at http://127.0.0.1:8000/docs.

Rebuild the frontend after changing its source; restart FastAPI after changing `.env.local`. Before the first build, `/` returns 503 with build instructions. If FastAPI has no API key, the page shows a sample poem and setup instructions.

### Development

For automatic reload, run the backend with `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` and, in a second terminal, the Vite dev server:

```sh
cd frontend
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/agent` and `/health` to FastAPI; set `API_URL` to use a backend elsewhere.

## Segma deployment

The repository matches the Segma FastAPI container's contract:

- The container builds the frontend with `npm ci` and `npm run build` in `frontend/` (its defaults), and runs only Uvicorn with `main.py`'s `app`. No Node process runs at runtime.
- `main.py` serves `frontend/dist`. The build uses relative URLs (`base: "./"`), and the page gets a `<base>` for the prefix Segma strips (for example `/fastapi-prod/<id>/api/`), so assets and API calls stay under that prefix, with or without a trailing slash.
- `GET /health` returns 200 for the container health check.
- Set `OPENAI_API_KEY` (and optionally the model variables above) in the app's environment variables.
- `fastapi` and `uvicorn` are not pinned exactly, so the versions in the base image are kept.

To call `/agent` from a page on another website through a Segma webhook URL, add that site under the webhook's allowed websites.

## Request flow

```text
Browser → FastAPI /agent (AG-UI) → chat model
Browser ← streamed text and generate_haiku tool calls ← FastAPI
Browser → FastAPI /illustration (poem) → image model
Browser ← WebP image ← FastAPI
```

`frontend/src/chat.tsx` runs the conversation with `@ag-ui/client`'s `HttpAgent`, sending `generate_haiku` as a frontend tool on every run. `main.py` uses [Pydantic AI's AG-UI adapter](https://pydantic.dev/docs/ai/integrations/ui/ag-ui/) to expose the agent in `agent.py`. When a run ends, the browser validates each `generate_haiku` call with `frontend/src/lib/haiku.ts`, adds valid poems to the collection, and records a tool result in the conversation; invalid calls are reported in the chat. Previews render while a call streams.

For each poem shown, the browser posts its lines to `/illustration`. FastAPI builds the image prompt itself (`illustration.py`), so the endpoint only accepts three short lines per language, and returns a WebP image. Until it arrives, which usually takes several seconds, the card shows the local illustration the agent chose, labeled "Painting an illustration…". If illustrations are off or the image model fails, the local illustration stays.

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

Browser tests run against the built frontend served by FastAPI, so run `npm run build` first. They start the FastAPI test services automatically, using the root `.venv` with `requirements-dev.txt`. They cover missing-key setup, backend readiness, streamed tool calls, collection navigation, serving under a Segma-style URL prefix opened without a trailing slash, and mobile layout. Only the models are simulated; live generation requires your own API key.

## Current limits

The browser retains the latest 50 poems and their illustrations in memory; refresh clears the collection and the conversation. Each illustration is one image-model call, billed by OpenAI. The schema enforces three nonempty lines per language; poetic quality and Japanese mora counts depend on the model. Model calls may incur provider usage charges. Add authentication, usage limits, and persistence as needed before public deployment.
