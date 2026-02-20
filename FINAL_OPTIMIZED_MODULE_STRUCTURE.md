# FINAL OPTIMIZED MODULE STRUCTURE (Version 1.0 – Market Ready)

## 🟢 1️⃣ Core Lab Module (Mandatory)
### Patient Management
- Registration
- Unique Lab ID
- Referral doctor
- Patient history
- SMS/WhatsApp notification

### Test Master
- Test categories
- Profiles (CBC Panel, LFT Panel)
- Gender/Age normal range
- Unit
- Price

### Report Entry Workflow
- Reception → Sample Collection → Technician Entry → Verify → Approve → Print

### PDF Report Generation
- QR verification
- Doctor signature
- Abnormal value highlight

## 🟢 2️⃣ Radiology Module (Template Based)
- .docx template upload
- Template mapping to test
- Rich text editor
- Version locking after approval
- PDF generation
- Covers: X-ray, USG, CT, MRI

## 🟢 3️⃣ Machine Integration Module (Revenue Booster)
- Support integration for analyzers like:
  - Roche Cobas e 411
  - Beckman Coulter AU480
  - Horiba Yumizen H550
  - Tosoh HLC-723GX
- Features:
  - ASTM/HL7 parser
  - RS-232 gateway (Raspberry Pi support)
  - Machine log tracking
  - Failed transmission retry
- 💰 *Charge extra for this module.*

## 🟢 4️⃣ Billing & Accounting (Critical for Owners)
- GST invoice
- Discount handling
- Paid / Due
- Daily collection report
- Payment mode (Cash / UPI / Card)
- Refund entry

## 🟢 5️⃣ Doctor / Referral Management
- Doctor database
- Commission %
- Monthly commission statement
- Doctor-wise revenue report
- *Very important in Indian market.*

## 🟢 6️⃣ Inventory Module (Simple Version)
- Reagent stock
- Low stock alert
- Expiry alert
- Purchase entry
- *(Advanced consumption tracking can come later)*

## 🟢 7️⃣ Admin & User Roles
- Roles: Admin, Receptionist, Technician, Radiologist, Accountant
- Features:
  - Activity logs
  - Role-based permission
  - Audit trail

## 🟢 8️⃣ Business Reports (Owner Dashboard)
- Essential Reports:
  - Daily collection
  - Monthly revenue
  - Test-wise revenue
  - Doctor-wise revenue
  - Pending payments
  - Top performing tests
- *Keep analytics simple but visual (charts).*

## 🟢 9️⃣ Patient Portal (Basic)
- Online report download
- QR verification
- Report status tracking

## 🟡 1️⃣0️⃣ Optional Add-On Modules (Phase 2)
*(Do NOT build initially. Add later for premium labs)*
- QC Module (Levey-Jennings)
- Microbiology Antibiotic Sensitivity Grid
- Histopathology structured report
- PACS integration
- Multi-branch advanced analytics
- Voice dictation for radiology
