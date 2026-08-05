# Collection Mismatch Analysis Report (All Dates)

This report outlines the discrepancies between the official **Payment Entries** and the sales **Fee Follow-Up** logs across all historical records.

## Summary by Branch

| Branch | Actual Payment Count | Actual Payments Total | Follow-up Logs Count | Follow-up Logs Total | Difference |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Chullickal** | 748 | ₹24,07,176 | 222 | ₹5,53,708 | **₹-18,53,468** |
| **Edappally** | 58 | ₹2,73,599 | 22 | ₹74,500 | **₹-1,99,099** |
| **Eraveli** | 588 | ₹10,88,935 | 204 | ₹3,42,900 | **₹-7,46,035** |
| **Fortkochi** | 541 | ₹16,07,441 | 174 | ₹4,06,650 | **₹-12,00,791** |
| **Kadavanthara** | 70 | ₹4,25,150 | 29 | ₹1,78,850 | **₹-2,46,300** |
| **Moolamkuzhi** | 161 | ₹5,87,820 | 47 | ₹1,19,100 | **₹-4,68,720** |
| **Palluruthy** | 567 | ₹14,02,945 | 253 | ₹5,90,800 | **₹-8,12,145** |
| **Thopumpadi** | 348 | ₹10,15,960 | 151 | ₹3,54,700 | **₹-6,61,260** |
| **Vennala** | 164 | ₹10,04,597 | 80 | ₹3,82,267 | **₹-6,22,330** |

## Chullickal Branch Deep Dive

* **Total Follow-up Logs claiming payments:** 222
* **Perfectly matching follow-ups:** 25
* **Follow-ups with NO matching payment entries:** 1 (Total amount claimed: ₹2,400)
* **Follow-ups with mismatched/duplicate amounts:** 196

### 1. Follow-ups with NO matching payment entries in July
These logs represent instances where a sales user claimed a payment was received, but no submitted Payment Entry exists for that student in July.

| Log Name | Student | Logged By | Date | Amount Claimed | Remarks |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `FU-2026-00580` | MOHAMMED SIDHAN A H (`STU-SU CHL-26-063`) | sneha.smartup@gmail.com | 2026-06-10 13:32:00 | ₹2,400 | — |

### 2. Follow-ups with mismatched/duplicate amounts
These logs show double-logging (multiple logs for the same student/payment) or splits that don't match the actual Payment Entry amounts.

#### `FU-2026-00124` - AYSHA SANA C R
- **Logged by:** sneha.smartup@gmail.com on 2026-05-26 16:26:00
- **Claimed amount:** ₹0
- **Actual payment entries in system:** ₹7,200
  * Payment entry `ACC-PAY-2026-04053` on 2026-04-06: ₹1,999
  * Payment entry `ACC-PAY-2026-05093` on 2026-05-19: ₹400
  * Payment entry `ACC-PAY-2026-05094` on 2026-05-19: ₹2,400
  * Payment entry `ACC-PAY-2026-06074` on 2026-06-23: ₹2,400
  * Payment entry `ACC-PAY-2026-06075` on 2026-06-23: ₹1

#### `FU-2026-00138` - MOHAMMED NAHAN NAJEEB
- **Logged by:** sneha.smartup@gmail.com on 2026-05-27 11:22:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-05069` on 2026-05-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05980` on 2026-06-18: ₹800
  * Payment entry `ACC-PAY-2026-05981` on 2026-06-18: ₹1,700

#### `FU-2026-00139` - FATHIMA ZAHRA P T
- **Logged by:** sneha.smartup@gmail.com on 2026-05-27 11:42:00
- **Claimed amount:** ₹1,500
- **Actual payment entries in system:** ₹6,000
  * Payment entry `ACC-PAY-2026-04628` on 2026-04-27: ₹1,500
  * Payment entry `ACC-PAY-2026-05229` on 2026-05-30: ₹1,500
  * Payment entry `ACC-PAY-2026-06482-1` on 2026-07-07: ₹3,000

#### `FU-2026-00156` - SANA FATHIMA L A
- **Logged by:** sneha.smartup@gmail.com on 2026-05-27 15:18:00
- **Claimed amount:** ₹1,300
- **Actual payment entries in system:** ₹6,800
  * Payment entry `ACC-PAY-2026-04532` on 2026-04-21: ₹2,000
  * Payment entry `ACC-PAY-2026-05165` on 2026-05-22: ₹1,300
  * Payment entry `ACC-PAY-2026-05634` on 2026-06-09: ₹2,000
  * Payment entry `ACC-PAY-2026-06474` on 2026-07-08: ₹1,300
  * Payment entry `ACC-PAY-2026-06475` on 2026-07-08: ₹200

#### `FU-2026-00172` - NANDEESWAR T B
- **Logged by:** sneha.smartup@gmail.com on 2026-05-29 08:00:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04432` on 2026-04-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05232` on 2026-05-30: ₹800
  * Payment entry `ACC-PAY-2026-05233` on 2026-05-30: ₹1,700
  * Payment entry `ACC-PAY-2026-06483-1` on 2026-07-03: ₹2,500
  * Payment entry `ACC-PAY-2026-07223` on 2026-08-03: ₹1,600
  * Payment entry `ACC-PAY-2026-07224` on 2026-08-03: ₹800
  * Payment entry `ACC-PAY-2026-07225` on 2026-08-03: ₹100

#### `FU-2026-00224` - DEVANANDA C A
- **Logged by:** sneha.smartup@gmail.com on 2026-06-01 15:56:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹7,300
  * Payment entry `ACC-PAY-2026-04474` on 2026-04-20: ₹2,400
  * Payment entry `ACC-PAY-2026-05254` on 2026-06-01: ₹2,400
  * Payment entry `ACC-PAY-2026-06743` on 2026-07-14: ₹2,400
  * Payment entry `ACC-PAY-2026-06744` on 2026-07-14: ₹100

#### `FU-2026-00338` - DIYA ZAHWAH
- **Logged by:** sneha.smartup@gmail.com on 2026-06-03 11:22:00
- **Claimed amount:** ₹1,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-04664` on 2026-04-28: ₹1,000
  * Payment entry `ACC-PAY-2026-05337` on 2026-06-02: ₹1,400
  * Payment entry `ACC-PAY-2026-06079` on 2026-06-24: ₹2,400

#### `FU-2026-00590` - FLEVIN C T
- **Logged by:** sneha.smartup@gmail.com on 2026-06-10 13:45:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹8,300
  * Payment entry `ACC-PAY-2026-04472` on 2026-04-20: ₹2,000
  * Payment entry `ACC-PAY-2026-04738` on 2026-05-04: ₹1,300
  * Payment entry `ACC-PAY-2026-05711` on 2026-06-10: ₹2,500
  * Payment entry `ACC-PAY-2026-06585` on 2026-07-10: ₹800
  * Payment entry `ACC-PAY-2026-06586` on 2026-07-10: ₹1,700

#### `FU-2026-00615` - SARA BEEGUM
- **Logged by:** sneha.smartup@gmail.com on 2026-06-11 09:04:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,000
  * Payment entry `ACC-PAY-2026-04246` on 2026-04-13: ₹2,000
  * Payment entry `ACC-PAY-2026-05485` on 2026-06-04: ₹1,300
  * Payment entry `ACC-PAY-2026-05486` on 2026-06-04: ₹700

#### `FU-2026-00659` - ALRINA SONY
- **Logged by:** sneha.smartup@gmail.com on 2026-06-17 11:33:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹4,999
  * Payment entry `ACC-PAY-2026-05407` on 2026-05-04: ₹499
  * Payment entry `ACC-PAY-2026-05487` on 2026-06-04: ₹2,000
  * Payment entry `ACC-PAY-2026-05943` on 2026-06-17: ₹2,500

#### `FU-2026-00721` - EMMANUEL ABY GEORGE
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:26:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03936` on 2026-03-26: ₹2,000
  * Payment entry `ACC-PAY-2026-04335` on 2026-04-14: ₹1,300
  * Payment entry `ACC-PAY-2026-05966` on 2026-05-15: ₹3,300
  * Payment entry `ACC-PAY-2026-05993` on 2026-06-20: ₹3,300
  * Payment entry `ACC-PAY-2026-06855` on 2026-07-19: ₹3,300

#### `FU-2026-00722` - HANEENA PARVEEN M S
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:28:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-04729` on 2026-05-04: ₹2,500
  * Payment entry `ACC-PAY-2026-05991` on 2026-06-19: ₹2,500

#### `FU-2026-00723` - HAWWA K F
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:28:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-04144` on 2026-04-09: ₹2,400
  * Payment entry `ACC-PAY-2026-05969` on 2026-06-18: ₹2,400

#### `FU-2026-00724` - MOHAMMED FAYAZ SHANAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:29:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹9,000
  * Payment entry `ACC-PAY-2026-04254` on 2026-04-13: ₹2,400
  * Payment entry `ACC-PAY-2026-04255` on 2026-04-13: ₹600
  * Payment entry `ACC-PAY-2026-04567` on 2026-04-23: ₹1,800
  * Payment entry `ACC-PAY-2026-04568` on 2026-04-23: ₹200
  * Payment entry `ACC-PAY-2026-05970` on 2026-06-18: ₹2,000
  * Payment entry `ACC-PAY-2026-07144` on 2026-07-31: ₹200
  * Payment entry `ACC-PAY-2026-07145` on 2026-07-31: ₹1,800

#### `FU-2026-00726` - MOHAMMED NAHAN NAJEEB
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:29:00
- **Claimed amount:** ₹800
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-05069` on 2026-05-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05980` on 2026-06-18: ₹800
  * Payment entry `ACC-PAY-2026-05981` on 2026-06-18: ₹1,700

#### `FU-2026-00727` - FATHIMA FAIZA
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:30:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹6,000
  * Payment entry `ACC-PAY-2026-03974` on 2026-04-02: ₹2,000
  * Payment entry `ACC-PAY-2026-05979` on 2026-06-18: ₹2,000
  * Payment entry `ACC-PAY-2026-06733` on 2026-07-14: ₹2,000

#### `FU-2026-00728` - SUHANA P M
- **Logged by:** sneha.smartup@gmail.com on 2026-06-22 16:36:00
- **Claimed amount:** ₹1,000
- **Actual payment entries in system:** ₹9,800
  * Payment entry `ACC-PAY-2026-04057` on 2026-04-06: ₹999
  * Payment entry `ACC-PAY-2026-04971` on 2026-05-12: ₹2,301
  * Payment entry `ACC-PAY-2026-05191` on 2026-05-25: ₹500
  * Payment entry `ACC-PAY-2026-05839` on 2026-06-15: ₹1,000
  * Payment entry `ACC-PAY-2026-06754-1` on 2026-07-09: ₹2,000
  * Payment entry `ACC-PAY-2026-07183` on 2026-08-01: ₹1,800
  * Payment entry `ACC-PAY-2026-07184` on 2026-08-01: ₹1,200

#### `FU-2026-00783` - PARVIN AZMIN
- **Logged by:** sneha.smartup@gmail.com on 2026-06-23 16:12:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹6,300
  * Payment entry `ACC-PAY-2026-03951` on 2026-03-31: ₹3,000
  * Payment entry `ACC-PAY-2026-06107` on 2026-06-25: ₹3,300

#### `FU-2026-00784` - SAIRA FATHIMA T I
- **Logged by:** sneha.smartup@gmail.com on 2026-06-23 16:17:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹6,600
  * Payment entry `ACC-PAY-2026-04765` on 2026-05-05: ₹3,300
  * Payment entry `ACC-PAY-2026-06040` on 2026-06-22: ₹3,300

#### `FU-2026-00806` - ALDRIN THOMAS O A
- **Logged by:** sneha.smartup@gmail.com on 2026-06-24 10:07:00
- **Claimed amount:** ₹1,000
- **Actual payment entries in system:** ₹15,000
  * Payment entry `ACC-PAY-2026-06049` on 2026-06-23: ₹1,000
  * Payment entry `ACC-PAY-2026-06679` on 2026-07-13: ₹14,000

#### `FU-2026-00807` - KRISHNA GADHA G
- **Logged by:** sneha.smartup@gmail.com on 2026-06-24 10:07:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹15,000
  * Payment entry `ACC-PAY-2026-06015` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-06364` on 2026-07-04: ₹13,000

#### `FU-2026-00808` - SHAUN JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-06-24 10:08:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,500
  * Payment entry `ACC-PAY-2026-06022` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-07155` on 2026-07-31: ₹500
  * Payment entry `ACC-PAY-2026-07156` on 2026-07-31: ₹2,000

