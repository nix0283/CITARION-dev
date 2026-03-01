"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeftRight,
  Play,
  Pause,
  RefreshCw,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CorrelatedPair {
  asset1: string;
  asset2: string;
  correlation: number;
  spread: number;
  spreadZScore: number;
  hedgeRatio: number;
  halfLife: number;
  regime: string;
}

interface SpectrumConfig {
  minCorrelation: number;
  maxCorrelation: number;
  lookbackPeriods: number;
  entryZScore: number;
  exitZScore: number;
  maxPositions: number;
}

const DEFAULT_CONFIG: SpectrumConfig = {
  minCorrelation: 0.6,
  maxCorrelation: 0.95,
  lookbackPeriods: 60,
  entryZScore: 2.0,
  exitZScore: 0.5,
  maxPositions: 5,
};

export function SpectrumBotManager() {
  const [config, setConfig] = useState<SpectrumConfig>(DEFAULT_CONFIG);
  const [pairs, setPairs] = useState<CorrelatedPair[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const runScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/bots/spectrum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", config }),
      });
      const data = await response.json();
      if (data.success) {
        setPairs(data.pairs || []);
        toast.success(`Найдено ${data.pairs?.length || 0} пар`);
      }
    } catch (error) {
      toast.error("Ошибка сканирования");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Spectrum
            <span className="text-sm font-normal text-muted-foreground">(Pairs Trading)</span>
          </h2>
          <p className="text-muted-foreground">
            Торговля коррелирующими активами на основе statistical relationships
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

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Мин. Корреляция: {config.minCorrelation}</Label>
            <Slider
              value={[config.minCorrelation]}
              onValueChange={([v]) => setConfig({ ...config, minCorrelation: v })}
              min={0.3} max={0.9} step={0.05}
            />
          </div>
          <div className="space-y-2">
            <Label>Entry Z-Score: {config.entryZScore}</Label>
            <Slider
              value={[config.entryZScore]}
              onValueChange={([v]) => setConfig({ ...config, entryZScore: v })}
              min={1} max={4} step={0.1}
            />
          </div>
          <div className="space-y-2">
            <Label>Exit Z-Score: {config.exitZScore}</Label>
            <Slider
              value={[config.exitZScore]}
              onValueChange={([v]) => setConfig({ ...config, exitZScore: v })}
              min={0.1} max={1.5} step={0.1}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={runScan} disabled={isScanning} className="w-full">
        {isScanning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
        {isScanning ? "Анализ..." : "Найти коррелирующие пары"}
      </Button>

      {/* Pairs List */}
      {pairs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Коррелирующие пары</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pairs.map((pair, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pair.asset1} / {pair.asset2}</span>
                    <Badge variant="outline">Corr: {pair.correlation.toFixed(2)}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Hedge Ratio: {pair.hedgeRatio.toFixed(3)} | Half-Life: {pair.halfLife.toFixed(0)} periods
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-bold", pair.spreadZScore > 0 ? "text-red-500" : "text-green-500")}>
                    Z: {pair.spreadZScore.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">{pair.regime}</div>
                </div>
                <Button size="sm" variant="outline">
                  Открыть
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как работает Spectrum</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Spectrum находит коррелирующие активы и торгует их spread.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Rolling correlation analysis</li>
            <li>Spread trading с z-score triggers</li>
            <li>Dynamic hedge ratio (OLS)</li>
            <li>Correlation regime detection</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            No ML - pure correlation/cointegration based signals.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
