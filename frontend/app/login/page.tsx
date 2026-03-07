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
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-white font-mono text-sm font-semibold">Research Committee</h1>
          <p className="text-white font-mono text-xs mt-1">AI Investment Research</p>
        </div>

        <div className="border border-[#1a1b28] rounded p-8 bg-[#0f1018]">
          <p className="text-white font-mono text-xs mb-6">
            {isSignUp ? 'Create an account' : 'Sign in to your account'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="bg-[#07080d] border border-[#1a1b28] text-white placeholder-white rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4fc3f7]"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="bg-[#07080d] border border-[#1a1b28] text-white placeholder-white rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4fc3f7]"
            />

            {error && (
              <p className="text-[#4fc3f7] font-mono text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-[#4fc3f7] text-[#07080d] font-mono font-semibold text-sm px-6 py-3 rounded hover:bg-[#81d4fa] transition-colors disabled:opacity-40 mt-2"
            >
              {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-white font-mono text-xs hover:text-[#9098b8] transition-colors mt-6 w-full text-center"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