#### `FU-2026-00809` - SHAUN JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-06-24 10:08:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,500
  * Payment entry `ACC-PAY-2026-06022` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-07155` on 2026-07-31: ₹500
  * Payment entry `ACC-PAY-2026-07156` on 2026-07-31: ₹2,000

#### `FU-2026-00888` - SAIRA FATHIMA T I
- **Logged by:** sneha.smartup@gmail.com on 2026-06-25 14:03:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹6,600
  * Payment entry `ACC-PAY-2026-04765` on 2026-05-05: ₹3,300
  * Payment entry `ACC-PAY-2026-06040` on 2026-06-22: ₹3,300

#### `FU-2026-00898` - NATASHA SHIHAB
- **Logged by:** sneha.smartup@gmail.com on 2026-06-25 14:22:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04250` on 2026-04-13: ₹3,300
  * Payment entry `ACC-PAY-2026-04794` on 2026-05-06: ₹3,300
  * Payment entry `ACC-PAY-2026-06485` on 2026-07-08: ₹3,300
  * Payment entry `ACC-PAY-2026-06486` on 2026-07-08: ₹3,300

#### `FU-2026-00948` - PAVAN KUMAR
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 07:52:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹8,200
  * Payment entry `ACC-PAY-2026-04803` on 2026-05-06: ₹4,000
  * Payment entry `ACC-PAY-2026-06487-1` on 2026-06-25: ₹4,200

#### `FU-2026-00961` - MOHAMMED RAIHAN A
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 10:13:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,500
  * Payment entry `ACC-PAY-2026-04905` on 2026-05-11: ₹2,500
  * Payment entry `ACC-PAY-2026-06112-1` on 2026-06-26: ₹2,000

#### `FU-2026-00983` - ABHITHNA SAJIMON
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 12:49:00
- **Claimed amount:** ₹2,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04500` on 2026-04-21: ₹1,000
  * Payment entry `ACC-PAY-2026-06120` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06121` on 2026-06-26: ₹2,700
  * Payment entry `ACC-PAY-2026-06422` on 2026-07-06: ₹600
  * Payment entry `ACC-PAY-2026-06423` on 2026-07-06: ₹3,300

#### `FU-2026-00984` - ABHITHNA SAJIMON
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 12:49:00
- **Claimed amount:** ₹2,700
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04500` on 2026-04-21: ₹1,000
  * Payment entry `ACC-PAY-2026-06120` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06121` on 2026-06-26: ₹2,700
  * Payment entry `ACC-PAY-2026-06422` on 2026-07-06: ₹600
  * Payment entry `ACC-PAY-2026-06423` on 2026-07-06: ₹3,300

#### `FU-2026-00986` - ANN MARYA SABU
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 12:49:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-04715` on 2026-05-02: ₹2,500
  * Payment entry `ACC-PAY-2026-06122` on 2026-06-26: ₹2,500

#### `FU-2026-01060` - ALPHONSA HAIDUS SERA
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 14:52:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04792` on 2026-05-06: ₹2,500
  * Payment entry `ACC-PAY-2026-05878` on 2026-06-16: ₹2,500
  * Payment entry `ACC-PAY-2026-06129` on 2026-06-26: ₹2,500
  * Payment entry `ACC-PAY-2026-06923` on 2026-07-21: ₹2,500

#### `FU-2026-01061` - ANNLIYA K B
- **Logged by:** sneha.smartup@gmail.com on 2026-06-26 14:52:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹7,500
  * Payment entry `ACC-PAY-2026-04553` on 2026-04-22: ₹2,500
  * Payment entry `ACC-PAY-2026-05388` on 2026-06-02: ₹2,500
  * Payment entry `ACC-PAY-2026-06128` on 2026-06-26: ₹2,500

#### `FU-2026-01087` - NAHIL K N
- **Logged by:** sneha.smartup@gmail.com on 2026-06-27 08:45:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-03966` on 2026-04-01: ₹1,999
  * Payment entry `ACC-PAY-2026-05207` on 2026-05-25: ₹400
  * Payment entry `ACC-PAY-2026-05208` on 2026-05-25: ₹2,400
  * Payment entry `ACC-PAY-2026-05209` on 2026-05-25: ₹100
  * Payment entry `ACC-PAY-2026-06132` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06133` on 2026-06-26: ₹1
  * Payment entry `ACC-PAY-2026-06134` on 2026-06-26: ₹200
  * Payment entry `ACC-PAY-2026-06821` on 2026-07-17: ₹2,200
  * Payment entry `ACC-PAY-2026-06822` on 2026-07-17: ₹300

#### `FU-2026-01230` - CARMEL JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 11:28:00
- **Claimed amount:** ₹2,050
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04210` on 2026-04-12: ₹2,050
  * Payment entry `ACC-PAY-2026-04211` on 2026-04-12: ₹1,250
  * Payment entry `ACC-PAY-2026-05627` on 2026-06-09: ₹2,050
  * Payment entry `ACC-PAY-2026-05628` on 2026-06-09: ₹1,250
  * Payment entry `ACC-PAY-2026-06176-1` on 2026-06-28: ₹2,050
  * Payment entry `ACC-PAY-2026-06177-1` on 2026-06-28: ₹1,250
  * Payment entry `ACC-PAY-2026-06490-2` on 2026-07-07: ₹2,050
  * Payment entry `ACC-PAY-2026-06491-1` on 2026-07-07: ₹1,250

#### `FU-2026-01231` - MARY ELSA
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 11:28:00
- **Claimed amount:** ₹2,050
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04209` on 2026-04-12: ₹3,300
  * Payment entry `ACC-PAY-2026-05625` on 2026-06-09: ₹2,050
  * Payment entry `ACC-PAY-2026-05626` on 2026-06-09: ₹1,250
  * Payment entry `ACC-PAY-2026-06178-1` on 2026-06-28: ₹2,050
  * Payment entry `ACC-PAY-2026-06179-1` on 2026-06-28: ₹1,250
  * Payment entry `ACC-PAY-2026-06488-1` on 2026-07-07: ₹2,050
  * Payment entry `ACC-PAY-2026-06489-2` on 2026-07-07: ₹1,250

#### `FU-2026-01233` - AIMAL V
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 11:28:00
- **Claimed amount:** ₹5,900
- **Actual payment entries in system:** ₹11,800
  * Payment entry `ACC-PAY-2026-04699` on 2026-04-30: ₹5,900
  * Payment entry `ACC-PAY-2026-06180` on 2026-06-29: ₹5,900

#### `FU-2026-01234` - AIMAL V
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 11:29:00
- **Claimed amount:** ₹5,900
- **Actual payment entries in system:** ₹11,800
  * Payment entry `ACC-PAY-2026-04699` on 2026-04-30: ₹5,900
  * Payment entry `ACC-PAY-2026-06180` on 2026-06-29: ₹5,900

#### `FU-2026-01303` - FAVOURIN D SILVA
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 16:26:00
- **Claimed amount:** ₹3,000
- **Actual payment entries in system:** ₹6,000
  * Payment entry `ACC-PAY-2026-04742` on 2026-05-04: ₹3,000
  * Payment entry `ACC-PAY-2026-06198` on 2026-06-29: ₹3,000

#### `FU-2026-01304` - AKBAR NAVEED
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 16:26:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03952` on 2026-03-31: ₹1,000
  * Payment entry `ACC-PAY-2026-04595` on 2026-04-24: ₹2,300
  * Payment entry `ACC-PAY-2026-05210` on 2026-05-25: ₹3,300
  * Payment entry `ACC-PAY-2026-06199` on 2026-06-29: ₹3,300
  * Payment entry `ACC-PAY-2026-07119` on 2026-07-30: ₹3,300

#### `FU-2026-01305` - HAYA SUNEER
- **Logged by:** sneha.smartup@gmail.com on 2026-06-29 16:36:00
- **Claimed amount:** ₹5,393
- **Actual payment entries in system:** ₹13,693
  * Payment entry `ACC-PAY-2026-03960` on 2026-04-01: ₹8,300
  * Payment entry `ACC-PAY-2026-06289-1` on 2026-06-29: ₹5,393

#### `FU-2026-01313` - AQSA SHAJAHAN
- **Logged by:** sneha.smartup@gmail.com on 2026-06-30 08:44:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹8,400
  * Payment entry `ACC-PAY-2026-03937` on 2026-03-26: ₹4,200
  * Payment entry `ACC-PAY-2026-06212` on 2026-06-29: ₹4,200

#### `FU-2026-01314` - RANVEER R
- **Logged by:** sneha.smartup@gmail.com on 2026-06-30 08:45:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-06214` on 2026-06-29: ₹2,500
  * Payment entry `ACC-PAY-2026-06215` on 2026-06-29: ₹2,500

#### `FU-2026-01367` - MUHAMMED HABEEB MANSHAD
- **Logged by:** sneha.smartup@gmail.com on 2026-06-30 11:38:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04709` on 2026-05-02: ₹3,300
  * Payment entry `ACC-PAY-2026-05942` on 2026-06-17: ₹3,300
  * Payment entry `ACC-PAY-2026-06816` on 2026-07-17: ₹3,300

#### `FU-2026-01368` - MUHAMMED HABEEB MANSHAD
- **Logged by:** sneha.smartup@gmail.com on 2026-06-30 11:39:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04709` on 2026-05-02: ₹3,300
  * Payment entry `ACC-PAY-2026-05942` on 2026-06-17: ₹3,300
  * Payment entry `ACC-PAY-2026-06816` on 2026-07-17: ₹3,300

#### `FU-2026-01465` - IAN PILLARD
- **Logged by:** sneha.smartup@gmail.com on 2026-07-01 11:11:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03953` on 2026-03-31: ₹3,300
  * Payment entry `ACC-PAY-2026-05245` on 2026-05-31: ₹3,300
  * Payment entry `ACC-PAY-2026-06290` on 2026-07-01: ₹3,300
  * Payment entry `ACC-PAY-2026-07186` on 2026-08-01: ₹3,300

#### `FU-2026-01527` - FATHIMA ZAHRA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-02 10:06:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹6,200
  * Payment entry `ACC-PAY-2026-04160` on 2026-04-10: ₹4,200
  * Payment entry `ACC-PAY-2026-06327-1` on 2026-07-01: ₹2,000

#### `FU-2026-01581` - VAIGA PRASANTH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-02 16:34:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04265` on 2026-04-13: ₹2,400
  * Payment entry `ACC-PAY-2026-05408` on 2026-06-02: ₹2,400
  * Payment entry `ACC-PAY-2026-06098` on 2026-06-25: ₹2,400
  * Payment entry `ACC-PAY-2026-06330` on 2026-07-02: ₹2,400

#### `FU-2026-01582` - CARMEL JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-02 16:34:00
- **Claimed amount:** ₹1,250
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04210` on 2026-04-12: ₹2,050
  * Payment entry `ACC-PAY-2026-04211` on 2026-04-12: ₹1,250
  * Payment entry `ACC-PAY-2026-05627` on 2026-06-09: ₹2,050
  * Payment entry `ACC-PAY-2026-05628` on 2026-06-09: ₹1,250
  * Payment entry `ACC-PAY-2026-06176-1` on 2026-06-28: ₹2,050
  * Payment entry `ACC-PAY-2026-06177-1` on 2026-06-28: ₹1,250
  * Payment entry `ACC-PAY-2026-06490-2` on 2026-07-07: ₹2,050
  * Payment entry `ACC-PAY-2026-06491-1` on 2026-07-07: ₹1,250

#### `FU-2026-01584` - MARY ELSA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-02 16:34:00
- **Claimed amount:** ₹1,250
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04209` on 2026-04-12: ₹3,300
  * Payment entry `ACC-PAY-2026-05625` on 2026-06-09: ₹2,050
  * Payment entry `ACC-PAY-2026-05626` on 2026-06-09: ₹1,250
  * Payment entry `ACC-PAY-2026-06178-1` on 2026-06-28: ₹2,050
  * Payment entry `ACC-PAY-2026-06179-1` on 2026-06-28: ₹1,250
  * Payment entry `ACC-PAY-2026-06488-1` on 2026-07-07: ₹2,050
  * Payment entry `ACC-PAY-2026-06489-2` on 2026-07-07: ₹1,250

