# System Architecture Documentation

## Overview

The Investment Research AI Committee is a multi-agent system built on LangGraph that orchestrates specialized AI agents to perform comprehensive stock market research.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (Terminal - Phase 1)                          │
│                  (Web App - Phase 2 & 3)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INVESTMENT RESEARCH COMMITTEE                   │
│                      (LangGraph Workflow)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               RESEARCH COORDINATOR                         │ │
│  │  • Parse user query                                        │ │
│  │  • Determine research needs                                │ │
│  │  • Route to appropriate agents                             │ │
│  │  • Manage workflow state                                   │ │
│  └─────────────┬──────────────────────────────────────────────┘ │
│                │                                                  │
│       ┌────────┴────────┬────────────┬────────────┐             │
│       ▼                 ▼            ▼            ▼             │
│  ┌─────────┐      ┌──────────┐  ┌────────┐  ┌──────────┐      │
│  │  Data   │      │ Earnings │  │  News  │  │Financial │      │
│  │Collector│      │Specialist│  │Research│  │ Analyst  │      │
│  └────┬────┘      └────┬─────┘  └───┬────┘  └────┬─────┘      │
│       │                │            │            │             │
│       │  ┌─────────────┴────────────┴────────────┘             │
│       │  │                                                      │
│       ▼  ▼                                                      │
│  ┌─────────────┐                                                │
│  │Report Writer│                                                │
│  └─────────────┘                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌─────────────┐
        │  EXTERNAL    │        │   AI/LLM    │
        │    APIS      │        │   SERVICE   │
        ├──────────────┤        ├─────────────┤
        │ • YFinance   │        │  OpenAI     │
        │ • Tavily     │        │  GPT-4      │
        └──────────────┘        └─────────────┘
```

## Data Flow

```
1. User Query
   ↓
2. Coordinator analyzes query
   ↓
3. Determines required data:
   ├→ Basic financials? → Data Collector
   ├→ Earnings details? → Earnings Specialist
   └→ Market context?   → News Researcher
   ↓
4. Each agent executes:
   ├→ Calls external APIs (YFinance, Tavily)
   ├→ Uses LLM for analysis
   └→ Stores results in shared state
   ↓
5. Coordinator checks completion
   ├→ Need more data? → Route to another agent
   └→ Enough data?     → Route to Financial Analyst
   ↓
6. Financial Analyst synthesizes insights
   ↓
7. Report Writer creates final output
   ↓
8. Return to user
```

## Agent Details

### 1. Research Coordinator (Orchestrator)

**Role**: Central controller and decision maker

**Inputs**:
- User query
- Current state of research
- Data collected so far

**Outputs**:
- Next agent to execute
- Routing decisions

**Logic**:
```python
if need_basic_data:
    route_to("data_collector")
elif need_earnings:
    route_to("earnings_specialist")
elif need_context:
    route_to("news_researcher")
elif ready_for_analysis:
    route_to("financial_analyst")
else:
    route_to("report_writer")
```

### 2. Data Collector (Financial Data Specialist)

**Role**: Gathers fundamental financial metrics

**Data Sources**:
- YFinance API

**Collects**:
- Current price
- Market cap
- P/E ratios
- 52-week high/low
- Beta
- Dividend yield
- Revenue
- Profit margins
- Debt-to-equity

**Output Format**:
```python
{
    "TICKER": {
        "basic_info": {...},
        "price_history": {...}
    }
}
```

### 3. Earnings Specialist

**Role**: Deep dive into earnings performance

**Data Sources**:
- YFinance API (earnings data)

**Analyzes**:
- Quarterly earnings history
- Annual earnings trends
- Revenue growth
- EPS (Earnings Per Share)
- Earnings surprises

**Output Format**:
```python
{
    "TICKER": {
        "earnings_history": {...},
        "quarterly_earnings": {...}
    }
}
```

### 4. News Researcher

**Role**: Gathers market context and sentiment

**Data Sources**:
- Tavily API (web search)

**Searches For**:
- Recent company news
- Earnings announcements
- Industry trends
- Competitive analysis
- Market sentiment

**Output Format**:
```python
{
    "TICKER": {
        "results": [
            {
                "title": "...",
                "url": "...",
                "content": "...",
                "score": 0.95
            }
        ]
    }
}
```

### 5. Financial Analyst

**Role**: Synthesizes all data into actionable insights

**Inputs**:
- All collected data from previous agents

**Analysis Performed**:
- Comparative analysis (if multiple stocks)
- Valuation assessment
- Growth trend analysis
- Risk evaluation
- Competitive positioning

**Uses LLM For**:
- Pattern recognition
- Insight generation
- Risk assessment
- Recommendation formulation

### 6. Report Writer

**Role**: Creates final polished report

**Inputs**:
- All research data
- Financial analysis

**Output Sections**:
1. Executive Summary
2. Company Overview(s)
3. Financial Metrics Comparison
4. Detailed Analysis
5. Market Context
6. Conclusion & Recommendations

**Format**: Markdown with tables and formatting

## State Management

### Shared State Structure

```python
{
    "messages": [HumanMessage, AIMessage, ...],
    "user_query": "Compare GOOGL and META",
    "research_data": {
        "stock_data": {...},
        "earnings_data": {...},
        "news_data": {...},
        "analysis": "..."
    },
    "current_agent": "coordinator",
    "final_report": "...",
    "next_step": "data_collector"
}
```

### State Updates

Each agent:
1. Reads from shared state
2. Performs its specialized task
3. Writes results back to state
4. Updates routing information

LangGraph ensures:
- Thread-safe state updates
- Proper sequencing
- Error recovery

## Technology Stack

### Core Framework
- **LangGraph**: Multi-agent orchestration
- **LangChain**: LLM integration and tooling
- **Python 3.11+**: Base language

### AI/LLM
- **OpenAI GPT-4**: Natural language understanding and generation
- **Model**: `gpt-4o` (optimal for analysis tasks)
- **Temperature**: 0 (deterministic outputs)

### Data Sources
- **YFinance**: Free stock market data
  - Real-time and historical prices
  - Fundamental metrics
  - Earnings data
  
- **Tavily API**: Web search
  - News articles
  - Market analysis
  - Industry reports

### Future Additions (Phase 2+)
- **FastAPI**: REST API backend
- **Supabase**: Database and authentication
- **Next.js**: Frontend web application

## Scalability Considerations

### Current Limitations (Phase 1)
- Terminal-based (single user)
- No persistence (no database)
- Sequential processing
- No caching

### Phase 2 Improvements
- Multi-user support via FastAPI
- Database storage in Supabase
- Report history and retrieval
- User authentication

### Phase 3 Improvements
- Web-based interface
- Real-time status updates
- Interactive visualizations
- Report sharing

### Future Optimizations
- Parallel agent execution
- Result caching
- Incremental updates
- Streaming responses

## Error Handling

### Agent-Level Errors
```python
try:
    result = fetch_data(ticker)
