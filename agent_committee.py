"""
Investment Research AI Committee - LangGraph Multi-Agent System
Matches professor requirements with specialized agents

Agents:
1. Planner Agent - Understands request and breaks into steps
2. Research Agent - Browses web, fetches financial data/APIs
3. Analyst Agent - Processes numbers, calculates metrics, compares assets
4. Writer/Report Agent - Formats clean, readable summaries
"""

import os
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
import operator
import yfinance as yf
from tavily import TavilyClient
from datetime import datetime, timedelta


# ============================================================================
# STATE DEFINITION
# ============================================================================

class AgentState(TypedDict):
    """Shared state across all agents in the committee"""
    messages: list
    user_query: str
    research_data: dict
    current_agent: str
    final_report: str
    next_step: str
    plan: dict  # Stores the research plan

# ============================================================================
# TOOLS AND UTILITIES
# ============================================================================

class FinancialDataTools:
    """Tools for gathering financial data"""
    
    @staticmethod
    def get_stock_info(ticker: str) -> dict:
        """Get comprehensive stock information"""
        try:
            print(f"   📊 Fetching stock data for {ticker}...")
            stock = yf.Ticker(ticker)
            info = stock.info
            print(f"   ✅ Successfully retrieved data for {ticker}")
            
            return {
                "ticker": ticker,
                "company_name": info.get("longName", "N/A"),
                "sector": info.get("sector", "N/A"),
                "industry": info.get("industry", "N/A"),
                "market_cap": info.get("marketCap", "N/A"),
                "current_price": info.get("currentPrice", "N/A"),
                "pe_ratio": info.get("trailingPE", "N/A"),
                "forward_pe": info.get("forwardPE", "N/A"),
                "dividend_yield": info.get("dividendYield", "N/A"),
                "52_week_high": info.get("fiftyTwoWeekHigh", "N/A"),
                "52_week_low": info.get("fiftyTwoWeekLow", "N/A"),
                "beta": info.get("beta", "N/A"),
                "revenue": info.get("totalRevenue", "N/A"),
                "profit_margin": info.get("profitMargins", "N/A"),
                "debt_to_equity": info.get("debtToEquity", "N/A"),
            }
        except Exception as e:
            print(f"   ❌ Error fetching data for {ticker}: {str(e)}")
            return {"error": f"Failed to fetch data for {ticker}: {str(e)}"}
    
    @staticmethod
    def get_earnings_data(ticker: str) -> dict:
        """Get earnings history and upcoming earnings"""
        try:
            print(f"   📈 Fetching earnings data for {ticker}...")
            stock = yf.Ticker(ticker)
            
            # Get earnings history
            earnings_history = stock.earnings_history
            quarterly_earnings = stock.quarterly_earnings
            print(f"   ✅ Successfully retrieved earnings for {ticker}")
            
            return {
                "ticker": ticker,
                "earnings_history": earnings_history.to_dict() if earnings_history is not None else {},
                "quarterly_earnings": quarterly_earnings.to_dict() if quarterly_earnings is not None else {},
            }
        except Exception as e:
            print(f"   ❌ Error fetching earnings for {ticker}: {str(e)}")
            return {"error": f"Failed to fetch earnings for {ticker}: {str(e)}"}
    
    @staticmethod
    def get_price_history(ticker: str, period: str = "1y") -> dict:
        """Get historical price data"""
        try:
            print(f"   📉 Fetching {period} price history for {ticker}...")
            stock = yf.Ticker(ticker)
            history = stock.history(period=period)
            print(f"   ✅ Successfully retrieved price history for {ticker}")
            
            return {
                "ticker": ticker,
                "period": period,
                "history": history.to_dict(),
                "start_price": float(history['Close'].iloc[0]) if len(history) > 0 else None,
                "end_price": float(history['Close'].iloc[-1]) if len(history) > 0 else None,
                "price_change_pct": ((float(history['Close'].iloc[-1]) - float(history['Close'].iloc[0])) / 
                                    float(history['Close'].iloc[0]) * 100) if len(history) > 0 else None,
            }
        except Exception as e:
            print(f"   ❌ Error fetching price history for {ticker}: {str(e)}")
            return {"error": f"Failed to fetch price history for {ticker}: {str(e)}"}


class WebSearchTools:
    """Tools for web research using Tavily"""
    
    def __init__(self, api_key: str):
        self.client = TavilyClient(api_key=api_key)
    
    def search_company_news(self, company: str, days: int = 30) -> dict:
        """Search for recent company news"""
        try:
            print(f"   🔍 Searching news for {company} (last {days} days)...")
            query = f"{company} stock news earnings latest"
            response = self.client.search(
                query=query,
                search_depth="advanced",
                max_results=5,
                days=days
            )
            print(f"   ✅ Found {len(response.get('results', []))} news articles for {company}")
            return response
        except Exception as e:
            print(f"   ❌ Error searching news for {company}: {str(e)}")
            return {"error": f"Failed to search news for {company}: {str(e)}"}


# ============================================================================
# AGENT DEFINITIONS
# ============================================================================

class PlannerAgent:
    """
    Planner Agent: Understands the user's request and breaks it into steps
    - Parses user query ONCE at the start
    - Creates a research plan
    - Routes to next agent based on plan completion
    """
    
    def __init__(self, llm):
        self.llm = llm
    
    def process(self, state: AgentState) -> AgentState:
        """Plan the research process"""
        
        print("\n" + "="*80)
        print("🎯 PLANNER AGENT: Creating research plan...")
        print("="*80)
        
        # If we already have a plan, just check what's done and route
        if state.get("plan"):
            print("   📋 Plan already exists, checking progress...")
            plan = state["plan"]
            
            # Check what's been completed
            data_collected = any("_info" in key for key in state["research_data"].keys())
            earnings_collected = any("_earnings" in key for key in state["research_data"].keys())
            news_collected = any("_news" in key for key in state["research_data"].keys())
            analysis_done = "analysis" in state["research_data"]
            
            print(f"   ✅ Data collected: {data_collected}")
            print(f"   ✅ Earnings collected: {earnings_collected}")
            print(f"   ✅ News collected: {news_collected}")
            print(f"   ✅ Analysis done: {analysis_done}")
            
            # Determine next step based on what's been done
            if not data_collected:
                next_step = "research_agent"
                print(f"   ➡️  Next: Collect stock data")
            elif not analysis_done:
                next_step = "analyst_agent"
                print(f"   ➡️  Next: Analyze data")
            else:
                next_step = "writer_agent"
                print(f"   ➡️  Next: Write final report")
            
            state["next_step"] = next_step
            return state
        
        # First time - create the plan using LLM
        planning_prompt = f"""You are a research planner for investment analysis.

User Query: {state['user_query']}

Create a research plan by answering:
1. What companies/tickers need to be analyzed? (extract ticker symbols)
2. What type of analysis? (comparison, single stock analysis, investment recommendation)
3. What data is needed? (stock metrics, earnings, news, price history)

Respond in this format:
TICKERS: [list of ticker symbols]
ANALYSIS_TYPE: [comparison/single/recommendation]
DATA_NEEDED: [metrics/earnings/news/history]"""

        print(f"   ⏳ Calling OpenAI to create plan (one-time only)...")
        
        response = self.llm.invoke([HumanMessage(content=planning_prompt)])
        
        print(f"   ✅ Plan created")
        
        # Parse the plan
        plan_text = response.content
        plan = {
            "raw_plan": plan_text,
            "created": True
        }
        
        state["plan"] = plan
        state["next_step"] = "research_agent"  # Always start with research
        state["messages"].append(AIMessage(content=f"Planner: Created research plan"))
        state["current_agent"] = "planner"
        
        print(f"   ➡️  Starting with research agent")
        
        return state