#### `FU-2026-01631` - SIONA SIJOY
- **Logged by:** sneha.smartup@gmail.com on 2026-07-03 10:49:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04343` on 2026-04-14: ₹2,400
  * Payment entry `ACC-PAY-2026-05051` on 2026-05-18: ₹2,400
  * Payment entry `ACC-PAY-2026-06337` on 2026-07-02: ₹2,400
  * Payment entry `ACC-PAY-2026-07216` on 2026-08-02: ₹2,400

#### `FU-2026-01664` - KRISHNA GADHA G
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 08:13:00
- **Claimed amount:** ₹13,000
- **Actual payment entries in system:** ₹15,000
  * Payment entry `ACC-PAY-2026-06015` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-06364` on 2026-07-04: ₹13,000

#### `FU-2026-01665` - MOHAMMED RIHAN M S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 08:14:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹8,400
  * Payment entry `ACC-PAY-2026-04722` on 2026-05-04: ₹4,200
  * Payment entry `ACC-PAY-2026-06365` on 2026-07-04: ₹4,200

#### `FU-2026-01667` - ADHIL AJMAL
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 08:14:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹7,200
  * Payment entry `ACC-PAY-2026-04590` on 2026-04-23: ₹2,400
  * Payment entry `ACC-PAY-2026-04591` on 2026-04-23: ₹600
  * Payment entry `ACC-PAY-2026-05389` on 2026-06-02: ₹1,800
  * Payment entry `ACC-PAY-2026-06367` on 2026-07-04: ₹2,400

#### `FU-2026-01669` - AMANA FATHIMA T H
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 08:14:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹7,600
  * Payment entry `ACC-PAY-2026-04041` on 2026-04-06: ₹1,000
  * Payment entry `ACC-PAY-2026-04657` on 2026-04-28: ₹2,500
  * Payment entry `ACC-PAY-2026-05536` on 2026-06-05: ₹800
  * Payment entry `ACC-PAY-2026-06368` on 2026-07-04: ₹3,300

#### `FU-2026-01670` - ABDUL KADHAR KUNJU T M
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 08:15:00
- **Claimed amount:** ₹3,000
- **Actual payment entries in system:** ₹6,600
  * Payment entry `ACC-PAY-2026-05167` on 2026-05-22: ₹3,300
  * Payment entry `ACC-PAY-2026-05168` on 2026-05-22: ₹300
  * Payment entry `ACC-PAY-2026-06369` on 2026-07-04: ₹3,000

#### `FU-2026-01671` - NATASHA SHIHAB
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 08:17:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04250` on 2026-04-13: ₹3,300
  * Payment entry `ACC-PAY-2026-04794` on 2026-05-06: ₹3,300
  * Payment entry `ACC-PAY-2026-06485` on 2026-07-08: ₹3,300
  * Payment entry `ACC-PAY-2026-06486` on 2026-07-08: ₹3,300

#### `FU-2026-01691` - NANDEESWAR T B
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 11:09:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04432` on 2026-04-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05232` on 2026-05-30: ₹800
  * Payment entry `ACC-PAY-2026-05233` on 2026-05-30: ₹1,700
  * Payment entry `ACC-PAY-2026-06483-1` on 2026-07-03: ₹2,500
  * Payment entry `ACC-PAY-2026-07223` on 2026-08-03: ₹1,600
  * Payment entry `ACC-PAY-2026-07224` on 2026-08-03: ₹800
  * Payment entry `ACC-PAY-2026-07225` on 2026-08-03: ₹100

#### `FU-2026-01739` - AFNA M A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:19:00
- **Claimed amount:** ₹1,900
- **Actual payment entries in system:** ₹3,800
  * Payment entry `ACC-PAY-2026-05750` on 2026-06-10: ₹1,900
  * Payment entry `ACC-PAY-2026-06381` on 2026-07-05: ₹1,900

#### `FU-2026-01742` - AZNA MARIYAM
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:51:00
- **Claimed amount:** ₹2,300
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04447` on 2026-04-20: ₹2,400
  * Payment entry `ACC-PAY-2026-04448` on 2026-04-20: ₹100
  * Payment entry `ACC-PAY-2026-05002` on 2026-05-14: ₹2,300
  * Payment entry `ACC-PAY-2026-05003` on 2026-05-14: ₹100
  * Payment entry `ACC-PAY-2026-05888` on 2026-06-16: ₹1,500
  * Payment entry `ACC-PAY-2026-05897` on 2026-06-16: ₹800
  * Payment entry `ACC-PAY-2026-05898` on 2026-06-16: ₹100
  * Payment entry `ACC-PAY-2026-06366` on 2026-07-04: ₹2,300

#### `FU-2026-01743` - ROMULLUS MATHEW ROY
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:51:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹9,050
  * Payment entry `ACC-PAY-2026-04247` on 2026-04-13: ₹2,500
  * Payment entry `ACC-PAY-2026-04746` on 2026-05-05: ₹1,550
  * Payment entry `ACC-PAY-2026-04747` on 2026-05-05: ₹950
  * Payment entry `ACC-PAY-2026-05435` on 2026-06-03: ₹1,550
  * Payment entry `ACC-PAY-2026-06350` on 2026-07-03: ₹2,500

#### `FU-2026-01744` - ROSE MARIA ROY
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:51:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹8,710
  * Payment entry `ACC-PAY-2026-04248` on 2026-04-13: ₹1,510
  * Payment entry `ACC-PAY-2026-04249` on 2026-04-13: ₹890
  * Payment entry `ACC-PAY-2026-04748` on 2026-05-05: ₹1,510
  * Payment entry `ACC-PAY-2026-04749` on 2026-05-05: ₹890
  * Payment entry `ACC-PAY-2026-05436` on 2026-06-03: ₹1,510
  * Payment entry `ACC-PAY-2026-06351` on 2026-07-03: ₹2,400

#### `FU-2026-01747` - HAFSA SALIH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:52:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹12,600
  * Payment entry `ACC-PAY-2026-04327` on 2026-04-14: ₹4,200
  * Payment entry `ACC-PAY-2026-04329` on 2026-04-14: ₹300
  * Payment entry `ACC-PAY-2026-05126` on 2026-05-20: ₹3,900
  * Payment entry `ACC-PAY-2026-06355` on 2026-07-03: ₹4,200

#### `FU-2026-01748` - AYESHA MINA K S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:52:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-05273` on 2026-06-01: ₹2,400
  * Payment entry `ACC-PAY-2026-06318` on 2026-07-02: ₹2,400

#### `FU-2026-01749` - MARZIYA P S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:53:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹16,500
  * Payment entry `ACC-PAY-2026-04006` on 2026-04-04: ₹3,300
  * Payment entry `ACC-PAY-2026-04805` on 2026-05-06: ₹3,300
  * Payment entry `ACC-PAY-2026-05622` on 2026-06-09: ₹3,300
  * Payment entry `ACC-PAY-2026-06323` on 2026-07-02: ₹3,300
  * Payment entry `ACC-PAY-2026-07206` on 2026-08-01: ₹3,300

#### `FU-2026-01750` - DHRUV S NAMBIAR
- **Logged by:** sneha.smartup@gmail.com on 2026-07-06 13:53:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹10,700
  * Payment entry `ACC-PAY-2026-04688` on 2026-04-30: ₹800
  * Payment entry `ACC-PAY-2026-04691` on 2026-04-30: ₹2,500
  * Payment entry `ACC-PAY-2026-04745` on 2026-05-04: ₹800
  * Payment entry `ACC-PAY-2026-05329` on 2026-06-02: ₹3,300
  * Payment entry `ACC-PAY-2026-06332` on 2026-07-02: ₹3,300

#### `FU-2026-01788` - MOHAMMED AMEER T H
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 08:14:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹6,550
  * Payment entry `ACC-PAY-2026-04524` on 2026-04-21: ₹1,550
  * Payment entry `ACC-PAY-2026-05530` on 2026-06-05: ₹2,500
  * Payment entry `ACC-PAY-2026-06401` on 2026-07-06: ₹2,500

#### `FU-2026-01789` - ABHITHNA SAJIMON
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 08:15:00
- **Claimed amount:** ₹600
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04500` on 2026-04-21: ₹1,000
  * Payment entry `ACC-PAY-2026-06120` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06121` on 2026-06-26: ₹2,700
  * Payment entry `ACC-PAY-2026-06422` on 2026-07-06: ₹600
  * Payment entry `ACC-PAY-2026-06423` on 2026-07-06: ₹3,300

#### `FU-2026-01790` - ABHITHNA SAJIMON
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 08:15:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04500` on 2026-04-21: ₹1,000
  * Payment entry `ACC-PAY-2026-06120` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06121` on 2026-06-26: ₹2,700
  * Payment entry `ACC-PAY-2026-06422` on 2026-07-06: ₹600
  * Payment entry `ACC-PAY-2026-06423` on 2026-07-06: ₹3,300

#### `FU-2026-01888` - FATHIMA ZAHRA P T
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 14:51:00
- **Claimed amount:** ₹3,000
- **Actual payment entries in system:** ₹6,000
  * Payment entry `ACC-PAY-2026-04628` on 2026-04-27: ₹1,500
  * Payment entry `ACC-PAY-2026-05229` on 2026-05-30: ₹1,500
  * Payment entry `ACC-PAY-2026-06482-1` on 2026-07-07: ₹3,000

#### `FU-2026-01906` - MOHAMMED RAIHAN K S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 16:27:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹6,600
  * Payment entry `ACC-PAY-2026-05390` on 2026-06-02: ₹3,300
  * Payment entry `ACC-PAY-2026-06452` on 2026-07-07: ₹3,300

#### `FU-2026-01908` - RUMAIS RAZEEM
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 16:32:00
- **Claimed amount:** ₹2,200
- **Actual payment entries in system:** ₹8,400
  * Payment entry `ACC-PAY-2026-04151` on 2026-04-10: ₹2,000
  * Payment entry `ACC-PAY-2026-06454` on 2026-07-07: ₹2,200
  * Payment entry `ACC-PAY-2026-06456` on 2026-07-07: ₹4,200

#### `FU-2026-01910` - RUMAIS RAZEEM
- **Logged by:** sneha.smartup@gmail.com on 2026-07-07 16:32:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹8,400
  * Payment entry `ACC-PAY-2026-04151` on 2026-04-10: ₹2,000
  * Payment entry `ACC-PAY-2026-06454` on 2026-07-07: ₹2,200
  * Payment entry `ACC-PAY-2026-06456` on 2026-07-07: ₹4,200

#### `FU-2026-01916` - HIZBA FATHIMA M B
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 08:24:00
- **Claimed amount:** ₹3,900
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-05023` on 2026-04-17: ₹5,000
  * Payment entry `ACC-PAY-2026-05784` on 2026-06-11: ₹3,300
  * Payment entry `ACC-PAY-2026-06462` on 2026-07-07: ₹3,900
  * Payment entry `ACC-PAY-2026-06746-1` on 2026-07-07: ₹2,000

#### `FU-2026-01931` - MINHA BAI T
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 09:37:00
- **Claimed amount:** ₹5,900
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04769` on 2026-05-05: ₹8,300
  * Payment entry `ACC-PAY-2026-06472` on 2026-07-08: ₹5,900

#### `FU-2026-01943` - HANAN MOHAMMED
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:36:00
- **Claimed amount:** ₹2,300
- **Actual payment entries in system:** ₹7,100
  * Payment entry `ACC-PAY-2026-04545` on 2026-04-22: ₹2,400
  * Payment entry `ACC-PAY-2026-04546` on 2026-04-22: ₹100
  * Payment entry `ACC-PAY-2026-05537` on 2026-06-05: ₹2,300
  * Payment entry `ACC-PAY-2026-06473` on 2026-07-08: ₹2,300

#### `FU-2026-01945` - SANA FATHIMA L A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:36:00
- **Claimed amount:** ₹1,300
- **Actual payment entries in system:** ₹6,800
  * Payment entry `ACC-PAY-2026-04532` on 2026-04-21: ₹2,000
  * Payment entry `ACC-PAY-2026-05165` on 2026-05-22: ₹1,300
  * Payment entry `ACC-PAY-2026-05634` on 2026-06-09: ₹2,000
  * Payment entry `ACC-PAY-2026-06474` on 2026-07-08: ₹1,300
  * Payment entry `ACC-PAY-2026-06475` on 2026-07-08: ₹200

#### `FU-2026-01946` - SANA FATHIMA L A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:37:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹6,800
  * Payment entry `ACC-PAY-2026-04532` on 2026-04-21: ₹2,000
  * Payment entry `ACC-PAY-2026-05165` on 2026-05-22: ₹1,300
  * Payment entry `ACC-PAY-2026-05634` on 2026-06-09: ₹2,000
  * Payment entry `ACC-PAY-2026-06474` on 2026-07-08: ₹1,300
  * Payment entry `ACC-PAY-2026-06475` on 2026-07-08: ₹200

