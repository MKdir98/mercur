# Support Ticket System Implementation

## Overview

This document describes the implementation of the support ticket system that connects the customer-facing contact form to the admin panel for managing customer inquiries.

## Architecture

### 1. Database Module

**Location:** `/packages/modules/support-ticket/`

The support ticket module is a custom Medusa module that defines the data model and service for managing support tickets.

**Model Schema:**
- `id`: Unique identifier with 'stk' prefix
- `name`: Customer name
- `email`: Customer email
- `phone`: Customer phone (optional)
- `type`: Ticket type (support, complaint, partnership, suggestion)
- `subject`: Ticket subject
- `message`: Ticket message content
- `status`: Ticket status (open, in_progress, resolved, closed)
- `admin_notes`: Internal notes from admin (optional)
- `created_at`: Auto-generated timestamp
- `updated_at`: Auto-generated timestamp

### 2. API Endpoints

#### Store API (Customer-Facing)

**Endpoint:** `POST /store/support-tickets`

**Location:** `/apps/backend/src/api/store/support-tickets/route.ts`

Creates a new support ticket from the customer contact form.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string (optional)",
  "type": "support | complaint | partnership | suggestion",
  "subject": "string",
  "message": "string"
}
```

**Response:**
```json
{
  "ticket": {
    "id": "stk_...",
    "name": "...",
    ...
  }
}
```

#### Admin API

**Endpoint:** `GET /admin/support-tickets`

**Location:** `/apps/backend/src/api/admin/support-tickets/route.ts`

Lists all support tickets with optional filtering.

**Query Parameters:**
- `skip`: Number of records to skip (pagination)
- `take`: Number of records to return (default: 50)
- `status`: Filter by status
- `type`: Filter by type

**Response:**
```json
{
  "tickets": [...],
  "count": 123,
  "skip": 0,
  "take": 50
}
```

**Endpoint:** `GET /admin/support-tickets/:id`

**Location:** `/apps/backend/src/api/admin/support-tickets/[id]/route.ts`

Retrieves a specific ticket by ID.

**Endpoint:** `POST /admin/support-tickets/:id`

Updates a ticket's status or admin notes.

**Request Body:**
```json
{
  "status": "open | in_progress | resolved | closed (optional)",
  "admin_notes": "string (optional)"
}
```

### 3. Frontend Components

#### Customer Contact Form

**Location:** `/b2c-marketplace-storefront/src/components/sections/ContactForm/ContactForm.tsx`

**URL:** `http://localhost:3001/ir/contact?type=suggestion`

The contact form now submits tickets to the backend API. It supports:
- Pre-selecting ticket type via URL query parameter
- All four ticket types: support, complaint, partnership, suggestion
- Form validation
- Success/error handling

**Environment Variable Required:**
```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
```

#### Admin Support Tickets Page

**Location:** `/mercur/apps/backend/src/admin/routes/support-tickets/page.tsx`

**URL:** `http://localhost:9000/app/support-tickets`

Features:
- View all support tickets in a table
- Filter by status and type
- View detailed ticket information
- Update ticket status (open → in_progress → resolved → closed)
- Add internal admin notes
- Automatic refresh after updates

### 4. Configuration

**Module Registration:**

The support ticket module is registered in `/apps/backend/medusa-config.ts`:

```typescript
modules: [
  // ... other modules
  { resolve: '@mercurjs/support-ticket' },
]
```

**Package Dependencies:**

Added to `/apps/backend/package.json`:

```json
{
  "dependencies": {
    "@mercurjs/support-ticket": "*",
    "@mercurjs/city": "*"
  }
}
```

## Usage

### For Customers

1. Visit the contact page: `http://localhost:3001/ir/contact`
2. Fill out the form with:
   - Name and email (required)
   - Phone number (optional)
   - Ticket type (support, complaint, partnership, suggestion)
   - Subject and message (required)
3. Click "ارسال پیام" to submit
4. Receive confirmation message

### For Administrators

1. Navigate to `http://localhost:9000/app/support-tickets`
2. View all submitted tickets in the table
3. Click "View" on any ticket to see details
4. Update ticket status using the action buttons:
   - Mark In Progress
   - Mark Resolved
   - Close Ticket
5. Add internal notes for team communication
6. Click "Save Notes" to save admin notes

## Ticket Lifecycle

1. **Open** - New ticket submitted by customer
2. **In Progress** - Admin is working on the ticket
3. **Resolved** - Issue has been resolved
4. **Closed** - Ticket is closed and archived

## Database

The support tickets are stored in the `support_ticket` table in PostgreSQL. The table is automatically created when running database migrations.

## Testing

### Test the Complete Flow:

1. **Start the backend:**
   ```bash
   cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
   npm run dev
   ```

2. **Start the storefront:**
   ```bash
   cd /home/mehdi/all/repositories/github.com/b2c-marketplace-storefront
   npm run dev
   ```

3. **Submit a test ticket:**
   - Go to http://localhost:3001/ir/contact?type=suggestion
   - Fill out and submit the form

4. **View in admin:**
   - Go to http://localhost:9000/app/support-tickets
   - You should see the submitted ticket

## Future Enhancements

Possible improvements:
1. Email notifications when tickets are created/updated
2. Customer-facing ticket tracking (customers can view their ticket status)
3. Integration with TalkJS for real-time chat after ticket creation
4. Priority levels for tickets
5. Assignment of tickets to specific admin users
6. Ticket categories/tags
7. File attachments support
8. Response templates for common inquiries
9. Analytics dashboard for ticket metrics
10. SLA tracking and reporting

## Troubleshooting

### Common Issues:

1. **"Failed to create support ticket" error:**
   - Check that the backend is running
   - Verify the `NEXT_PUBLIC_MEDUSA_BACKEND_URL` environment variable is set correctly
   - Check backend logs for detailed error messages

2. **Admin page shows "No TalkJS App ID" error:**
   - This is expected if you're on the old messages page
   - Use the new route: `/app/support-tickets` instead of `/app/messages`

3. **Tickets not appearing in admin:**
   - Verify database migrations ran successfully
   - Check that the module is properly registered in `medusa-config.ts`
   - Verify the API endpoint is accessible: `http://localhost:9000/admin/support-tickets`

## Migration from TalkJS Messages

The original `/app/messages` route using TalkJS has been preserved. The new support ticket system is available at `/app/support-tickets`. Both can coexist:

- Use TalkJS Messages for real-time chat with vendors/customers
- Use Support Tickets for structured customer support inquiries

## Notes

- The support ticket system is independent of TalkJS and doesn't require TalkJS configuration
- Tickets are stored in the database, not in TalkJS conversations
- The system supports multiple languages (Persian/English) through the form interface

