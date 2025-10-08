# Auto-Demo Rollout & Measurement Plan

**Feature:** Auto-run first demo on homepage for new users
**Target:** 10× user happiness through instant value delivery
**Timeline:** 48-hour measurement window

---

## Rollout Strategy

### Phase 1: Internal Testing (Day 0, Hours 0-4)

**Setup:**
```bash
# Set environment variable to enable feature flag
export NEXT_PUBLIC_AUTO_RUN_DEMO=true
```

**Testing Checklist:**
- [ ] Clear localStorage and verify demo auto-runs
- [ ] Verify loading state shows within 500ms
- [ ] Verify success state appears after demo completes
- [ ] Test error handling with missing API key
- [ ] Verify returning users see normal QuickStartCard
- [ ] Check page load performance (FCP < 1.5s)
- [ ] Confirm analytics events are tracked correctly

**Pass Criteria:**
- All acceptance tests pass (see mini-PRD)
- No console errors
- Page load time < 1.5s (95th percentile)

---

### Phase 2: 25% Rollout (Day 1, Hours 4-28)

**Implementation:**
- Feature flag enabled in production
- 25% of new sessions randomly assigned to treatment group
- Assignment persisted in localStorage for consistency

**Monitoring:**
Monitor every 4 hours for first 24 hours:

```bash
# Access analytics dashboard or run measurement script
bun run measure:auto-demo
```

**Key Metrics to Track:**

| Metric | Baseline (Control) | Target (Treatment) | Actual (Treatment) |
|--------|-------------------|-------------------|-------------------|
| Time-to-first-success | 45-90s | 5-10s | _measure_ |
| First-session success rate | ~40% | 85% | _measure_ |
| Error rate | <2% | <5% | _measure_ |
| API key setup clicks | ~10% | >30% | _measure_ |
| Create workflow clicks | ~15% | >40% | _measure_ |

**Rollback Triggers:**
- Error rate > 10% → Immediate rollback
- Page load time > 2.5s (95th percentile) → Immediate rollback
- User complaints > 5 in 24h → Manual review + potential rollback
- Success rate < baseline → Rollback after investigation

---

### Phase 3: Decision Point (Day 2, Hour 28)

**Analysis Required:**

1. **Statistical Significance Test:**
   - Use two-proportion z-test for success rate
   - p < 0.05 required for significance
   - Calculate confidence intervals for time metrics

2. **Impact Assessment:**
   ```
   Time-to-first-success reduction:
   - Expected: -80% (70 seconds faster)
   - Threshold: -50% minimum for success

   Success rate improvement:
   - Expected: +45 pp (40% → 85%)
   - Threshold: +15 pp minimum for success
   ```

3. **Risk Check:**
   - Page load degradation: <10% increase allowed
   - Error rate: Must stay <5%
   - User sentiment: Check for negative feedback

**Decision Matrix:**

| Outcome | Action |
|---------|--------|
| Both metrics hit threshold + no risks | **Increase to 100%** |
| One metric hits threshold + no risks | **Hold at 25%, extend measurement to 72h** |
| Metrics neutral + no risks | **Rollback to 0%** |
| Any rollback trigger activated | **Immediate rollback to 0%** |

---

### Phase 4a: Full Rollout (If approved)

- Increase `isInTreatmentGroup(25)` → `isInTreatmentGroup(100)`
- Monitor for 24h
- If stable, remove A/B test code and make permanent

### Phase 4b: Rollback (If needed)

- Set `NEXT_PUBLIC_AUTO_RUN_DEMO=false`
- Clear A/B test assignments: localStorage key `ab_test_assignment`
- All users revert to normal QuickStartCard
- Conduct post-mortem analysis

---

## Measurement Scripts

### Calculate Metrics from Analytics

```typescript
// Run in browser console on production
import {
  calculateTimeToFirstSuccess,
  calculateSuccessRate,
  getTrackedEvents
} from '@/lib/analytics'

// Time to first success
const ttfs = calculateTimeToFirstSuccess()
console.log('Time to first success:', ttfs, 'ms')

// Success rate
const successRate = calculateSuccessRate()
console.log('Success rate:', successRate)

// All events
const events = getTrackedEvents()
console.log('All tracked events:', events)

// Treatment vs Control comparison
const treatments = events.filter(e => e.event === 'treatment_assigned').length
const controls = events.filter(e => e.event === 'control_assigned').length
console.log(`Treatment: ${treatments}, Control: ${controls}`)
```

### Export Data for Analysis

```typescript
// Export to CSV for statistical analysis
const events = getTrackedEvents()
const csv = events.map(e =>
  `${e.event},${e.timestamp},${e.duration_ms || ''},${e.error_message || ''}`
).join('\n')

console.log(csv)
// Copy and paste into analysis tool (Excel, R, Python)
```

---

## 48-Hour Impact Readout Template

**Date:** [YYYY-MM-DD]
**Measurement Window:** [Start] to [End]
**Total Sessions:** [N]
**Treatment Group:** [N] ([%])
**Control Group:** [N] ([%])

### Primary Metrics

| Metric | Control | Treatment | Delta | Threshold | Result |
|--------|---------|-----------|-------|-----------|--------|
| Time-to-first-success (median) | __s | __s | __% | -50% | ✅ / ❌ |
| Success rate | __% | __% | __ pp | +15 pp | ✅ / ❌ |

### Secondary Metrics

| Metric | Control | Treatment | Delta | Threshold | Result |
|--------|---------|-----------|-------|-----------|--------|
| Error rate | __% | __% | __ pp | <5% | ✅ / ❌ |
| API key setup clicks | __% | __% | __ pp | +20 pp | ✅ / ❌ |
| Create workflow clicks | __% | __% | __ pp | +25 pp | ✅ / ❌ |

### Risk Metrics

| Metric | Value | Threshold | Result |
|--------|-------|-----------|--------|
| Page load time (p95) | __s | <2.5s | ✅ / ❌ |
| Error rate | __% | <5% | ✅ / ❌ |
| User complaints | __ | <5 | ✅ / ❌ |

### Statistical Significance

- **Success rate z-test:** p = __ (threshold: <0.05)
- **Time reduction t-test:** p = __ (threshold: <0.05)
- **Confidence:** __% (threshold: >95%)

### Decision

**PROCEED** / **HOLD** / **ROLLBACK**

**Rationale:**
[Explain why based on data above]

### Next Steps

1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

---

## Notes & Learnings

- What worked well:
- What didn't work:
- Unexpected findings:
- Recommendations for future experiments:
