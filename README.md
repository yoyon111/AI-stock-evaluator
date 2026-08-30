AI Stock Evaluator provides an interactive interface for researching publicly traded companies. Users can submit research questions and receive AI-generated reports based on financial information, market data, and external sources.

The project is built with Next.js and connects to a separate FastAPI backend that handles the AI research pipeline.

Features
🤖 AI-powered stock research
📊 Company and stock analysis
🔎 Research questions using natural language
🧠 Multi-agent AI research pipeline
📚 External information and source gathering
🔐 User authentication
💾 Saved research reports
🌐 Deployed web application
Tech Stack
Frontend: Next.js, React, TypeScript
Backend: FastAPI, Python
Authentication & Database: Supabase
AI: OpenAI
Research: Tavily
Deployment: Vercel
Architecture

The application is split into two repositories:

Frontend: AI-stock-evaluator
Backend: ai-stock-evaluator-backend

The frontend provides the user interface while the backend manages authentication, research requests, AI agents, and saved reports.
