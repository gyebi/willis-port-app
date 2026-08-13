# Willis Port

Willis Port is a staff-facing web application for capturing shipping requests, calculating charges, generating invoices, recording payments, and issuing receipts.

## Project Summary

The MVP is designed around one core workflow:

1. Capture a customer request from Email, WhatsApp, Phone, Walk-in, or the website.
2. Store customer and shipment details in a structured record.
3. Apply a backend pricing rule and exchange rate.
4. Generate a professional invoice in Ghana cedis.
5. Track invoice status and record payments.
6. Issue receipts after payment is received.

The application is intended to become a lightweight operations and management system for Willis Port, not just a PDF generator.

## Key Business Goals

- Capture requests from multiple channels
- Maintain customer and shipment history
- Support goods classification, weight, CBM, and supporting documents
- Calculate shipping charges using configured business rules
- Freeze the exchange rate and pricing rule used on each invoice for audit history
- Track invoice states such as draft, sent, partially paid, paid, overdue, and cancelled
- Record payments and generate receipts
- Provide management reporting for invoicing, payment status, and outstanding balances

## Recommended Stack

- Frontend: Next.js, React, TypeScript, CSS Modules
- Backend/API: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Authentication: Firebase Authentication
- File Storage: Google Cloud Storage or Firebase Storage
- Hosting: Firebase App Hosting or Google Cloud Run
- PDF Generation: PDFKit or Puppeteer
- Integrations: Email, WhatsApp Business API, exchange-rate API

## Core Data Flow

`Customer -> Request -> Shipment/Cargo -> Invoice -> Payment -> Receipt`

This structure keeps requests at the center of the system and lets one customer create many requests over time.

## MVP Scope

The first delivery focuses on a usable internal workflow:

- Protected staff workspace
- Customer and request entry
- Cargo details and pricing calculation
- Invoice creation and persistence
- PDF invoice generation
- Invoice listing and basic status tracking
- Server-side validation and authorization

## Security Principles

- Keep secrets in backend-only environment variables
- Never trust browser-calculated totals
- Validate all inputs on the server
- Authorize every sensitive operation server-side
- Protect documents and uploads with private access controls
- Record audit-friendly invoice and payment history

## Development Notes

The technical brief emphasizes building feature by feature:

- Understand the business rule
- Identify security risks
- Validate and authorize on the server
- Implement the feature
- Test normal and invalid cases
- Move on to the next feature

