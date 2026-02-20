# Gap Analysis against Version 1.0 (Market Ready) Specifications

This analysis compares our current system state to the `FINAL_OPTIMIZED_MODULE_STRUCTURE.md` to identify exactly what is missing and what needs refinement to hit Version 1.0.

## 🟢 1️⃣ Core Lab Module (Mandatory)
### ✅ **Implemented:**
- Patient Registration, Unique Lab ID (UHID), Referral Doctor linking.
- Full "Test Master" CRUD mapped to categories, varying normal ranges (male/female), units, and pricing.
- Complete workflow: PENDING → COMPLETED → VERIFIED → DELIVERED.
- PDF Report generation featuring doctor signatures and abnormal highlighting via conditional ranges.

### ❌ **Missing / Needs Work:**
- **SMS/WhatsApp Notifications:** No integration currently exists in the backend or frontend for automated alerts upon registration or report completion.
- **Profiles / Panels:** The `tests` table and frontend only support flat individual tests. We need a way to group tests together into a specific Profile (e.g., "CBC Panel", "LFT Panel") so they can be billed and reported together under one heading. 
- **QR Verification Portal:** PDFs do generate internal QRs, but there is no public-facing route to actually verify the validity of the scanned report.

## 🟢 2️⃣ Radiology Module (Template Based)
### ✅ **Implemented:**
- Everything mapping to Radiology requirements `.docx` templates, template mappings, rich text editors, and locked/editable statuses for versions is built and completely integrated into the workflow. QRs and signatures apply here as well. 
**(Status: 100% Complete for V1.0)**

## 🟢 3️⃣ Machine Integration Module (Revenue Booster)
### ✅ **Implemented:**
- An internal TCP/IP socket service (`machineIntegrationService.js`) exists and can ingest basic HL7 protocols from modern analyzers (Port 2575).

### ❌ **Missing / Needs Work:**
- **ASTM / RS-232 gateway (Raspberry Pi Support):** Completely missing.
- **Log tracking / Fallback Retries:** Currently, the Node.js socket just silently attempts updates; there is no UI to view logs, failed syncs, or manually retry payloads.

## 🟢 4️⃣ Billing & Accounting (Critical for Owners)
### ✅ **Implemented:**
- GST, discounts, paid/due calculations, invoice generation, payment modes (Cash, Online, UPI).
- Daily collection metrics and summary stats.

### ❌ **Missing / Needs Work:**
- **Refund Entry:** Our schema does not support refunds on previous invoices or updating ledger values negatively for cancellations.

## 🟢 5️⃣ Doctor / Referral Management
### ✅ **Implemented:**
- Doctor Database, Commission percentages, generating Doctor Payout entries (`doctor_payouts`).
- Rich frontend UI for `FinancialReports.jsx` handles doctor level revenue.
**(Status: 100% Complete for V1.0)**

## 🟢 6️⃣ Inventory Module
### ✅ **Implemented:**
- Complete end-to-end Inventory modules tracking Reagents, Purchases (`purchase_invoices`, `purchase_items`), Supplier details, Batch tracking, Expiry Dates, and dynamic Reorder Level alerting.
**(Status: 100% Complete for V1.0)**

## 🟢 7️⃣ Admin & User Roles
### ✅ **Implemented:**
- Role-based Middlewares and JWT integrations supporting `ADMIN`, `TECHNICIAN`, `RECEPTIONIST`, and `DOCTOR`.

### ❌ **Missing / Needs Work:**
- **Missing Specific Roles:** The original Postgres schema explicitly limits roles (`CHECK (role IN ('ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST'))`). `Radiologist` and `Accountant` roles are not permitted by the DB constraints.
- **Audit Trails/Activity Logs:** We only log inventory transactions (`inventory_logs`). There is no global system activity logger for system entities (who deleted an invoice, who changed patient data).

## 🟢 8️⃣ Business Reports (Owner Dashboard)
### ✅ **Implemented:**
- Dashboards containing charts and aggregations covering Top Tests, Payments, Revenues.
**(Status: 100% Complete for V1.0)**

## 🟢 9️⃣ Patient Portal (Basic)
### ❌ **Missing / Needs Work:**
- **Entirely Missing:** There is currently no web route or interface designed for a patient to search their UHID, verify via basic OTP or simply download completed reports. (The closest is `/promote`, which is a static marketing brochure).

---

## 🎯 Recommended Next Steps

Here is the recommended order of attack to reach V1.0 readiness:

1. **User Role Expansion:** Update the database to properly support `Accountant` and `Radiologist` roles.
2. **Setup Test Profiles / Panels:** Modify the "Test Master" schema and frontend to allow "Panels" that consist of multiple underlying test parameters.
3. **Build the Patient Portal:** A lightweight, public-facing page (`/portal/:uhid/:sampleId` or similar) to view and download reports (this also completes the QR verification feature).
4. **Implement Event Logging / Audit Trails:** Add a simple hook/middleware on inserts/updates to track who changed what.
5. **Add Refund Entries:** Slightly tweak the invoice database functionality to support "Canceled/Refunded" state modifications.
6. **(Optional) SMS Integrations:** Look into Twilio/Msg91 configs for WhatsApp automations.
