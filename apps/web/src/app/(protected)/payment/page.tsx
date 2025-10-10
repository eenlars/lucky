"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Download } from "lucide-react"
import { useState } from "react"
import { RollingNumber } from "./components/rolling-number"

const PRESET_AMOUNTS = [10, 25, 50, 100]

interface Transaction {
  id: string
  date: string
  amount: number
  invoice: string
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", date: "2 months ago", amount: 20, invoice: "inv_001" },
  { id: "2", date: "2 months ago", amount: 10, invoice: "inv_002" },
  { id: "3", date: "2 months ago", amount: 40, invoice: "inv_003" },
  { id: "4", date: "2 months ago", amount: 9, invoice: "inv_004" },
  { id: "5", date: "3 months ago", amount: 20, invoice: "inv_005" },
]

export default function PaymentPage() {
  const [amount, setAmount] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(125.5)
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false)

  const handlePresetClick = (value: number) => {
    setAmount(value.toString())
  }

  const handleTopUp = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) return

    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setCurrentBalance(prev => prev + Number.parseFloat(amount))
    setIsProcessing(false)
    setAmount("")
  }

  const isValidAmount = amount && Number.parseFloat(amount) > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 max-w-5xl mx-auto">
          <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            <h1 className="relative text-4xl font-light tracking-tight text-foreground">Payment</h1>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl">Manage your credits and billing preferences</p>
        </div>

        {/* Credits Display */}
        <div className="mb-12 max-w-5xl mx-auto">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Credits</h2>
          <RollingNumber value={currentBalance} />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] max-w-5xl mx-auto">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Buy Credits */}
            <Card className="border-border/50 shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Buy Credits</CardTitle>
                <CardDescription>Add credits to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium text-foreground">
                    Amount (USD)
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="text-base h-10"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Preset Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={cn(
                        "px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        amount === preset.toString()
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border text-foreground hover:border-foreground/40 hover:bg-muted/50",
                      )}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                {/* Payment Button */}
                <Button onClick={handleTopUp} disabled={!isValidAmount || isProcessing} size="lg" className="w-full">
                  {isProcessing ? (
                    <>
                      <div className="size-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Add ${amount || "0.00"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border-border/50 shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
                <CardDescription>Payment History</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                    <div>Date</div>
                    <div className="text-right">Credits</div>
                    <div className="w-24 text-right">Invoice</div>
                  </div>

                  {/* Transactions */}
                  {MOCK_TRANSACTIONS.map(transaction => (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2.5 text-sm hover:bg-muted/50 rounded-md transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    >
                      <div className="text-muted-foreground">{transaction.date}</div>
                      <div className="text-right font-medium tabular-nums text-foreground">${transaction.amount}</div>
                      <div className="w-24 text-right">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] inline-flex items-center gap-1"
                        >
                          <Download className="size-3" />
                          Get invoice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Auto Top-Up */}
            <Card className="border-border/50 shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">Auto Top-Up</CardTitle>
                  <Switch checked={autoTopUpEnabled} onCheckedChange={setAutoTopUpEnabled} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatically purchase credits when your balance falls below a threshold.
                </p>
                {autoTopUpEnabled && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <label htmlFor="threshold" className="text-xs font-medium text-foreground">
                        Threshold Amount
                      </label>
                      <Input
                        id="threshold"
                        type="number"
                        placeholder="10.00"
                        defaultValue="10"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="topup-amount" className="text-xs font-medium text-foreground">
                        Top-Up Amount
                      </label>
                      <Input
                        id="topup-amount"
                        type="number"
                        placeholder="25.00"
                        defaultValue="25"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Usage */}
            <Card className="border-border/50 shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-start text-sm">
                  View Usage
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
