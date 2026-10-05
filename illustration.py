"""Illustrations for haiku, drawn by an OpenAI image model."""

import base64
import os
from functools import lru_cache

from openai import AsyncOpenAI


DEFAULT_MODEL = "gpt-image-1-mini"
DEFAULT_QUALITY = "low"
MEDIA_TYPE = "image/webp"

STYLE = """A serene illustration for a Japanese haiku, in the spirit of a soft
watercolor print: muted greens, warm creams and gentle pastels, simple shapes,
plenty of calm empty space. Wide panoramic composition with the subject in the
middle band, so the picture can be cropped at the top and bottom. No text,
letters, calligraphy, signatures or borders."""


def image_model() -> str:
    """The configured model; an empty HAIKU_IMAGE_MODEL turns illustrations off."""
    return os.getenv("HAIKU_IMAGE_MODEL", DEFAULT_MODEL).strip()


@lru_cache(maxsize=1)
def get_client() -> AsyncOpenAI:
    """Create the client lazily so the app starts without credentials."""
    return AsyncOpenAI()


def prompt_for(japanese: list[str], english: list[str]) -> str:
    poem = "\n".join(f"{ja} ({en})" for ja, en in zip(japanese, english))
    return f"{STYLE}\n\nThe haiku, with its English translation:\n{poem}"


async def draw(japanese: list[str], english: list[str]) -> bytes:
    """One WebP image for the poem."""
    result = await get_client().images.generate(
        model=image_model(),
        prompt=prompt_for(japanese, english),
        size="1536x1024",
        quality=os.getenv("HAIKU_IMAGE_QUALITY", DEFAULT_QUALITY).strip() or DEFAULT_QUALITY,
        output_format="webp",
        output_compression=80,
        n=1,
        timeout=120,
    )
    return base64.b64decode(result.data[0].b64_json)
