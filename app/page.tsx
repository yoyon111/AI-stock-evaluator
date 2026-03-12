'use client'

import { useState, useEffect } from 'react'
import { createClient } from './lib/supabase'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  query: string
  report: string
  tickers: string[]
  intents: string[]
  sources: any[]
  created_at: string
}

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [status, setStatus] = useState('')
  const [currentReport, setCurrentReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
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

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    }
  }

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setCurrentReport(null)
    setError('')
    setStatus('🔍 Planner identifying tickers and intents...')

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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Research failed')
      }

      const data = await res.json()
      setCurrentReport(data)
      setStatus('')
      setQuery('') // Clear input after successful research
      fetchReports()
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  async function loadReport(id: string) {
    setLoading(true)
    setError('')
    const token = await getToken()
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentReport(data)
      } else {
        throw new Error('Failed to load report')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  async function deleteReport(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this report?')) return

    const token = await getToken()
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        fetchReports()
        if (currentReport?.id === id) {
          setCurrentReport(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete report:', err)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function copyToClipboard() {
    if (!currentReport) return
    navigator.clipboard.writeText(currentReport.report)
    alert('Report copied to clipboard!')
  }

  function downloadReport() {
    if (!currentReport) return
    const blob = new Blob([currentReport.report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${currentReport.query.slice(0, 30)}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#07080d] flex">

      {/* Sidebar */}
      <div className="w-80 border-r border-[#1a1b28] flex flex-col">
        <div className="p-6 border-b border-[#1a1b28]">
          <h1 className="text-white font-mono text-lg font-bold tracking-tight">
            Research Committee
          </h1>
          <p className="text-gray-400 font-mono text-xs mt-1">
            AI Investment Research
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-3">
            Recent Reports ({reports.length})
          </p>
          
          {reports.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-mono text-xs">No reports yet</p>
              <p className="text-gray-600 font-mono text-xs mt-2">
                Ask a question to get started
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {reports.map(report => (
              <div
                key={report.id}
                className={`group relative p-3 rounded border transition-all cursor-pointer ${
                  currentReport?.id === report.id
                    ? 'border-[#4fc3f7] bg-[#4fc3f7]/5'
                    : 'border-[#1a1b28] hover:border-[#2a2b38] hover:bg-[#0f1018]'
                }`}
                onClick={() => loadReport(report.id)}
              >
                <p className="text-white font-mono text-xs truncate pr-6">
                  {report.query}
                </p>
                
                <div className="flex gap-1 mt-2 flex-wrap">
                  {report.tickers.slice(0, 3).map(t => (
                    <span
                      key={t}
                      className="text-[#4fc3f7] font-mono text-[10px] bg-[#4fc3f7]/10 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                  {report.tickers.length > 3 && (
                    <span className="text-gray-500 font-mono text-[10px]">
                      +{report.tickers.length - 3}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-500 font-mono text-[10px] mt-2">
                  {new Date(report.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>

                {/* Delete button - shows on hover */}
                <button
                  onClick={(e) => deleteReport(report.id, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400"
                  title="Delete report"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#1a1b28]">
          <button
            onClick={handleSignOut}
            className="text-gray-400 font-mono text-xs hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Query input */}
        <div className="p-6 border-b border-[#1a1b28]">
          <form onSubmit={handleResearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything — Compare GOOGL vs META, What's driving NVDA, Should I invest in TSLA..."
              className="flex-1 bg-[#0f1018] border border-[#1a1b28] text-white placeholder-gray-500 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4fc3f7] focus:ring-1 focus:ring-[#4fc3f7] transition-all"
              disabled={loading}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#4fc3f7] text-[#07080d] font-mono font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[#81d4fa] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Researching
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Research
                </>
              )}
            </button>
          </form>

          {status && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-1 h-1 bg-[#4fc3f7] rounded-full animate-pulse" />
              <p className="text-gray-400 font-mono text-xs">{status}</p>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 font-mono text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* Report display */}
        <div className="flex-1 overflow-y-auto p-8">
          {!currentReport && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4fc3f7]/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#4fc3f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white font-mono text-sm mb-2">No report selected</p>
                <p className="text-gray-500 font-mono text-xs">Ask a question or select a report from the sidebar</p>
              </div>
              
              <div className="flex flex-col gap-2 w-full max-w-md">
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-2 text-center">
                  Example queries
                </p>
                {[
                  "What's the outlook for NVDA next quarter?",
                  "Compare TSLA vs competitors on valuation",
                  "What's driving META's stock price lately?",
                ].map(example => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="text-left text-gray-400 font-mono text-xs hover:text-[#4fc3f7] hover:bg-[#0f1018] transition-all px-4 py-3 rounded-lg border border-[#1a1b28] hover:border-[#2a2b38]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-[#4fc3f7] rounded-full animate-pulse" />
                <p className="text-gray-400 font-mono text-sm">Analyzing your query...</p>
              </div>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-[#0f1018] rounded animate-pulse"
                  style={{ width: `${Math.random() * 40 + 40}%` }}
                />
              ))}
            </div>
          )}

          {currentReport && !loading && (
            <div className="max-w-4xl">
              {/* Report Header */}
              <div className="mb-6 pb-6 border-b border-[#1a1b28]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-white font-mono text-xl mb-2">{currentReport.query}</h2>
                    <div className="flex gap-2 flex-wrap">
                      {currentReport.tickers.map(ticker => (
                        <span
                          key={ticker}
                          className="text-[#4fc3f7] font-mono text-xs bg-[#4fc3f7]/10 px-3 py-1 rounded-full"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Export Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="text-gray-400 hover:text-white transition-colors p-2"
                      title="Export options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#0f1018] border border-[#1a1b28] rounded-lg shadow-xl z-10">
                        <button
                          onClick={() => { copyToClipboard(); setShowExportMenu(false); }}
                          className="w-full text-left px-4 py-2 text-gray-400 hover:text-white hover:bg-[#1a1b28] transition-colors font-mono text-xs flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy to clipboard
                        </button>
                        <button
                          onClick={() => { downloadReport(); setShowExportMenu(false); }}
                          className="w-full text-left px-4 py-2 text-gray-400 hover:text-white hover:bg-[#1a1b28] transition-colors font-mono text-xs flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download as TXT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-500 font-mono text-xs">
                  {new Date(currentReport.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Report Content */}
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-mono bg-transparent border-0 p-0">
                  {currentReport.report}
                </pre>
              </div>

              {/* Sources */}
              {currentReport.sources && currentReport.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#1a1b28]">
                  <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-4">
                    Sources ({currentReport.sources.length})
                  </p>
                  <div className="space-y-2">
                    {currentReport.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg border border-[#1a1b28] hover:border-[#2a2b38] hover:bg-[#0f1018] transition-all group"
                      >
                        <p className="text-[#4fc3f7] font-mono text-xs group-hover:text-[#81d4fa] transition-colors">
                          {source.title || source.url}
                        </p>
                        <p className="text-gray-600 font-mono text-[10px] mt-1 truncate">
                          {source.url}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
