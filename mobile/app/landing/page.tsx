'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import '../globals.css'

export default function LandingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Post My Note
        </div>
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          Create Stunning Note Posts
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
        Generate ready-to-post content with AI. Perfect for Instagram, LinkedIn, X and more.
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 py-4 text-lg rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50"
        >
          Start Creating Free
        </Link>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Why Choose Our Platform?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold mb-3">AI-Powered</h3>
            <p className="text-gray-400">
              Generate compelling content ideas and note posts using advanced AI technology
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold mb-3">Beautiful Designs</h3>
            <p className="text-gray-400">
              Choose from multiple font combinations and color themes to match your brand
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold mb-3">Instant Download</h3>
            <p className="text-gray-400">
              Generate and download your note slides in seconds, ready to post
            </p>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          What Our Users Say
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all">
            <p className="text-gray-300 mb-6 italic leading-relaxed">
              "This tool has completely transformed how I create content for Instagram. I can generate professional notes in minutes instead of hours!"
            </p>
            <div className="text-lg font-semibold text-white">
              Sarah Chen
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all">
            <p className="text-gray-300 mb-6 italic leading-relaxed">
              "The AI understands my brand voice perfectly. Every post feels authentic and engaging. Highly recommend!"
            </p>
            <div className="text-lg font-semibold text-white">
              Marcus Johnson
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all">
            <p className="text-gray-300 mb-6 italic leading-relaxed">
              "As a small business owner, this saves me so much time and money. The quality is incredible and the customization options are perfect."
            </p>
            <div className="text-lg font-semibold text-white">
              Emily Rodriguez
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto p-12 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators making amazing content
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 text-lg rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50"
          >
            Sign Up Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-white/10 text-center text-gray-400">
        <p>© 2025 Post My Note. All rights reserved.</p>
      </footer>
    </div>
  )
}

