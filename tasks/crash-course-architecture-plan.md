# SmartUp Crash Course 2026–27 — Comprehensive ERP Feature Architecture & Specification

> **Document Status**: Complete System Design & Blueprint  
> **Implementation Status**: **ON HOLD (Waiting for User Command)**  
> **Source Brief**: `"C:\Users\arjun\Downloads\SmartUp Documents\CRASH COURSE SALES BRIEF.pdf"`  
> **Target Academic Year**: 2026–2027  

---

## 1. Executive Summary & Sales Brief Analysis

The **SmartUp Crash Course 2026–27** is an intensive, early-morning academic revision and exam-preparation program aimed at secondary and higher secondary students approaching annual and board examinations.

### Key Programme Parameters from Sales Brief:
| Dimension | Specification from Sales Brief |
|---|---|
| **Target Classes** | 9th, 10th, Plus One (11th), Plus Two (12th) |
| **Core Subjects** | Physics, Chemistry & Mathematics (PCM) |
| **Participating Branches** | **Palluruthy** (`Smart Up Palluruthy`), **Thoppumpady** (`Smart Up Thopumpadi`), **Fort Kochi** (`Smart Up Fortkochi` / `Smart Up Chullickal`) |
| **Class Timings** | **Monday to Saturday, 6:15 AM – 8:00 AM** (Early morning slot, non-conflicting with regular school hours) |
| **Course Schedule** | **Phase 1**: 16 November – 5 December 2026 (~3 weeks)<br>**Phase 2**: 28 December 2026 – 30 January 2027 (~5 weeks)<br>**Plus Two Extension**: Up to 13 February 2027 (dedicated Mathematics support) |
| **Batch Size Policy** | Strict batch capacity: **20 to 50 students per class per branch** |
| **Assessment System** | Exactly **3 Progress Examinations** per batch |
| **Sunday Languages** | Optional for Classes 9 & 10: English, Hindi, Malayalam (Sundays) |
| **Branch Sales Targets** | **Minimum**: 80 students/branch (240 total)<br>**Recommended**: 120–150 students/branch (360–450 total across 3 branches) |

### Fee Structure Matrix:
| Class | Course Fee | Exam & Materials | Mandatory Total | Optional Language (1 Lang) | Optional Languages (All 3 Bundle) | Max Possible Fee |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **9th** | ₹3,999 | ₹299 | **₹4,298** | +₹999 (₹5,297) | +₹2,499 (**₹6,797**) | ₹6,797 |
| **10th** | ₹4,999 | ₹299 | **₹5,298** | +₹999 (₹6,297) | +₹2,499 (**₹7,797**) | ₹7,797 |
| **Plus One** | ₹5,999 | ₹299 | **₹6,298** | N/A | N/A | ₹6,298 |
| **Plus Two** | ₹5,999 | ₹299 | **₹6,298** | N/A | N/A (Math ext included) | ₹6,298 |

---

## 2. System Architecture & Frappe Backend Integration

Per the **Protected Backend Data Policy**, all operations are strictly non-destructive. No existing tables, doctypes, or production records will be modified or dropped.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SmartUp Next.js Frontend                              │
│                                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ Sales Admission Flow  │  │ Branch Manager Portal │  │ Director Dashboard  │  │
│  │ /admit-crash-course   │  │ Batch/Timetable/Exams │  │ Target & Rev Hub    │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬──────────┘  │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │                          │                         │
               ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes & Business Logic                        │
│                                                                                 │
│  • /api/admission/crash-course      • /api/crash-course/targets                 │
│  • /api/crash-course/batches        • /api/crash-course/exams                   │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Frappe Cloud ERP Backend (Live Data)                       │
│                                                                                 │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────────┐  │
│  │ Student & Guardian │   │ Program Enrollment │   │ Student Group (Batch)   │  │
│  │ (customer link)    │   │ (category: CC)     │   │ (20–50 capacity check)  │  │
│  └────────────────────┘   └────────────────────┘   └─────────────────────────┘  │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────────┐  │
│  │ Sales Order & Inv  │   │ Course Schedule    │   │ 3 Assessment Plans      │  │
│  │ (itemized fees)    │   │ (6:15–8:00 AM)     │   │ (Milestone Exams)       │  │
│  └────────────────────┘   └────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Frappe DocTypes & Data Mapping

1. **Student Master (`tabStudent`)**:
   - Reuses the existing robust Student creation pipeline (Guardian, Parent User, Student record, Customer record).
   - Tagged with `custom_branch`: Palluruthy / Thoppumpady / Fort Kochi.

