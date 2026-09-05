# ResolveAI — Customer Support Resolution Assistant (TRACK_ID=PS04)

> **Nexious Hackathon Submission**: An end-to-end AI-powered Customer Support Resolution Assistant for a broadband & mobile desk. Solves routine support queue clogging and context loss during human handovers using RAG, customer account records, and structured decision synthesis.

---

## 🌟 Key Architecture & RAG Workflow

```
Customer Question
       ↓
Account Record Lookup (Plan, Telemetry, Billing)
       ↓
RAG Vector Store Search (Support Articles KB101–KB105)
       ↓
AI Reasoning & Decision Engine
       ↓
┌────────────────────────────────────────────────────────┐
│  🟢 CASE 1: RESOLVE (High Conf: 94%) → Grounded Draft │
│  🟡 CASE 2: ASK (Med Conf: 88%) → Missing Parameter   │
│  🔴 CASE 3: ESCALATE (Low Conf: 41%) → Handover Package │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features

### 1. 🟢 CASE 1 — Grounded Resolution (RESOLVE)
- Searches indexed KB support articles (`KB-102 Broadband Connection Troubleshooting`).
- Cross-references customer line telemetry (e.g. Arun's Fiber 200 Mbps plan, WAN light status).
- Generates grounded draft answers with **inline section citations** (`Source: KB-102 §2`).
- 1-Click **Approve & Send** for support desk agents.

### 2. 🟡 CASE 2 — Missing Information Request (ASK)
- Automatically detects missing mandatory diagnostic inputs (e.g. Transaction Reference ID for pending bank transfers, router serial number).
- Prompts customer for **exactly one** required piece of information.

### 3. 🔴 CASE 3 — Zero-Friction Human Escalation (ESCALATE)
- Triggers when RAG match score is low (< 70%) or physical infrastructure damage is detected (e.g. severed fiber cable).
- Automatically synthesizes a structured **HANDOVER SUMMARY**:
  - `Issue`: Crisp summary of customer problem.
  - `Customer Status`: Plan, Billing status, Area outage status.
  - `What We Know`: Verified facts & line telemetry.
  - `What Was Tried`: Troubleshooting steps performed.
  - `AI Assessment`: Reason for escalation.
  - `Recommended Action`: Action item for Level-2 technical specialist.
- Guarantees the customer **NEVER repeats themselves**.

---

## 🛠️ Tech Stack & Structure

- **Backend**: Python 3.14 + FastAPI + Pydantic + TF-IDF Vector Search Index.
- **Frontend**: HTML5 + Vanilla CSS3 (Dark Glassmorphism UI) + ES6 JavaScript + Lucide Icons.
- **Database**: Seed JSON data (`customers.json`, `tickets.json`, `support_articles/`).

### Project Layout

```
resolve-ai/
├── backend/
│   ├── main.py              # FastAPI server & route handlers
│   ├── api/                 # REST endpoints (chat, tickets, customers, agents)
│   ├── ai/                  # RAG engine, classifier, resolver & escalation synthesizer
│   ├── database/            # Models, schemas & file persistence
│   ├── knowledge/           # Vector store indexer
│   └── services/            # Business logic
├── frontend/
│   ├── index.html           # Agent Dashboard & Customer Portal SPA
│   ├── css/style.css        # Glassmorphic Dark Design System
│   └── js/                  # SPA controller & API client
├── data/                    # Customers, tickets, KB markdown articles
└── README.md
```

---

## 🚀 How to Run Locally

### Option A: Run FastAPI Server (Recommended)
```bash
# 1. Install dependencies
python -m pip install fastapi uvicorn pydantic requests

# 2. Run backend server from workspace root
python -m backend.main

# 3. Open in Browser
Open http://127.0.0.1:8000 in your web browser!
```

### Option B: Standalone Web Interface
Open `resolve-ai/frontend/index.html` directly in any browser. It automatically uses offline dataset fallbacks!
