# Enhanced Document Generation System

## Overview

The Enhanced Document Generation System provides a streamlined interface for admins to generate professional documents for employees. This system replaces the need for manual document creation by providing:

1. **Employee Selection**: Choose from approved employees
2. **Document Type Selection**: Select from available document templates
3. **ROI Field Management**: Fill in Region of Interest fields with smart prefilling
4. **Live Preview**: See exactly how the document will look
5. **Generate & Send**: Finalize and make available for employee download

## Available Document Types

### 1. Full-Time Offer Letter
- **Template**: `full_time_offer.html`
- **Key ROI Fields**: Employee name, designation, salary breakdown, CTC details, joining date
- **Use Case**: Formal employment offers for full-time positions

### 2. Internship Offer Letter
- **Template**: `internship_offer.html`
- **Key ROI Fields**: Employee name, designation, stipend, duration, internship description
- **Use Case**: Internship position offers

### 3. Experience Letter
- **Template**: `experience.html`
- **Key ROI Fields**: Employee name, designation, employment period
- **Use Case**: Work experience certification for former employees

### 4. Relieving Letter
- **Template**: `relieving.html`
- **Key ROI Fields**: Employee name, designation, last working day, resignation date
- **Use Case**: Formal relieving documentation

### 5. Payslip
- **Template**: `payslip.html`
- **Key ROI Fields**: Salary breakdown, deductions, net pay, employee details
- **Use Case**: Monthly salary statements

## How to Use

### Step 1: Access the Enhanced Document Generator
1. Navigate to Admin Dashboard
2. Go to the "Employee Directory" tab
3. Click "📄 Enhanced Document Generator" button

### Step 2: Select Employee and Document Type
1. **Choose Employee**: Browse and select from the list of approved employees
2. **Choose Document Type**: Select the type of document you want to generate
3. Click "Next: Fill ROI Fields"

### Step 3: Fill ROI Fields
1. **Smart Prefilling**: The system automatically fills known fields from employee data
2. **Manual Entry**: Fill in any remaining required fields
3. **Field Validation**: Required fields are marked with red asterisks
4. Click "Preview Document" when ready

### Step 4: Preview and Finalize
1. **Live Preview**: Review the generated PDF in real-time
2. **Edit if Needed**: Go back to edit fields if changes are required
3. **Generate & Send**: Click to finalize and make available for employee download

## ROI Fields Explained

ROI (Region of Interest) fields are the dynamic placeholders in document templates that get filled with actual data. Examples:

- `{{emp_name}}` → Employee's actual name
- `{{designation}}` → Employee's job title
- `{{doj}}` → Date of joining
- `{{monthly_salary}}` → Salary amount

## Smart Prefilling Logic

The system automatically prefills fields based on:

1. **Employee Profile Data**: Name, designation, department, joining date
2. **Salary Calculations**: Automatic breakdown for payslips and offer letters
3. **Default Values**: Company standard values (signatory names, etc.)
4. **Date Logic**: Current date for document generation dates

## API Endpoints

### Backend Routes (Enhanced System)
- `GET /api/enhanced-docs/employees` - Get employees for document generation
- `GET /api/enhanced-docs/types` - Get available document types and ROI fields
- `GET /api/enhanced-docs/employee/{id}/prefill/{type}` - Get prefilled data
- `POST /api/enhanced-docs/preview` - Generate PDF preview
- `POST /api/enhanced-docs/generate` - Generate and save final document
- `GET /api/enhanced-docs/download/{employee_id}/{doc_type}` - Download document

### Frontend Components
- `EnhancedDocumentGenerator.jsx` - Main document generation interface
- `DocumentGeneratorModal.jsx` - Legacy AI-powered document generator (still available)

## Benefits Over Legacy System

### Old System (AI-Based)
- Required pasting raw text for AI extraction
- Less predictable field mapping
- Single-step process with limited control

### New Enhanced System
- **Structured Workflow**: Clear 4-step process
- **Smart Prefilling**: Automatic population of known fields
- **Live Preview**: See document before finalizing
- **Better UX**: Intuitive interface with progress tracking
- **Reliable**: No dependency on AI for field extraction

## Employee Access

Once a document is generated:
1. Document is saved to S3 storage
2. Employee record is updated with document reference
3. Employee can download from their dashboard
4. Document remains available for future downloads

## Technical Implementation

### Backend Architecture
- **FastAPI Router**: `enhanced_doc_system.py` handles all enhanced document routes
- **Template Engine**: Jinja2 for HTML template rendering
- **PDF Generation**: xhtml2pdf for HTML to PDF conversion
- **Storage**: S3 for document storage
- **Database**: MongoDB for employee data and document references

### Frontend Architecture
- **React Component**: `EnhancedDocumentGenerator.jsx` provides the UI
- **State Management**: Local React state for form data and workflow
- **API Integration**: Fetch-based communication with backend
- **Preview**: Embedded PDF viewer for live preview

## Configuration

Document types and their ROI fields are configured in `DOCUMENT_CONFIGS` in `enhanced_doc_system.py`. To add a new document type:

1. Add template HTML file to `apps/backend/templates/`
2. Define ROI fields in `DOCUMENT_CONFIGS`
3. Add any special prefilling logic in `get_employee_prefill_data()`

## Security & Access Control

- Only admin users can access the document generator
- Employee data is validated before document generation
- Generated documents are stored securely in S3
- Document access is controlled through employee authentication

This enhanced system provides a professional, reliable way to generate company documents while maintaining the flexibility to customize templates and ROI fields as needed.