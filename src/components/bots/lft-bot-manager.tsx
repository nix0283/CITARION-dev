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
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  AlertTriangle,
  Target,
  BarChart3,
  Calendar,
  Gauge,
  Layers,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LFTPosition {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  strategy: string;
  totalSize: number;
  avgEntryPrice: number;
  currentPrice: number;
  pnlPercent: number;
  holdingDays: number;
  scale: string;
  trailingActivated: boolean;
}

interface LFTSignal {
  id: string;
  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfitLevels: Array<{ price: number; percent: number }>;
  positionSize: number;
  scaleInLevels: Array<{ price: number; size: number }>;
  expectedHoldingDays: number;
  timeframe: string;
  riskRewardRatio: number;
  trendContext: {
    direction: string;
    strength: number;
    phase: string;
  };
}

interface LFTMetrics {
  totalTrades: number;
  winTrades: number;
  winRate: number;
  totalPnL: number;
  avgHoldingDays: number;
  maxDrawdown: number;
}

interface LFTConfig {
  enabledStrategies: string[];
  primaryStrategy: string;
  defaultTimeframe: string;
  maxPositions: number;
  maxPositionSize: number;
  maxPositionValue: number;
  minHoldingDays: number;
  maxHoldingDays: number;
  defaultHoldingDays: number;
  maxRiskPerPosition: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  enablePyramiding: boolean;
  maxPyramidLevels: number;
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  trailingActivationPercent: number;
  trendStrengthMin: number;
  mtfAlignmentRequired: boolean;
}

interface LFTState {
  positions: LFTPosition[];
  signals: LFTSignal[];
  metrics: LFTMetrics;
}

const DEFAULT_CONFIG: LFTConfig = {
  enabledStrategies: ['TREND_FOLLOWING', 'SWING_TRADING', 'BREAKOUT', 'MACRO_MOMENTUM'],
  primaryStrategy: 'TREND_FOLLOWING',
  defaultTimeframe: '1d',
  maxPositions: 10,
  maxPositionSize: 10,
  maxPositionValue: 50000,
  minHoldingDays: 1,
  maxHoldingDays: 14,
  defaultHoldingDays: 5,
  maxRiskPerPosition: 2,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  enablePyramiding: true,
  maxPyramidLevels: 2,
  trailingStopEnabled: true,
  trailingStopPercent: 3,
  trailingActivationPercent: 5,
  trendStrengthMin: 40,
  mtfAlignmentRequired: true,
};

const STRATEGIES = [
  { value: 'TREND_FOLLOWING', label: 'Trend Following', desc: 'Следование за трендом', color: 'bg-green-500' },
  { value: 'SWING_TRADING', label: 'Swing Trading', desc: 'Свинг-трейдинг', color: 'bg-blue-500' },
  { value: 'BREAKOUT', label: 'Breakout', desc: 'Торговля пробоев', color: 'bg-purple-500' },
  { value: 'MACRO_MOMENTUM', label: 'Macro Momentum', desc: 'Макро-импульс', color: 'bg-orange-500' },
];

const MARKET_PHASES = [
  { value: 'ACCUMULATION', label: 'Accumulation', color: 'text-blue-500' },
  { value: 'MARKUP', label: 'Markup', color: 'text-green-500' },
  { value: 'DISTRIBUTION', label: 'Distribution', color: 'text-yellow-500' },
  { value: 'MARKDOWN', label: 'Markdown', color: 'text-red-500' },
];

