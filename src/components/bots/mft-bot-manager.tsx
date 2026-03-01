"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Waves,
  Play,
  Pause,
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  BarChart3,
  Clock,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MFTPosition {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlPercent: number;
  strategy: string;
  timeframe: string;
  openedAt: number;
}

interface MFTSignal {
  id: string;
  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  holdingPeriod: number;
  timeframe: string;
  regime: string;
  executionAlgorithm: string;
  urgency: string;
  riskRewardRatio: number;
}

interface MFTMetrics {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  totalPnL: number;
  winRate: number;
  maxDrawdown: number;
  dailyPnL: number;
}

interface MFTConfig {
  enabledStrategies: string[];
  defaultTimeframe: string;
  maxPositions: number;
  maxPositionSize: number;
  maxPositionValue: number;
  defaultHoldingPeriod: number;
  maxHoldingPeriod: number;
  maxRiskPerTrade: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  vwapDeviationEntry: number;
}

interface MFTState {
  positions: MFTPosition[];
  signals: MFTSignal[];
  metrics: MFTMetrics;
  regime: string;
}

const DEFAULT_CONFIG: MFTConfig = {
  enabledStrategies: ['MOMENTUM', 'MEAN_REVERSION', 'VWAP_REVERSION', 'VOLUME_BREAKOUT'],
  defaultTimeframe: '15m',
  maxPositions: 8,
  maxPositionSize: 5,
  maxPositionValue: 10000,
  defaultHoldingPeriod: 60,
  maxHoldingPeriod: 240,
  maxRiskPerTrade: 1,
  stopLossPercent: 1.5,
  takeProfitPercent: 3,
  trailingStopEnabled: true,
  trailingStopPercent: 1,
  vwapDeviationEntry: 2,
};

const STRATEGIES = [
  { value: 'MOMENTUM', label: 'Momentum', desc: 'Следование за импульсом' },
  { value: 'MEAN_REVERSION', label: 'Mean Reversion', desc: 'Возврат к среднему' },
  { value: 'VWAP_REVERSION', label: 'VWAP Reversion', desc: 'Отскок от VWAP' },
  { value: 'VOLUME_BREAKOUT', label: 'Volume Breakout', desc: 'Пробой на объёме' },
];

const TIMEFRAMES = [
  { value: '1m', label: '1 минута' },
  { value: '5m', label: '5 минут' },
  { value: '15m', label: '15 минут' },
  { value: '1h', label: '1 час' },
];

