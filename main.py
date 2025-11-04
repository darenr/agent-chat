"""Simple chat app example build with FastAPI.

Run with:

    uv run -m chat_app
"""

from __future__ import annotations as _annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

import fastapi
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from typing_extensions import TypedDict

from pydantic_ai import Agent, CodeExecutionTool
from pydantic_ai.exceptions import UnexpectedModelBehavior
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)
from openai.types.responses import WebSearchToolParam

from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings


model_settings = OpenAIResponsesModelSettings(
    openai_builtin_tools=[WebSearchToolParam(type="web_search_preview")],
    builtin_tools=[CodeExecutionTool()],
    openai_include_code_execution_outputs=True,
)
model = OpenAIResponsesModel("gpt-4o-mini")
agent = Agent(model=model, model_settings=model_settings)


THIS_DIR = Path(__file__).parent

# In-memory storage for chat messages
messages_store: list[ModelMessage] = []

app = fastapi.FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse((THIS_DIR / "chat_app.html"), media_type="text/html")


@app.get("/chat_app.ts")
async def main_ts() -> FileResponse:
    """Get the raw typescript code, it's compiled in the browser, forgive me."""
    return FileResponse((THIS_DIR / "chat_app.ts"), media_type="text/plain")


@app.get("/chat/")
async def get_chat() -> Response:
    msgs = messages_store
    return Response(
        b"\n".join(json.dumps(to_chat_message(m)).encode("utf-8") for m in msgs),
        media_type="text/plain",
    )


@app.get("/files/")
async def get_files() -> Response:
    """Get list of files in the current directory."""
    try:
        # Get all files in the current directory
        files = []
        for file_path in THIS_DIR.iterdir():
            if file_path.is_file() and not file_path.name.startswith("."):
                files.append(file_path.name)

        # Sort files alphabetically
        files.sort()

        return Response(
            json.dumps({"files": files}).encode("utf-8"),
            media_type="application/json",
        )
    except Exception as e:
        return Response(
            json.dumps({"files": [], "error": str(e)}).encode("utf-8"),
            media_type="application/json",
        )


class ChatMessage(TypedDict):
    """Format of messages sent to the browser."""

    role: Literal["user", "model"]
    timestamp: str
    content: str


def to_chat_message(m: ModelMessage) -> ChatMessage:
    first_part = m.parts[0]
    if isinstance(m, ModelRequest):
        if isinstance(first_part, UserPromptPart):
            assert isinstance(first_part.content, str)
            return {
                "role": "user",
                "timestamp": first_part.timestamp.isoformat(),
                "content": first_part.content,
            }
    elif isinstance(m, ModelResponse):
        if isinstance(first_part, TextPart):
            return {
                "role": "model",
                "timestamp": m.timestamp.isoformat(),
                "content": first_part.content,
            }
    raise UnexpectedModelBehavior(f"Unexpected message type for chat app: {m}")


@app.post("/chat/")
async def post_chat(prompt: Annotated[str, fastapi.Form()]) -> StreamingResponse:
    async def stream_messages():
        """Streams new line delimited JSON `Message`s to the client."""
        # stream the user prompt so that can be displayed straight away
        yield (
            json.dumps(
                {
                    "role": "user",
                    "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    "content": prompt,
                }
            ).encode("utf-8")
            + b"\n"
        )
        # get the chat history so far to pass as context to the agent
        messages = messages_store
        # run the agent with the user prompt and the chat history
        async with agent.run_stream(prompt, message_history=messages) as result:
            async for text in result.stream_output(debounce_by=0.01):
                # text here is a `str` and the frontend wants
                # JSON encoded ModelResponse, so we create one
                m = ModelResponse(parts=[TextPart(text)], timestamp=result.timestamp())
                yield json.dumps(to_chat_message(m)).encode("utf-8") + b"\n"

        # add new messages (e.g. the user prompt and the agent response in this case) to memory
        messages_store.extend(result.new_messages())

    return StreamingResponse(stream_messages(), media_type="text/plain")


@app.post("/chat/clear")
async def clear_chat() -> Response:
    """Clear stored chat messages."""
    messages_store.clear()
    return Response(status_code=204)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", reload=True, reload_dirs=[str(THIS_DIR)])
