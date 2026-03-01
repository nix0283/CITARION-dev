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
  Zap,
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
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HFTConfirmation {
  layer: number;
  name: string;
  passed: boolean;
  weight: number;
  score: number;
  details: string;
}

interface HFTSignal {
  id: string;
  symbol: string;
  timestamp: number;
  direction: 'LONG' | 'SHORT';
  strength: string;
  confidence: number;
  confirmations: HFTConfirmation[];
  confirmationScore: number;
  recommendedEntry: number;
  recommendedStop: number;
  recommendedTarget: number;
  positionSize: number;
  executionStyle: string;
  urgency: string;
  riskRewardRatio: number;
  validUntil: number;
}

interface HFTMicrostructure {
  effectiveSpread: number;
  orderFlowImbalance: number;
  tradeIntensity: number;
  depthImbalance: number;
  icebergDetected: boolean;
  spoofingDetected: boolean;
}

interface HFTConfig {
  requiredConfirmations: number;
  minConfirmationScore: number;
  minRiskReward: number;
  maxSpreadPercent: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  maxDrawdownPercent: number;
  latencyBudgetMs: number;
  enableIcebergDetection: boolean;
  enableSpoofingDetection: boolean;
  enableWhaleTracking: boolean;
}

interface HFTState {
  isRunning: boolean;
  activeSignals: HFTSignal[];
  dailyTrades: number;
  dailyPnL: number;
  currentDrawdown: number;
  circuitBreakerActive: boolean;
  circuitBreakerReason?: string;
}

const DEFAULT_CONFIG: HFTConfig = {
  requiredConfirmations: 5,
  minConfirmationScore: 70,
  minRiskReward: 2.0,
  maxSpreadPercent: 0.1,
  maxPositionSize: 1000,
  maxDailyTrades: 50,
  maxDrawdownPercent: 5,
  latencyBudgetMs: 100,
  enableIcebergDetection: true,
  enableSpoofingDetection: true,
  enableWhaleTracking: true,
};

