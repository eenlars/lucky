export class SpendingTracker {
  private static instance: SpendingTracker
  private spend = 0
  private limit = 0
  private active = false
  private sdkSpend = 0 // Track SDK costs separately for reporting

  static getInstance(): SpendingTracker {
    if (!this.instance) this.instance = new SpendingTracker()
    return this.instance
  }

  initialize(limit: number): void {
    this.spend = 0
    this.sdkSpend = 0
    this.limit = limit
    this.active = true
  }

  addCost(cost: number): void {
    if (this.active) this.spend += cost
  }

  /**
   * Add cost from Claude Code SDK usage.
   * Tracks both in total spend and SDK-specific counter.
   *
   * @param cost Cost in USD from SDK usage
   * @param invocationId Optional workflow invocation ID for tracking
   */
  addSDKCost(cost: number, invocationId?: string): void {
    if (this.active) {
      this.spend += cost
      this.sdkSpend += cost
    }
  }

  canMakeRequest(): boolean {
    return !this.active || this.spend < this.limit
  }

  getStatus() {
    return {
      currentSpend: this.spend,
      spendingLimit: this.limit,
      sdkSpend: this.sdkSpend,
      customSpend: this.spend - this.sdkSpend,
    }
  }
}