export function MFTBotManager() {
  const [config, setConfig] = useState<MFTConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<MFTState | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('MOMENTUM');
  const [vwapValue, setVwapValue] = useState(95000);
  const [currentPrice, setCurrentPrice] = useState(95200);

  const fetchState = async () => {
    try {
      const response = await fetch("/api/bots/mft");
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to fetch MFT state:", error);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch("/api/bots/mft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate", config }),
      });
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        toast.success(`Симуляция завершена: ${data.results?.length || 0} сигналов`);
      }
    } catch (error) {
      toast.error("Ошибка симуляции");
    } finally {
      setIsSimulating(false);
    }
  };

  const generateSignal = async () => {
    try {
      const response = await fetch("/api/bots/mft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateSignal",
          symbol: "BTCUSDT",
          strategy: selectedStrategy,
          price: currentPrice,
          config,
          additionalData: { volume: 2500, orderbookImbalance: 0.1 },
        }),
      });
      const data = await response.json();
      if (data.success && data.signal) {
        toast.success(`Сигнал: ${data.signal.direction} @ $${data.signal.entryPrice.toFixed(2)}`);
        fetchState();
      } else {
        toast.info("Нет подходящего сигнала");
      }
    } catch (error) {
      toast.error("Ошибка генерации сигнала");
    }
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'TRENDING': return 'text-green-500';
      case 'VOLATILE': return 'text-red-500';
      case 'RANGING': return 'text-blue-500';
      case 'QUIET': return 'text-gray-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStrategyBadge = (strategy: string) => {
    const colors: Record<string, string> = {
      'MOMENTUM': 'bg-green-500',
      'MEAN_REVERSION': 'bg-blue-500',
      'VWAP_REVERSION': 'bg-purple-500',
      'VOLUME_BREAKOUT': 'bg-orange-500',
    };
    return <Badge className={colors[strategy] || 'bg-gray-500'}>{strategy}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Waves className="h-6 w-6 text-blue-500" />
            MFT Bot
            <span className="text-sm font-normal text-muted-foreground">(Medium-Frequency Trading)</span>
          </h2>
          <p className="text-muted-foreground">
            Среднечастотная торговля: 15 минут - 4 часа, VWAP, Volume Profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getRegimeColor(state?.regime || 'UNKNOWN')}>
            {state?.regime || 'UNKNOWN'}
          </Badge>
          <Badge variant="outline">
            {state?.positions?.length || 0}/{config.maxPositions} позиций
          </Badge>
        </div>
      </div>

      {/* VWAP & Price Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">VWAP & Price Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 relative border rounded-lg p-4 bg-muted/20">
            {/* VWAP Bands */}
            <div className="absolute top-6 left-4 right-4 h-0.5 bg-red-400/50 border-dashed" />
            <div className="absolute top-2 left-4 right-4 h-0.5 bg-red-400 border-dashed" />
            <span className="absolute top-0 right-4 text-xs text-red-400">+2σ</span>
            
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-blue-500 -translate-y-1/2" />
            <span className="absolute top-1/2 right-4 text-xs text-blue-500 -translate-y-1/2 font-mono">
              VWAP: ${vwapValue.toLocaleString()}
            </span>
            
            <div className="absolute bottom-6 left-4 right-4 h-0.5 bg-green-400/50 border-dashed" />
            <div className="absolute bottom-2 left-4 right-4 h-0.5 bg-green-400 border-dashed" />
            <span className="absolute bottom-0 right-4 text-xs text-green-400">-2σ</span>

            {/* Current Price */}
            <div 
              className="absolute left-1/2 w-4 h-4 rounded-full -translate-x-1/2 bg-primary shadow-lg"
              style={{ top: '40%' }}
            />
            <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
              Current: ${currentPrice.toLocaleString()} | Deviation: {((currentPrice - vwapValue) / vwapValue * 100).toFixed(2)}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-2xl font-bold text-green-500">
              {((state?.metrics?.winRate ?? 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Total PnL</div>
            <div className={cn("text-2xl font-bold", (state?.metrics?.totalPnL ?? 0) >= 0 ? "text-green-500" : "text-red-500")}>
              ${(state?.metrics?.totalPnL ?? 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-2xl font-bold">{state?.metrics?.totalTrades ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Max Drawdown</div>
            <div className="text-2xl font-bold text-red-500">
              {((state?.metrics?.maxDrawdown ?? 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Стратегия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STRATEGIES.map((strat) => (
              <Button
                key={strat.value}
                variant={selectedStrategy === strat.value ? "default" : "outline"}
                onClick={() => setSelectedStrategy(strat.value)}
                className="h-auto py-3 flex flex-col items-center"
              >
                <span className="font-medium">{strat.label}</span>
                <span className="text-xs text-muted-foreground">{strat.desc}</span>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={config.defaultTimeframe} onValueChange={(v) => setConfig({ ...config, defaultTimeframe: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Holding Period: {config.defaultHoldingPeriod} min</Label>
              <Slider
                value={[config.defaultHoldingPeriod]}
                onValueChange={([v]) => setConfig({ ...config, defaultHoldingPeriod: v })}
                min={15} max={240} step={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Positions */}
      {state?.positions && state.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Активные позиции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.positions.slice(0, 5).map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={pos.direction === 'LONG' ? "bg-green-500" : "bg-red-500"}>
                      {pos.direction}
                    </Badge>
                    {getStrategyBadge(pos.strategy)}
                    <span className="text-xs text-muted-foreground">{pos.timeframe}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Entry: ${pos.entryPrice.toFixed(2)} | SL: ${pos.stopLoss.toFixed(2)} | TP: ${pos.takeProfit.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-bold", pos.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                    ${pos.pnl.toFixed(2)}
                  </div>
                  <div className={cn("text-xs", pos.pnlPercent >= 0 ? "text-green-500" : "text-red-500")}>
                    {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Max Positions</Label>
              <Input
                type="number"
                value={config.maxPositions}
                onChange={(e) => setConfig({ ...config, maxPositions: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Per Trade %</Label>
              <Input
                type="number"
                step="0.1"
                value={config.maxRiskPerTrade}
                onChange={(e) => setConfig({ ...config, maxRiskPerTrade: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss %</Label>
              <Input
                type="number"
                step="0.1"
                value={config.stopLossPercent}
                onChange={(e) => setConfig({ ...config, stopLossPercent: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Take Profit %</Label>
              <Input
                type="number"
                step="0.1"
                value={config.takeProfitPercent}
                onChange={(e) => setConfig({ ...config, takeProfitPercent: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.trailingStopEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, trailingStopEnabled: checked })}
              />
              <Label>Trailing Stop</Label>
            </div>
            {config.trailingStopEnabled && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">{config.trailingStopPercent}%</Label>
                <Slider
                  value={[config.trailingStopPercent]}
                  onValueChange={([v]) => setConfig({ ...config, trailingStopPercent: v })}
                  min={0.5} max={3} step={0.1}
                  className="w-24"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={generateSignal} variant="outline" className="flex-1">
          <Target className="h-4 w-4 mr-2" />
          Генерировать сигнал
        </Button>
        <Button onClick={runSimulation} disabled={isSimulating} className="flex-1">
          {isSimulating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          {isSimulating ? "Симуляция..." : "Запустить симуляцию"}
        </Button>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Как работает MFT Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>MFT Bot торгует на минутных и часовых таймфреймах с использованием VWAP и Volume Profile.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Strategies:</strong> Momentum, Mean Reversion, VWAP Reversion, Volume Breakout</li>
            <li><strong>VWAP Analysis:</strong> Вход при отклонении от VWAP на 2+ стандартных отклонения</li>
            <li><strong>Volume Profile:</strong> POC, Value Area, поддержка/сопротивление по объёму</li>
            <li><strong>Regime Detection:</strong> Trending, Ranging, Volatile, Quiet</li>
            <li><strong>Execution:</strong> TWAP, POV, VWAP algorithms</li>
            <li><strong>Holding Period:</strong> 15 минут - 4 часа</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            Optimal for intraday trading with moderate frequency.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
