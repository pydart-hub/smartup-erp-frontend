# Task: Weekly Mentor Student Call Tracking & Pending Indicators

- [ ] 1. Add `checkWeeklyCallStatus` utility to evaluate if a student was called in the last 7 days / this week <!-- id: 1 -->
- [ ] 2. Update `drilldownRows` in `MentorFeedbackReport.tsx` to ensure all active assignments and feedback are merged <!-- id: 2 -->
- [ ] 3. Compute `pendingCallsCount` and `calledStudentsCount` for each mentor in `mentorGroups` <!-- id: 3 -->
- [ ] 4. Compute `pendingCallsCount` for each branch in `branchGroups` and global total pending calls <!-- id: 4 -->
- [ ] 5. Update UI in `MentorFeedbackReport.tsx`: <!-- id: 5 -->
  - Top summary cards: Add "Weekly Calls Pending" KPI card
  - Level 1 Branch Cards: Add "Pending Calls" stat box & alert badge
  - Level 2 Mentor Cards: Add "Pending Calls" stat box & alert badge
  - Level 3 Student Table: Add "Weekly Call Status" column with Called/Not Called badge & filter dropdown
- [ ] 6. Also pass `assignmentsEndpoint="/api/branch-manager/mentor-assignments"` in `BranchManagerMentorsFeedbackPage` <!-- id: 6 -->
- [ ] 7. Verify with `npx tsc --noEmit` <!-- id: 7 -->
- [ ] 8. Verify UI in browser via `browser_subagent` <!-- id: 8 -->

## Review & Verification Results
(To be updated upon completion)
