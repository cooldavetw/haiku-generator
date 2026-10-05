"""Test-only model: exercises real FastAPI/AG-UI transport without provider calls."""

import asyncio
import base64
import json
import re

from pydantic_ai import Agent
from pydantic_ai.messages import UserPromptPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel

import illustration
import main
from agent import INSTRUCTIONS

# A real 1x1 WebP, so the browser can decode the "generated" illustration.
TINY_WEBP = base64.b64decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA")


async def stream_poem(messages, info):
    assert any(tool.name == "generate_haiku" for tool in info.function_tools)
    prompts = [
        part.content
        for message in messages
        for part in message.parts
        if isinstance(part, UserPromptPart) and isinstance(part.content, str)
    ]
    match = re.search(r"poem (\d+)", prompts[-1], re.IGNORECASE)
    number = match.group(1) if match else "1"
    poem = {
        "japanese": ["春風や", "小川の岸に", "花ひとつ"],
        "english": [f"Poem {number}", "A river winds through the reeds", "Spring is here again"],
        "image_name": "spring.svg",
        "background": "blossom",
    }
    yield {0: DeltaToolCall(name="generate_haiku", json_args=json.dumps(poem))}


test_agent = Agent(FunctionModel(stream_function=stream_poem), instructions=INSTRUCTIONS)
main.get_agent = lambda: test_agent


async def fake_draw(japanese, english):
    await asyncio.sleep(0.5)  # long enough to see the placeholder
    return TINY_WEBP


illustration.draw = fake_draw
app = main.app
