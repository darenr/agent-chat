# Agent Chat

A modern chat application built with FastAPI and PydanticAI, featuring streaming AI responses, code execution, web search capabilities, and rich markdown rendering.

There's also an experimental code execution sandbox (uses Deno) that is being worked on, as an MCP server.

## Overview

This project demonstrates a full-stack chat application that leverages OpenAI's GPT-4o-mini model through the PydanticAI framework. The application includes a FastAPI backend with SQLite persistence and a dynamic frontend that supports real-time streaming responses, syntax highlighting, Mermaid diagrams, mathematical equations, and more.

## Features

### AI Capabilities
- **Streaming Responses**: Real-time streaming of AI responses with debounced updates
- **Web Search**: Built-in web search tool for accessing current information
- **Code Execution**: Sandboxed code execution environment for running Python code
- **Conversation History**: Persistent chat history stored in SQLite database

### Rich Content Rendering
- **Markdown Support**: Full GitHub Flavored Markdown (GFM) including tables
- **Syntax Highlighting**: Dark-themed code blocks with syntax highlighting for multiple languages (Python, JavaScript, Java, Rust, HTML, etc.)
- **Copy to Clipboard**: One-click copy button for all code blocks
- **Mermaid Diagrams**: Render flowcharts, sequence diagrams, and other visualizations
- **Mathematical Equations**: LaTeX/MathJax support for mathematical notation
- **Tables**: Formatted tables with proper borders and styling

### User Interface
- **Sticky Toolbar**: Always-visible header with app branding
- **Responsive Design**: Adapts to different screen sizes (75vw max-width)
- **Clear Conversation**: Button to clear visible conversation without deleting history
- **New Chat**: Button to start fresh by clearing both UI and database history
- **Loading Spinner**: Visual feedback during AI response generation
- **Custom Background**: Configurable background image

## Project Structure

```
agent-chat/
├── chat_app.py          # FastAPI backend server
├── chat_app.html        # HTML UI with embedded styles
├── chat_app.ts          # TypeScript frontend logic
├── static/              # Static assets
│   └── assets/          # Images and backgrounds
├── pyproject.toml       # Python dependencies
└── README.md           # This file
```

## Architecture

### Backend (`chat_app.py`)

**FastAPI Application**
- Lifespan management for database connections
- Static file serving for assets
- RESTful endpoints for chat operations

**Endpoints**
- `GET /` - Serve main HTML page
- `GET /chat_app.ts` - Serve TypeScript source (transpiled in browser)
- `GET /chat/` - Retrieve all stored messages
- `POST /chat/` - Submit new chat message and stream AI response
- `POST /chat/clear` - Clear all stored chat history

**Database Layer**
- Asynchronous SQLite wrapper using ThreadPoolExecutor
- Stores conversation history as JSON-encoded ModelMessages
- Methods: `add_messages()`, `get_messages()`, `clear_messages()`

**AI Agent Configuration**
- Model: OpenAI GPT-4o-mini
- Tools: Web search preview, code execution
- Settings: Streaming enabled, code execution outputs included

### Frontend (`chat_app.html` + `chat_app.ts`)

**TypeScript Logic** (transpiled in-browser)
- Fetches and processes streaming responses
- Handles newline-delimited JSON messages
- Manages conversation UI updates
- Processes Mermaid diagram blocks
- Initializes syntax highlighting
- Implements copy-to-clipboard functionality

**Markdown Processing**
- Marked.js for markdown parsing
- marked-highlight extension for code blocks
- marked-table extension for GFM tables
- Custom preprocessing for Mermaid diagrams

**UI Components**
- Conversation area with role-based styling
- Form with text input and dual buttons (Clear/Send)
- Toolbar with New Chat button
- Loading spinner with smooth transitions
- Error display area

## Installation

