# Customer Types & Logging Documentation

## Customer Types Overview

### 1. PREPAID (client_type = '1')
**How it works:**
- Customer pays in advance (like a wallet)
- Balance increases when money is added
- Balance decreases when filling requests are completed
- No credit limit, no payment due dates
- Customer must have sufficient balance before making requests

**Recharge Process:**
- Amount is directly added to wallet balance
- Balance = Previous Balance + Recharge Amount
- No pending invoices to pay
- Transaction recorded in `filling_history` as 'inward' type

**Logged Actions:**
- ✅ Recharge amount added
- ✅ New balance after recharge
- ✅ User who performed recharge
- ✅ Timestamp

---

### 2. POSTPAID (client_type = '2')
**How it works:**
- Customer gets products first, pays later
- Has a credit limit (`cst_limit` or `amtlimit`)
- Can make requests up to credit limit
- After filling requests complete, invoices are generated
- Customer needs to recharge to pay pending invoices

**Recharge Process:**
- Amount is added to balance
- System automatically pays oldest pending invoices first (FIFO)
- Balance = Previous Balance + Recharge Amount - Paid Invoices
- If recharge amount > pending invoices, remaining stays as balance
- Transaction recorded in `filling_history` as 'inward' type
- Filling requests marked as paid (`payment_status = 1`)

**Logged Actions:**
- ✅ Recharge amount added
- ✅ Number of invoices paid
- ✅ Total amount paid to invoices
- ✅ New balance after recharge and payments
- ✅ Remaining credit (if any)
- ✅ User who performed recharge
- ✅ Timestamp

---

### 3. DAY LIMIT (client_type = '3')
**How it works:**
- Customer has a payment deadline (e.g., 7 days, 15 days)
- When filling request completes, customer has X days to pay
- If payment not made within day limit, account becomes inactive
- Payments clear day-by-day (oldest unpaid day first)
- Cannot partially pay a day - must pay full day amount

**Recharge Process:**
- Amount is added to balance and `total_day_amount`
- System groups unpaid invoices by completion date (day-wise)
- Clears oldest days first (full day payment required)
- Updates `day_remaining_amount` if payment exceeds pending invoices
- Balance = Previous Balance + Payment - Paid Day Amounts
- Transaction recorded in `filling_history` as 'inward' type
- Account status updated based on overdue status

**Logged Actions:**
- ✅ Recharge amount added
- ✅ Number of days cleared
- ✅ Number of invoices paid
- ✅ Total amount paid
- ✅ Remaining day amount
- ✅ Extra payment stored (if any)
- ✅ Account status (Active/Overdue)
- ✅ New balance
- ✅ User who performed recharge
- ✅ Timestamp

---

## Comprehensive Logging System

### Two-Level Logging:

#### 1. Customer-Specific Logs (`customer_audit_log` table)
**Purpose:** Quick access to customer-specific actions
**Fields:**
- `customer_id` - Which customer
- `action_type` - Type of action (recharge, type_switch, balance_update, etc.)
- `user_id` - Employee who performed action
- `user_name` - Employee name
- `remarks` - Description
- `amount` - Amount involved
- `created_at` - Timestamp

**Actions Logged:**
- ✅ Recharge (all types)
- ✅ Customer type switching
- ✅ Balance updates
- ✅ Status changes

#### 2. System-Wide Audit Logs (`audit_log` table)
**Purpose:** Complete system audit trail
**Fields:**
- `page` - Page where action occurred
- `unique_code` - Unique identifier
- `section` - Module/Section
- `user_id` - Employee ID
- `user_name` - Employee name
- `action` - Action type
- `remarks` - Description
- `old_value` - Previous state (JSON)
- `new_value` - New state (JSON)
- `field_name` - Field changed
- `record_type` - Type of record
- `record_id` - Record ID
- `action_date` - Date of action
- `action_time` - Time of action

**Actions Logged:**
- ✅ All customer recharges (Prepaid, Postpaid, Day Limit)
- ✅ Customer type switching (Prepaid ↔ Postpaid ↔ Day Limit)
- ✅ Balance updates
- ✅ Status changes (Active/Inactive)
- ✅ Credit limit changes
- ✅ Day limit changes
- ✅ All changes with before/after values

---

## Action List & Logging Status

### Customer Recharge Actions:

| Action | Prepaid | Postpaid | Day Limit | Logged In |
|--------|---------|----------|-----------|-----------|
| **Recharge Amount Added** | ✅ | ✅ | ✅ | Both logs |
| **Balance Updated** | ✅ | ✅ | ✅ | Both logs |
| **Invoices Paid** | N/A | ✅ | ✅ | Both logs |
| **Days Cleared** | N/A | N/A | ✅ | Both logs |
| **Account Status Change** | N/A | N/A | ✅ | Both logs |
| **Remaining Credit** | ✅ | ✅ | ✅ | Both logs |

### Customer Management Actions:

| Action | Logged In | Old Value | New Value |
|--------|-----------|-----------|-----------|
| **Switch to Prepaid** | Both logs | ✅ | ✅ |
| **Switch to Postpaid** | Both logs | ✅ | ✅ |
| **Switch to Day Limit** | Both logs | ✅ | ✅ |
| **Update Credit Limit** | Both logs | ✅ | ✅ |
| **Update Day Limit** | Both logs | ✅ | ✅ |
| **Change Status (Active/Inactive)** | Both logs | ✅ | ✅ |

---

## How to View Logs

### Customer-Specific Logs:
1. Go to Customer Details page
2. Click on "Activity Logs" tab
3. View all actions for that specific customer

### System-Wide Audit Logs:
1. Go to Audit Logs page
2. Filter by:
   - Record Type: "customer"
   - Section: "Customer Management" or "Customer Recharge"
   - Date range
3. View complete audit trail with before/after values

---

## Technical Implementation

### API Endpoint:
- **Route:** `/api/customers/client-history`
- **Method:** `PATCH`
- **Body:** `{ customerId, rechargeAmount }`

### Processing Flow:
1. Identify customer type (Prepaid/Postpaid/Day Limit)
2. Process recharge according to type
3. Update balance and related fields
4. Record transaction in `filling_history`
5. Create log in `customer_audit_log`
6. Create comprehensive log in `audit_log`

### Database Tables:
- `customers` - Customer master data
- `customer_balances` - Balance and limit information
- `filling_requests` - Filling requests/invoices
- `filling_history` - Transaction history
- `customer_audit_log` - Customer-specific logs
- `audit_log` - System-wide audit logs

---

## Status: ✅ ALL FEATURES IMPLEMENTED

- ✅ Prepaid recharge working
- ✅ Postpaid recharge working
- ✅ Day Limit recharge working
- ✅ Comprehensive logging implemented
- ✅ Customer type switching logged
- ✅ All actions tracked in both log systems

