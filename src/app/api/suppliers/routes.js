const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware: Authentication
function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  next();
}

// Middleware: Permission check
function checkPermission(moduleName, action) {
  return async (req, res, next) => {
    try {
      const role = req.session.role;

      const [rows] = await db.execute(
        "SELECT can_view, can_edit, can_delete FROM role_permissions WHERE module=? AND role=?",
        [moduleName, role]
      );

      if (rows.length === 0) {
        return res.status(403).json({ error: "Permission not found." });
      }

      const permissions = rows[0];

      if (action === "view" && permissions.can_view !== 1) {
        return res.status(403).json({ error: "You are not allowed to view suppliers." });
      }
      if (action === "edit" && permissions.can_edit !== 1) {
        return res.status(403).json({ error: "You are not allowed to edit suppliers." });
      }
      if (action === "delete" && permissions.can_delete !== 1) {
        return res.status(403).json({ error: "You are not allowed to delete suppliers." });
      }

      req.permissions = permissions;
      next();
    } catch (err) {
      console.error("Permission check failed:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

// GET: List suppliers with all fields
router.get("/", isAuthenticated, checkPermission("Supplier", "view"), async (req, res) => {
  try {
    // Fetch all suppliers from the database
    const [suppliers] = await db.execute(`
      SELECT 
        id,
        name,
        phone,
        address,
        postbox,
        email,
        picture,
        gstin,
        pan,
        supplier_type,
        status,
        created_at,
        updated_at
      FROM supplier 
      ORDER BY created_at DESC
    `);

    // Calculate payable amount for each supplier from stock table
    const suppliersWithPayable = await Promise.all(
      suppliers.map(async (supplier) => {
        try {
          const [rows] = await db.execute(
            "SELECT SUM(payable) AS total_payable FROM stock WHERE supplier_id = ?",
            [supplier.id]
          );
          
          const payable = rows[0].total_payable || 0;
          
          return {
            ...supplier,
            payable: Number(payable)
          };
        } catch (error) {
          console.error(`Error calculating payable for supplier ${supplier.id}:`, error);
          return {
            ...supplier,
            payable: 0
          };
        }
      })
    );

    res.json({ 
      suppliers: suppliersWithPayable, 
      permissions: req.permissions 
    });
    
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST: Add new supplier
router.post("/", isAuthenticated, checkPermission("Supplier", "edit"), async (req, res) => {
  const { 
    name, 
    phone, 
    address, 
    postbox, 
    email, 
    picture, 
    gstin, 
    pan, 
    supplier_type, 
    status 
  } = req.body;

  // Validation
  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO supplier 
       (name, phone, address, postbox, email, picture, gstin, pan, supplier_type, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, address, postbox, email, picture, gstin, pan, supplier_type, status || 'active']
    );

    res.json({ 
      message: "Supplier added successfully", 
      id: result.insertId 
    });
  } catch (err) {
    console.error("Error adding supplier:", err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('email')) {
        res.status(400).json({ error: "Supplier with this email already exists" });
      } else if (err.sqlMessage.includes('phone')) {
        res.status(400).json({ error: "Supplier with this phone number already exists" });
      } else {
        res.status(400).json({ error: "Supplier with these details already exists" });
      }
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// GET: Single supplier by ID
router.get("/:id", isAuthenticated, checkPermission("Supplier", "view"), async (req, res) => {
  const { id } = req.params;

  try {
    const [suppliers] = await db.execute(
      `SELECT 
        id,
        name,
        phone,
        address,
        postbox,
        email,
        picture,
        gstin,
        pan,
        supplier_type,
        status,
        created_at,
        updated_at
       FROM supplier WHERE id = ?`,
      [id]
    );

    if (suppliers.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Calculate payable amount
    const [rows] = await db.execute(
      "SELECT SUM(payable) AS total_payable FROM stock WHERE supplier_id = ?",
      [id]
    );

    const supplier = {
      ...suppliers[0],
      payable: Number(rows[0].total_payable || 0)
    };

    res.json({ supplier });
  } catch (err) {
    console.error("Error fetching supplier:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT: Update supplier
router.put("/:id", isAuthenticated, checkPermission("Supplier", "edit"), async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    phone, 
    address, 
    postbox, 
    email, 
    picture, 
    gstin, 
    pan, 
    supplier_type, 
    status 
  } = req.body;

  // Validation
  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const [result] = await db.execute(
      `UPDATE supplier SET 
        name = ?, phone = ?, address = ?, postbox = ?, email = ?, 
        picture = ?, gstin = ?, pan = ?, supplier_type = ?, status = ?
       WHERE id = ?`,
      [name, phone, address, postbox, email, picture, gstin, pan, supplier_type, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.json({ message: "Supplier updated successfully" });
  } catch (err) {
    console.error("Error updating supplier:", err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: "Supplier with these details already exists" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// DELETE: Delete supplier
router.delete("/:id", isAuthenticated, checkPermission("Supplier", "delete"), async (req, res) => {
  const { id } = req.params;

  try {
    // Check if supplier has related records
    const [stockRows] = await db.execute(
      "SELECT COUNT(*) as stockCount FROM stock WHERE supplier_id = ?", 
      [id]
    );

    if (stockRows[0].stockCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete supplier with existing stock records" 
      });
    }

    const [result] = await db.execute("DELETE FROM supplier WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.json({ message: "Supplier deleted successfully" });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;