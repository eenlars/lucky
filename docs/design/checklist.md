# Design Principles Checklist

A practical checklist for evaluating designs against timeless principles. Use this before finalizing any interface component or feature.

**CRITICAL: These checkboxes must ALWAYS remain unchecked.** They serve as perpetual reminders that good design is never finished—it's a continuous pursuit of excellence. Every time you review this list, the unchecked boxes remind you to keep questioning, keep refining, keep improving.

---

## 1. Good design is innovative

**The possibilities for innovation are not exhausted. Technology enables new opportunities, but innovation develops with technology—never as an end in itself.**

- [ ] Does this solve a problem in a novel way?
- [ ] Is the innovation driven by user needs or technology capabilities?
- [ ] Does it improve upon existing patterns, or just differ for difference's sake?
- [ ] Will users understand why this approach is better?

---

## 2. Good design makes a product useful

**Products must satisfy functional, psychological, and aesthetic criteria. Design emphasizes usefulness while removing anything that detracts from it.**

- [ ] Does every element serve a clear purpose?
- [ ] Can users accomplish their goals without friction?
- [ ] Is beauty a consequence of usefulness, not a replacement for it?
- [ ] Are there decorative elements that could be removed without losing function?

---

## 3. Good design is aesthetic

**Aesthetic quality is integral to usefulness. Products we use daily affect our wellbeing. Only well-executed objects can be beautiful.**

- [ ] Are proportions mathematically justified and visually balanced?
- [ ] Do spacing ratios create natural rhythm?
- [ ] Are font sizes and weights related proportionally?
- [ ] Have optical corrections been applied where math looks wrong?
- [ ] Does the design feel calm and composed?

---

## 4. Good design makes a product understandable

**Design clarifies structure. At best, it makes the product self-explanatory.**

- [ ] Can users understand what this does without explanation?
- [ ] Is the hierarchy immediately clear?
- [ ] Do interactive elements look interactive?
- [ ] Are states (active, disabled, loading) obvious?
- [ ] If tooltips or help text are needed, should the design be reconsidered?

---

## 5. Good design is unobtrusive

**Products are tools, not decorative objects. Design should be neutral and restrained, leaving room for user self-expression.**

- [ ] Does the UI recede during use, letting content be primary?
- [ ] Are interactions appropriately subtle or prominent based on context?
- [ ] Does the design support focus on the user's task?
- [ ] Are animations purposeful rather than decorative?

---

## 6. Good design is honest

**Design doesn't make products seem more valuable than they are. It doesn't manipulate with unkept promises.**

- [ ] Do components look like what they do?
- [ ] Are materials and interactions honest (no fake physics unless it aids understanding)?
- [ ] Is there fake depth on flat screens without serving hierarchy?
- [ ] Does the design accurately represent capabilities?

---

## 7. Good design is long-lasting

**It avoids fashion and never appears antiquated. It lasts many years—even in throwaway society.**

- [ ] Is this based on timeless principles rather than current trends?
- [ ] Will this feel dated in 10 years? If yes, why?
- [ ] Does it prioritize proportion over fashion?
- [ ] Does it use contrast over trendy color palettes?
- [ ] Is structure more important than effects?

---

## 8. Good design is thorough down to the last detail

**Nothing is arbitrary or left to chance. Care and accuracy show respect toward users.**

- [ ] Is every CSS property justified and documented?
- [ ] Do measurements follow the design scale (no arbitrary values)?
- [ ] Are icons optically centered (not just mathematically centered)?
- [ ] Are corner radii proportional to container height?
- [ ] Are font weights adjusted for different sizes?
- [ ] Are transition durations based on perception thresholds (typically 200ms)?
- [ ] Does it work at 200% zoom?

---

## 9. Good design is feeling

**Good design creates emotion—feeling good, feeling productive, feeling something you have never felt before.**

- [ ] Does this create the right emotional tone for the context?
- [ ] Do interactions feel responsive and alive?
- [ ] Does the experience feel crafted with care?
- [ ] Will users feel confident and in control?
- [ ] Does it create delight through usefulness, not decoration?

---

## 10. Good design is as little design as possible

**Less, but better. Design concentrates on essentials—products are not burdened with non-essentials. Back to purity, back to simplicity. But functionality must be preserved.**

- [ ] Can this element be removed and functionality still works? (If yes, consider removing)
- [ ] Does this serve the user? (If yes, keep and perfect it)
- [ ] Is this here because "it looks nice"? (Justify or remove)
- [ ] Is every detail intentional?
- [ ] Have we removed arbitrary decisions?
- [ ] Is this the minimum design necessary to solve the problem well?

---

## Universal Accessibility & Quality Standards

Every component must meet these baseline standards:

- [ ] Keyboard navigable
- [ ] Screen reader accessible
- [ ] Respects `prefers-reduced-motion`
- [ ] Respects `prefers-color-scheme`
- [ ] Respects `prefers-contrast`
- [ ] Works without JavaScript (progressive enhancement)
- [ ] Tested at 200% zoom
- [ ] Color contrast meets WCAG AA minimum
- [ ] Touch targets are minimum 44×44px on mobile

---

## Decision Documentation

For every component, answer:

1. **Why does this exist?** (serves user need X)
2. **Why this value?** (measurement justified by perception/context)
3. **Why not alternatives?** (decision tree showing when to use what)
4. **Will this last?** (timeless principle, not trend)
5. **Is it thorough?** (optical corrections applied)
6. **Is it accessible?** (everyone can use it)
7. **Is it honest?** (looks like what it does)
8. **Is it unobtrusive?** (fades appropriately during use)

---

## Usage

**Before committing any design work:**
1. Review this checklist
2. Question each principle honestly
3. Address weaknesses you discover
4. Document your decisions in component files or design docs

**NEVER check the boxes.** They remain unchecked as a reminder that design excellence is a journey, not a destination. The moment you think you've achieved perfection is the moment you stop improving.

**This is not a mandate to delete—this is a mandate to be intentional.**

*"Weniger, aber besser. Less, but better. Not 'less' alone."*
— Dieter Rams