class ResearchAgent:
    """
    Research Agent: Browses the web, fetches data from finance APIs
    - Gets stock data from Yahoo Finance
    - Gets price history
    - Gets earnings data
    - Searches for news
    """
    
    def __init__(self, llm, tavily_api_key: str):
        self.llm = llm
        self.financial_tools = FinancialDataTools()
        self.search_tools = WebSearchTools(tavily_api_key)
    
    def process(self, state: AgentState) -> AgentState:
        """Gather all financial data and news"""
        
        print("\n" + "="*80)
        print("🔍 RESEARCH AGENT: Gathering financial data and news...")
        print("="*80)
        
        # Extract tickers from query
        extraction_prompt = f"""Extract stock ticker symbols from this query: {state['user_query']}

Examples:
- "Compare Apple and Microsoft" -> AAPL, MSFT
- "Analyze Tesla" -> TSLA
- "Apple vs Google" -> AAPL, GOOGL

Return ONLY comma-separated ticker symbols."""

        print(f"   ⏳ Identifying companies...")
        response = self.llm.invoke([HumanMessage(content=extraction_prompt)])
        print(f"   ✅ Companies: {response.content}")
        
        tickers = [t.strip().upper() for t in response.content.split(",")]
        
        # Gather ALL data for each ticker
        for ticker in tickers:
            print(f"\n   📊 Researching {ticker}:")
            
            # Get stock info
            stock_info = self.financial_tools.get_stock_info(ticker)
            state["research_data"][f"{ticker}_info"] = stock_info
            
            # Get price history
            price_history = self.financial_tools.get_price_history(ticker)
            state["research_data"][f"{ticker}_history"] = price_history
            
            # Get earnings
            earnings = self.financial_tools.get_earnings_data(ticker)
            state["research_data"][f"{ticker}_earnings"] = earnings
            
            # Get news
            company_name = stock_info.get("company_name", ticker)
            news = self.search_tools.search_company_news(company_name)
            state["research_data"][f"{ticker}_news"] = news
        
        state["messages"].append(AIMessage(
            content=f"Research Agent: Completed research for {', '.join(tickers)}"
        ))
        state["current_agent"] = "research_agent"
        state["next_step"] = "planner"  # Go back to planner to decide next step
        
        print(f"\n   ✅ Research complete for all companies")
        
        return state


class AnalystAgent:
    """
    Analyst Agent: Processes numbers, calculates metrics, compares assets
    - Performs valuation analysis
    - Calculates financial ratios
    - Compares companies
    - Assesses risks
    """
    
    def __init__(self, llm):
        self.llm = llm
    
    def process(self, state: AgentState) -> AgentState:
        """Perform comprehensive financial analysis"""
        
        print("\n" + "="*80)
        print("💼 ANALYST AGENT: Analyzing financial data...")
        print("="*80)
        
        analysis_prompt = f"""You are a senior financial analyst. Analyze the research data.

User Query: {state['user_query']}

Research Data:
{state['research_data']}

Provide detailed analysis covering:
1. Financial Health Assessment (review key metrics)
2. Valuation Analysis (P/E ratios, market cap relative to peers)
3. Growth Trends (revenue growth, price performance)
4. Risk Factors (debt levels, volatility/beta)
5. Competitive Positioning (if comparing multiple companies)
6. Investment Recommendation (buy/hold/sell with reasoning)

Be specific and quantitative. Compare numbers directly."""

        print(f"   📝 Analyzing {len(state['research_data'])} data points...")
        print(f"   ⏳ Calling OpenAI for analysis (30-60 seconds)...")
        
        response = self.llm.invoke([HumanMessage(content=analysis_prompt)])
        
        print(f"   ✅ Analysis complete ({len(response.content)} characters)")
        
        state["research_data"]["analysis"] = response.content
        state["messages"].append(AIMessage(
            content=f"Analyst Agent: Completed financial analysis"
        ))
        state["current_agent"] = "analyst_agent"
        state["next_step"] = "planner"  # Go back to planner
        
        return state


