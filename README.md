# Enterprise AI Operations Copilot

A full-stack AI operations platform that enables teams to upload documents, search organizational knowledge, and ask questions using retrieval-augmented generation (RAG). The project includes tenant-aware access, authentication, a React dashboard, and an MCP server that exposes Copilot capabilities as tools.

## Overview

Enterprise AI Operations Copilot brings document knowledge and AI-assisted question answering into a single application. Users can upload supported documents, retrieve relevant information through semantic search, and ask questions grounded in indexed content.

The project is designed as a multi-tenant application, with an API backend, relational database, vector search, and Model Context Protocol (MCP) integration.

## Features

- **AI-powered question answering:** Generate responses grounded in retrieved document content.
- **Document ingestion:** Upload PDF and text documents for processing and indexing.
- **Semantic search:** Retrieve relevant document chunks using vector search.
- **Multi-tenant architecture:** Organize users, memberships, documents, and queries by tenant.
- **Authentication:** User registration, login, JWT access tokens, and refresh-token support.
- **Dashboard analytics:** Track document processing, indexed chunks, and AI query activity.
- **MCP integration:** Expose Copilot capabilities through `search_documents`, `ask_copilot`, and `check_copilot_status`.
- **REST API:** Provide application functionality through FastAPI endpoints.
- **Automated tests:** Validate core API functionality and tenant isolation.

## Technology Stack

| Layer            | Technologies                              |
| ---------------- | ----------------------------------------- |
| Backend          | Python, FastAPI                           |
| Frontend         | React, TypeScript, Vite                   |
| Database         | PostgreSQL, SQLAlchemy                    |
| Migrations       | Alembic                                   |
| AI and retrieval | Groq, RAG, ChromaDB, LangChain components |
| Integration      | Model Context Protocol (MCP)              |
| Testing          | pytest                                    |
| Development      | Docker Compose, Git                       |

## Architecture

```text
React + TypeScript Frontend
            |
            v
       FastAPI Backend
            |
      +-----+------+
      |            |
      v            v
 PostgreSQL     Document Processing
      |            |
      |            v
      |       ChromaDB Vector Store
      |            |
      +------> RAG Retrieval
                   |
                   v
               Groq LLM

MCP Client ---> MCP Server ---> Copilot Services
```

## Project Structure

```text
enterprise-ai-operations-copilot/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   └── tenant_deps.py
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   └── services/
├── frontend/
│   └── src/
├── migrations/
├── tests/
├── mcp_server.py
├── alembic.ini
├── docker-compose.yml
├── requirements.txt
├── pytest.ini
├── .env.example
└── .gitignore
```

## Prerequisites

- Python 3.12
- Node.js and npm
- PostgreSQL 16, or a compatible Docker environment
- A Groq API key for LLM-powered responses

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/enterprise-ai-operations-copilot.git
cd enterprise-ai-operations-copilot
```

### 2. Configure the Python environment

Windows:

```cmd
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

### 3. Configure environment variables

Create a local `.env` file based on `.env.example` and configure the database URL, JWT secret, Groq API key, and development tenant ID.

**Never commit `.env` or real credentials to GitHub.**

### 4. Start PostgreSQL

If Docker Compose is configured for your local database:

```bash
docker compose up -d postgres
```

Review `docker-compose.yml` and `.env.example` to ensure the service name and database configuration match your setup.

### 5. Run database migrations

```bash
python -m alembic upgrade head
```

### 6. Start the backend

```bash
python -m uvicorn app.main:app --reload
```

API documentation is available at:

`http://127.0.0.1:8000/docs`

### 7. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## MCP Server

The MCP server exposes the following tools:

| Tool                   | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `check_copilot_status` | Check Copilot service status                         |
| `search_documents`     | Search indexed documents                             |
| `ask_copilot`          | Ask questions using Copilot retrieval and generation |

For local testing, launch the server through MCP Inspector using the Python environment configured for this project. Configure the development tenant ID and required environment variables before invoking tools.

## Testing

Run the backend test suite:

```bash
python -m pytest -q
```

Build the frontend for production:

```bash
cd frontend
npm run build
```

The MCP tools can also be tested interactively using MCP Inspector.

## Security Considerations

- Keep API keys, JWT secrets, database credentials, and refresh tokens private.
- Enforce tenant-level authorization for document search and question answering.
- Validate document uploads and limit resource consumption.
- Configure secure cookies, HTTPS, and production environment variables before deployment.
- Review refresh-token rotation, revocation, and replay handling before production use.

## Current Status

The application has been run locally, the frontend production build has passed, and all three MCP tools have been manually tested using MCP Inspector. Automated tests have also passed in the development environment.

Production deployment and final security review should be completed and verified separately.

## Future Improvements

- Production deployment with managed PostgreSQL.
- Automated CI checks and security scanning.
- Expanded MCP integration and authorization tests.
- Monitoring, structured logging, and operational alerts.
- Improved document ingestion and retrieval evaluation.

## License

No license has been added yet. Specify a license before permitting others to reuse or distribute this project.