#### `FU-2026-01947` - VINOD KUMAR V
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:37:00
- **Claimed amount:** ₹1,765
- **Actual payment entries in system:** ₹12,770
  * Payment entry `ACC-PAY-2026-04345` on 2026-04-14: ₹3,300
  * Payment entry `ACC-PAY-2026-04937` on 2026-05-11: ₹800
  * Payment entry `ACC-PAY-2026-04938` on 2026-05-11: ₹2,500
  * Payment entry `ACC-PAY-2026-05381` on 2026-06-02: ₹800
  * Payment entry `ACC-PAY-2026-05382` on 2026-06-02: ₹1,535
  * Payment entry `ACC-PAY-2026-06476` on 2026-07-08: ₹1,765
  * Payment entry `ACC-PAY-2026-06479` on 2026-07-08: ₹2,070

#### `FU-2026-01948` - VINOD KUMAR V
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:37:00
- **Claimed amount:** ₹2,070
- **Actual payment entries in system:** ₹12,770
  * Payment entry `ACC-PAY-2026-04345` on 2026-04-14: ₹3,300
  * Payment entry `ACC-PAY-2026-04937` on 2026-05-11: ₹800
  * Payment entry `ACC-PAY-2026-04938` on 2026-05-11: ₹2,500
  * Payment entry `ACC-PAY-2026-05381` on 2026-06-02: ₹800
  * Payment entry `ACC-PAY-2026-05382` on 2026-06-02: ₹1,535
  * Payment entry `ACC-PAY-2026-06476` on 2026-07-08: ₹1,765
  * Payment entry `ACC-PAY-2026-06479` on 2026-07-08: ₹2,070

#### `FU-2026-01949` - VARADHA V
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:37:00
- **Claimed amount:** ₹465
- **Actual payment entries in system:** ₹8,230
  * Payment entry `ACC-PAY-2026-04346` on 2026-04-14: ₹1,230
  * Payment entry `ACC-PAY-2026-04347` on 2026-04-14: ₹770
  * Payment entry `ACC-PAY-2026-04939` on 2026-05-11: ₹1,230
  * Payment entry `ACC-PAY-2026-04940` on 2026-05-11: ₹570
  * Payment entry `ACC-PAY-2026-05384` on 2026-06-02: ₹1,430
  * Payment entry `ACC-PAY-2026-05385` on 2026-06-02: ₹1,535
  * Payment entry `ACC-PAY-2026-06477` on 2026-07-08: ₹465
  * Payment entry `ACC-PAY-2026-06478` on 2026-07-08: ₹1,000

#### `FU-2026-01950` - VARADHA V
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 11:37:00
- **Claimed amount:** ₹1,000
- **Actual payment entries in system:** ₹8,230
  * Payment entry `ACC-PAY-2026-04346` on 2026-04-14: ₹1,230
  * Payment entry `ACC-PAY-2026-04347` on 2026-04-14: ₹770
  * Payment entry `ACC-PAY-2026-04939` on 2026-05-11: ₹1,230
  * Payment entry `ACC-PAY-2026-04940` on 2026-05-11: ₹570
  * Payment entry `ACC-PAY-2026-05384` on 2026-06-02: ₹1,430
  * Payment entry `ACC-PAY-2026-05385` on 2026-06-02: ₹1,535
  * Payment entry `ACC-PAY-2026-06477` on 2026-07-08: ₹465
  * Payment entry `ACC-PAY-2026-06478` on 2026-07-08: ₹1,000

#### `FU-2026-01962` - OMAR DHAYAN P S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 13:12:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹7,200
  * Payment entry `ACC-PAY-2026-04964` on 2026-05-12: ₹2,400
  * Payment entry `ACC-PAY-2026-06480-1` on 2026-06-27: ₹2,400
  * Payment entry `ACC-PAY-2026-06913-1` on 2026-07-08: ₹2,400

#### `FU-2026-01963` - SHIVARCHANA A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 13:13:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-05123` on 2026-05-20: ₹2,400
  * Payment entry `ACC-PAY-2026-06481-2` on 2026-07-07: ₹2,400

#### `FU-2026-01964` - MOHAMMED ZIYA M H
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 13:13:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,000
  * Payment entry `ACC-PAY-2026-04556` on 2026-04-22: ₹800
  * Payment entry `ACC-PAY-2026-04557` on 2026-04-22: ₹200
  * Payment entry `ACC-PAY-2026-05391` on 2026-06-02: ₹1,000
  * Payment entry `ACC-PAY-2026-06484` on 2026-07-08: ₹2,000

#### `FU-2026-01965` - NATASHA SHIHAB
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 13:13:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04250` on 2026-04-13: ₹3,300
  * Payment entry `ACC-PAY-2026-04794` on 2026-05-06: ₹3,300
  * Payment entry `ACC-PAY-2026-06485` on 2026-07-08: ₹3,300
  * Payment entry `ACC-PAY-2026-06486` on 2026-07-08: ₹3,300

#### `FU-2026-01968` - MARY ELSA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 13:13:00
- **Claimed amount:** ₹2,050
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04209` on 2026-04-12: ₹3,300
  * Payment entry `ACC-PAY-2026-05625` on 2026-06-09: ₹2,050
  * Payment entry `ACC-PAY-2026-05626` on 2026-06-09: ₹1,250
  * Payment entry `ACC-PAY-2026-06178-1` on 2026-06-28: ₹2,050
  * Payment entry `ACC-PAY-2026-06179-1` on 2026-06-28: ₹1,250
  * Payment entry `ACC-PAY-2026-06488-1` on 2026-07-07: ₹2,050
  * Payment entry `ACC-PAY-2026-06489-2` on 2026-07-07: ₹1,250

#### `FU-2026-01970` - CARMEL JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 13:14:00
- **Claimed amount:** ₹2,050
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04210` on 2026-04-12: ₹2,050
  * Payment entry `ACC-PAY-2026-04211` on 2026-04-12: ₹1,250
  * Payment entry `ACC-PAY-2026-05627` on 2026-06-09: ₹2,050
  * Payment entry `ACC-PAY-2026-05628` on 2026-06-09: ₹1,250
  * Payment entry `ACC-PAY-2026-06176-1` on 2026-06-28: ₹2,050
  * Payment entry `ACC-PAY-2026-06177-1` on 2026-06-28: ₹1,250
  * Payment entry `ACC-PAY-2026-06490-2` on 2026-07-07: ₹2,050
  * Payment entry `ACC-PAY-2026-06491-1` on 2026-07-07: ₹1,250

#### `FU-2026-02032` - ALWIN WILSON
- **Logged by:** sneha.smartup@gmail.com on 2026-07-08 16:26:00
- **Claimed amount:** ₹3,200
- **Actual payment entries in system:** ₹6,400
  * Payment entry `ACC-PAY-2026-04987` on 2026-05-13: ₹3,200
  * Payment entry `ACC-PAY-2026-06498` on 2026-07-08: ₹3,200

#### `FU-2026-02189` - FLEVIN C T
- **Logged by:** sneha.smartup@gmail.com on 2026-07-11 09:41:00
- **Claimed amount:** ₹800
- **Actual payment entries in system:** ₹8,300
  * Payment entry `ACC-PAY-2026-04472` on 2026-04-20: ₹2,000
  * Payment entry `ACC-PAY-2026-04738` on 2026-05-04: ₹1,300
  * Payment entry `ACC-PAY-2026-05711` on 2026-06-10: ₹2,500
  * Payment entry `ACC-PAY-2026-06585` on 2026-07-10: ₹800
  * Payment entry `ACC-PAY-2026-06586` on 2026-07-10: ₹1,700

#### `FU-2026-02190` - FLEVIN C T
- **Logged by:** sneha.smartup@gmail.com on 2026-07-11 09:41:00
- **Claimed amount:** ₹1,700
- **Actual payment entries in system:** ₹8,300
  * Payment entry `ACC-PAY-2026-04472` on 2026-04-20: ₹2,000
  * Payment entry `ACC-PAY-2026-04738` on 2026-05-04: ₹1,300
  * Payment entry `ACC-PAY-2026-05711` on 2026-06-10: ₹2,500
  * Payment entry `ACC-PAY-2026-06585` on 2026-07-10: ₹800
  * Payment entry `ACC-PAY-2026-06586` on 2026-07-10: ₹1,700

#### `FU-2026-02192` - PARVATINANDA V
- **Logged by:** sneha.smartup@gmail.com on 2026-07-11 09:41:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-05799` on 2026-06-11: ₹2,500
  * Payment entry `ACC-PAY-2026-06587` on 2026-07-10: ₹2,500

#### `FU-2026-02193` - MOHAMMED RAIHAN C S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-11 09:42:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹10,100
  * Payment entry `ACC-PAY-2026-04482` on 2026-04-20: ₹5,900
  * Payment entry `ACC-PAY-2026-06565` on 2026-07-09: ₹4,200

#### `FU-2026-02245` - ADHIDEV P B
- **Logged by:** sneha.smartup@gmail.com on 2026-07-11 14:33:00
- **Claimed amount:** ₹3,000
- **Actual payment entries in system:** ₹9,000
  * Payment entry `ACC-PAY-2026-04499` on 2026-04-21: ₹3,000
  * Payment entry `ACC-PAY-2026-05142` on 2026-05-21: ₹3,000
  * Payment entry `ACC-PAY-2026-06618` on 2026-07-11: ₹3,000

#### `FU-2026-02378` - ALKA MARIA SEBASTIAN
- **Logged by:** sneha.smartup@gmail.com on 2026-07-14 09:43:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-04050` on 2026-04-06: ₹3,300
  * Payment entry `ACC-PAY-2026-05027` on 2026-05-15: ₹3,300
  * Payment entry `ACC-PAY-2026-05840` on 2026-06-15: ₹3,300
  * Payment entry `ACC-PAY-2026-06702` on 2026-07-14: ₹3,300

#### `FU-2026-02383` - ALDRIN THOMAS O A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-14 09:44:00
- **Claimed amount:** ₹14,000
- **Actual payment entries in system:** ₹15,000
  * Payment entry `ACC-PAY-2026-06049` on 2026-06-23: ₹1,000
  * Payment entry `ACC-PAY-2026-06679` on 2026-07-13: ₹14,000

#### `FU-2026-02396` - YOHAAN T B
- **Logged by:** sneha.smartup@gmail.com on 2026-07-14 09:46:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03904` on 2026-03-17: ₹3,300
  * Payment entry `ACC-PAY-2026-05228` on 2026-05-30: ₹3,300
  * Payment entry `ACC-PAY-2026-05837` on 2026-06-15: ₹3,300
  * Payment entry `ACC-PAY-2026-06644` on 2026-07-12: ₹3,300

