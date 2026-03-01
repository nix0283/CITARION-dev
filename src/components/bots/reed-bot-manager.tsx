"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sigma,
  Play,
  Pause,
  RefreshCw,
  Activity,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Pair {
  asset1: string;
  asset2: string;
  hedgeRatio: number;
  halfLife: number;
  adfPValue: number;
  status: string;
}

interface SpreadMetrics {
  zScore: number;
  hurstExponent: number;
  varianceRatio: number;
}

interface ReedConfig {
  minCorrelation: number;
  minAdfPValue: number;
  minHalfLife: number;
  maxHalfLife: number;
  entryZScore: number;
  exitZScore: number;
  hedgeMethod: "OLS" | "TLS" | "KALMAN" | "DYNAMIC";
}

const DEFAULT_CONFIG: ReedConfig = {
  minCorrelation: 0.7,
  minAdfPValue: 0.05,
  minHalfLife: 5,
  maxHalfLife: 100,
  entryZScore: 2.0,
  exitZScore: 0.5,
  hedgeMethod: "KALMAN",
};

export function ReedBotManager() {
  const [config, setConfig] = useState<ReedConfig>(DEFAULT_CONFIG);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sigma className="h-6 w-6 text-primary" />
            Reed
            <span className="text-sm font-normal text-muted-foreground">(Statistical Arbitrage)</span>
          </h2>
          <p className="text-muted-foreground">
            Mean-reverting стратегии с classical statistics
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
            <Label>ADF p-value: {config.minAdfPValue}</Label>
            <Slider
              value={[config.minAdfPValue]}
              onValueChange={([v]) => setConfig({ ...config, minAdfPValue: v })}
              min={0.01} max={0.1} step={0.01}
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
            <Label>Max Half-Life: {config.maxHalfLife}</Label>
            <Slider
              value={[config.maxHalfLife]}
              onValueChange={([v]) => setConfig({ ...config, maxHalfLife: v })}
              min={20} max={200} step={10}
            />
          </div>
        </CardContent>
      </Card>

      {/* Methods Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm font-medium">ADF Test</div>
            <div className="text-xs text-muted-foreground">Augmented Dickey-Fuller</div>
            <Badge variant="outline" className="mt-2">Stationarity</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm font-medium">Johansen</div>
            <div className="text-xs text-muted-foreground">Cointegration Rank</div>
            <Badge variant="outline" className="mt-2">Multi-asset</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm font-medium">Kalman Filter</div>
            <div className="text-xs text-muted-foreground">Dynamic Hedge</div>
            <Badge variant="outline" className="mt-2">Adaptive</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm font-medium">Hurst Exponent</div>
            <div className="text-xs text-muted-foreground">Mean Reversion</div>
            <Badge variant="outline" className="mt-2">H &lt; 0.5</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как работает Reed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Named after the flexible and resilient plant - thrives in mean-reverting environments.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Engle-Granger cointegration testing (ADF)</li>
            <li>Johansen test for multiple assets</li>
            <li>Z-score based entry/exit signals</li>
            <li>Half-life estimation (Ornstein-Uhlenbeck)</li>
            <li>Dynamic hedge ratio (OLS, TLS, Kalman Filter)</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            No ML/Neural Networks - Pure classical statistics
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