except Exception as e:
    state["research_data"]["errors"].append({
        "agent": "data_collector",
        "error": str(e)
    })
    # Continue with available data
```

### Workflow-Level Recovery
- Coordinator checks for critical errors
- Can skip optional agents if data unavailable
- Always produces a report (even if incomplete)

## Performance Metrics

### Expected Execution Times
- Simple query (1 stock): 20-30 seconds
- Comparison (2 stocks): 40-60 seconds
- Complex analysis (3+ stocks): 60-90 seconds

### API Call Breakdown
- Data Collector: 2-3 calls per stock
- Earnings Specialist: 1-2 calls per stock
- News Researcher: 3-5 calls total
- Financial Analyst: 1 LLM call
- Report Writer: 1 LLM call

### Cost Estimates (per query)
- OpenAI API: ~$0.02-0.10 (GPT-4)
- Tavily API: Free tier (up to 1000 searches/month)
- YFinance: Free

## Security Considerations

### API Key Management
- Stored in `.env` file (not in code)
- Never committed to version control
- Separate keys per environment

### Data Privacy
- No user data stored (Phase 1)
- Query logs only in memory
- No PII collected

### Phase 2+ Security
- Authentication via Supabase
- Row-level security
- API rate limiting
- Input validation

## Testing Strategy

### Unit Tests (Future)
- Test each agent independently
- Mock API responses
- Verify data parsing

### Integration Tests
- `test_setup.py` verifies:
  - Environment configuration
  - Package installation
  - API connectivity
  - End-to-end workflow

### Manual Testing
- Terminal interface for rapid iteration
- Real-world query testing
- Edge case exploration

## Extension Points

### Adding New Agents

1. Create agent class:
```python
class TechnicalAnalyst:
    def __init__(self, llm):
        self.llm = llm
    
    def process(self, state: AgentState) -> AgentState:
        # Implementation
        return state
```

2. Register in workflow:
```python
workflow.add_node("technical_analyst", self.technical_analyst.process)
```

3. Update routing:
```python
if need_technical_analysis:
    next_step = "technical_analyst"
```

### Adding New Data Sources

1. Create tool class:
```python
class BlockchainDataTools:
    def get_on_chain_metrics(self, token):
        # Implementation
        pass
```

2. Integrate in relevant agent:
```python
class CryptoAnalyst:
    def __init__(self, llm):
        self.blockchain_tools = BlockchainDataTools()
```

## Future Agent Ideas

- **Technical Analyst**: Chart patterns, momentum indicators
- **Sentiment Analyst**: Social media, Reddit, Twitter analysis
- **Options Analyst**: Options chain, implied volatility
- **Macro Analyst**: Economic indicators, Fed policy
- **ESG Analyst**: Environmental, social, governance factors
- **Risk Analyst**: VaR, stress testing, correlations
- **Portfolio Manager**: Asset allocation, rebalancing

---

**Version**: 1.0 (Phase 1)
**Last Updated**: Phase 1 completion
**Next Update**: Phase 2 implementation
