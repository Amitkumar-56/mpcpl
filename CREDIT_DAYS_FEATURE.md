# Credit Days Feature Implementation

## Overview

This feature adds a third customer type called "Credit Days" customers, in addition to the existing Prepaid and Postpaid customers.

## How Credit Days Work

### Customer Creation

- When creating a customer, you can now select "Credit Days Client" as the customer type
- You specify the number of credit days (e.g., 10 days)
- Optionally set a credit limit

### Credit Period Management

- Credit days customers can make requests without immediate payment
- They have a specified number of days (e.g., 10 days) to make payment
- After the credit period expires, their account is automatically blocked
- Status shows as "overdue" with days overdue count

### Automatic Credit Reset

- When a credit days customer makes a payment, their credit period is automatically reset
- New expiry date is calculated from the payment date + credit days
- Account is automatically unblocked after payment

## Database Changes

### New Fields Added

- `customers.credit_days` - Number of credit days for the customer
- `customer_balances.limit_expiry` - Date when credit period expires
- `customer_balances.last_reset_date` - Last time credit was reset

### New API Endpoints

- `POST /api/customers/credit-payment` - Handle credit days customer payments
- `GET /api/customers/credit-payment?customerId=X` - Get credit status

## UI Changes

### Customer Add Form

- Added "Credit Days Client" option
- Credit days input field (1-365 days)
- Optional credit limit field

### Customer Details Page

- Shows credit expiry date
- Displays days remaining or days overdue
- Credit-specific status badges
- Enhanced payment modal for credit days customers

### Customer List Page

- Updated billing type display to show "Credit Days (Xd)"
- Updated statistics to separate credit days customers

## Utility Functions

### `src/lib/creditDaysUtils.js`

- `checkCreditDaysOverdue(customerId)` - Check if customer is overdue
- `resetCreditDaysLimit(customerId, paymentAmount)` - Reset credit after payment
- `getCreditDaysStatus(customer)` - Get customer status
- `canMakeCreditRequest(customerId, requestAmount)` - Check request eligibility

## Testing

Run the credit days test suite:

```bash
npm run test:credit-days
```

## Usage Examples

### Creating a Credit Days Customer

```javascript
const customerData = {
  client_type: "3", // Credit Days
  credit_days: 10, // 10 days credit period
  amtlimit: 50000, // Optional credit limit
};
```

### Checking Credit Status

```javascript
import { checkCreditDaysOverdue } from "@/lib/creditDaysUtils";

const status = await checkCreditDaysOverdue(customerId);
// Returns: { isOverdue, daysOverdue, totalOutstanding, limitExpiry, creditDays }
```

### Processing Payment

```javascript
const paymentData = {
  customerId: 123,
  paymentAmount: 25000,
  paymentMethod: "cash",
};

const response = await fetch("/api/customers/credit-payment", {
  method: "POST",
  body: JSON.stringify(paymentData),
});
```

## Status Types

1. **Active** - Credit period is valid, customer can make requests
2. **Overdue** - Credit period expired with outstanding balance
3. **Blocked** - Credit period expired, account blocked

## Automatic Processes

1. **Overdue Detection** - Automatically detects when credit period expires
2. **Account Blocking** - Blocks overdue accounts from making new requests
3. **Credit Reset** - Resets credit period after payment
4. **Status Updates** - Updates customer status based on credit period

## Benefits

- Flexible credit terms for different customers
- Automatic credit management
- Clear overdue tracking
- Seamless payment and reset process
- Better cash flow management
