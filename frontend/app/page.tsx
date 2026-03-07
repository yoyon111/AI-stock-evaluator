'use client'

import { useState, useEffect } from 'react'
import { createClient } from './lib/supabase'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  query: string
  tickers: string[]
  intents: string[]
  created_at: string
}

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [status, setStatus] = useState('')
  const [currentReport, setCurrentReport] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchReports()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function fetchReports() {
    const token = await getToken()
    if (!token) return

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setReports(data)
    }
  }

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setCurrentReport('')
    setStatus('Planner identifying tickers and intents...')

    const token = await getToken()

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      })

      if (!res.ok) throw new Error('Research failed')

      const data = await res.json()
      setCurrentReport(data.report)
      setStatus('')
      fetchReports()
    } catch (err) {
      setStatus('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadReport(id: string) {
    const token = await getToken()
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setCurrentReport(data.report)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#07080d] flex">

      {/* Sidebar */}
      <div className="w-72 border-r border-[#1a1b28] flex flex-col">
        <div className="p-6 border-b border-[#1a1b28]">
          <h1 className="text-white font-mono text-sm font-semibold">Research Committee</h1>
          <p className="text-white font-mono text-xs mt-1">AI Investment Research</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-white font-mono text-xs uppercase tracking-widest mb-3">Recent Reports</p>
          {reports.length === 0 && (
            <p className="text-white font-mono text-xs">No reports yet</p>
          )}
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => loadReport(report.id)}
              className="w-full text-left p-3 rounded border border-transparent hover:border-[#1a1b28] hover:bg-[#0f1018] transition-all mb-2"
            >
              <p className="text-white font-mono text-xs truncate">{report.query}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {report.tickers.map(t => (
                  <span key={t} className="text-[#4fc3f7] font-mono text-xs">{t}</span>
                ))}
              </div>
              <p className="text-white font-mono text-xs mt-1">
                {new Date(report.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#1a1b28]">
          <button
            onClick={handleSignOut}
            className="text-white font-mono text-xs hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Query input */}
        <div className="p-8 border-b border-[#1a1b28]">
          <form onSubmit={handleResearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything — Compare GOOGL vs META, What's driving NVDA, Should I invest in TSLA..."
              className="flex-1 bg-[#0f1018] border border-[#1a1b28] text-white placeholder-white rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4fc3f7]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#4fc3f7] text-[#07080d] font-mono font-semibold text-sm px-6 py-3 rounded hover:bg-[#81d4fa] transition-colors disabled:opacity-40"
            >
              {loading ? 'Researching...' : 'Research'}
            </button>
          </form>

          {status && (
            <p className="text-white font-mono text-xs mt-3 animate-pulse">{status}</p>
          )}
        </div>

        {/* Report display */}
        <div className="flex-1 overflow-y-auto p-8">
          {!currentReport && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-white font-mono text-sm">No report selected</p>
              <div className="flex flex-col gap-2 text-center">
                {[
                  "What's the outlook for NVDA next quarter?",
                  "Compare TSLA vs competitors on valuation",
                  "What's driving META's stock price lately?",
                ].map(example => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="text-white font-mono text-xs hover:text-[#9098b8] transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-3">
              <div className="h-4 bg-[#0f1018] rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-[#0f1018] rounded animate-pulse w-1/2"></div>
              <div className="h-4 bg-[#0f1018] rounded animate-pulse w-2/3"></div>
              <div className="h-4 bg-[#0f1018] rounded animate-pulse w-3/4 mt-4"></div>
              <div className="h-4 bg-[#0f1018] rounded animate-pulse w-1/3"></div>
            </div>
          )}

          {currentReport && !loading && (
            <div className="prose prose-invert prose-sm max-w-none font-mono">
              <pre className="whitespace-pre-wrap text-white text-sm leading-relaxed font-mono">
                {currentReport}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
