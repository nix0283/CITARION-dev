"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  RefreshCw,
  Activity,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BasisOpportunity {
  spotSymbol: string;
  futuresSymbol: string;
  exchange: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisPercent: number;
  fundingRate: number;
  expectedReturn: number;
  arbType: string;
  confidence: number;
}

interface ArbPosition {
  id: string;
  spotQuantity: number;
  futuresQuantity: number;
  spotEntryPrice: number;
  futuresEntryPrice: number;
  entryBasis: number;
  currentBasis: number;
  unrealizedPnl: number;
  fundingCaptured: number;
  status: string;
}

interface OrionConfig {
  minBasisPercent: number;
  minFundingRate: number;
  maxExpiryDays: number;
  minCapital: number;
  maxCapital: number;
  targetReturnPercent: number;
  stopLossPercent: number;
  exchanges: string[];
}

const DEFAULT_CONFIG: OrionConfig = {
  minBasisPercent: 0.5,
  minFundingRate: 0.001,
  maxExpiryDays: 90,
  minCapital: 1000,
  maxCapital: 50000,
  targetReturnPercent: 15,
  stopLossPercent: 1.0,
  exchanges: ["binance", "bybit", "okx"],
};

export function OrionBotManager() {
  const [config, setConfig] = useState<OrionConfig>(DEFAULT_CONFIG);
  const [opportunities, setOpportunities] = useState<BasisOpportunity[]>([]);
  const [positions, setPositions] = useState<ArbPosition[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [scanInterval, setScanInterval] = useState(60);

  const runScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/bots/orion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", config }),
      });
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
        toast.success(`Найдено ${data.opportunities?.length || 0} возможностей`);
      }
    } catch (error) {
      toast.error("Ошибка сканирования");
    } finally {
      setIsScanning(false);
    }
  };

  const executeArb = async (opportunity: BasisOpportunity, capital: number) => {
    try {
      const response = await fetch("/api/bots/orion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", opportunity, capital }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Arbitrage позиция открыта");
        setPositions(prev => [...prev, data.position]);
      }
    } catch (error) {
      toast.error("Ошибка исполнения");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Orion
            <span className="text-sm font-normal text-muted-foreground">(Cash-and-Carry Arbitrage)</span>
          </h2>
          <p className="text-muted-foreground">
            Risk-free arbitrage между спотовым и фьючерсным рынками
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

      {/* Config Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Мин. Basis %</Label>
            <Input
              type="number"
              value={config.minBasisPercent}
              onChange={(e) => setConfig({ ...config, minBasisPercent: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Мин. Funding Rate</Label>
            <Input
              type="number"
              step="0.0001"
              value={config.minFundingRate}
              onChange={(e) => setConfig({ ...config, minFundingRate: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Мин. Капитал (USDT)</Label>
            <Input
              type="number"
              value={config.minCapital}
              onChange={(e) => setConfig({ ...config, minCapital: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Макс. Капитал (USDT)</Label>
            <Input
              type="number"
              value={config.maxCapital}
              onChange={(e) => setConfig({ ...config, maxCapital: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scan Button */}
      <div className="flex gap-2">
        <Button onClick={runScan} disabled={isScanning} className="flex-1">
          {isScanning ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          {isScanning ? "Сканирование..." : "Сканировать возможности"}
        </Button>
      </div>

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Найденные возможности</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunities.map((opp, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{opp.spotSymbol}</span>
                    <Badge variant="outline">{opp.arbType}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Spot: ${opp.spotPrice.toFixed(2)} | Futures: ${opp.futuresPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-500">+{opp.expectedReturn.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground">Basis: {opp.basisPercent.toFixed(2)}%</div>
                </div>
                <Button size="sm" onClick={() => executeArb(opp, config.minCapital)}>
                  Исполнить
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Positions */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Активные позиции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {positions.map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={pos.unrealizedPnl >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
                      {pos.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Entry Basis: {pos.entryBasis.toFixed(2)}% | Current: {pos.currentBasis.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-bold", pos.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500")}>
                    ${pos.unrealizedPnl.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Funding: ${pos.fundingCaptured.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Как работает Orion
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Orion ищет risk-free возможности arbitrage между спотовым и фьючерсным рынками.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Cash-and-Carry:</strong> Покупка спот + продажа фьючерса с премией</li>
            <li><strong>Reverse Cash-and-Carry:</strong> Продажа спот + покупка фьючерса с дисконтом</li>
            <li><strong>Funding Arbitrage:</strong> Захват funding rate при благоприятных условиях</li>
          </ul>
          <p className="text-xs italic mt-2 text-primary/70">
            Named after the hunter constellation - captures risk-free profit across markets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
