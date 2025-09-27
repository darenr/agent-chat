import { Marked } from 'https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.0/lib/marked.esm.js'
import { markedHighlight } from 'https://cdn.jsdelivr.net/npm/marked-highlight@2/src/index.js'

const marked = new Marked({

});


var renderer = new marked.Renderer();
renderer.link = function (href, title, text) {
  var link = marked.Renderer.prototype.link.call(this, href, title, text);
  return link.replace("<a", "<a target='_blank' ");
};

marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Enable line breaks
  pedantic: false, // Disable pedantic mode
  sanitize: false, // Disable sanitization
  tables: true,
  silent: true, // Suppress warnings
  renderer: renderer, // Use custom renderer that opens links in new tab
});


marked.use(markedHighlight({
  highlight: function (code, lang) {
    console.log('Highlighting code block', { lang, code })
    const language = (window as any).hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = (window as any).hljs.highlight(code, { language }).value;
    const escapedCode = code.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if ('mermaid' === lang || 'mermaidjs' === lang) {
      return `<pre class="hljs p-4"><code class="language-${language}">${code}</code></pre>`;
    } else {
      return `<div class="code-block-container">
        <button class="copy-btn btn btn-sm btn-outline-secondary">Copy</button>
        <pre class="hljs p-2" data-original-code="${escapedCode}"><code class="language-${language}">${highlighted}</code></pre>
      </div>`;
    }


  }
}));
const convElement = document.getElementById('conversation')

const promptInput = document.getElementById('prompt-input') as HTMLInputElement
const spinner = document.getElementById('spinner')

function processMermaid(content: string): string {
  // Replace ```mermaid or ```mermaidjs blocks with <div class="mermaid">
  return content.replace(/```(?:mermaid|mermaidjs)\n([\s\S]*?)\n```/g, '<div class="mermaid">$1</div>')
}


// stream the response and render messages as each chunk is received
// data is sent as newline-delimited JSON
async function onFetchResponse(response: Response): Promise<void> {
  let text = ''
  let decoder = new TextDecoder()
  if (response.ok) {
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      text += decoder.decode(value)
      addMessages(text)
      spinner.classList.remove('active')
    }
    addMessages(text)
    promptInput.disabled = false
    promptInput.focus()
  } else {
    const text = await response.text()
    console.error(`Unexpected response: ${response.status}`, { response, text })
    throw new Error(`Unexpected response: ${response.status}`)
  }
}

// The format of messages, this matches pydantic-ai both for brevity and understanding
// in production, you might not want to keep this format all the way to the frontend
interface Message {
  role: string
  content: string
  timestamp: string
}

// take raw response text and render messages into the `#conversation` element
// Message timestamp is assumed to be a unique identifier of a message, and is used to deduplicate
// hence you can send data about the same message multiple times, and it will be updated
// instead of creating a new message elements
function addMessages(responseText: string) {
  const lines = responseText.split('\n')
  const messages: Message[] = lines.filter(line => line.length > 1).map(j => JSON.parse(j))
  for (const message of messages) {
    // we use the timestamp as a crude element id
    const { timestamp, role, content } = message
    const id = `msg-${timestamp}`
    let msgDiv = document.getElementById(id)
    if (!msgDiv) {
      msgDiv = document.createElement('div')
      msgDiv.id = id
      msgDiv.title = `${role} at ${timestamp}`
      msgDiv.classList.add('border-top', 'pt-2', role)
      convElement.appendChild(msgDiv)
    }
    // First, process MathJax on the raw content to handle LaTeX.
    // Create a temporary div to let MathJax do its work.
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    if (window.MathJax) {
      window.MathJax.typesetPromise([tempDiv]).catch((err) =>
        console.log("MathJax typesetting error:", err)
      );
    }

    msgDiv.innerHTML = marked.parse(processMermaid(tempDiv.innerHTML))
  }
  // Initialize Mermaid diagrams
  try {
    (window as any).mermaid.init()
  } catch (e) {
    console.warn('Mermaid init failed:', e)
  }
  // Add copy functionality to code blocks
  document.querySelectorAll('.copy-btn').forEach(btn => {
    if (!(btn as any)._listenerAdded) {
      btn.addEventListener('click', function () {
        const pre = this.nextElementSibling as HTMLPreElement;
        const text = pre.getAttribute('data-original-code') || '';
        navigator.clipboard.writeText(text).then(() => {
          const originalText = this.textContent;
          this.textContent = 'Copied!';
          setTimeout(() => this.textContent = originalText, 2000);
        }).catch(err => {
          console.error('Failed to copy: ', err);
        });
      });
      (btn as any)._listenerAdded = true;
    }
  });
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

function onError(error: any) {
  console.error(error)
  document.getElementById('error').classList.remove('d-none')
  document.getElementById('spinner').classList.remove('active')
}

async function onSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault()
  spinner.classList.add('active')
  const body = new FormData(e.target as HTMLFormElement)

  promptInput.value = ''
  promptInput.disabled = true

  const response = await fetch('/chat/', { method: 'POST', body })
  await onFetchResponse(response)
}

// call onSubmit when the form is submitted (e.g. user clicks the send button or hits Enter)
document.querySelector('form').addEventListener('submit', (e) => onSubmit(e).catch(onError))

// load messages on page load
fetch('/chat/').then(onFetchResponse).catch(onError)