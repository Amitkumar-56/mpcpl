# Role-Based Permissions Configuration

## Overview
This document outlines the role-based permissions and access control for different user roles in the system.

## Role Definitions

### 1. Staff (Role 1)
**Access:**
- ✅ Single branch/station (filtered by assigned `fs_id`)
- ✅ Purchase Request (search box only - no buttons, no status filters)
- ✅ Stock (optional - based on permissions)
- ✅ Attendance (all history)
- ✅ Dashboard (balance only)

**Restrictions:**
- ❌ Cannot create requests
- ❌ Cannot see history items (Stock History, Outstanding History, Loading History, Tanker History, Deepo History)
- ❌ Cannot see NB modules, Users, Agent Management, Reports
- ❌ Cannot see Customers, Employees, Suppliers, Transporters management

**Menu Items:**
- Dashboard
- Purchase Request
- Stock (if permission granted)
- Loading Stations

---

### 2. Incharge (Role 2)
**Access:**
- ✅ Single branch/station (filtered by assigned `fs_id`)
- ✅ Purchase Request (search box only - no buttons, no status filters)
- ✅ Stock (optional - based on permissions)
- ✅ Attendance (all history)
- ✅ Dashboard (balance only)

**Restrictions:**
- ❌ Cannot create requests
- ❌ **NO HISTORY ITEMS** (all history modules hidden)
- ❌ Cannot see NB modules, Users, Agent Management, Reports
- ❌ Cannot see Customers, Employees, Suppliers, Transporters management

**Menu Items:**
- Dashboard
- Purchase Request
- Stock (if permission granted)
- Loading Stations

---

### 3. Team Leader (Role 3)
**Access:**
- ✅ Multi-branch/station (can see all stations)
- ✅ Purchase Request (full access - with buttons, status filters, export)
- ✅ Tanker Movement (Tanker History)
- ✅ Attendance (for his branch team only)
- ✅ Customer Recharge (via Customers module)
- ✅ Create Request (can create filling requests)
- ✅ Stock Update

**Restrictions:**
- ❌ Cannot see NB modules (NB Accounts, NB Expenses, NB Stock)
- ❌ Cannot see Users, Agent Management (admin only)

**Menu Items:**
- Dashboard
- Customers (for recharge)
- Purchase Request (full)
- Stock
- Stock History
- Outstanding History
- Loading Stations
- Schedule Prices
- Products
- Employees
- Suppliers
- Transporters
- Stock Transfer
- Reports
- Vehicles
- LR Management
- Loading History
- Tanker History
- Deepo History
- Vouchers
- Remarks
- Items

---

### 4. Accountant (Role 4)
**Access:**
- ✅ Multi-branch
- ✅ Create Request
- ✅ Tanker Movement (Tanker History - for stock tracking)
- ✅ Stock Update (sale, use)
- ✅ NB Stock
- ✅ NB Expenses
- ✅ NB Accounts

**Restrictions:**
- ❌ Cannot see history items (Stock History, Outstanding History, Loading History, Deepo History)
- ❌ Cannot see Users, Agent Management

**Menu Items:**
- Dashboard
- Purchase Request
- Stock
- Tanker History (for movement tracking)
- Stock Transfer
- Loading Stations
- Products
- NB Accounts
- NB Expenses
- NB Stock

---

### 5. Head Operation (Role 5 - Admin)
**Access:**
- ✅ All modules from Accountant
- ✅ All modules in the system
- ✅ Full administrative access

**Menu Items:**
- All menu items available

---

## Implementation Details

### API Changes
1. **Filling Requests API** (`/api/filling-requests/route.js`):
   - Staff/Incharge: Filtered by assigned station (`fs_id`), only pending requests
   - Team Leader+: Multi-branch access, all statuses

### Frontend Changes
1. **Sidebar** (`src/components/sidebar.jsx`):
   - Role-based menu filtering
   - History items hidden for Incharge
   - NB modules only for Accountant and above

2. **Filling Requests Page** (`src/app/filling-requests/editFiling.jsx`):
   - Staff/Incharge: Search box only, no buttons, no status filters
   - Team Leader+: Full page with all features

3. **Dashboard** (`src/app/dashboard/page.js`):
   - Staff/Incharge: Balance only
   - Others: Full dashboard stats

---

## Notes

### Attendance Module
- **Status**: Needs to be implemented or verified
- **Staff/Incharge**: Should have access to all attendance history
- **Team Leader**: Should have access to attendance for his branch team only
- **Location**: Check if attendance module exists or needs to be created

### Customer Recharge
- **Path**: `/customers/recharge-request`
- **Access**: Team Leader and above (via Customers module)
- **Functionality**: Allows recharging customer balance

### Tanker Movement
- **Module**: Tanker History (`/tanker-history`)
- **Access**: Team Leader (full), Accountant (for stock tracking)
- **Purpose**: Track tanker movements and stock transfers

---

## Testing Checklist

- [ ] Staff can only see assigned station requests
- [ ] Staff/Incharge see only search box in Purchase Request
- [ ] Team Leader sees full Purchase Request page
- [ ] Incharge cannot see any history items
- [ ] Team Leader can access Customer Recharge
- [ ] Accountant can access NB modules
- [ ] Multi-branch access works for Team Leader+
- [ ] Single-branch restriction works for Staff/Incharge