export function LFTBotManager() {
  const [config, setConfig] = useState<LFTConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<LFTState | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('TREND_FOLLOWING');
  const [trendDirection, setTrendDirection] = useState<'UP' | 'DOWN' | 'SIDEWAYS'>('UP');
  const [trendStrength, setTrendStrength] = useState(65);
  const [marketPhase, setMarketPhase] = useState('MARKUP');

  const fetchState = async () => {
    try {
      const response = await fetch("/api/bots/lft");
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to fetch LFT state:", error);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => clearInterval(interval);
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch("/api/bots/lft", {
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
      const response = await fetch("/api/bots/lft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateSignal",
          symbol: "BTCUSDT",
          strategy: selectedStrategy,
          price: 95000,
          config,
          macroContext: {
            btcDominance: 52,
            totalMarketCap: 2500000000000,
            fearGreedIndex: 55,
            fundingRateAvg: 0.0001,
            openInterestChange: 2.5,
            stablecoinInflow: 500000000,
            exchangeOutflow: 200000000,
            whaleAccumulation: 0.4,
          },
        }),
      });
      const data = await response.json();
      if (data.success && data.signal) {
        toast.success(`Сигнал: ${data.signal.direction} @ $${data.signal.entryPrice.toFixed(2)}`);
        fetchState();
      } else {
        toast.info("Нет подходящего сигнала - проверьте MTF alignment");
      }
    } catch (error) {
      toast.error("Ошибка генерации сигнала");
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'UP': return <ChevronUp className="h-5 w-5 text-green-500" />;
      case 'DOWN': return <ChevronDown className="h-5 w-5 text-red-500" />;
      default: return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getScaleBadge = (scale: string) => {
    switch (scale) {
      case 'INITIAL': return <Badge variant="outline">Initial</Badge>;
      case 'PYRAMID_1': return <Badge className="bg-blue-500">P1</Badge>;
      case 'PYRAMID_2': return <Badge className="bg-purple-500">P2</Badge>;
      case 'FULL': return <Badge className="bg-green-500">Full</Badge>;
      default: return <Badge variant="outline">{scale}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-500" />
            LFT Bot
            <span className="text-sm font-normal text-muted-foreground">(Low-Frequency Trading)</span>
          </h2>
          <p className="text-muted-foreground">
            Позиционная торговля: дни-недели, свинг, тренд-следящие стратегии
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {getTrendIcon(trendDirection)}
            {trendDirection}
          </Badge>
          <Badge variant="outline">
            {state?.positions?.length || 0}/{config.maxPositions} позиций
          </Badge>
        </div>
      </div>

      {/* Trend & Phase Analysis */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Trend Strength</div>
              {getTrendIcon(trendDirection)}
            </div>
            <div className="text-3xl font-bold">{trendStrength}</div>
            <Progress value={trendStrength} className="h-2 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              Min: {config.trendStrengthMin}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-2">Market Phase (Wyckoff)</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {MARKET_PHASES.find(p => p.value === marketPhase)?.label}
            </div>
            <div className="flex gap-2 mt-3">
              {MARKET_PHASES.map((phase) => (
                <Button
                  key={phase.value}
                  variant={marketPhase === phase.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMarketPhase(phase.value)}
                  className="h-7 text-xs"
                >
                  {phase.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-2">Multi-TF Alignment</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">4H UP</Badge>
              <Badge className="bg-green-500">1D UP</Badge>
              <Badge className="bg-green-500">1W UP</Badge>
            </div>
            <div className="text-xs text-green-500 mt-2">
              ✓ All timeframes aligned
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-5 gap-4">
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
              ${(state?.metrics?.totalPnL ?? 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Avg Hold</div>
            <div className="text-2xl font-bold">
              {(state?.metrics?.avgHoldingDays ?? 0).toFixed(1)}d
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Max DD</div>
            <div className="text-2xl font-bold text-red-500">
              {((state?.metrics?.maxDrawdown ?? 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-2xl font-bold">{state?.metrics?.totalTrades ?? 0}</div>
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
                <Badge className={strat.color}>{strat.label}</Badge>
                <span className="text-xs text-muted-foreground mt-1">{strat.desc}</span>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Holding Days: {config.defaultHoldingDays}</Label>
              <Slider
                value={[config.defaultHoldingDays]}
                onValueChange={([v]) => setConfig({ ...config, defaultHoldingDays: v })}
                min={1} max={14} step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss %: {config.stopLossPercent}</Label>
              <Slider
                value={[config.stopLossPercent]}
                onValueChange={([v]) => setConfig({ ...config, stopLossPercent: v })}
                min={2} max={10} step={0.5}
              />
            </div>
            <div className="space-y-2">
              <Label>Take Profit %: {config.takeProfitPercent}</Label>
              <Slider
                value={[config.takeProfitPercent]}
                onValueChange={([v]) => setConfig({ ...config, takeProfitPercent: v })}
                min={5} max={30} step={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Positions with Pyramiding */}
      {state?.positions && state.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Активные позиции (с пирамидингом)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.positions.slice(0, 5).map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={pos.direction === 'LONG' ? "bg-green-500" : "bg-red-500"}>
                      {pos.direction}
                    </Badge>
                    {getScaleBadge(pos.scale)}
                    <span className="text-sm font-mono">{pos.symbol}</span>
                    {pos.trailingActivated && (
                      <Badge variant="outline" className="text-xs">Trailing Active</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Entry: ${pos.avgEntryPrice.toFixed(2)} | Size: {pos.totalSize.toFixed(2)} | 
                    Days: {pos.holdingDays.toFixed(1)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-bold", pos.pnlPercent >= 0 ? "text-green-500" : "text-red-500")}>
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
              <Label>Max Position Value</Label>
              <Input
                type="number"
                value={config.maxPositionValue}
                onChange={(e) => setConfig({ ...config, maxPositionValue: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Per Position %</Label>
              <Input
                type="number"
                step="0.1"
                value={config.maxRiskPerPosition}
                onChange={(e) => setConfig({ ...config, maxRiskPerPosition: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trend Strength Min</Label>
              <Input
                type="number"
                value={config.trendStrengthMin}
                onChange={(e) => setConfig({ ...config, trendStrengthMin: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.enablePyramiding}
                onCheckedChange={(checked) => setConfig({ ...config, enablePyramiding: checked })}
              />
              <Label>Enable Pyramiding</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.mtfAlignmentRequired}
                onCheckedChange={(checked) => setConfig({ ...config, mtfAlignmentRequired: checked })}
              />
              <Label>MTF Alignment Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.trailingStopEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, trailingStopEnabled: checked })}
              />
              <Label>Trailing Stop</Label>
            </div>
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
            Как работает LFT Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>LFT Bot торгует на дневных и недельных таймфреймах с использованием тренд-анализа.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Strategies:</strong> Trend Following, Swing Trading, Breakout, Macro Momentum</li>
            <li><strong>Multi-TF Analysis:</strong> 4H, 1D, 1W alignment</li>
            <li><strong>Wyckoff Phases:</strong> Accumulation, Markup, Distribution, Markdown</li>
            <li><strong>Pyramiding:</strong> Scale-in до 2 уровней</li>
            <li><strong>Position Scaling:</strong> Partial take profits на уровнях</li>
            <li><strong>Holding Period:</strong> 1-14 дней</li>
            <li><strong>Macro Filters:</strong> Fear &amp; Greed, Funding Rate, Whale Activity</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            Ideal for swing trading and position trading with multi-day holds.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
