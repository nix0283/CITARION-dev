"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Activity,
  BarChart3,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendState {
  symbol: string;
  currentPrice: number;
  direction: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  strength: "WEAK" | "MODERATE" | "STRONG";
  adx: number;
  sma20: number;
  sma50: number;
  sma200: number;
  donchianUpper: number;
  donchianLower: number;
  parabolicSAR: number;
  atr: number;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
}

interface KronConfig {
  smaPeriods: number[];
  adxPeriod: number;
  adxThreshold: number;
  donchianPeriod: number;
  atrPeriod: number;
  atrMultiplier: number;
  psarStep: number;
  psarMax: number;
  pyramidEnabled: boolean;
  maxPyramids: number;
}

const DEFAULT_CONFIG: KronConfig = {
  smaPeriods: [20, 50, 200],
  adxPeriod: 14,
  adxThreshold: 25,
  donchianPeriod: 20,
  atrPeriod: 14,
  atrMultiplier: 2.0,
  psarStep: 0.02,
  psarMax: 0.2,
  pyramidEnabled: false,
  maxPyramids: 3,
};

export function KronBotManager() {
  const [config, setConfig] = useState<KronConfig>(DEFAULT_CONFIG);
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<TrendState | null>(null);
  const [positions, setPositions] = useState<any[]>([]);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "UPTREND": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "DOWNTREND": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "UPTREND": return "text-green-500";
      case "DOWNTREND": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "STRONG": return "bg-green-500";
      case "MODERATE": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Kron
            <span className="text-sm font-normal text-muted-foreground">(Trend Following)</span>
          </h2>
          <p className="text-muted-foreground">
            Named after the titan of time - captures trends across timeframes
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

      {/* Trend State */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {state ? getDirectionIcon(state.direction) : <Activity className="h-4 w-4" />}
            Текущее состояние тренда
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">Direction</div>
              <div className={cn("text-lg font-bold flex items-center justify-center gap-1", 
                state ? getDirectionColor(state.direction) : ""
              )}>
                {state ? getDirectionIcon(state.direction) : null}
                {state?.direction ?? "---"}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">Strength</div>
              <div className="flex items-center justify-center gap-2">
                <Badge className={state ? getStrengthColor(state.strength) : ""}>
                  {state?.strength ?? "---"}
                </Badge>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">ADX</div>
              <div className={cn("text-lg font-bold",
                (state?.adx ?? 0) > 25 ? "text-green-500" : ""
              )}>
                {state?.adx.toFixed(1) ?? "---"}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">Signal</div>
              <Badge variant={state?.signal === "BUY" ? "default" : state?.signal === "SELL" ? "destructive" : "outline"}
                className={state?.signal === "BUY" ? "bg-green-500" : ""}>
                {state?.signal ?? "HOLD"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moving Averages */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">SMA 20</div>
            <div className="text-xl font-bold">${state?.sma20.toFixed(2) ?? "---"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">SMA 50</div>
            <div className="text-xl font-bold">${state?.sma50.toFixed(2) ?? "---"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">SMA 200</div>
            <div className="text-xl font-bold">${state?.sma200.toFixed(2) ?? "---"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Donchian & PSAR */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Donchian Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Upper:</span>
              <span className="font-mono">${state?.donchianUpper.toFixed(2) ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lower:</span>
              <span className="font-mono">${state?.donchianLower.toFixed(2) ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-mono">${state?.currentPrice.toFixed(2) ?? "---"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parabolic SAR & ATR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PSAR:</span>
              <span className="font-mono">${state?.parabolicSAR.toFixed(2) ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ATR:</span>
              <span className="font-mono">${state?.atr.toFixed(2) ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ATR %:</span>
              <span className="font-mono">
                {state ? ((state.atr / state.currentPrice) * 100).toFixed(2) : "---"}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>ADX Threshold: {config.adxThreshold}</Label>
            <Slider
              value={[config.adxThreshold]}
              onValueChange={([v]) => setConfig({ ...config, adxThreshold: v })}
              min={15} max={40} step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Donchian Period: {config.donchianPeriod}</Label>
            <Slider
              value={[config.donchianPeriod]}
              onValueChange={([v]) => setConfig({ ...config, donchianPeriod: v })}
              min={10} max={55} step={5}
            />
          </div>
          <div className="space-y-2">
            <Label>ATR Multiplier: {config.atrMultiplier}</Label>
            <Slider
              value={[config.atrMultiplier]}
              onValueChange={([v]) => setConfig({ ...config, atrMultiplier: v })}
              min={1} max={4} step={0.1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как работает Kron</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Named after the titan of time - captures trends across timeframes using classical momentum.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Multiple moving average systems (SMA, EMA)</li>
            <li>ADX trend strength filtering</li>
            <li>Donchian channel breakouts</li>
            <li>Parabolic SAR trailing stops</li>
            <li>Position pyramid option</li>
            <li>Volatility-adjusted position sizing</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            Uses classical momentum and trend indicators - no neural networks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