### Prerequisites
- Python 3.11 or higher
- UV package manager (recommended) or pip
- OpenAI API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/darenr/agent-chat.git
cd agent-chat
```

2. Install dependencies:
```bash
uv sync
```

3. Set up your OpenAI API key:
```bash
export OPENAI_API_KEY='your-api-key-here'
```

4. (Optional) Configure Logfire for observability:
```bash
export LOGFIRE_TOKEN='your-logfire-token'
```

## Usage

### Running the Application

Start the server with auto-reload:
```bash
uv run -m chat_app
```

The application will be available at `http://localhost:8000`

### Using the Chat Interface

1. **Send a Message**: Type your question in the input field and click "Send" or press Enter
2. **View Response**: AI responses stream in real-time with formatted content
3. **Copy Code**: Click the "Copy" button in the top-right of any code block
4. **Clear Screen**: Click "Clear" to remove visible messages (history preserved)
5. **New Chat**: Click "New Chat" in the toolbar to clear all history and start fresh

### Example Interactions

**Code Generation**
```
User: Write a Python function to calculate Fibonacci numbers

AI: [Generates syntax-highlighted code with copy button]
```

**Web Search**
```
User: What are the latest developments in AI?

AI: [Uses web search tool to provide current information]
```

**Code Execution**
```
User: Calculate the sum of squares from 1 to 100

AI: [Executes code and shows result]
```

**Diagrams**
```
User: Show me a flowchart of the login process

AI: [Generates Mermaid diagram that renders visually]
```

## Technical Details

### Message Flow

1. User submits form → TypeScript prevents default submission
2. POST to `/chat/` with FormData containing prompt
3. Backend creates user message and streams to client
4. Backend runs PydanticAI agent with chat history
5. Agent streams output tokens back to client
6. Client updates UI incrementally as chunks arrive
7. Complete messages saved to database for future context

### Data Persistence

Messages are stored in `.chat_app_messages.sqlite` as JSON-encoded arrays:
```python
{
    "id": int,              # Auto-increment primary key
    "message_list": str     # JSON array of ModelMessage objects
}
```

### Security Considerations

- Code execution runs in a sandboxed environment (PydanticAI built-in)
- No user authentication (add for production use)
- Database stored locally (not suitable for multi-user deployments)
- API keys should be environment variables, not committed to code

## Customization

### Styling
- Edit CSS in `<style>` block of `chat_app.html`
- Modify toolbar color: `#toolbar { background-color: #3a3632 }`
- Change syntax theme: Update Highlight.js CDN link to different theme

### AI Behavior
- Adjust model: Change `OpenAIResponsesModel("gpt-4o-mini")` to other models
- Modify tools: Add/remove items in `builtin_tools` array
- Tune streaming: Adjust `debounce_by` parameter in `result.stream_output()`

### Background Image
- Replace `/static/assets/green-bg.jpg` with your own image
- Update CSS `body { background-image: url('...') }`

## Dependencies

### Python
- `fastapi` - Web framework
- `pydantic-ai` - AI agent framework
- `uvicorn` - ASGI server
- `logfire` - Observability (optional)

### JavaScript/CSS (CDN)
- Bootstrap 5.3.8 - UI framework
- Highlight.js 11.9.0 - Syntax highlighting
- Mermaid 10 - Diagram rendering
- Marked.js 15.0.0 - Markdown parsing
- MathJax 3 - Mathematical equations
- TypeScript 5.6.3 - In-browser transpilation

## Development

### Project Philosophy
- Minimal build tooling (TypeScript transpiled in-browser)
- Single-file components where possible
- Progressive enhancement
- Streaming-first architecture

### Future Enhancements
- User authentication and multi-user support
- Export conversations to markdown/PDF
- Voice input/output
- Image generation and analysis
- Custom system prompts
- Conversation branching
- Share conversation links

## License

See LICENSE file for details.

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Acknowledgments

- Built with [PydanticAI](https://ai.pydantic.dev/) by Pydantic
- Uses [OpenAI](https://openai.com/) models
- UI powered by [Bootstrap](https://getbootstrap.com/)