2. **Program Enrollment (`tabProgram Enrollment`)**:
   - `academic_year`: `"2026-2027"`
   - `student_category`: `"Crash Course"` (differentiates crash course from regular and demo students).
   - `custom_program_type`: `"Crash Course"`
   - `custom_plan`: `"Crash Course 2026-27"`
   - `custom_crash_course_phase`: `"Phase 1 & 2"` (or `"Plus Two Extension"`)
   - `custom_language_addon`: Comma-separated list e.g. `"English,Hindi,Malayalam"` or `"None"`

3. **Student Group (Batch Management) (`tabStudent Group`)**:
   - Distinct batch naming schema: `CC-2026-{CLASS}-{BRANCH_ABBR}-B{N}`  
     *Examples: `CC-2026-10-THP-B1`, `CC-2026-P2-PAL-B1`, `CC-2026-9-FTK-B1`*
   - Group Type: `"Batch"`
   - Max capacity enforcement: **Hard cap at 50 students**. Recommended split at **40-45 students**.
   - Min batch viability threshold: **20 students**.

4. **Items, Sales Order & Sales Invoice (`tabItem`, `tabSales Order`, `tabSales Invoice`)**:
   - Itemized bill structure:
     * **Line 1 (Tuition)**: `Crash Course Tuition - Class {9|10|Plus One|Plus Two}` (₹3,999 / ₹4,999 / ₹5,999)
     * **Line 2 (Materials)**: `Crash Course Exam & Materials Fee` (₹299 fixed)
     * **Line 3 (Optional Add-on)**: `Crash Course Sunday Language Fee` (₹999 for single, ₹2,499 for bundle)
   - Sales Order auto-created with the above line items and immediately submitted.
   - 1 Sales Invoice auto-generated and submitted, triggering WhatsApp invoice delivery and online payment token generation.

5. **Timetable / Schedule (`tabCourse Schedule`)**:
   - Mon–Sat morning schedule: `from_time: "06:15:00"`, `to_time: "08:00:00"`.
   - Sunday language schedule: `day_of_week: "Sunday"`, time configured by branch.
   - Calendar date ranges strictly bounded by Phase 1 (16 Nov – 5 Dec 2026) and Phase 2 (28 Dec 2026 – 30 Jan 2027), with Plus Two extending to 13 Feb 2027.

6. **Exam System (`tabAssessment Plan` & `tabAssessment Result`)**:
   - Exactly 3 Assessment Plans per Crash Course Student Group:
     1. **Exam 1 (Phase 1 Baseline/Progress Exam)**: Scheduled end of Phase 1 (approx. Dec 4–5, 2026).
     2. **Exam 2 (Phase 2 Mid-Evaluation Exam)**: Scheduled mid Phase 2 (approx. Jan 16–17, 2027).
     3. **Exam 3 (Final Board Simulation/Mock Exam)**: Scheduled end of Phase 2 (approx. Jan 29–30, 2027).

---

## 3. Detailed Component & Module Structure

### 3.1 New Frontend Pages & Components
```
src/
├── app/
│   └── dashboard/
│       ├── sales-user/
│       │   ├── admit-crash-course/
│       │   │   └── page.tsx                   # Dedicated 4-step Crash Course Admission Wizard
│       │   └── crash-course-targets/
│       │       └── page.tsx                   # Branch-wise Sales Target & Conversion Tracker
│       ├── branch-manager/
│       │   └── crash-course/
│       │       ├── page.tsx                   # Batch capacity overview (20-50), seats remaining
│       │       ├── batches/[batchId]/page.tsx # Student list, attendance, teacher allocation
│       │       └── exams/page.tsx             # 3-exam scheduler & marks entry hub
│       └── director/
│           └── crash-course-performance/
│               └── page.tsx                   # Director overview: Branch vs Target (80 / 150), Revenue
├── components/
│   └── crash-course/
│       ├── CrashCourseFeeSummaryCard.tsx      # Real-time reactive fee breakdown with language add-ons
│       ├── LanguageSelectionSelector.tsx      # Interactive toggle for English, Hindi, Malayalam + bundle discount
│       ├── BatchCapacityGauge.tsx             # Visual capacity meter (20-50 range, green/yellow/red)
│       ├── SalesPitchHelperDrawer.tsx         # Slide-out quick sales script with the 6 parent selling points
│       └── TargetProgressBar.tsx              # Minimum (80) vs Recommended (120-150) progress bar
├── lib/
│   ├── api/
│   │   └── crashCourse.ts                     # API client methods for crash course admission, batches, targets
│   ├── types/
│   │   └── crashCourse.ts                     # TypeScript types (CrashCourseForm, Pricing, Batch, Target)
│   ├── utils/
│   │   └── crashCoursePricing.ts              # Pricing calculator & fee validator (Single source of truth)
│   └── validators/
│       └── crashCourseAdmission.ts            # Zod validation schema for crash course admission
```

