# GenAI Knowledge & Research Workspace

A production-grade, enterprise-ready Generative AI & Agentic AI platform featuring multi-document Retrieval-Augmented Generation (RAG), high-dimensional vector semantic search, autonomous agentic workflows (ReAct framework), RAG Triad automated evaluation (Ragas-style), and real-time LLMOps telemetry monitoring.

---

## 🌟 Key Features & Architecture

### 1. 📚 Document Ingestion & Chunk Inspector
- **Multi-format Ingestion:** Supports PDF parsing, Markdown (`.md`), and raw text (`.txt`) documents.
- **Recursive Chunking Strategy:** Implements recursive character splitting with configurable sliding window chunk size (500 chars) and overlap (100 chars) to preserve semantic continuity across paragraph boundaries.
- **Chunk Inspection:** Direct visibility into chunk tokens, word counts, and metadata.

### 2. ⚡ In-Memory Vector Store & Cosine Similarity Engine
- High-dimensional dense vector embeddings generated via Google Gemini Embedding model.
- Vector search with mathematical Cosine Similarity computation.
- Customizable Top-K nearest neighbors and minimum similarity score thresholding.

### 3. 💬 Grounded RAG Workspace
- Strict document grounding to prevent hallucinations.
- Verifiable numerical citations (`[1]`, `[2]`) linked directly to exact retrieved source chunks.
- Server-Sent Events (SSE) streaming for real-time token delivery with low Time-To-First-Token (TTFT).

### 4. 🤖 Agentic Research (Autonomous ReAct Framework)
- Stateful agent reasoning loop executing dynamic **Thought ➔ Action ➔ Observation ➔ Synthesis** cycles.
- Dynamic tool registry accessible by the agent:
  - `document_search`: Hybrid semantic & keyword chunk retrieval
  - `document_comparison`: Cross-document differential synthesis
  - `summarizer_tool`: Recursive hierarchical summarization
  - `evidence_extractor`: Verifiable quotation extraction
  - `calculator_tool`: Precise quantitative arithmetic computations

### 5. 🎯 RAG Triad Automated Evaluation Suite (Ragas / TruLens Standard)
Automated LLM-as-a-Judge quality auditing across the 4 golden metrics of production RAG:
- **Context Relevance:** Evaluates whether retrieved passages are strictly relevant to the user query.
- **Groundedness (Faithfulness):** Verifies that generated claims are 100% supported by the context.
- **Answer Relevance:** Checks whether the response directly addresses user intent.
- **Citation Accuracy:** Verifies alignment between citation tags and source chunks.

### 6. 📊 Real-Time LLMOps & Telemetry Dashboard
- Live tracking of Total API Requests, Average Latency, and P95 Latency.
- Total token accounting (Prompt + Completion).
- Request audit table logging timestamp, endpoint type, latency, TTFT, token consumption, and status codes.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend:** Node.js, Express, TypeScript (TSX)
- **AI & Embeddings:** Google Gemini 3.8 Flash, Text Embedding 004
- **Vector Math:** In-memory high-dimensional dense Cosine Similarity
- **Document Processing:** PDF parsing (`pdf-parse`), regex normalization

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### Installation
```bash
git clone <your-repo-url>
cd genai-knowledge-workspace
npm install
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running the Application
```bash
# Start both Backend and Frontend in Development Mode
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── server/                     # Backend Express Server
│   ├── core/                   # Gemini API client & resilient generation
│   ├── db/                     # In-memory Vector Store & Chunk indexing
│   ├── evaluation/             # RAG Triad evaluation engine
│   ├── monitoring/             # LLMOps metrics tracker & logger
│   ├── rag/                    # Retrieval-Augmented Generation pipeline
│   ├── routes/                 # REST API endpoints (rag, search, agent, eval, metrics)
│   └── server.ts               # Main server entrypoint
├── src/                        # Frontend React Application
│   ├── components/
│   │   ├── agent/              # Autonomous ReAct Agent UI
│   │   ├── chat/               # Grounded RAG Chat & Citations
│   │   ├── documents/          # Document library & Chunk Inspector
│   │   ├── evaluation/         # RAG Triad Benchmark UI
│   │   ├── layout/             # Sidebar, Topbar navigation
│   │   ├── monitoring/         # LLMOps Telemetry Dashboard
│   │   └── search/             # Semantic Search Explorer
│   ├── types/                  # Shared TypeScript interfaces
│   └── App.tsx                 # Root application component
└── package.json
```

---

## 📄 License
MIT License
