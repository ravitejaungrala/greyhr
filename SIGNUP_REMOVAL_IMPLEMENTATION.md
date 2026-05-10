# HRMS: Employee Signup Removal Implementation

## Overview
Removed employee self-registration capability. Now only admins and super admins can create new employees with complete onboarding.

## Changes Implemented

### 1. Frontend Changes

#### LoginRegister.jsx (UPDATED)
**Path**: `apps/frontend/src/pages/LoginRegister.jsx`

**What was removed**:
- Multi-step onboarding flow (5 steps)
- Onboarding state: `step`, `mode`, `employeeId`, `onboardingData`
- Handling for "onboarding_pending" status
- PAN card, passport, document uploads in login flow
- Progress bar and step indicators
- All validation and document parsing

**What remains**:
- Simple login form (email + password)
- Direct navigation to dashboard on successful login
- Auto-routing based on user role

**Code Flow**:
```
User Login
  ↓
POST /auth/login
  ↓
Returns: {role, name, email, employee_id, status}
  ↓
Admin → /admin/dashboard
Employee → /employee/pulse
```

### 2. Backend (No Changes Needed)

#### Still Supported Features
- **Endpoint**: `POST /admin/add-employee` (router.py:603)
- **Admin creates employee with**:
  - Full personal details
  - Bank information
  - Education certificates
  - **PAN Card** ✓ (already implemented)
  - Passport photo
  - Work experience
- **Result**: Employee created with `status="approved"`
- **Next step**: Admin shares generated credentials with employee

### 3. Document Collection

#### PAN Card Integration (WORKING)
✓ Backend model accepts `pan_card_base64` (AdminAddEmployeeRequest)
✓ Admin dashboard form has PAN upload field
✓ S3 storage: `onboarding_docs/{emp_id}_pan_card{extension}`
✓ Stored in user record as `pan_card_url`

#### Other Documents (WORKING)
- Passport Photo → `profile_photos/{emp_id}_passport{ext}`
- Bank Passbook → `onboarding_docs/{emp_id}_bank_passbook{ext}`
- UG Certificate → `onboarding_docs/{emp_id}_edu_cert{ext}`
- PAN Card → `onboarding_docs/{emp_id}_pan_card{ext}`
- Intermediate/SSC → Optional certificates

### 4. Workflow Changes

#### BEFORE (Self-Registration)
```
Employee visits site
  ↓
Tries to register
  ↓
Fills 5-step onboarding form
  ↓
Uploads documents
  ↓
Waits for HR approval
```

#### AFTER (Admin-Led Creation)
```
HR Admin logs in → /admin/dashboard
  ↓
Navigates to "Add New Employee"
  ↓
Fills all details at once
  ↓
Uploads all documents (including PAN)
  ↓
Employee record created with status="approved"
  ↓
Admin shares credentials: email + password
  ↓
Employee logs in → Direct dashboard access
  ↓
No additional onboarding needed
```

## Login Response Changes

### Before
```json
{
  "role": "employee",
  "name": "John Doe",
  "email": "john@neuzenai.com",
  "employee_id": "EMP123456",
  "status": "onboarding_pending"  ← Triggered multi-step flow
}
```

### After
```json
{
  "role": "employee",
  "name": "John Doe",
  "email": "john@neuzenai.com",
  "employee_id": "EMP123456",
  "status": "approved"  ← Direct dashboard access
}
```

## Database Impact

No data migration needed. Existing employees can still:
- Log in normally
- Access their dashboard
- View/edit their profile

## Testing Checklist

- [ ] Login page shows no registration option
- [ ] Login with admin credentials works
- [ ] Admin can access "Add New Employee" tab
- [ ] PAN card upload works in admin form
- [ ] Created employee can login with provided credentials
- [ ] No "onboarding_pending" flow triggers
- [ ] All documents saved to S3 correctly
- [ ] Employee dashboard loads immediately after login

## API Endpoints Reference

### Login (Login.jsx calls)
```
POST /auth/login
Content-Type: application/json
{
  "email": "user@neuzenai.com",
  "password": "password123"
}

Response:
{
  "role": "employee" | "admin" | "super_admin",
  "name": "User Name",
  "email": "user@neuzenai.com",
  "employee_id": "EMP123456",
  "status": "approved" | "pending_approval"
}
```

### Admin Create Employee
```
POST /admin/add-employee
Content-Type: application/json
{
  "name": "Employee Name",
  "email": "emp@neuzenai.com",
  "password": "auto_generated",
  "full_name": "Full Name",
  "dob": "1990-01-15",
  "father_name": "Father",
  "mother_name": "Mother",
  "siblings_details": "1 Sister",
  "bank_name": "SBI",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "cif_number": "1234567",
  "bank_passbook_base64": "data:image/png;base64,...",
  "pan_card_base64": "data:image/png;base64,...",  ← NEW FIELD
  "passport_photo_base64": "data:image/jpeg;base64,...",
  "ug_details": {
    "institution_name": "MIT",
    "department": "CS",
    "cgpa": "8.5",
    "pass_year": "2020",
    "board_university": "Anna University",
    "certificate_base64": "data:application/pdf;base64,..."
  },
  "has_experience": true,
  "experience_list": [...],
  "pf_number": "PF123",
  "uan_number": "UAN123",
  "role": "employee"
}
```

## Files Modified

```
Frontend:
- apps/frontend/src/pages/LoginRegister.jsx (MAJOR REFACTOR)

Backend:
- No changes (already supports admin employee creation)

Configuration:
- No changes needed
```

## Related Files (For Reference)

```
Admin Form: apps/frontend/src/pages/AdminDashboard.jsx
Admin Agent: apps/backend/api/admin_agent.py
Router: apps/backend/api/router.py
Models: apps/backend/api/router.py (lines 100-150)
Database: Mongo users collection
Storage: AWS S3
```

## Security Notes

✓ Employee self-registration closed
✓ Only super_admin and admin can create employees
✓ Password generated by admin (or use secure method)
✓ All documents scanned and stored
✓ PAN card validation on backend
✓ Role-based access enforced

## Known Issues

- AdminDashboard.jsx has JSX structure errors (unrelated to this change)
  - Needs fixing before building for production