#### `FU-2026-02397` - C S ESHA MEHARIN
- **Logged by:** sneha.smartup@gmail.com on 2026-07-14 09:46:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04587` on 2026-04-23: ₹2,400
  * Payment entry `ACC-PAY-2026-04895` on 2026-05-10: ₹2,400
  * Payment entry `ACC-PAY-2026-05557` on 2026-06-06: ₹2,400
  * Payment entry `ACC-PAY-2026-06646` on 2026-07-12: ₹2,400

#### `FU-2026-02513` - YASEEN T A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:27:00
- **Claimed amount:** ₹2,300
- **Actual payment entries in system:** ₹4,700
  * Payment entry `ACC-PAY-2026-05332` on 2026-06-02: ₹2,400
  * Payment entry `ACC-PAY-2026-06750` on 2026-07-15: ₹2,300

#### `FU-2026-02515` - AMITH KRISHNA PS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:27:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,000
  * Payment entry `ACC-PAY-2026-05007` on 2026-05-14: ₹2,000
  * Payment entry `ACC-PAY-2026-06751` on 2026-07-15: ₹2,000

#### `FU-2026-02517` - SAYANORA SHANAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:27:00
- **Claimed amount:** ₹1,600
- **Actual payment entries in system:** ₹8,000
  * Payment entry `ACC-PAY-2026-04236` on 2026-04-13: ₹2,000
  * Payment entry `ACC-PAY-2026-05893` on 2026-06-16: ₹1,300
  * Payment entry `ACC-PAY-2026-05894` on 2026-06-16: ₹1,700
  * Payment entry `ACC-PAY-2026-06752` on 2026-07-15: ₹1,600
  * Payment entry `ACC-PAY-2026-06753` on 2026-07-15: ₹1,400

#### `FU-2026-02519` - SAYANORA SHANAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:27:00
- **Claimed amount:** ₹1,400
- **Actual payment entries in system:** ₹8,000
  * Payment entry `ACC-PAY-2026-04236` on 2026-04-13: ₹2,000
  * Payment entry `ACC-PAY-2026-05893` on 2026-06-16: ₹1,300
  * Payment entry `ACC-PAY-2026-05894` on 2026-06-16: ₹1,700
  * Payment entry `ACC-PAY-2026-06752` on 2026-07-15: ₹1,600
  * Payment entry `ACC-PAY-2026-06753` on 2026-07-15: ₹1,400

#### `FU-2026-02526` - SUHANA P M
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:28:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹9,800
  * Payment entry `ACC-PAY-2026-04057` on 2026-04-06: ₹999
  * Payment entry `ACC-PAY-2026-04971` on 2026-05-12: ₹2,301
  * Payment entry `ACC-PAY-2026-05191` on 2026-05-25: ₹500
  * Payment entry `ACC-PAY-2026-05839` on 2026-06-15: ₹1,000
  * Payment entry `ACC-PAY-2026-06754-1` on 2026-07-09: ₹2,000
  * Payment entry `ACC-PAY-2026-07183` on 2026-08-01: ₹1,800
  * Payment entry `ACC-PAY-2026-07184` on 2026-08-01: ₹1,200

#### `FU-2026-02528` - MOHAMMED MISHUB C A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:28:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹7,200
  * Payment entry `ACC-PAY-2026-04036` on 2026-04-06: ₹2,400
  * Payment entry `ACC-PAY-2026-05527` on 2026-06-05: ₹2,400
  * Payment entry `ACC-PAY-2026-06755-2` on 2026-07-04: ₹2,400

#### `FU-2026-02532` - MOHAMMED RIZWAN
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:29:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹6,500
  * Payment entry `ACC-PAY-2026-04238` on 2026-04-13: ₹2,000
  * Payment entry `ACC-PAY-2026-05611` on 2026-06-09: ₹1,300
  * Payment entry `ACC-PAY-2026-05612` on 2026-06-09: ₹700
  * Payment entry `ACC-PAY-2026-06776` on 2026-07-15: ₹2,500

#### `FU-2026-02535` - ANN MARY
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:29:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,800
  * Payment entry `ACC-PAY-2026-03930` on 2026-03-25: ₹3,300
  * Payment entry `ACC-PAY-2026-04972` on 2026-05-12: ₹3,300
  * Payment entry `ACC-PAY-2026-06722` on 2026-07-14: ₹3,300
  * Payment entry `ACC-PAY-2026-06723` on 2026-07-14: ₹200
  * Payment entry `ACC-PAY-2026-07228` on 2026-08-03: ₹3,100
  * Payment entry `ACC-PAY-2026-07229` on 2026-08-03: ₹600

#### `FU-2026-02537` - ANN MARY
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:29:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹13,800
  * Payment entry `ACC-PAY-2026-03930` on 2026-03-25: ₹3,300
  * Payment entry `ACC-PAY-2026-04972` on 2026-05-12: ₹3,300
  * Payment entry `ACC-PAY-2026-06722` on 2026-07-14: ₹3,300
  * Payment entry `ACC-PAY-2026-06723` on 2026-07-14: ₹200
  * Payment entry `ACC-PAY-2026-07228` on 2026-08-03: ₹3,100
  * Payment entry `ACC-PAY-2026-07229` on 2026-08-03: ₹600

#### `FU-2026-02542` - FATHIMA FAIZA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:30:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹6,000
  * Payment entry `ACC-PAY-2026-03974` on 2026-04-02: ₹2,000
  * Payment entry `ACC-PAY-2026-05979` on 2026-06-18: ₹2,000
  * Payment entry `ACC-PAY-2026-06733` on 2026-07-14: ₹2,000

#### `FU-2026-02545` - AFRA NAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:31:00
- **Claimed amount:** ₹2,700
- **Actual payment entries in system:** ₹8,500
  * Payment entry `ACC-PAY-2026-04133` on 2026-04-08: ₹1,000
  * Payment entry `ACC-PAY-2026-04606` on 2026-04-24: ₹1,000
  * Payment entry `ACC-PAY-2026-05185` on 2026-05-23: ₹2,100
  * Payment entry `ACC-PAY-2026-05186` on 2026-05-23: ₹400
  * Payment entry `ACC-PAY-2026-05231` on 2026-05-30: ₹1,000
  * Payment entry `ACC-PAY-2026-06734` on 2026-07-14: ₹2,700
  * Payment entry `ACC-PAY-2026-06735` on 2026-07-14: ₹300

#### `FU-2026-02547` - AFRA NAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:31:00
- **Claimed amount:** ₹300
- **Actual payment entries in system:** ₹8,500
  * Payment entry `ACC-PAY-2026-04133` on 2026-04-08: ₹1,000
  * Payment entry `ACC-PAY-2026-04606` on 2026-04-24: ₹1,000
  * Payment entry `ACC-PAY-2026-05185` on 2026-05-23: ₹2,100
  * Payment entry `ACC-PAY-2026-05186` on 2026-05-23: ₹400
  * Payment entry `ACC-PAY-2026-05231` on 2026-05-30: ₹1,000
  * Payment entry `ACC-PAY-2026-06734` on 2026-07-14: ₹2,700
  * Payment entry `ACC-PAY-2026-06735` on 2026-07-14: ₹300

#### `FU-2026-02548` - ABHIRAMI NS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:31:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹6,600
  * Payment entry `ACC-PAY-2026-04982` on 2026-05-13: ₹4,200
  * Payment entry `ACC-PAY-2026-06736` on 2026-07-14: ₹2,400

#### `FU-2026-02558` - AFREEN K A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:33:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-05431` on 2026-06-03: ₹2,400
  * Payment entry `ACC-PAY-2026-06739` on 2026-07-14: ₹2,400

#### `FU-2026-02560` - MOHAMMED THAMEEZ A T
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:33:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04208` on 2026-04-12: ₹3,300
  * Payment entry `ACC-PAY-2026-05705` on 2026-06-10: ₹3,300
  * Payment entry `ACC-PAY-2026-06740` on 2026-07-14: ₹3,300

#### `FU-2026-02565` - DIYA DHANESH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:33:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04726` on 2026-05-04: ₹2,400
  * Payment entry `ACC-PAY-2026-05327` on 2026-06-02: ₹2,400
  * Payment entry `ACC-PAY-2026-06742` on 2026-07-14: ₹2,400
  * Payment entry `ACC-PAY-2026-07197` on 2026-08-01: ₹2,400

#### `FU-2026-02568` - DEVANANDA C A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:34:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹7,300
  * Payment entry `ACC-PAY-2026-04474` on 2026-04-20: ₹2,400
  * Payment entry `ACC-PAY-2026-05254` on 2026-06-01: ₹2,400
  * Payment entry `ACC-PAY-2026-06743` on 2026-07-14: ₹2,400
  * Payment entry `ACC-PAY-2026-06744` on 2026-07-14: ₹100

#### `FU-2026-02569` - DEVANANDA C A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:34:00
- **Claimed amount:** ₹100
- **Actual payment entries in system:** ₹7,300
  * Payment entry `ACC-PAY-2026-04474` on 2026-04-20: ₹2,400
  * Payment entry `ACC-PAY-2026-05254` on 2026-06-01: ₹2,400
  * Payment entry `ACC-PAY-2026-06743` on 2026-07-14: ₹2,400
  * Payment entry `ACC-PAY-2026-06744` on 2026-07-14: ₹100

#### `FU-2026-02570` - FIDHA FATHIMA M N
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:34:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-04888` on 2026-05-09: ₹2,400
  * Payment entry `ACC-PAY-2026-04889` on 2026-05-09: ₹100
  * Payment entry `ACC-PAY-2026-06747` on 2026-07-14: ₹2,300
  * Payment entry `ACC-PAY-2026-06748` on 2026-07-14: ₹200

#### `FU-2026-02573` - ANDRIYA MARIYA P J
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:34:00
- **Claimed amount:** ₹2,600
- **Actual payment entries in system:** ₹5,200
  * Payment entry `ACC-PAY-2026-05802` on 2026-06-11: ₹2,600
  * Payment entry `ACC-PAY-2026-06745` on 2026-07-14: ₹2,600

#### `FU-2026-02575` - HIZBA FATHIMA M B
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:35:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-05023` on 2026-04-17: ₹5,000
  * Payment entry `ACC-PAY-2026-05784` on 2026-06-11: ₹3,300
  * Payment entry `ACC-PAY-2026-06462` on 2026-07-07: ₹3,900
  * Payment entry `ACC-PAY-2026-06746-1` on 2026-07-07: ₹2,000

#### `FU-2026-02581` - FIDHA FATHIMA M N
- **Logged by:** sneha.smartup@gmail.com on 2026-07-15 16:35:00
- **Claimed amount:** ₹2,300
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-04888` on 2026-05-09: ₹2,400
  * Payment entry `ACC-PAY-2026-04889` on 2026-05-09: ₹100
  * Payment entry `ACC-PAY-2026-06747` on 2026-07-14: ₹2,300
  * Payment entry `ACC-PAY-2026-06748` on 2026-07-14: ₹200

#### `FU-2026-02619` - HIZBA HAMDA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-17 10:32:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹8,400
  * Payment entry `ACC-PAY-2026-03995` on 2026-04-04: ₹3,000
  * Payment entry `ACC-PAY-2026-04654` on 2026-04-28: ₹1,200
  * Payment entry `ACC-PAY-2026-06807-3` on 2026-07-15: ₹4,200

#### `FU-2026-02621` - MANHA SIRAJ
- **Logged by:** sneha.smartup@gmail.com on 2026-07-17 10:33:00
- **Claimed amount:** ₹5,900
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-03935` on 2026-03-26: ₹3,000
  * Payment entry `ACC-PAY-2026-04235` on 2026-04-13: ₹2,000
  * Payment entry `ACC-PAY-2026-04791` on 2026-05-05: ₹3,300
  * Payment entry `ACC-PAY-2026-06812` on 2026-07-17: ₹5,900

#### `FU-2026-02622` - MUHAMMED HABEEB MANSHAD
- **Logged by:** sneha.smartup@gmail.com on 2026-07-17 10:33:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04709` on 2026-05-02: ₹3,300
  * Payment entry `ACC-PAY-2026-05942` on 2026-06-17: ₹3,300
  * Payment entry `ACC-PAY-2026-06816` on 2026-07-17: ₹3,300

#### `FU-2026-02623` - ANYA ROBIN
- **Logged by:** sneha.smartup@gmail.com on 2026-07-17 10:34:00
- **Claimed amount:** ₹3,000
- **Actual payment entries in system:** ₹11,300
  * Payment entry `ACC-PAY-2026-04711` on 2026-05-02: ₹8,300
  * Payment entry `ACC-PAY-2026-06805` on 2026-07-15: ₹3,000

#### `FU-2026-02625` - ADWIN SAM PAUL
- **Logged by:** sneha.smartup@gmail.com on 2026-07-17 10:35:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹6,600
  * Payment entry `ACC-PAY-2026-05456` on 2026-06-03: ₹3,300
  * Payment entry `ACC-PAY-2026-06806` on 2026-07-15: ₹3,300

#### `FU-2026-02700` - AKASH P V
- **Logged by:** sneha.smartup@gmail.com on 2026-07-18 11:23:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04577` on 2026-04-23: ₹2,400
  * Payment entry `ACC-PAY-2026-05139` on 2026-05-21: ₹2,400
  * Payment entry `ACC-PAY-2026-05901` on 2026-06-16: ₹2,400
  * Payment entry `ACC-PAY-2026-06827` on 2026-07-18: ₹2,400

#### `FU-2026-02701` - NAHIL K N
- **Logged by:** sneha.smartup@gmail.com on 2026-07-18 11:24:00
- **Claimed amount:** ₹2,200
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-03966` on 2026-04-01: ₹1,999
  * Payment entry `ACC-PAY-2026-05207` on 2026-05-25: ₹400
  * Payment entry `ACC-PAY-2026-05208` on 2026-05-25: ₹2,400
  * Payment entry `ACC-PAY-2026-05209` on 2026-05-25: ₹100
  * Payment entry `ACC-PAY-2026-06132` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06133` on 2026-06-26: ₹1
  * Payment entry `ACC-PAY-2026-06134` on 2026-06-26: ₹200
  * Payment entry `ACC-PAY-2026-06821` on 2026-07-17: ₹2,200
  * Payment entry `ACC-PAY-2026-06822` on 2026-07-17: ₹300

