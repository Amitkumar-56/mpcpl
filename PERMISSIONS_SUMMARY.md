# Permission System Summary

## ✅ Pages with Permission Checks (Verified)

### Main Pages:
1. **Customers** (`/customers/page.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Customer"

2. **Employees** (`/employees/page.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Employees"

3. **Stock** (`/stock/page.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Stock"

4. **Products** (`/products/page.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Items & Products"

5. **Filling Requests** (`/filling-requests/editFiling.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Filling Requests"

6. **Loading Stations** (`/loading-stations/page.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Loading Station"

7. **Suppliers** (`/suppliers/Suppliers.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Suppliers"

8. **Transporters** (`/transporters/page.jsx`) ✅
   - Checks: can_view, can_edit, can_delete
   - Module: "Transporters"

9. **Loading History** (`/loading-unloading-history/page.jsx`) ✅
   - Checks: can_view
   - Module: "Loading History"

10. **Tanker History** (`/tanker-history/page.jsx`) ✅
    - Checks: can_view, can_edit, can_delete
    - Module: "Tanker History"

11. **Deepo History** (`/deepo-history/page.jsx`) ✅
    - Checks: can_view, can_edit, can_delete
    - Module: "Deepo History"

12. **Items** (`/items/page.jsx`) ✅
    - Checks: can_view
    - Module: "Items"

13. **NB Expenses** (`/nb-expenses/page.jsx`) ✅
    - Checks: can_view, can_edit, can_delete
    - Module: "NB Expenses"

14. **LR List** (`/lr-list/page.jsx`) ✅
    - Checks: can_view, can_edit, can_delete
    - Module: "LR Management"

15. **Roles** (`/roles/page.jsx`) ✅
    - Admin only (role 5)
    - No module check needed

## 🔐 Permission Check Flow

### 1. Login Time:
- Employee-specific permissions fetched (employee_id = X)
- Role-based permissions fetched (role = Y, employee_id = 0)
- Merged: Employee-specific overrides role-based
- Stored in session

### 2. Page Access:
- Check if user is admin (role 5) → Full access
- Check cached permissions from session
- Check sessionStorage cache (5 min TTL)
- Fetch from API if not cached
- Deny access if no permission

### 3. Action Buttons:
- Edit buttons: Check `can_edit` permission
- Delete buttons: Check `can_delete` permission
- View buttons: Check `can_view` permission

## 📋 Module Names Mapping

| Sidebar Module | Database Module Name |
|---------------|---------------------|
| Dashboard | Dashboard |
| Customers | Customer |
| Filling Requests | Filling Requests |
| Stock | Stock |
| Loading Stations | Loading Station |
| Products | Items & Products |
| Employees | Employees |
| Suppliers | Suppliers |
| Transporters | Transporters |
| NB Accounts | NB Accounts |
| NB Expenses | NB Expenses |
| NB Stock | NB Stock |
| Stock Transfer | Stock Transfer |
| Reports | Reports |
| Retailers | Retailers |
| Agent Management | Agent Management |
| Users | Users |
| Vehicles | Vehicles |
| LR Management | LR Management |
| Loading History | Loading History |
| Tanker History | Tanker History |
| Deepo History | Deepo History |
| Vouchers | Voucher |
| Remarks | Remarks |
| Items | Items |

## ✅ System Status

- ✅ Login routes fetch both employee and role permissions
- ✅ Verify route merges permissions correctly
- ✅ Check-permissions API checks employee_id first, then role
- ✅ Sidebar filters menu items based on can_view
- ✅ All major pages have permission checks
- ✅ Edit/Delete buttons respect permissions
- ✅ Admin (role 5) has full access everywhere
- ✅ Roles page is admin-only

## 🎯 How It Works

1. **Employee-Specific Permissions** (Highest Priority):
   - Set in employee edit page
   - Stored with `employee_id` in `role_permissions` table
   - Override role-based permissions for same module

2. **Role-Based Permissions** (Fallback):
   - Set in roles page (admin only)
   - Stored with `role` and `employee_id = 0`
   - Applied when no employee-specific permission exists

3. **Admin Access**:
   - Role 5 (Admin) always has full access
   - No permission checks needed
   - Can access all pages and perform all actions

## 📝 Notes

- Permissions are cached in sessionStorage for 5 minutes
- Permission checks happen on page load
- API routes also verify permissions server-side
- Sidebar automatically hides modules without can_view permission

