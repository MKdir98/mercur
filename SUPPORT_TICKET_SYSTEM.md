# Support Ticket System Implementation

## Overview
A complete ticketing system has been implemented to allow customers to submit support requests through the storefront and enable admins to manage them through the admin panel.

## Architecture

### 1. Database Module (`@mercurjs/support-ticket`)
Located in: `/packages/modules/support-ticket/`

**Model:** `SupportTicket`
- `id`: Unique identifier (prefix: 'stk')
- `name`: Customer name
- `email`: Customer email
- `phone`: Customer phone (optional)
- `type`: Ticket type ('support', 'complaint', 'partnership', 'suggestion')
- `subject`: Ticket subject
- `message`: Ticket message
- `status`: Ticket status ('open', 'in_progress', 'resolved', 'closed')
- `admin_notes`: Internal admin notes (optional)
- `created_at`: Auto-generated timestamp
- `updated_at`: Auto-generated timestamp

### 2. API Endpoints

#### Store API (Public)
**POST `/store/support-tickets`**
- Creates a new support ticket
- Required fields: name, email, type, subject, message
- Optional fields: phone
- Returns the created ticket

Example request:
```json
{
  "name": "علی محمدی",
  "email": "ali@example.com",
  "phone": "09123456789",
  "type": "support",
  "subject": "مشکل در پرداخت",
  "message": "من نمی‌توانم خرید خود را تکمیل کنم..."
}
```

#### Admin API (Protected)
**GET `/admin/support-tickets`**
- Lists all support tickets
- Query parameters: 
  - `skip`: Pagination offset (default: 0)
  - `take`: Number of items (default: 50)
  - `status`: Filter by status
  - `type`: Filter by type
- Returns tickets array and count

**GET `/admin/support-tickets/:id`**
- Retrieves a single ticket by ID

**POST `/admin/support-tickets/:id`**
- Updates a ticket
- Body fields:
  - `status`: New status
  - `admin_notes`: Admin notes

### 3. Frontend Components

#### Customer Facing (Storefront)
**ContactForm Component**
- Location: `/src/components/sections/ContactForm/ContactForm.tsx`
- URL: `http://localhost:3001/ir/contact?type=suggestion`
- Supports URL parameter `type` to pre-select ticket type
- Submits to backend API
- Shows success message after submission

#### Admin Panel
**Support Tickets Page**
- Location: `/apps/backend/src/admin/routes/support-tickets/page.tsx`
- URL: `http://localhost:9000/app/support-tickets`
- Features:
  - List all tickets with pagination
  - Filter by status and type
  - View ticket details
  - Update ticket status (open, in_progress, resolved, closed)
  - Add admin notes
  - Persian language labels for ticket types

## Setup Instructions

### 1. Install Dependencies
```bash
cd /home/mehdi/all/repositories/github.com/mercur
yarn install
```

### 2. Build the Module
```bash
cd packages/modules/support-ticket
npm run build
```

### 3. Run Migrations
```bash
cd apps/backend
npm run db:migrate
```

### 4. Start the Backend
```bash
cd apps/backend
npm run dev
```

### 5. Start the Storefront
```bash
cd /home/mehdi/all/repositories/github.com/b2c-marketplace-storefront
npm run dev
```

## Usage

### For Customers
1. Navigate to: `http://localhost:3001/ir/contact`
2. Or with pre-selected type: `http://localhost:3001/ir/contact?type=suggestion`
3. Fill in the form:
   - Name and email (required)
   - Phone number (optional)
   - Select ticket type
   - Enter subject and message
4. Submit the form
5. Receive confirmation message

### For Admins
1. Navigate to: `http://localhost:9000/app/support-tickets`
2. View list of all submitted tickets
3. Click "View" on any ticket to see details
4. Update ticket status:
   - Mark In Progress
   - Mark Resolved
   - Close Ticket
5. Add internal admin notes
6. Save changes

## Ticket Types
- **پشتیبانی** (Support): General support requests
- **شکایت** (Complaint): Customer complaints
- **همکاری** (Partnership): Partnership inquiries
- **پیشنهاد** (Suggestion): Suggestions and feedback

## Ticket Status Flow
1. **open**: Initially created tickets
2. **in_progress**: Admin is working on the ticket
3. **resolved**: Issue has been resolved
4. **closed**: Ticket is closed (final state)

## Environment Variables
Ensure these are set in your backend `.env`:
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
```

## Files Modified/Created

### Created
- `/packages/modules/support-ticket/` (entire module)
- `/apps/backend/src/api/store/support-tickets/route.ts`
- `/apps/backend/src/api/admin/support-tickets/route.ts`
- `/apps/backend/src/api/admin/support-tickets/[id]/route.ts`
- `/apps/backend/src/admin/routes/support-tickets/page.tsx`

### Modified
- `/apps/backend/medusa-config.ts` (added support-ticket module)
- `/apps/backend/package.json` (added dependency)
- `/src/components/sections/ContactForm/ContactForm.tsx` (connected to API)

## Notes
- The old TalkJS messages page has been kept at `/app/messages` for reference
- The new support tickets system is independent and doesn't require TalkJS
- All timestamps are automatically managed by the database
- The system is fully integrated with Medusa's module system
- Persian language support in admin panel for better UX

## Testing Checklist
- [ ] Submit a ticket from storefront
- [ ] View ticket in admin panel
- [ ] Update ticket status
- [ ] Add admin notes
- [ ] Filter tickets by status
- [ ] Filter tickets by type
- [ ] Verify Persian labels display correctly

## Future Enhancements
- Email notifications to customers when status changes
- Admin reply functionality
- File attachment support
- Customer portal to view their tickets
- Ticket assignment to specific admin users
- Priority levels (low, medium, high, urgent)

