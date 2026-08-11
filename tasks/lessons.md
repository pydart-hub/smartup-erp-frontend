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