#### `FU-2026-02703` - NAHIL K N
- **Logged by:** sneha.smartup@gmail.com on 2026-07-18 11:24:00
- **Claimed amount:** ₹300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-03966` on 2026-04-01: ₹1,999
  * Payment entry `ACC-PAY-2026-05207` on 2026-05-25: ₹400
  * Payment entry `ACC-PAY-2026-05208` on 2026-05-25: ₹2,400
  * Payment entry `ACC-PAY-2026-05209` on 2026-05-25: ₹100
  * Payment entry `ACC-PAY-2026-06132` on 2026-06-26: ₹2,300
  * Payment entry `ACC-PAY-2026-06133` on 2026-06-26: ₹1
  * Payment entry `ACC-PAY-2026-06134` on 2026-06-26: ₹200
  * Payment entry `ACC-PAY-2026-06821` on 2026-07-17: ₹2,200
  * Payment entry `ACC-PAY-2026-06822` on 2026-07-17: ₹300

#### `FU-2026-02705` - MESEL LIJU
- **Logged by:** sneha.smartup@gmail.com on 2026-07-18 11:24:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04309` on 2026-04-13: ₹2,400
  * Payment entry `ACC-PAY-2026-04705` on 2026-05-02: ₹2,400
  * Payment entry `ACC-PAY-2026-06823` on 2026-07-17: ₹2,400
  * Payment entry `ACC-PAY-2026-06874` on 2026-07-20: ₹2,400

#### `FU-2026-02757` - AMAN SHAKEER K
- **Logged by:** sneha.smartup@gmail.com on 2026-07-20 14:02:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04569` on 2026-04-23: ₹2,500
  * Payment entry `ACC-PAY-2026-05365` on 2026-06-02: ₹2,500
  * Payment entry `ACC-PAY-2026-05902` on 2026-06-16: ₹2,500
  * Payment entry `ACC-PAY-2026-06834` on 2026-07-18: ₹2,500

#### `FU-2026-02758` - EMMANUEL ABY GEORGE
- **Logged by:** sneha.smartup@gmail.com on 2026-07-20 14:03:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03936` on 2026-03-26: ₹2,000
  * Payment entry `ACC-PAY-2026-04335` on 2026-04-14: ₹1,300
  * Payment entry `ACC-PAY-2026-05966` on 2026-05-15: ₹3,300
  * Payment entry `ACC-PAY-2026-05993` on 2026-06-20: ₹3,300
  * Payment entry `ACC-PAY-2026-06855` on 2026-07-19: ₹3,300

#### `FU-2026-02759` - ANISTA P S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-20 14:03:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹10,100
  * Payment entry `ACC-PAY-2026-04123` on 2026-04-08: ₹2,000
  * Payment entry `ACC-PAY-2026-04243` on 2026-04-13: ₹3,900
  * Payment entry `ACC-PAY-2026-06860` on 2026-07-20: ₹4,200

#### `FU-2026-02760` - MESEL LIJU
- **Logged by:** sneha.smartup@gmail.com on 2026-07-20 14:24:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04309` on 2026-04-13: ₹2,400
  * Payment entry `ACC-PAY-2026-04705` on 2026-05-02: ₹2,400
  * Payment entry `ACC-PAY-2026-06823` on 2026-07-17: ₹2,400
  * Payment entry `ACC-PAY-2026-06874` on 2026-07-20: ₹2,400

#### `FU-2026-02781` - ANTONY RAPHEL P P
- **Logged by:** sneha.smartup@gmail.com on 2026-07-21 13:09:00
- **Claimed amount:** ₹5,900
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04483` on 2026-04-20: ₹8,300
  * Payment entry `ACC-PAY-2026-06901-1` on 2026-07-15: ₹5,900

#### `FU-2026-02782` - MOHAMMED ZAYAN V Z
- **Logged by:** sneha.smartup@gmail.com on 2026-07-21 13:10:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04902` on 2026-05-11: ₹1,000
  * Payment entry `ACC-PAY-2026-04949` on 2026-05-12: ₹2,300
  * Payment entry `ACC-PAY-2026-05830` on 2026-06-14: ₹3,300
  * Payment entry `ACC-PAY-2026-06910-1` on 2026-07-13: ₹3,300

#### `FU-2026-02784` - EMLIN MARIYA PHILOMINA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-21 13:10:00
- **Claimed amount:** ₹900
- **Actual payment entries in system:** ₹5,400
  * Payment entry `ACC-PAY-2026-04323` on 2026-04-14: ₹999
  * Payment entry `ACC-PAY-2026-04744` on 2026-05-04: ₹1,401
  * Payment entry `ACC-PAY-2026-05793` on 2026-06-11: ₹1,500
  * Payment entry `ACC-PAY-2026-06911-1` on 2026-07-02: ₹900
  * Payment entry `ACC-PAY-2026-06912-1` on 2026-07-02: ₹600

#### `FU-2026-02786` - EMLIN MARIYA PHILOMINA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-21 13:11:00
- **Claimed amount:** ₹600
- **Actual payment entries in system:** ₹5,400
  * Payment entry `ACC-PAY-2026-04323` on 2026-04-14: ₹999
  * Payment entry `ACC-PAY-2026-04744` on 2026-05-04: ₹1,401
  * Payment entry `ACC-PAY-2026-05793` on 2026-06-11: ₹1,500
  * Payment entry `ACC-PAY-2026-06911-1` on 2026-07-02: ₹900
  * Payment entry `ACC-PAY-2026-06912-1` on 2026-07-02: ₹600

#### `FU-2026-02810` - ALPHONSA HAIDUS SERA
- **Logged by:** sneha.smartup@gmail.com on 2026-07-22 09:03:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04792` on 2026-05-06: ₹2,500
  * Payment entry `ACC-PAY-2026-05878` on 2026-06-16: ₹2,500
  * Payment entry `ACC-PAY-2026-06129` on 2026-06-26: ₹2,500
  * Payment entry `ACC-PAY-2026-06923` on 2026-07-21: ₹2,500

#### `FU-2026-02873` - SHIFAS A S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-22 17:12:00
- **Claimed amount:** ₹4,500
- **Actual payment entries in system:** ₹10,800
  * Payment entry `ACC-PAY-2026-04198` on 2026-04-11: ₹4,000
  * Payment entry `ACC-PAY-2026-05092` on 2026-05-19: ₹2,300
  * Payment entry `ACC-PAY-2026-06933` on 2026-07-22: ₹4,500

#### `FU-2026-02875` - AJMAL T S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-22 17:12:00
- **Claimed amount:** ₹600
- **Actual payment entries in system:** ₹10,500
  * Payment entry `ACC-PAY-2026-05121` on 2026-05-20: ₹2,000
  * Payment entry `ACC-PAY-2026-05206` on 2026-05-25: ₹1,300
  * Payment entry `ACC-PAY-2026-06046` on 2026-06-23: ₹3,300
  * Payment entry `ACC-PAY-2026-06047` on 2026-06-23: ₹300
  * Payment entry `ACC-PAY-2026-06930-1` on 2026-07-22: ₹2,000
  * Payment entry `ACC-PAY-2026-06931-1` on 2026-07-22: ₹1,000
  * Payment entry `ACC-PAY-2026-06932-1` on 2026-07-22: ₹600

#### `FU-2026-02876` - AJMAL T S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-22 17:12:00
- **Claimed amount:** ₹1,000
- **Actual payment entries in system:** ₹10,500
  * Payment entry `ACC-PAY-2026-05121` on 2026-05-20: ₹2,000
  * Payment entry `ACC-PAY-2026-05206` on 2026-05-25: ₹1,300
  * Payment entry `ACC-PAY-2026-06046` on 2026-06-23: ₹3,300
  * Payment entry `ACC-PAY-2026-06047` on 2026-06-23: ₹300
  * Payment entry `ACC-PAY-2026-06930-1` on 2026-07-22: ₹2,000
  * Payment entry `ACC-PAY-2026-06931-1` on 2026-07-22: ₹1,000
  * Payment entry `ACC-PAY-2026-06932-1` on 2026-07-22: ₹600

#### `FU-2026-02878` - AJMAL T S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-22 17:12:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹10,500
  * Payment entry `ACC-PAY-2026-05121` on 2026-05-20: ₹2,000
  * Payment entry `ACC-PAY-2026-05206` on 2026-05-25: ₹1,300
  * Payment entry `ACC-PAY-2026-06046` on 2026-06-23: ₹3,300
  * Payment entry `ACC-PAY-2026-06047` on 2026-06-23: ₹300
  * Payment entry `ACC-PAY-2026-06930-1` on 2026-07-22: ₹2,000
  * Payment entry `ACC-PAY-2026-06931-1` on 2026-07-22: ₹1,000
  * Payment entry `ACC-PAY-2026-06932-1` on 2026-07-22: ₹600

#### `FU-2026-02891` - SANKIRTHANA S KAMMATH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-23 09:22:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,000
  * Payment entry `ACC-PAY-2026-06023` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-06936` on 2026-07-22: ₹2,000

#### `FU-2026-03102` - AAYISHA ZEHAN
- **Logged by:** sneha.smartup@gmail.com on 2026-07-28 10:33:00
- **Claimed amount:** ₹1,900
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04004` on 2026-04-04: ₹5,000
  * Payment entry `ACC-PAY-2026-04572` on 2026-04-23: ₹3,300
  * Payment entry `ACC-PAY-2026-05188` on 2026-05-25: ₹2,000
  * Payment entry `ACC-PAY-2026-06056` on 2026-06-23: ₹2,000
  * Payment entry `ACC-PAY-2026-07012` on 2026-07-27: ₹1,900

#### `FU-2026-03105` - SHAJAS K S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-28 10:33:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹16,500
  * Payment entry `ACC-PAY-2026-04861` on 2026-05-07: ₹3,300
  * Payment entry `ACC-PAY-2026-05171` on 2026-05-23: ₹3,300
  * Payment entry `ACC-PAY-2026-05556` on 2026-06-06: ₹3,300
  * Payment entry `ACC-PAY-2026-07017` on 2026-07-27: ₹3,300
  * Payment entry `ACC-PAY-2026-07018` on 2026-07-27: ₹3,300

#### `FU-2026-03106` - SHAJAS K S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-28 10:34:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹16,500
  * Payment entry `ACC-PAY-2026-04861` on 2026-05-07: ₹3,300
  * Payment entry `ACC-PAY-2026-05171` on 2026-05-23: ₹3,300
  * Payment entry `ACC-PAY-2026-05556` on 2026-06-06: ₹3,300
  * Payment entry `ACC-PAY-2026-07017` on 2026-07-27: ₹3,300
  * Payment entry `ACC-PAY-2026-07018` on 2026-07-27: ₹3,300

#### `FU-2026-03158` - HAYA ZARA RAFEEK
- **Logged by:** sneha.smartup@gmail.com on 2026-07-28 13:18:00
- **Claimed amount:** ₹500
- **Actual payment entries in system:** ₹7,500
  * Payment entry `ACC-PAY-2026-04969` on 2026-05-12: ₹2,500
  * Payment entry `ACC-PAY-2026-05992` on 2026-06-19: ₹2,500
  * Payment entry `ACC-PAY-2026-07024-1` on 2026-07-27: ₹2,000
  * Payment entry `ACC-PAY-2026-07025-3` on 2026-07-27: ₹500

#### `FU-2026-03159` - HANAN FATHIMA A A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-28 13:19:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹8,000
  * Payment entry `ACC-PAY-2026-04367` on 2026-04-16: ₹2,000
  * Payment entry `ACC-PAY-2026-05242` on 2026-05-30: ₹2,000
  * Payment entry `ACC-PAY-2026-05908` on 2026-06-17: ₹2,000
  * Payment entry `ACC-PAY-2026-07026-1` on 2026-07-18: ₹2,000

#### `FU-2026-03188` - HAYA ZARA RAFEEK
- **Logged by:** sneha.smartup@gmail.com on 2026-07-28 16:09:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹7,500
  * Payment entry `ACC-PAY-2026-04969` on 2026-05-12: ₹2,500
  * Payment entry `ACC-PAY-2026-05992` on 2026-06-19: ₹2,500
  * Payment entry `ACC-PAY-2026-07024-1` on 2026-07-27: ₹2,000
  * Payment entry `ACC-PAY-2026-07025-3` on 2026-07-27: ₹500

