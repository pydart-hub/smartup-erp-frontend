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
