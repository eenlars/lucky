"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Activity, Clock, DollarSign, TrendingUp, Zap } from "lucide-react"
import { useEffect, useState } from "react"

interface ModelStats {
  model: string
  invocations: number
  totalCost: number
  avgCost: number
  totalDuration: number
  avgDuration: number
  successRate: number
}

interface ProviderStats {
  provider: string
  totalInvocations: number
  totalCost: number
  models: ModelStats[]
}

export default function ProvidersAnalyticsPage() {
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCost, setTotalCost] = useState(0)
  const [totalInvocations, setTotalInvocations] = useState(0)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const supabase = createClient()

      // Fetch node invocations with model data
      const { data: invocations, error } = await supabase
        .from("NodeInvocation")
        .select("model, usd_cost, start_time, end_time, status")
        .not("model", "is", null)
        .order("start_time", { ascending: false })
        .limit(1000)

      if (error) {
        console.error("Failed to load analytics:", error)
        setIsLoading(false)
        return
      }

      if (!invocations || invocations.length === 0) {
        setIsLoading(false)
        return
      }

      // Group by provider and model
      const statsMap = new Map<string, Map<string, ModelStats>>()
      let totalCostSum = 0
      let totalInvocationsCount = 0

      invocations.forEach(inv => {
        const model = inv.model as string
        const cost = inv.usd_cost || 0
        const startTime = new Date(inv.start_time)
        const endTime = inv.end_time ? new Date(inv.end_time) : null
        const duration = endTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 0
        const isSuccess = inv.status === "completed"

        // Determine provider from model name
        let provider = "openrouter"
        if (model.startsWith("openai/")) {
          provider = "openai"
        } else if (model.startsWith("groq/")) {
          provider = "groq"
        }

        if (!statsMap.has(provider)) {
          statsMap.set(provider, new Map())
        }

        const providerModels = statsMap.get(provider)!
        if (!providerModels.has(model)) {
          providerModels.set(model, {
            model,
            invocations: 0,
            totalCost: 0,
            avgCost: 0,
            totalDuration: 0,
            avgDuration: 0,
            successRate: 0,
          })
        }

        const modelStats = providerModels.get(model)!
        modelStats.invocations++
        modelStats.totalCost += cost
        modelStats.totalDuration += duration
        if (isSuccess) {
          modelStats.successRate++
        }

        totalCostSum += cost
        totalInvocationsCount++
      })

      // Calculate averages and format data
      const formattedStats: ProviderStats[] = []

      statsMap.forEach((models, provider) => {
        let providerTotalInvocations = 0
        let providerTotalCost = 0

        const modelStats: ModelStats[] = []

        models.forEach(stats => {
          stats.avgCost = stats.totalCost / stats.invocations
          stats.avgDuration = stats.totalDuration / stats.invocations
          stats.successRate = (stats.successRate / stats.invocations) * 100

          providerTotalInvocations += stats.invocations
          providerTotalCost += stats.totalCost

          modelStats.push(stats)
        })

        // Sort models by invocations
        modelStats.sort((a, b) => b.invocations - a.invocations)

        formattedStats.push({
          provider,
          totalInvocations: providerTotalInvocations,
          totalCost: providerTotalCost,
          models: modelStats,
        })
      })

      // Sort providers by total cost
      formattedStats.sort((a, b) => b.totalCost - a.totalCost)

      setProviderStats(formattedStats)
      setTotalCost(totalCostSum)
      setTotalInvocations(totalInvocationsCount)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount)
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 1) {
      return `${(seconds * 1000).toFixed(0)}ms`
    }
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "openai":
        return "🤖"
      case "groq":
        return "⚡"
      case "openrouter":
        return "🌐"
      default:
        return "📊"
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "openai":
        return "OpenAI"
      case "groq":
        return "Groq"
      case "openrouter":
        return "OpenRouter"
      default:
        return provider
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Provider Analytics</h1>
          <p className="text-sm text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Provider Analytics</h1>
        <p className="text-sm text-muted-foreground">Track model usage and costs across all providers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="size-4" />
              Total Invocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalInvocations.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Active Providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{providerStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="size-4" />
              Avg Cost/Call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {totalInvocations > 0 ? formatCurrency(totalCost / totalInvocations) : "$0.0000"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      {providerStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
            <p className="text-sm text-muted-foreground">
              Start using your workflows to see model usage analytics here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {providerStats.map(providerStat => (
            <Card key={providerStat.provider}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getProviderIcon(providerStat.provider)}</div>
                    <div>
                      <CardTitle>{getProviderName(providerStat.provider)}</CardTitle>
                      <CardDescription>
                        {providerStat.totalInvocations.toLocaleString()} invocations •{" "}
                        {formatCurrency(providerStat.totalCost)} total cost
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {providerStat.models.map(modelStat => (
                    <div key={modelStat.model} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-mono text-sm font-medium mb-1">{modelStat.model}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{modelStat.invocations.toLocaleString()} calls</span>
                            <span>•</span>
                            <span>{formatCurrency(modelStat.totalCost)} total</span>
                            <span>•</span>
                            <span>{modelStat.successRate.toFixed(1)}% success</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(modelStat.avgCost)}/call
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 border-t text-xs">
                        <div>
                          <div className="text-muted-foreground mb-1">Avg Duration</div>
                          <div className="font-medium flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDuration(modelStat.avgDuration)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Total Cost</div>
                          <div className="font-medium">{formatCurrency(modelStat.totalCost)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Invocations</div>
                          <div className="font-medium">{modelStat.invocations.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
