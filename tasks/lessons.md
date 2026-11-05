# Lessons Learned

## Framer Motion: Conditional Child Rendering and Variant Propagation

### Problem
When a child `motion.div` is conditionally rendered (e.g. `{!isLoading && <motion.div variants={item}>}`) inside a parent `motion.div` that propagates variants (`initial="hidden" animate="show"`), the child will remain invisible (stuck in `initial` state) if it mounts *after* the parent has already completed its transition.

### Solution
Instead of relying on variant propagation (`variants={item}`) for conditionally mounted components, always use explicit inline animation properties on the conditional child:
```typescript
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, ease: "easeOut" }}
>
```
This forces Framer Motion to animate the element independently when it is mounted to the DOM.

## Frappe DocStatus & React Query Form Guarding

### Problem
1. When submitting Frappe DocTypes (like `Assessment Result`), documents created via API start in Draft (`docstatus: 0`) and require submission (`docstatus: 1`). If code filters queries with `docstatus = 1`, any record where submission failed or is pending becomes invisible to the UI, leading users to believe marks were not entered or were lost.
2. In React Query, if a form syncs server data into local state via `useEffect([data])`, window refocus or network revalidation will silently overwrite user input fields while the user is actively typing.

### Solution
1. Always query `filters: [["docstatus", "!=", 2]]` so drafts are visible and can be displayed or auto-healed.
2. Maintain a `dirtyRef = useRef<Set<string>>(new Set())` to track modified rows, and only sync server query data for untouched rows during background refetches. Never delete existing documents prior to verifying new document creation and submission.

## UI Calculation vs Display Variable Synchronization in Timing Systems

### Problem
When calculating metrics (such as late minutes against scheduled class time) while simultaneously displaying the comparison time in the UI (e.g. `Xm late (vs Y)`), using different source variables for the calculation and the display creates glaring inconsistencies (e.g. calculating against global 5:00 PM while displaying session 6:00 PM -> "60m late vs 06:00 PM"). Furthermore, global mode defaults must never discard or overwrite explicit per-item/per-session overrides entered by the user.

### Solution
1. Unify the computation and label under a single source of truth variable (e.g. `effectiveSessClassTime`), guaranteeing that whatever appears in `(vs {formatTo12Hour(...)})` is mathematically identical to the value used in the difference algorithm.
2. In session lists, prioritize `session.class_time` first before falling back to global or branch-level defaults.
3. Ensure save payloads persist the item's explicit session time rather than falling back to global variables when saving.