class WriterAgent:
    """
    Writer/Report Agent: Formats clean, readable summaries with tables
    - Creates executive summary
    - Formats data into tables
    - Writes clear recommendations
    - Professional markdown formatting
    """
    
    def __init__(self, llm):
        self.llm = llm
    
    def process(self, state: AgentState) -> AgentState:
        """Generate final polished report"""
        
        print("\n" + "="*80)
        print("📄 WRITER AGENT: Creating final report...")
        print("="*80)
        
        report_prompt = f"""You are a professional investment report writer. Create a comprehensive report.

User Query: {state['user_query']}

All Research Data and Analysis:
{state['research_data']}

Create a well-formatted investment report with:

1. **EXECUTIVE SUMMARY** (2-3 sentences with key recommendation)

2. **COMPANY OVERVIEW(S)** 
   - Key facts about each company
   - Use bullet points for clarity

3. **FINANCIAL METRICS TABLE**
   - Create a markdown table comparing key metrics
   - Include: Price, Market Cap, P/E Ratio, Revenue, Profit Margin, etc.

4. **DETAILED ANALYSIS**
   - Include the analyst's comprehensive findings
   - Use subheadings for each section

5. **MARKET CONTEXT**
   - Summarize recent news and sentiment
   - Note any significant developments

6. **CONCLUSION & RECOMMENDATION**
   - Clear buy/hold/sell recommendation
   - Key reasons supporting the recommendation
   - Risk factors to consider

Use markdown formatting. Be clear, concise, and professional."""

        print(f"   📝 Generating report from all research...")
        print(f"   ⏳ Calling OpenAI for report writing (30-60 seconds)...")
        
        response = self.llm.invoke([HumanMessage(content=report_prompt)])
        
        print(f"   ✅ Report generated ({len(response.content)} characters)")
        
        state["final_report"] = response.content
        state["messages"].append(AIMessage(
            content=f"Writer Agent: Final report completed"
        ))
        state["current_agent"] = "writer_agent"
        state["next_step"] = "end"
        
        return state


# ============================================================================
# LANGGRAPH WORKFLOW
# ============================================================================

class InvestmentResearchCommittee:
    """Main orchestrator for the multi-agent investment research system"""
    
    def __init__(self, openai_api_key: str, tavily_api_key: str):
        print("🚀 Initializing Investment Research Committee...")
        print(f"   Setting up AI model (gpt-4o-mini)...")
        
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=openai_api_key,
            timeout=120,
            max_retries=2
        )
        
        print(f"   ✅ AI model configured")
        print(f"   Initializing specialized agents...")
        
        # Initialize agents matching professor's requirements
        self.planner = PlannerAgent(self.llm)
        self.researcher = ResearchAgent(self.llm, tavily_api_key)
        self.analyst = AnalystAgent(self.llm)
        self.writer = WriterAgent(self.llm)
        
        print(f"   ✅ 4 specialized agents initialized:")
        print(f"      - Planner Agent (breaks down requests)")
        print(f"      - Research Agent (fetches data & news)")
        print(f"      - Analyst Agent (processes numbers)")
        print(f"      - Writer Agent (formats reports)")
        print(f"   Building workflow graph...")
        
        # Build the graph
        self.graph = self._build_graph()
        
        print(f"   ✅ Workflow graph built")
        print(f"✅ Committee ready!\n")
    
    def _build_graph(self) -> StateGraph:
        """Construct the LangGraph workflow"""
        
        workflow = StateGraph(AgentState)
        
        # Add nodes for each agent
        workflow.add_node("planner", self.planner.process)
        workflow.add_node("research_agent", self.researcher.process)
        workflow.add_node("analyst_agent", self.analyst.process)
        workflow.add_node("writer_agent", self.writer.process)
        
        # Define routing logic
        def route_next(state: AgentState) -> str:
            """Route to next agent based on planner's decision"""
            next_step = state.get("next_step", "planner")
            if next_step == "end":
                return END
            return next_step
        
        # Workflow: Always start with planner
        workflow.set_entry_point("planner")
        
        # Planner decides where to go next
        workflow.add_conditional_edges(
            "planner",
            route_next,
            {
                "research_agent": "research_agent",
                "analyst_agent": "analyst_agent",
                "writer_agent": "writer_agent",
                END: END
            }
        )
        
        # All agents go back to planner for next routing decision
        workflow.add_edge("research_agent", "planner")
        workflow.add_edge("analyst_agent", "planner")
        
        # Writer ends the workflow
        workflow.add_edge("writer_agent", END)
        
        return workflow.compile()
    
    def research(self, user_query: str) -> dict:
        """Execute the research process"""
        
        print(f"\n{'='*80}")
        print(f"🔬 STARTING RESEARCH")
        print(f"{'='*80}")
        print(f"Query: {user_query}")
        print(f"{'='*80}")
        print(f"Agent Flow:")
        print(f"  1. Planner → creates research plan")
        print(f"  2. Research → gathers all financial data & news")
        print(f"  3. Analyst → processes numbers & compares")
        print(f"  4. Writer → formats final report")
        print(f"{'='*80}\n")
        
        # Initialize state
        initial_state = {
            "messages": [HumanMessage(content=user_query)],
            "user_query": user_query,
            "research_data": {},
            "current_agent": "",
            "final_report": "",
            "next_step": "",
            "plan": None
        }
        
        print("🚀 Launching multi-agent workflow...\n")
        
        # Run the graph
        try:
            result = self.graph.invoke(initial_state)
            print("\n" + "="*80)
            print("✅ RESEARCH COMPLETE!")
            print("="*80)
        except Exception as e:
            print("\n" + "="*80)
            print("❌ ERROR DURING RESEARCH")
            print("="*80)
            print(f"Error: {str(e)}")
            raise
        
        # Print agent activity
        print("\n" + "="*80)
        print("📋 AGENT ACTIVITY LOG:")
        print("="*80)
        for i, msg in enumerate(result["messages"][1:], 1):
            print(f"{i}. {msg.content}")
        
        print("\n" + "="*80)
        print("📊 FINAL REPORT:")
        print("="*80)
        print(result["final_report"])
        
        return result


# ============================================================================
# MAIN EXECUTION (for terminal testing)
# ============================================================================

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    
    if not OPENAI_API_KEY or not TAVILY_API_KEY:
        print("ERROR: Please set OPENAI_API_KEY and TAVILY_API_KEY environment variables")
        exit(1)
    
    # Initialize the committee
    committee = InvestmentResearchCommittee(
        openai_api_key=OPENAI_API_KEY,
        tavily_api_key=TAVILY_API_KEY
    )
    
    # Test queries
    test_queries = [
        "Compare Google and Meta's latest earnings",
        "Analyze Apple's financial performance over the last year",
        "Should I invest in Tesla? Give me a detailed analysis",
    ]
    
    # Run interactive mode
    print("\n" + "="*80)
    print("Investment Research AI Committee")
    print("Multi-Agent System with Specialized Agents")
    print("="*80)
    print("\nExample queries:")
    for i, q in enumerate(test_queries, 1):
        print(f"{i}. {q}")
    
    print("\nEnter your research query (or 'quit' to exit):")
    
    while True:
        user_input = input("\n> ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        
        if not user_input:
            continue
        
        try:
            result = committee.research(user_input)
        except KeyboardInterrupt:
            print("\n\n⚠️  Research interrupted by user (Ctrl+C)")
            break
        except Exception as e:
            print(f"\n❌ Error during research: {str(e)}")
            import traceback
            traceback.print_exc()
