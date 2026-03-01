"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Gauge,
  Play,
  Pause,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Quote {
  side: "BID" | "ASK";
  price: number;
  quantity: number;
  spread: number;
  status: string;
}

interface InventoryState {
  quantity: number;
  avgPrice: number;
  unrealizedPnl: number;
  inventoryRisk: number;
}

interface ArchitectConfig {
  symbol: string;
  maxInventory: number;
  gamma: number;        // Risk aversion
  kappa: number;        // Order book intensity
  quoteQuantity: number;
  minSpreadPercent: number;
  maxSpreadMultiplier: number;
  inventorySkewFactor: number;
}

const DEFAULT_CONFIG: ArchitectConfig = {
  symbol: "BTCUSDT",
  maxInventory: 1.0,
  gamma: 0.1,
  kappa: 1.5,
  quoteQuantity: 0.01,
  minSpreadPercent: 0.01,
  maxSpreadMultiplier: 5,
  inventorySkewFactor: 0.1,
};

export function ArchitectBotManager() {
  const [config, setConfig] = useState<ArchitectConfig>(DEFAULT_CONFIG);
  const [isActive, setIsActive] = useState(false);
  const [inventory, setInventory] = useState<InventoryState>({
    quantity: 0,
    avgPrice: 0,
    unrealizedPnl: 0,
    inventoryRisk: 0,
  });
  const [quotes, setQuotes] = useState<{ bid: Quote | null; ask: Quote | null }>({
    bid: null,
    ask: null,
  });
  const [metrics, setMetrics] = useState({
    totalPnL: 0,
    spreadCaptured: 0,
    tradesCount: 0,
    winRate: 0,
    toxicityScore: 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" />
            Architect
            <span className="text-sm font-normal text-muted-foreground">(Market Maker)</span>
          </h2>
          <p className="text-muted-foreground">
            Institutional Market Maker с Avellaneda-Stoikov optimal spread model
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "outline"} className={isActive ? "bg-green-500" : ""}>
            {isActive ? "Quoting" : "Stopped"}
          </Badge>
          <Button onClick={() => setIsActive(!isActive)} variant="outline">
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? "Стоп" : "Старт"}
          </Button>
        </div>
      </div>

      {/* Current Quotes */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">BID (Покупка)</div>
                <div className="text-2xl font-bold text-green-500">
                  {quotes.bid?.price.toFixed(2) || "---"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Qty: {quotes.bid?.quantity || 0}</div>
                <div className="text-xs text-muted-foreground">
                  Spread: {quotes.bid?.spread.toFixed(4) || 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">ASK (Продажа)</div>
                <div className="text-2xl font-bold text-red-500">
                  {quotes.ask?.price.toFixed(2) || "---"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Qty: {quotes.ask?.quantity || 0}</div>
                <div className="text-xs text-muted-foreground">
                  Spread: {quotes.ask?.spread.toFixed(4) || 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory State</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Position</div>
            <div className={cn("text-xl font-bold", inventory.quantity >= 0 ? "text-green-500" : "text-red-500")}>
              {inventory.quantity.toFixed(4)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Avg Price</div>
            <div className="text-xl font-bold">${inventory.avgPrice.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Unrealized PnL</div>
            <div className={cn("text-xl font-bold", inventory.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500")}>
              ${inventory.unrealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Risk Score</div>
            <div className="text-xl font-bold">{(inventory.inventoryRisk * 100).toFixed(0)}%</div>
          </div>
        </CardContent>
      </Card>

      {/* Avellaneda-Stoikov Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avellaneda-Stoikov Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>γ (Risk Aversion): {config.gamma}</Label>
            <Slider
              value={[config.gamma]}
              onValueChange={([v]) => setConfig({ ...config, gamma: v })}
              min={0.01} max={0.5} step={0.01}
            />
          </div>
          <div className="space-y-2">
            <Label>κ (Order Book Intensity): {config.kappa}</Label>
            <Slider
              value={[config.kappa]}
              onValueChange={([v]) => setConfig({ ...config, kappa: v })}
              min={0.5} max={5} step={0.1}
            />
          </div>
          <div className="space-y-2">
            <Label>Inventory Skew: {config.inventorySkewFactor}</Label>
            <Slider
              value={[config.inventorySkewFactor]}
              onValueChange={([v]) => setConfig({ ...config, inventorySkewFactor: v })}
              min={0} max={0.5} step={0.01}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Inventory (BTC)</Label>
            <Input
              type="number"
              value={config.maxInventory}
              onChange={(e) => setConfig({ ...config, maxInventory: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Quote Size (BTC)</Label>
            <Input
              type="number"
              value={config.quoteQuantity}
              onChange={(e) => setConfig({ ...config, quoteQuantity: parseFloat(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Total PnL</div>
            <div className={cn("text-lg font-bold", metrics.totalPnL >= 0 ? "text-green-500" : "text-red-500")}>
              ${metrics.totalPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Spread Captured</div>
            <div className="text-lg font-bold">{metrics.spreadCaptured.toFixed(4)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Trades</div>
            <div className="text-lg font-bold">{metrics.tradesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-lg font-bold">{(metrics.winRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">Toxicity</div>
            <div className={cn("text-lg font-bold", metrics.toxicityScore > 0.6 ? "text-red-500" : "text-green-500")}>
              {(metrics.toxicityScore * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Avellaneda-Stoikov Model
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Optimal market making model minimizing inventory risk:</p>
          <div className="bg-muted/50 p-2 rounded font-mono text-xs">
            spread = γ * σ² * T + 2/κ * ln(1 + γ/κ)
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>Inventory skew для управления позицией</li>
            <li>Adverse selection protection</li>
            <li>Volatility-adjusted quoting</li>
            <li>Circuit breakers при высокой toxicity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
