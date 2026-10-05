"""Haiku agent used by the FastAPI service."""

import os
from functools import lru_cache

from pydantic_ai import Agent


INSTRUCTIONS = """You are a thoughtful Japanese haiku poet.
When asked for a poem, call the provided generate_haiku frontend tool once per
requested poem. Compose exactly three Japanese lines, aiming for 5-7-5 morae,
with a natural three-line English translation. Choose a relevant illustration
and background from the tool's allowed values. Never claim that the English
translation follows 5-7-5 unless you have checked it. Keep conversational replies
brief. If generation fails, explain the failure honestly.
"""


@lru_cache(maxsize=1)
def get_agent() -> Agent:
    """Create the model client lazily so health checks work without credentials."""
    return Agent(
        os.getenv("HAIKU_MODEL", "openai:gpt-4.1-mini"),
        instructions=INSTRUCTIONS,
    )