#### `FU-2026-03284` - ANIKESH RAO
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 09:01:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹7,200
  * Payment entry `ACC-PAY-2026-05172` on 2026-05-23: ₹2,400
  * Payment entry `ACC-PAY-2026-05173` on 2026-05-23: ₹100
  * Payment entry `ACC-PAY-2026-06073` on 2026-06-23: ₹2,300
  * Payment entry `ACC-PAY-2026-07111` on 2026-07-29: ₹2,400

#### `FU-2026-03285` - NIVEDITHA N
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 09:01:00
- **Claimed amount:** ₹5,900
- **Actual payment entries in system:** ₹11,830
  * Payment entry `ACC-PAY-2026-04478` on 2026-04-20: ₹5,930
  * Payment entry `ACC-PAY-2026-07105-1` on 2026-07-29: ₹5,900

#### `FU-2026-03367` - FIDHA FATHIMA A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 11:37:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹10,100
  * Payment entry `ACC-PAY-2026-04593` on 2026-04-24: ₹5,900
  * Payment entry `ACC-PAY-2026-07118` on 2026-07-30: ₹4,200

#### `FU-2026-03375` - AKBAR NAVEED
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 12:51:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03952` on 2026-03-31: ₹1,000
  * Payment entry `ACC-PAY-2026-04595` on 2026-04-24: ₹2,300
  * Payment entry `ACC-PAY-2026-05210` on 2026-05-25: ₹3,300
  * Payment entry `ACC-PAY-2026-06199` on 2026-06-29: ₹3,300
  * Payment entry `ACC-PAY-2026-07119` on 2026-07-30: ₹3,300

#### `FU-2026-03376` - SHIZA BASHEER
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 12:52:00
- **Claimed amount:** ₹1,200
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04620` on 2026-04-25: ₹4,500
  * Payment entry `ACC-PAY-2026-04736` on 2026-05-04: ₹3,800
  * Payment entry `ACC-PAY-2026-04737` on 2026-05-04: ₹4,700
  * Payment entry `ACC-PAY-2026-07121` on 2026-07-30: ₹1,200

#### `FU-2026-03377` - MOHAMMED RASOOL AL AMEEN
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 12:52:00
- **Claimed amount:** ₹2,200
- **Actual payment entries in system:** ₹6,400
  * Payment entry `ACC-PAY-2026-04421` on 2026-04-17: ₹3,000
  * Payment entry `ACC-PAY-2026-04624` on 2026-04-27: ₹1,200
  * Payment entry `ACC-PAY-2026-07120` on 2026-07-30: ₹2,200

#### `FU-2026-03392` - RIZWANA S A
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 14:57:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹12,300
  * Payment entry `ACC-PAY-2026-03968` on 2026-04-01: ₹3,300
  * Payment entry `ACC-PAY-2026-05080` on 2026-05-19: ₹3,300
  * Payment entry `ACC-PAY-2026-05906` on 2026-06-17: ₹3,300
  * Payment entry `ACC-PAY-2026-07131` on 2026-07-30: ₹2,400

#### `FU-2026-03412` - ADHEEB RILLAH K U
- **Logged by:** sneha.smartup@gmail.com on 2026-07-30 15:41:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹8,000
  * Payment entry `ACC-PAY-2026-04156` on 2026-04-10: ₹2,000
  * Payment entry `ACC-PAY-2026-04799` on 2026-05-06: ₹2,000
  * Payment entry `ACC-PAY-2026-05614` on 2026-06-09: ₹100
  * Payment entry `ACC-PAY-2026-05615` on 2026-06-09: ₹1,900
  * Payment entry `ACC-PAY-2026-07137` on 2026-07-30: ₹2,000

#### `FU-2026-03439` - MOHAMMED FAYAZ SHANAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-31 11:46:00
- **Claimed amount:** ₹1,800
- **Actual payment entries in system:** ₹9,000
  * Payment entry `ACC-PAY-2026-04254` on 2026-04-13: ₹2,400
  * Payment entry `ACC-PAY-2026-04255` on 2026-04-13: ₹600
  * Payment entry `ACC-PAY-2026-04567` on 2026-04-23: ₹1,800
  * Payment entry `ACC-PAY-2026-04568` on 2026-04-23: ₹200
  * Payment entry `ACC-PAY-2026-05970` on 2026-06-18: ₹2,000
  * Payment entry `ACC-PAY-2026-07144` on 2026-07-31: ₹200
  * Payment entry `ACC-PAY-2026-07145` on 2026-07-31: ₹1,800

#### `FU-2026-03440` - MOHAMMED ASIF T S
- **Logged by:** sneha.smartup@gmail.com on 2026-07-31 11:47:00
- **Claimed amount:** ₹2,500
- **Actual payment entries in system:** ₹7,500
  * Payment entry `ACC-PAY-2026-04767` on 2026-05-05: ₹2,500
  * Payment entry `ACC-PAY-2026-05310` on 2026-06-01: ₹2,500
  * Payment entry `ACC-PAY-2026-07146` on 2026-07-31: ₹2,500

#### `FU-2026-03448` - MOHAMMED FAYAZ SHANAVAS
- **Logged by:** sneha.smartup@gmail.com on 2026-07-31 15:23:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹9,000
  * Payment entry `ACC-PAY-2026-04254` on 2026-04-13: ₹2,400
  * Payment entry `ACC-PAY-2026-04255` on 2026-04-13: ₹600
  * Payment entry `ACC-PAY-2026-04567` on 2026-04-23: ₹1,800
  * Payment entry `ACC-PAY-2026-04568` on 2026-04-23: ₹200
  * Payment entry `ACC-PAY-2026-05970` on 2026-06-18: ₹2,000
  * Payment entry `ACC-PAY-2026-07144` on 2026-07-31: ₹200
  * Payment entry `ACC-PAY-2026-07145` on 2026-07-31: ₹1,800

#### `FU-2026-03449` - SHAUN JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-07-31 15:24:00
- **Claimed amount:** ₹500
- **Actual payment entries in system:** ₹4,500
  * Payment entry `ACC-PAY-2026-06022` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-07155` on 2026-07-31: ₹500
  * Payment entry `ACC-PAY-2026-07156` on 2026-07-31: ₹2,000

#### `FU-2026-03535` - SUHANA P M
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 13:37:00
- **Claimed amount:** ₹1,800
- **Actual payment entries in system:** ₹9,800
  * Payment entry `ACC-PAY-2026-04057` on 2026-04-06: ₹999
  * Payment entry `ACC-PAY-2026-04971` on 2026-05-12: ₹2,301
  * Payment entry `ACC-PAY-2026-05191` on 2026-05-25: ₹500
  * Payment entry `ACC-PAY-2026-05839` on 2026-06-15: ₹1,000
  * Payment entry `ACC-PAY-2026-06754-1` on 2026-07-09: ₹2,000
  * Payment entry `ACC-PAY-2026-07183` on 2026-08-01: ₹1,800
  * Payment entry `ACC-PAY-2026-07184` on 2026-08-01: ₹1,200

#### `FU-2026-03536` - IAN PILLARD
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 13:38:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹13,200
  * Payment entry `ACC-PAY-2026-03953` on 2026-03-31: ₹3,300
  * Payment entry `ACC-PAY-2026-05245` on 2026-05-31: ₹3,300
  * Payment entry `ACC-PAY-2026-06290` on 2026-07-01: ₹3,300
  * Payment entry `ACC-PAY-2026-07186` on 2026-08-01: ₹3,300

#### `FU-2026-03537` - HIBA SAJEER
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 13:38:00
- **Claimed amount:** ₹4,500
- **Actual payment entries in system:** ₹9,900
  * Payment entry `ACC-PAY-2026-04625` on 2026-04-27: ₹5,400
  * Payment entry `ACC-PAY-2026-07193` on 2026-08-01: ₹4,500

#### `FU-2026-03540` - MUHAMMED FAIZ A
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 13:39:00
- **Claimed amount:** ₹1,800
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-04522` on 2026-04-21: ₹2,000
  * Payment entry `ACC-PAY-2026-05681` on 2026-06-09: ₹400
  * Payment entry `ACC-PAY-2026-05682` on 2026-06-09: ₹600
  * Payment entry `ACC-PAY-2026-07187` on 2026-08-01: ₹1,800
  * Payment entry `ACC-PAY-2026-07188` on 2026-08-01: ₹200

#### `FU-2026-03542` - SUHANA P M
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 15:47:00
- **Claimed amount:** ₹1,200
- **Actual payment entries in system:** ₹9,800
  * Payment entry `ACC-PAY-2026-04057` on 2026-04-06: ₹999
  * Payment entry `ACC-PAY-2026-04971` on 2026-05-12: ₹2,301
  * Payment entry `ACC-PAY-2026-05191` on 2026-05-25: ₹500
  * Payment entry `ACC-PAY-2026-05839` on 2026-06-15: ₹1,000
  * Payment entry `ACC-PAY-2026-06754-1` on 2026-07-09: ₹2,000
  * Payment entry `ACC-PAY-2026-07183` on 2026-08-01: ₹1,800
  * Payment entry `ACC-PAY-2026-07184` on 2026-08-01: ₹1,200

#### `FU-2026-03543` - NOORA SAJEER
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 14:18:00
- **Claimed amount:** ₹5,085
- **Actual payment entries in system:** ₹10,585
  * Payment entry `ACC-PAY-2026-04388` on 2026-04-17: ₹5,475
  * Payment entry `ACC-PAY-2026-07198` on 2026-08-01: ₹25
  * Payment entry `ACC-PAY-2026-07199` on 2026-08-01: ₹5,085

#### `FU-2026-03544` - DIYA DHANESH
- **Logged by:** sneha.smartup@gmail.com on 2026-08-01 14:19:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04726` on 2026-05-04: ₹2,400
  * Payment entry `ACC-PAY-2026-05327` on 2026-06-02: ₹2,400
  * Payment entry `ACC-PAY-2026-06742` on 2026-07-14: ₹2,400
  * Payment entry `ACC-PAY-2026-07197` on 2026-08-01: ₹2,400

#### `FU-2026-03551` - SIONA SIJOY
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:13:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹9,600
  * Payment entry `ACC-PAY-2026-04343` on 2026-04-14: ₹2,400
  * Payment entry `ACC-PAY-2026-05051` on 2026-05-18: ₹2,400
  * Payment entry `ACC-PAY-2026-06337` on 2026-07-02: ₹2,400
  * Payment entry `ACC-PAY-2026-07216` on 2026-08-02: ₹2,400

#### `FU-2026-03552` - RIHAN MOHAMMED C R
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:13:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹10,100
  * Payment entry `ACC-PAY-2026-04766` on 2026-05-05: ₹5,000
  * Payment entry `ACC-PAY-2026-05326` on 2026-06-02: ₹900
  * Payment entry `ACC-PAY-2026-07217` on 2026-08-03: ₹4,200

#### `FU-2026-03553` - MARZIYA P S
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:13:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹16,500
  * Payment entry `ACC-PAY-2026-04006` on 2026-04-04: ₹3,300
  * Payment entry `ACC-PAY-2026-04805` on 2026-05-06: ₹3,300
  * Payment entry `ACC-PAY-2026-05622` on 2026-06-09: ₹3,300
  * Payment entry `ACC-PAY-2026-06323` on 2026-07-02: ₹3,300
  * Payment entry `ACC-PAY-2026-07206` on 2026-08-01: ₹3,300

#### `FU-2026-03554` - MEHREEN ASHKER BABU
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:14:00
- **Claimed amount:** ₹2,370
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04342` on 2026-04-14: ₹4,500
  * Payment entry `ACC-PAY-2026-04353` on 2026-04-16: ₹1,430
  * Payment entry `ACC-PAY-2026-04354` on 2026-04-16: ₹2,370
  * Payment entry `ACC-PAY-2026-07204` on 2026-08-01: ₹3,530
  * Payment entry `ACC-PAY-2026-07205` on 2026-08-01: ₹2,370

#### `FU-2026-03555` - LAMIA ASHKER BABU
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:14:00
- **Claimed amount:** ₹2,370
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04341` on 2026-04-14: ₹4,500
  * Payment entry `ACC-PAY-2026-04351` on 2026-04-16: ₹1,430
  * Payment entry `ACC-PAY-2026-04352` on 2026-04-16: ₹2,370
  * Payment entry `ACC-PAY-2026-07202` on 2026-08-01: ₹3,530
  * Payment entry `ACC-PAY-2026-07203` on 2026-08-01: ₹2,370

#### `FU-2026-03556` - MUHAMMED FAIZ A
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:15:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹5,000
  * Payment entry `ACC-PAY-2026-04522` on 2026-04-21: ₹2,000
  * Payment entry `ACC-PAY-2026-05681` on 2026-06-09: ₹400
  * Payment entry `ACC-PAY-2026-05682` on 2026-06-09: ₹600
  * Payment entry `ACC-PAY-2026-07187` on 2026-08-01: ₹1,800
  * Payment entry `ACC-PAY-2026-07188` on 2026-08-01: ₹200

#### `FU-2026-03557` - HADI AFNAN K S
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:16:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-04954` on 2026-05-12: ₹2,400
  * Payment entry `ACC-PAY-2026-07200` on 2026-08-01: ₹2,400

