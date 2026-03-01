'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Target,
  Bell,
  Settings,
  BarChart3
} from 'lucide-react'

// Binance-like color scheme
const colors = {
  up: '#0ECB81',      // Binance green
  down: '#F6465D',    // Binance red
  warning: '#F0B90B', // Binance yellow
  background: '#0B0E11',
  cardBg: '#1E2329',
  border: '#2B3139',
  text: '#EAECEF',
  textMuted: '#848E9C',
  accent: '#FCD535'   // Binance gold
}

interface Signal {
  id: string
  symbol: string
  direction: 'LONG' | 'SHORT'
  status: string
  confidence: number
  entryPrice?: number
  takeProfits?: Array<{ price: number; percent: number }>
  stopLoss?: number
  leverage?: number
  execution?: {
    currentPrice: number
    unrealizedPnl: number
    unrealizedPnlPercent: number
  }
  timestamp: string
}

interface Position {
  id: string
  symbol: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  positionSize: number
  leverage: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  stopLoss: number
  takeProfits: Array<{ price: number; percent: number }>
  status: string
}

interface AccountSummary {
  totalSignals: number
  activeSignals: number
  openPositions: number
  totalPnL: number
  winRate: number
}

export function SignalBotPanel() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('positions')
  const [signalInput, setSignalInput] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/signals')
      const data = await res.json()
      
      if (data.success) {
        setSignals(data.signals || [])
        setPositions(data.positions || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleProcessSignal = async () => {
    if (!signalInput.trim()) return
    
    try {
      await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: signalInput, source: 'manual' })
      })
      setSignalInput('')
      fetchData()
    } catch (error) {
      console.error('Failed to process signal:', error)
    }
  }

  const handleClosePosition = async (signalId: string) => {
    try {
      await fetch('/api/signals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', signalId })
      })
      fetchData()
    } catch (error) {
      console.error('Failed to close position:', error)
    }
  }

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(2)
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(6)
  }

  const formatPnL = (pnl: number, percent: number) => {
    const isPositive = pnl >= 0
    return (
      <span style={{ color: isPositive ? colors.up : colors.down }}>
        {isPositive ? '+' : ''}{pnl.toFixed(2)} ({isPositive ? '+' : ''}{percent.toFixed(2)}%)
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
      active: { bg: 'bg-green-500/20', text: 'text-green-500' },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-500' }
    }
    const style = styles[status] || styles.pending
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ background: colors.background }}>
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: colors.accent }} />
      </div>
    )
  }

  return (
    <div className="space-y-4" style={{ color: colors.text }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: colors.cardBg }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6" style={{ color: colors.accent }} />
            <h1 className="text-xl font-bold">Signal Bot</h1>
          </div>
          <Badge style={{ background: colors.accent, color: colors.background }}>LIVE</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 p-4 rounded-lg" style={{ background: colors.cardBg }}>
        <div className="text-center">
          <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Total</div>
          <div className="font-bold">{summary?.totalSignals || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Active</div>
          <div className="font-bold" style={{ color: colors.up }}>{summary?.activeSignals || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Positions</div>
          <div className="font-bold">{summary?.openPositions || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-xs mb-1" style={{ color: colors.textMuted }}>PnL</div>
          <div className="font-bold" style={{ color: (summary?.totalPnL || 0) >= 0 ? colors.up : colors.down }}>
            ${(summary?.totalPnL || 0).toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Win Rate</div>
          <div className="font-bold">{((summary?.winRate || 0) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Signal Input */}
      <div className="p-4 rounded-lg" style={{ background: colors.cardBg }}>
        <div className="flex gap-2">
          <Input
            value={signalInput}
            onChange={(e) => setSignalInput(e.target.value)}
            placeholder="Paste signal message..."
            className="flex-1"
          />
          <Button onClick={handleProcessSignal} style={{ background: colors.accent, color: colors.background }}>
            Process
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-2">
          {positions.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ background: colors.cardBg, color: colors.textMuted }}>
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No open positions</p>
            </div>
          ) : (
            positions.map((position) => (
              <div key={position.id} className="p-4 rounded-lg" style={{ background: colors.cardBg }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge style={{ background: position.direction === 'LONG' ? colors.up : colors.down, color: colors.background }}>
                      {position.direction}
                    </Badge>
                    <span className="font-bold text-lg">{position.symbol}</span>
                    <span className="text-sm" style={{ color: colors.textMuted }}>{position.leverage}x</span>
                  </div>
                  {formatPnL(position.unrealizedPnl, position.unrealizedPnlPercent)}
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                  <div><span style={{ color: colors.textMuted }}>Entry: </span>${formatPrice(position.entryPrice)}</div>
                  <div><span style={{ color: colors.textMuted }}>Current: </span>${formatPrice(position.currentPrice)}</div>
                  <div><span style={{ color: colors.textMuted }}>Size: </span>${position.positionSize.toFixed(2)}</div>
                  <div><span style={{ color: colors.textMuted }}>SL: </span><span style={{ color: colors.down }}>${formatPrice(position.stopLoss)}</span></div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => handleClosePosition(position.id)} className="ml-auto">
                  Close
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-2">
          {signals.filter(s => s.status !== 'closed').map((signal) => (
            <div key={signal.id} className="p-4 rounded-lg" style={{ background: colors.cardBg }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge style={{ background: signal.direction === 'LONG' ? colors.up : colors.down, color: colors.background }}>
                    {signal.direction}
                  </Badge>
                  <span className="font-bold">{signal.symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(signal.status)}
                  <span className="text-sm" style={{ color: colors.textMuted }}>{Math.round(signal.confidence * 100)}% conf</span>
                </div>
              </div>
              {signal.entryPrice && (
                <div className="mt-2 text-sm" style={{ color: colors.textMuted }}>
                  Entry: ${formatPrice(signal.entryPrice)}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="history">
          <div className="p-4 rounded-lg text-center" style={{ background: colors.cardBg, color: colors.textMuted }}>
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Signal history</p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="p-4 rounded-lg space-y-4" style={{ background: colors.cardBg }}>
            <h3 className="font-bold text-lg">Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded" style={{ background: colors.background }}>
                <div className="text-sm" style={{ color: colors.textMuted }}>Min Confidence</div>
                <div className="text-2xl font-bold">70%</div>
              </div>
              <div className="p-3 rounded" style={{ background: colors.background }}>
                <div className="text-sm" style={{ color: colors.textMuted }}>Max Leverage</div>
                <div className="text-2xl font-bold">10x</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