export function HFTBotManager() {
  const [config, setConfig] = useState<HFTConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<HFTState | null>(null);
  const [microstructure, setMicrostructure] = useState<HFTMicrostructure | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [latency, setLatency] = useState(0);

  const fetchState = async () => {
    try {
      const response = await fetch("/api/bots/hft");
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to fetch HFT state:", error);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const startEngine = async () => {
    try {
      const response = await fetch("/api/bots/hft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", config }),
      });
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        toast.success("HFT Engine запущен");
      }
    } catch (error) {
      toast.error("Ошибка запуска HFT Engine");
    }
  };

  const stopEngine = async () => {
    try {
      const response = await fetch("/api/bots/hft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        toast.success("HFT Engine остановлен");
      }
    } catch (error) {
      toast.error("Ошибка остановки HFT Engine");
    }
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch("/api/bots/hft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate", config }),
      });
      const data = await response.json();
      if (data.success) {
        setState(data.state);
        toast.success(`Симуляция завершена: ${data.signals?.length || 0} сигналов`);
      }
    } catch (error) {
      toast.error("Ошибка симуляции");
    } finally {
      setIsSimulating(false);
    }
  };

  const getConfirmationColor = (passed: boolean) => passed ? "text-green-500" : "text-red-500";
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            HFT Bot
            <span className="text-sm font-normal text-muted-foreground">(High-Frequency Trading)</span>
          </h2>
          <p className="text-muted-foreground">
            Высокочастотная торговля с 10-слойной системой подтверждения сигналов
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state?.circuitBreakerActive && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertCircle className="h-3 w-3 mr-1" />
              Circuit Breaker
            </Badge>
          )}
          <Badge variant={state?.isRunning ? "default" : "outline"} className={state?.isRunning ? "bg-green-500" : ""}>
            {state?.isRunning ? "Активен" : "Остановлен"}
          </Badge>
          <Button onClick={state?.isRunning ? stopEngine : startEngine} variant="outline">
            {state?.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {state?.isRunning ? "Стоп" : "Старт"}
          </Button>
        </div>
      </div>

      {/* Microstructure Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Order Flow</div>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {((microstructure?.orderFlowImbalance ?? 0) * 100).toFixed(1)}%
            </div>
            <Progress 
              value={((microstructure?.orderFlowImbalance ?? 0) + 1) * 50} 
              className="h-1 mt-2" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Trade Intensity</div>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-2">
              ${((microstructure?.tradeIntensity ?? 0) / 1000).toFixed(1)}K/s
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Latency</div>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {latency.toFixed(0)}ms
            </div>
            <div className={cn("text-xs mt-1", latency < config.latencyBudgetMs ? "text-green-500" : "text-red-500")}>
              Budget: {config.latencyBudgetMs}ms
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Daily Trades</div>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {state?.dailyTrades ?? 0}/{config.maxDailyTrades}
            </div>
            <Progress value={((state?.dailyTrades ?? 0) / config.maxDailyTrades) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detection Warnings */}
      {(microstructure?.icebergDetected || microstructure?.spoofingDetected) && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Market Manipulation Detected</span>
            </div>
            <div className="flex gap-4 mt-2">
              {microstructure?.icebergDetected && (
                <Badge variant="outline" className="border-yellow-500">Iceberg Orders</Badge>
              )}
              {microstructure?.spoofingDetected && (
                <Badge variant="outline" className="border-red-500">Spoofing</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Signals */}
      {state?.activeSignals && state.activeSignals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Активные сигналы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.activeSignals.slice(-5).map((signal) => (
              <div key={signal.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={signal.direction === 'LONG' ? "bg-green-500" : "bg-red-500"}>
                      {signal.direction}
                    </Badge>
                    <span className="font-mono text-sm">{signal.symbol}</span>
                    <Badge className={getUrgencyColor(signal.urgency)}>{signal.urgency}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Conf: {(signal.confidence * 100).toFixed(0)}%
                    </span>
                    <span className="text-sm font-mono">
                      R:R {signal.riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Confirmation Layers */}
                <div className="flex flex-wrap gap-1">
                  {signal.confirmations.slice(0, 10).map((conf, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                      conf.passed ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {conf.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {conf.name}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Entry: ${signal.recommendedEntry.toFixed(2)} | 
                  SL: ${signal.recommendedStop.toFixed(2)} | 
                  TP: ${signal.recommendedTarget.toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Layers Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">10-Layer Confirmation System</CardTitle>
          <CardDescription>Каждый сигнал должен пройти минимум N слоёв подтверждения</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[
              { name: 'Order Flow', desc: 'Анализ потока ордеров' },
              { name: 'Liquidity', desc: 'Глубина ликвидности' },
              { name: 'Spread', desc: 'Ширина спреда' },
              { name: 'Regime', desc: 'Рыночный режим' },
              { name: 'Market Quality', desc: 'Качество рынка' },
              { name: 'Whale Activity', desc: 'Активность китов' },
              { name: 'Manipulation', desc: 'Детекция манипуляций' },
              { name: 'Volatility', desc: 'Волатильность' },
              { name: 'Session', desc: 'Тайминг сессии' },
              { name: 'Risk/Reward', desc: 'Соотношение риск/прибыль' },
            ].map((layer, i) => (
              <div key={i} className="p-2 rounded border text-center">
                <div className="text-xs font-medium">{i + 1}. {layer.name}</div>
                <div className="text-xs text-muted-foreground">{layer.desc}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Required Confirmations: {config.requiredConfirmations}</Label>
              <span className="text-xs text-muted-foreground">из 10 слоёв</span>
            </div>
            <Slider
              value={[config.requiredConfirmations]}
              onValueChange={([v]) => setConfig({ ...config, requiredConfirmations: v })}
              min={3} max={10} step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Min Confirmation Score</Label>
              <Input
                type="number"
                value={config.minConfirmationScore}
                onChange={(e) => setConfig({ ...config, minConfirmationScore: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min R:R Ratio</Label>
              <Input
                type="number"
                step="0.1"
                value={config.minRiskReward}
                onChange={(e) => setConfig({ ...config, minRiskReward: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Position Size</Label>
              <Input
                type="number"
                value={config.maxPositionSize}
                onChange={(e) => setConfig({ ...config, maxPositionSize: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Latency Budget (ms)</Label>
              <Input
                type="number"
                value={config.latencyBudgetMs}
                onChange={(e) => setConfig({ ...config, latencyBudgetMs: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.enableIcebergDetection}
                onCheckedChange={(checked) => setConfig({ ...config, enableIcebergDetection: checked })}
              />
              <Label>Iceberg Detection</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.enableSpoofingDetection}
                onCheckedChange={(checked) => setConfig({ ...config, enableSpoofingDetection: checked })}
              />
              <Label>Spoofing Detection</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.enableWhaleTracking}
                onCheckedChange={(checked) => setConfig({ ...config, enableWhaleTracking: checked })}
              />
              <Label>Whale Tracking</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={runSimulation} disabled={isSimulating} className="flex-1">
          {isSimulating ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          {isSimulating ? "Симуляция..." : "Запустить симуляцию"}
        </Button>
        <Button onClick={fetchState} variant="outline">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Как работает HFT Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>HFT Bot использует 10-слойную систему подтверждения для фильтрации сигналов.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Microstructure Analysis:</strong> Order book imbalance, trade intensity</li>
            <li><strong>Manipulation Detection:</strong> Iceberg orders, spoofing patterns</li>
            <li><strong>Circuit Breaker:</strong> Автоматическая остановка при просадке</li>
            <li><strong>Execution Styles:</strong> Aggressive, Passive, Adaptive</li>
            <li><strong>Urgency Levels:</strong> Low, Medium, High, Critical</li>
            <li><strong>VWAP/TWAP:</strong> Оптимальное исполнение крупных ордеров</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            Sub-millisecond execution. Colocation recommended for production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
