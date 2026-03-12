'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('✓ Check your email to confirm your account')
        setEmail('')
        setPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4fc3f7]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#4fc3f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-white font-mono text-2xl font-bold tracking-tight mb-2">
            Research Committee
          </h1>
          <p className="text-gray-400 font-mono text-sm">
            AI-Powered Investment Research
          </p>
        </div>

        {/* Login Form */}
        <div className="border border-[#1a1b28] rounded-lg p-8 bg-[#0f1018] shadow-xl">
          <div className="mb-6">
            <h2 className="text-white font-mono text-lg font-semibold mb-1">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 font-mono text-xs">
              {isSignUp 
                ? 'Get started with your research account' 
                : 'Sign in to continue your research'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 font-mono text-xs mb-2 block">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#07080d] border border-[#1a1b28] text-white placeholder-gray-600 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4fc3f7] focus:ring-1 focus:ring-[#4fc3f7] transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 font-mono text-xs mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#07080d] border border-[#1a1b28] text-white placeholder-gray-600 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4fc3f7] focus:ring-1 focus:ring-[#4fc3f7] transition-all"
              />
              {isSignUp && (
                <p className="text-gray-600 font-mono text-xs mt-1">
                  At least 6 characters
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 font-mono text-xs">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-400 font-mono text-xs">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4fc3f7] text-[#07080d] font-mono font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[#81d4fa] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? 'Create account' : 'Sign in'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1a1b28]">
            <button
              onClick={() => { 
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
              }}
              className="text-gray-400 font-mono text-xs hover:text-white transition-colors w-full text-center"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Create one"
              }
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#4fc3f7]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4fc3f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-gray-500 font-mono text-xs">AI Powered</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#4fc3f7]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4fc3f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-500 font-mono text-xs">Secure</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#4fc3f7]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4fc3f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-gray-500 font-mono text-xs">Reliable</p>
          </div>
        </div>
      </div>
    </div>
  )
}
