"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Target,
  Play,
  Pause,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MeanReversionState {
  symbol: string;
  currentPrice: number;
  mean: number;
  stdDev: number;
  zScore: number;
  rsi: number;
  bollingerUpper: number;
  bollingerLower: number;
  signal: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
  halfLife: number;
  confidence: number;
}

interface EquilibristConfig {
  lookbackPeriod: number;
  stdDevMultiplier: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  zScoreEntry: number;
  zScoreExit: number;
  minHalfLife: number;
  maxHalfLife: number;
}

const DEFAULT_CONFIG: EquilibristConfig = {
  lookbackPeriod: 20,
  stdDevMultiplier: 2.0,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  zScoreEntry: 2.0,
  zScoreExit: 0.5,
  minHalfLife: 5,
  maxHalfLife: 50,
};

export function EquilibristBotManager() {
  const [config, setConfig] = useState<EquilibristConfig>(DEFAULT_CONFIG);
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<MeanReversionState | null>(null);
  const [symbols, setSymbols] = useState<string[]>(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "OVERSOLD": return "text-green-500";
      case "OVERBOUGHT": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getSignalBg = (signal: string) => {
    switch (signal) {
      case "OVERSOLD": return "bg-green-500/10 border-green-500/30";
      case "OVERBOUGHT": return "bg-red-500/10 border-red-500/30";
      default: return "bg-muted/50";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Equilibrist
            <span className="text-sm font-normal text-muted-foreground">(Mean Reversion)</span>
          </h2>
          <p className="text-muted-foreground">
            Поиск равновесия при отклонении цен от статистического среднего
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-green-500" : ""}>
            {isActive ? "Активен" : "Остановлен"}
          </Badge>
          <Button onClick={() => setIsActive(!isActive)} variant="outline">
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? "Стоп" : "Старт"}
          </Button>
        </div>
      </div>

      {/* Bollinger Bands Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bollinger Bands & RSI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 relative border rounded-lg p-4 bg-muted/20">
            {/* Upper Band */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-red-300 opacity-50" />
            <div className="absolute top-4 right-4 text-xs text-red-400">Upper BB</div>
            
            {/* Middle (Mean) */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary opacity-50" />
            <div className="absolute top-1/2 right-4 text-xs text-primary -translate-y-1/2">Mean</div>
            
            {/* Lower Band */}
            <div className="absolute bottom-4 left-4 right-4 h-0.5 bg-green-300 opacity-50" />
            <div className="absolute bottom-4 right-4 text-xs text-green-400">Lower BB</div>
            
            {/* Current Price Indicator */}
            {state && (
              <div 
                className={cn("absolute left-1/2 w-2 h-2 rounded-full -translate-x-1/2", 
                  state.signal === "OVERSOLD" ? "bg-green-500 bottom-6" :
                  state.signal === "OVERBOUGHT" ? "bg-red-500 top-6" : "bg-primary top-1/2"
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Config */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label>Lookback Period: {config.lookbackPeriod}</Label>
            <Slider
              value={[config.lookbackPeriod]}
              onValueChange={([v]) => setConfig({ ...config, lookbackPeriod: v })}
              min={10} max={50} step={1}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label>Std Dev Multiplier: {config.stdDevMultiplier}</Label>
            <Slider
              value={[config.stdDevMultiplier]}
              onValueChange={([v]) => setConfig({ ...config, stdDevMultiplier: v })}
              min={1} max={3} step={0.1}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label>Z-Score Entry: {config.zScoreEntry}</Label>
            <Slider
              value={[config.zScoreEntry]}
              onValueChange={([v]) => setConfig({ ...config, zScoreEntry: v })}
              min={1} max={4} step={0.1}
            />
          </CardContent>
        </Card>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">RSI</div>
            <div className={cn("text-2xl font-bold", 
              (state?.rsi ?? 50) < 30 ? "text-green-500" : 
              (state?.rsi ?? 50) > 70 ? "text-red-500" : ""
            )}>
              {state?.rsi.toFixed(1) ?? "---"}
            </div>
            <div className="text-xs text-muted-foreground">
              Oversold: {config.rsiOversold} | Overbought: {config.rsiOverbought}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Z-Score</div>
            <div className={cn("text-2xl font-bold",
              Math.abs(state?.zScore ?? 0) > 2 ? "text-yellow-500" : ""
            )}>
              {state?.zScore.toFixed(2) ?? "---"}
            </div>
            <div className="text-xs text-muted-foreground">From mean</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Half-Life</div>
            <div className="text-2xl font-bold">
              {state?.halfLife.toFixed(0) ?? "---"}
            </div>
            <div className="text-xs text-muted-foreground">periods</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Signal</div>
            <Badge className={cn("text-base", getSignalBg(state?.signal ?? "NEUTRAL"))}>
              {state?.signal ?? "NEUTRAL"}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              Confidence: {((state?.confidence ?? 0) * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как работает Equilibrist</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Named after the art of maintaining balance - seeks equilibrium when prices deviate.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Bollinger Bands mean reversion</li>
            <li>RSI overbought/oversold detection</li>
            <li>Statistical z-score signals</li>
            <li>Ornstein-Uhlenbeck half-life estimation</li>
            <li>Volatility regime detection</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            Classic statistical mean reversion without ML black boxes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