### 3.2 Next.js Backend API Routes
```
src/app/api/crash-course/
├── admit/route.ts                # Orchestrates Student + Program Enrollment + Group + SO + Invoice
├── batches/route.ts              # Lists crash course batches with real-time enrolled counts & vacancy
├── pricing/route.ts              # Returns verified pricing matrix and language add-on calculations
├── targets/route.ts              # Computes branch-level performance vs 80 / 120-150 target thresholds
└── exams/route.ts                # Handles the 3 standard Assessment Plans creation and marks submission
```

---

## 4. Business Logic & Workflow Specifications

### 4.1 Pricing Engine Specification (`crashCoursePricing.ts`)
```typescript
export interface CrashCoursePricingInput {
  classLevel: "9th" | "10th" | "Plus One" | "Plus Two";
  selectedLanguages: ("English" | "Hindi" | "Malayalam")[];
}

export interface CrashCourseFeeBreakdown {
  courseFee: number;
  examMaterialsFee: number;
  mandatoryTotal: number;
  languageFee: number;
  languageSavings: number;
  grandTotal: number;
}
```
- **Rules**:
  1. Base Tuition:
     - 9th: ₹3,999
     - 10th: ₹4,999
     - Plus One: ₹5,999
     - Plus Two: ₹5,999
  2. Exam & Materials: Fixed ₹299 across all classes.
  3. Languages (Only allowed if `classLevel` is "9th" or "10th"):
     - 0 languages: ₹0
     - 1 language: ₹999
     - 2 languages: ₹1,998 (2 × ₹999)
     - 3 languages: ₹2,499 (Bundle discount saves ₹498 compared to ₹2,997)
  4. If Plus One or Plus Two is selected, language options are automatically disabled and set to ₹0.

### 4.2 Batch Capacity & Seat Enclosure Rules
- Each batch has a minimum operational size of **20 students** and a maximum capacity of **50 students**.
- When `enrolled_count >= 45`, the system displays a warning: *"Batch near capacity (X/50). Prepare Batch 2."*
- When `enrolled_count >= 50`, the batch is locked for admissions, requiring sales users to select or generate Batch 2.
- Ensures SmartUp upholds its sales promise to parents: *"Limited batch strength: 20–50 students per class"*.

### 4.3 Sales Pitch Assistant (Embedded in UI)
The sales form includes a dedicated collateral drawer for counsellors:
1. **Focused morning classes**: 6:15 AM – 8:00 AM (maximizes daytime school hours, builds peak discipline).
2. **Dedicated revision**: Comprehensive syllabus coverage in Physics, Chemistry & Math.
3. **Continuous monitoring**: 3 formal examinations to evaluate score improvements.
4. **Transparent fees**: All-inclusive pricing without surprise material costs.
5. **Small batch learning**: Guaranteed 20–50 student cohort.
6. **Plus Two math extension**: 2 additional weeks up to 13 February 2027 at no extra cost.

---

## 5. Implementation Roadmap (Post-Approval)

| Phase | Tasks | Verification Criteria |
|---|---|---|
| **Phase 1: Foundation & Data Layer** | • Define TypeScript interfaces and Zod schemas.<br>• Implement `crashCoursePricing.ts` utility with KaTeX/currency math.<br>• Implement batch capacity helper and naming utilities. | Unit tests verify exact fee totals: 9th (₹4,298 / ₹5,297 / ₹6,797), 10th (₹5,298 / ₹6,297 / ₹7,797), P1/P2 (₹6,298). |
| **Phase 2: Admission Orchestrator API** | • Create `src/app/api/crash-course/admit/route.ts`.<br>• Create itemized SO and Sales Invoice generation for Tuition + ₹299 Materials + Languages.<br>• Auto-link customer and send WhatsApp notification. | Tested against mock & live API safely without corrupting any standard students. |
| **Phase 3: Sales User Admission UI** | • Build `/dashboard/sales-user/admit-crash-course/page.tsx`.<br>• Add "Crash Course Admission" card to `new-admission/page.tsx`.<br>• Integrate real-time language toggles, capacity indicator, and sales pitch cheat sheet. | UI responsive, error-handled, form-state guarded against React Query revalidation drops. |
| **Phase 4: Sales Target & Branch Hub** | • Build `/dashboard/sales-user/crash-course-targets/page.tsx`.<br>• Build Branch Manager crash course view (Palluruthy, Thoppumpady, Fort Kochi).<br>• Display 80-student minimum and 120-150 recommended target trackers. | Accurate counts derived directly from submitted `Program Enrollment` with category `"Crash Course"`. |
| **Phase 5: Timetable & Exam Module** | • Integrate 6:15 AM - 8:00 AM schedule generator.<br>• Create the 3-exam Assessment Plan template for Crash Course batches. | Branch managers can enter marks for the 3 exams and parents see results on their portal. |
