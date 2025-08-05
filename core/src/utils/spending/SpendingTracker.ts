export class SpendingTracker {
  private static instance: SpendingTracker
  private spend = 0
  private limit = 0
  private active = false

  static getInstance(): SpendingTracker {
    if (!this.instance) this.instance = new SpendingTracker()
    return this.instance
  }

  initialize(limit: number): void {
    this.spend = 0
    this.limit = limit
    this.active = true
  }

  addCost(cost: number): void {
    if (this.active) this.spend += cost
  }

  canMakeRequest(): boolean {
    return !this.active || this.spend < this.limit
  }

  getStatus() {
    return { currentSpend: this.spend, spendingLimit: this.limit }
  }
}