#### `FU-2026-03558` - ANSEL JITHIN KP
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:16:00
- **Claimed amount:** ₹2,600
- **Actual payment entries in system:** ₹7,800
  * Payment entry `ACC-PAY-2026-05852` on 2026-06-15: ₹2,600
  * Payment entry `ACC-PAY-2026-06328` on 2026-07-01: ₹1,300
  * Payment entry `ACC-PAY-2026-06329` on 2026-07-01: ₹1,300
  * Payment entry `ACC-PAY-2026-07201-1` on 2026-08-01: ₹2,600

#### `FU-2026-03559` - NOORA SAJEER
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 08:17:00
- **Claimed amount:** ₹25
- **Actual payment entries in system:** ₹10,585
  * Payment entry `ACC-PAY-2026-04388` on 2026-04-17: ₹5,475
  * Payment entry `ACC-PAY-2026-07198` on 2026-08-01: ₹25
  * Payment entry `ACC-PAY-2026-07199` on 2026-08-01: ₹5,085

#### `FU-2026-03621` - LAMIA ASHKER BABU
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 11:45:00
- **Claimed amount:** ₹3,530
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04341` on 2026-04-14: ₹4,500
  * Payment entry `ACC-PAY-2026-04351` on 2026-04-16: ₹1,430
  * Payment entry `ACC-PAY-2026-04352` on 2026-04-16: ₹2,370
  * Payment entry `ACC-PAY-2026-07202` on 2026-08-01: ₹3,530
  * Payment entry `ACC-PAY-2026-07203` on 2026-08-01: ₹2,370

#### `FU-2026-03622` - MEHREEN ASHKER BABU
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 11:45:00
- **Claimed amount:** ₹3,530
- **Actual payment entries in system:** ₹14,200
  * Payment entry `ACC-PAY-2026-04342` on 2026-04-14: ₹4,500
  * Payment entry `ACC-PAY-2026-04353` on 2026-04-16: ₹1,430
  * Payment entry `ACC-PAY-2026-04354` on 2026-04-16: ₹2,370
  * Payment entry `ACC-PAY-2026-07204` on 2026-08-01: ₹3,530
  * Payment entry `ACC-PAY-2026-07205` on 2026-08-01: ₹2,370

#### `FU-2026-03632` - HEBA ANAS
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 14:14:00
- **Claimed amount:** ₹4,200
- **Actual payment entries in system:** ₹12,600
  * Payment entry `ACC-PAY-2026-03941` on 2026-03-28: ₹4,200
  * Payment entry `ACC-PAY-2026-05967` on 2026-06-18: ₹4,200
  * Payment entry `ACC-PAY-2026-07222` on 2026-08-03: ₹4,200

#### `FU-2026-03635` - NEHA FATHIMA M N
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 14:26:00
- **Claimed amount:** ₹200
- **Actual payment entries in system:** ₹9,800
  * Payment entry `ACC-PAY-2026-03979` on 2026-04-02: ₹1,000
  * Payment entry `ACC-PAY-2026-04894` on 2026-05-10: ₹2,000
  * Payment entry `ACC-PAY-2026-05525` on 2026-06-05: ₹3,300
  * Payment entry `ACC-PAY-2026-07226` on 2026-08-03: ₹3,300
  * Payment entry `ACC-PAY-2026-07227` on 2026-08-03: ₹200

#### `FU-2026-03636` - NANDEESWAR T B
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 14:27:00
- **Claimed amount:** ₹100
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04432` on 2026-04-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05232` on 2026-05-30: ₹800
  * Payment entry `ACC-PAY-2026-05233` on 2026-05-30: ₹1,700
  * Payment entry `ACC-PAY-2026-06483-1` on 2026-07-03: ₹2,500
  * Payment entry `ACC-PAY-2026-07223` on 2026-08-03: ₹1,600
  * Payment entry `ACC-PAY-2026-07224` on 2026-08-03: ₹800
  * Payment entry `ACC-PAY-2026-07225` on 2026-08-03: ₹100

#### `FU-2026-03637` - ANN MARY
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 14:30:00
- **Claimed amount:** ₹600
- **Actual payment entries in system:** ₹13,800
  * Payment entry `ACC-PAY-2026-03930` on 2026-03-25: ₹3,300
  * Payment entry `ACC-PAY-2026-04972` on 2026-05-12: ₹3,300
  * Payment entry `ACC-PAY-2026-06722` on 2026-07-14: ₹3,300
  * Payment entry `ACC-PAY-2026-06723` on 2026-07-14: ₹200
  * Payment entry `ACC-PAY-2026-07228` on 2026-08-03: ₹3,100
  * Payment entry `ACC-PAY-2026-07229` on 2026-08-03: ₹600

#### `FU-2026-03648` - BAKI ANAS
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 14:59:00
- **Claimed amount:** ₹700
- **Actual payment entries in system:** ₹2,700
  * Payment entry `ACC-PAY-2026-05402` on 2026-06-02: ₹1,350
  * Payment entry `ACC-PAY-2026-07234` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07235` on 2026-08-03: ₹700

#### `FU-2026-03660` - NANDEESWAR T B
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:12:00
- **Claimed amount:** ₹1,600
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04432` on 2026-04-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05232` on 2026-05-30: ₹800
  * Payment entry `ACC-PAY-2026-05233` on 2026-05-30: ₹1,700
  * Payment entry `ACC-PAY-2026-06483-1` on 2026-07-03: ₹2,500
  * Payment entry `ACC-PAY-2026-07223` on 2026-08-03: ₹1,600
  * Payment entry `ACC-PAY-2026-07224` on 2026-08-03: ₹800
  * Payment entry `ACC-PAY-2026-07225` on 2026-08-03: ₹100

#### `FU-2026-03662` - NANDEESWAR T B
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:14:00
- **Claimed amount:** ₹800
- **Actual payment entries in system:** ₹10,000
  * Payment entry `ACC-PAY-2026-04432` on 2026-04-18: ₹2,500
  * Payment entry `ACC-PAY-2026-05232` on 2026-05-30: ₹800
  * Payment entry `ACC-PAY-2026-05233` on 2026-05-30: ₹1,700
  * Payment entry `ACC-PAY-2026-06483-1` on 2026-07-03: ₹2,500
  * Payment entry `ACC-PAY-2026-07223` on 2026-08-03: ₹1,600
  * Payment entry `ACC-PAY-2026-07224` on 2026-08-03: ₹800
  * Payment entry `ACC-PAY-2026-07225` on 2026-08-03: ₹100

#### `FU-2026-03663` - NEHA FATHIMA M N
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:15:00
- **Claimed amount:** ₹3,300
- **Actual payment entries in system:** ₹9,800
  * Payment entry `ACC-PAY-2026-03979` on 2026-04-02: ₹1,000
  * Payment entry `ACC-PAY-2026-04894` on 2026-05-10: ₹2,000
  * Payment entry `ACC-PAY-2026-05525` on 2026-06-05: ₹3,300
  * Payment entry `ACC-PAY-2026-07226` on 2026-08-03: ₹3,300
  * Payment entry `ACC-PAY-2026-07227` on 2026-08-03: ₹200

#### `FU-2026-03664` - ANN MARY
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:16:00
- **Claimed amount:** ₹3,100
- **Actual payment entries in system:** ₹13,800
  * Payment entry `ACC-PAY-2026-03930` on 2026-03-25: ₹3,300
  * Payment entry `ACC-PAY-2026-04972` on 2026-05-12: ₹3,300
  * Payment entry `ACC-PAY-2026-06722` on 2026-07-14: ₹3,300
  * Payment entry `ACC-PAY-2026-06723` on 2026-07-14: ₹200
  * Payment entry `ACC-PAY-2026-07228` on 2026-08-03: ₹3,100
  * Payment entry `ACC-PAY-2026-07229` on 2026-08-03: ₹600

#### `FU-2026-03665` - MEDHA S NAMBIAR
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:17:00
- **Claimed amount:** ₹3,000
- **Actual payment entries in system:** ₹8,135
  * Payment entry `ACC-PAY-2026-03996` on 2026-04-04: ₹3,000
  * Payment entry `ACC-PAY-2026-05328` on 2026-06-02: ₹2,135
  * Payment entry `ACC-PAY-2026-07230` on 2026-08-03: ₹3,000

#### `FU-2026-03666` - BAHA ANAS
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:17:00
- **Claimed amount:** ₹650
- **Actual payment entries in system:** ₹2,700
  * Payment entry `ACC-PAY-2026-05401` on 2026-06-02: ₹1,350
  * Payment entry `ACC-PAY-2026-07231` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07232` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07233` on 2026-08-03: ₹50

#### `FU-2026-03667` - SONAKSHI MOL K S
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:18:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹10,300
  * Payment entry `ACC-PAY-2026-04152` on 2026-04-10: ₹2,000
  * Payment entry `ACC-PAY-2026-04950` on 2026-05-12: ₹2,000
  * Payment entry `ACC-PAY-2026-05140` on 2026-05-21: ₹3,000
  * Payment entry `ACC-PAY-2026-05877` on 2026-06-16: ₹1,300
  * Payment entry `ACC-PAY-2026-07241` on 2026-08-03: ₹2,000

#### `FU-2026-03668` - BAKI ANAS
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:18:00
- **Claimed amount:** ₹650
- **Actual payment entries in system:** ₹2,700
  * Payment entry `ACC-PAY-2026-05402` on 2026-06-02: ₹1,350
  * Payment entry `ACC-PAY-2026-07234` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07235` on 2026-08-03: ₹700

#### `FU-2026-03669` - BAHA ANAS
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 17:19:00
- **Claimed amount:** ₹50
- **Actual payment entries in system:** ₹2,700
  * Payment entry `ACC-PAY-2026-05401` on 2026-06-02: ₹1,350
  * Payment entry `ACC-PAY-2026-07231` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07232` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07233` on 2026-08-03: ₹50

#### `FU-2026-03670` - SHAUN JOSEPH
- **Logged by:** sneha.smartup@gmail.com on 2026-08-03 16:45:00
- **Claimed amount:** ₹2,000
- **Actual payment entries in system:** ₹4,500
  * Payment entry `ACC-PAY-2026-06022` on 2026-06-22: ₹2,000
  * Payment entry `ACC-PAY-2026-07155` on 2026-07-31: ₹500
  * Payment entry `ACC-PAY-2026-07156` on 2026-07-31: ₹2,000

#### `FU-2026-03703` - ANSEL JITHIN KP
- **Logged by:** sneha.smartup@gmail.com on 2026-08-04 15:54:00
- **Claimed amount:** ₹2,600
- **Actual payment entries in system:** ₹7,800
  * Payment entry `ACC-PAY-2026-05852` on 2026-06-15: ₹2,600
  * Payment entry `ACC-PAY-2026-06328` on 2026-07-01: ₹1,300
  * Payment entry `ACC-PAY-2026-06329` on 2026-07-01: ₹1,300
  * Payment entry `ACC-PAY-2026-07201-1` on 2026-08-01: ₹2,600

#### `FU-2026-03704` - BAHA ANAS
- **Logged by:** sneha.smartup@gmail.com on 2026-08-04 15:54:00
- **Claimed amount:** ₹650
- **Actual payment entries in system:** ₹2,700
  * Payment entry `ACC-PAY-2026-05401` on 2026-06-02: ₹1,350
  * Payment entry `ACC-PAY-2026-07231` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07232` on 2026-08-03: ₹650
  * Payment entry `ACC-PAY-2026-07233` on 2026-08-03: ₹50

#### `FU-2026-03715` - MOHAMMED AMAL M A
- **Logged by:** sneha.smartup@gmail.com on 2026-08-04 21:21:00
- **Claimed amount:** ₹2,400
- **Actual payment entries in system:** ₹4,800
  * Payment entry `ACC-PAY-2026-05460` on 2026-06-03: ₹2,400
  * Payment entry `ACC-PAY-2026-07260` on 2026-08-04: ₹2,400

