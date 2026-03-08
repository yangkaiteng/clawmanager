import { useState, useRef, useEffect, type FC } from 'react'
import { Brain, X, Send, Loader, ChevronDown, Bot, User } from 'lucide-react'
import { assistantApi } from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const NanoClawAssistant: FC = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Nano Claw 🐾 Your AI assistant for managing OpenClaw instances. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await assistantApi.chat(msg, history)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.reply, timestamp: new Date() },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-50 transition-all duration-300 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          boxShadow: open
            ? '0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(6, 182, 212, 0.3)'
            : '0 0 20px rgba(99, 102, 241, 0.4)',
        }}
      >
        {open ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <Brain className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 w-96 z-40 transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col"
          style={{ height: '520px', boxShadow: '0 0 40px rgba(99, 102, 241, 0.15), 0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Header */}
          <div className="p-4 border-b border-border-subtle"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Nano Claw</h3>
                  <p className="text-xs text-text-muted">AI Assistant • Mock Mode</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-gradient-to-br from-accent-purple to-accent-cyan'
                    : 'bg-bg-elevated border border-border'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot className="w-4 h-4 text-white" />
                    : <User className="w-3.5 h-3.5 text-text-secondary" />
                  }
                </div>
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent-purple text-white rounded-tr-sm'
                      : 'bg-bg-elevated text-text-primary border border-border-subtle rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-text-muted'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-accent-purple to-accent-cyan">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-bg-elevated border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border-subtle">
            <div className="flex gap-2 items-end bg-bg-elevated rounded-xl border border-border-subtle focus-within:border-accent-purple/50 transition-colors p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask Nano Claw anything…"
                rows={1}
                className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-muted resize-none focus:outline-none leading-relaxed py-1 px-2 max-h-24 overflow-y-auto"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
              >
                {loading ? (
                  <Loader className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default NanoClawAssistant
