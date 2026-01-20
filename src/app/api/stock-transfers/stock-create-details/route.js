import { executeQuery, executeTransaction } from "@/lib/db";
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transfer ID is required' },
        { status: 400 }
      );
    }

    // Fetch transfer record without product join first
    const transferRows = await executeQuery(
      `SELECT st.*, 
              fs1.station_name as from_station_name,
              fs2.station_name as to_station_name
       FROM stock_transfers st
       LEFT JOIN filling_stations fs1 ON st.station_from = fs1.id
       LEFT JOIN filling_stations fs2 ON st.station_to = fs2.id
       WHERE st.id = ?`,
      [id]
    );

    if (transferRows.length === 0) {
      return NextResponse.json(
        { error: 'No record found' },
        { status: 404 }
      );
    }

    // Fetch stations
    const stationsRows = await executeQuery(
      'SELECT id, station_name FROM filling_stations'
    );

    // Fetch products - TRY DIFFERENT TABLE NAMES
    let productsRows = [];
    let productTableExists = false;
    let actualProductTable = '';
    
    // Try to find the correct products table
    const possibleTableNames = ['products', 'product', 'Product', 'PRODUCTS', 'stock_products'];
    
    for (const tableName of possibleTableNames) {
      try {
        productsRows = await executeQuery(
          `SELECT id, pname FROM ${tableName}`
        );
        productTableExists = true;
        actualProductTable = tableName;
        console.log(`✅ Found products table: ${tableName}`);
        break;
      } catch (error) {
        console.log(`❌ Table ${tableName} not found`);
      }
    }
    
    // If no products table found, use empty array
    if (!productTableExists) {
      productsRows = [];
      console.log('⚠️ No products table found in database');
    }

    // Get product name for current transfer if possible
    let productName = '';
    if (transferRows[0].product && productTableExists) {
      try {
        const productInfo = await executeQuery(
          `SELECT pname FROM ${actualProductTable} WHERE id = ?`,
          [transferRows[0].product]
        );
        if (productInfo.length > 0) {
          productName = productInfo[0].pname;
        }
      } catch (error) {
        console.log('Could not fetch product name');
      }
    }

    // Fetch transfer logs if table exists
    let logsRows = [];
    try {
      logsRows = await executeQuery(
        `SELECT tl.*, u.name as updated_by_name 
         FROM transfer_logs tl
         LEFT JOIN users u ON tl.updated_by = u.id
         WHERE tl.transfer_id = ?
         ORDER BY tl.created_at DESC`,
        [id]
      );
    } catch (error) {
      console.log('transfer_logs table not found, skipping logs');
    }

    return NextResponse.json({
      transfer: {
        ...transferRows[0],
        product_name: productName
      },
      stations: stationsRows,
      products: productsRows,
      logs: logsRows,
      hasProductsTable: productTableExists
    });
  } catch (error) {
    console.error('Error fetching transfer details:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to save uploaded file
async function saveFile(file, fileName) {
  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'slips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, buffer);

    return `/uploads/slips/${fileName}`;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

// Helper function to get status text
function getStatusText(status) {
  switch(status) {
    case '1': return 'Dispatch';
    case '2': return 'Pending';
    case '3': return 'Completed';
    default: return 'Unknown';
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transfer ID is required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    
    const station_from = formData.get('station_from');
    const station_to = formData.get('station_to');
    const driver_id = formData.get('driver_id');
    const vehicle_id = formData.get('vehicle_id');
    const transfer_quantity = parseFloat(formData.get('transfer_quantity'));
    const status = formData.get('status');
    const product = formData.get('product');
    const slipFile = formData.get('slip');
    const user_id = formData.get('user_id') || '1'; // Default to admin user

    // Validation
    if (!station_from || !station_to || !driver_id || !vehicle_id || 
        !transfer_quantity || !status || !product) {
      return NextResponse.json(
        { error: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    if (transfer_quantity <= 0) {
      return NextResponse.json(
        { error: 'Transfer quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current transfer data WITHOUT product join
    const currentTransfer = await executeQuery(
      `SELECT st.*, 
              fs1.station_name as from_station_name,
              fs2.station_name as to_station_name
       FROM stock_transfers st
       LEFT JOIN filling_stations fs1 ON st.station_from = fs1.id
       LEFT JOIN filling_stations fs2 ON st.station_to = fs2.id
       WHERE st.id = ?`,
      [id]
    );

    if (currentTransfer.length === 0) {
      return NextResponse.json(
        { error: 'Transfer record not found' },
        { status: 404 }
      );
    }

    const oldData = currentTransfer[0];
    
    let slip = oldData.slip || '';
    
    // Handle file upload if new file is provided
    if (slipFile && slipFile.size > 0) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      const fileType = slipFile.type;
      
      if (!validTypes.includes(fileType)) {
        return NextResponse.json(
          { error: 'Only JPG, JPEG, PNG & GIF files are allowed' },
          { status: 400 }
        );
      }

      // Validate file size (5MB)
      if (slipFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size should be less than 5MB' },
          { status: 400 }
        );
      }

      // Generate unique file name
      const fileExtension = path.extname(slipFile.name);
      const fileName = `slip_${id}_${Date.now()}${fileExtension}`;
      
      // Save file
      slip = await saveFile(slipFile, fileName);
    }

    // Prepare changes log
    const changes = [];
    
    // Compare old and new values
    if (parseInt(oldData.station_from) !== parseInt(station_from)) {
      // Get station names for better log
      const [fromStation] = await executeQuery(
        'SELECT station_name FROM filling_stations WHERE id = ?',
        [station_from]
      );
      const newFromName = fromStation?.[0]?.station_name || station_from;
      changes.push(`Station From: ${oldData.from_station_name} → ${newFromName}`);
    }
    
    if (parseInt(oldData.station_to) !== parseInt(station_to)) {
      const [toStation] = await executeQuery(
        'SELECT station_name FROM filling_stations WHERE id = ?',
        [station_to]
      );
      const newToName = toStation?.[0]?.station_name || station_to;
      changes.push(`Station To: ${oldData.to_station_name} → ${newToName}`);
    }
    
    if (oldData.driver_id !== driver_id) {
      changes.push(`Driver ID: ${oldData.driver_id} → ${driver_id}`);
    }
    
    if (oldData.vehicle_id !== vehicle_id) {
      changes.push(`Vehicle ID: ${oldData.vehicle_id} → ${vehicle_id}`);
    }
    
    if (parseFloat(oldData.transfer_quantity) !== transfer_quantity) {
      changes.push(`Quantity: ${oldData.transfer_quantity} → ${transfer_quantity}`);
    }
    
    if (oldData.status !== status) {
      changes.push(`Status: ${getStatusText(oldData.status)} → ${getStatusText(status)}`);
    }
    
    if (parseInt(oldData.product) !== parseInt(product)) {
      // Try to get product names
      let oldProductName = oldData.product;
      let newProductName = product;
      
      try {
        // Check if products table exists
        const tableCheck = await executeQuery("SHOW TABLES LIKE 'products'");
        if (tableCheck.length > 0) {
          const [oldProduct] = await executeQuery(
            'SELECT pname FROM products WHERE id = ?',
            [oldData.product]
          );
          if (oldProduct?.[0]?.pname) {
            oldProductName = oldProduct[0].pname;
          }
          
          const [newProduct] = await executeQuery(
            'SELECT pname FROM products WHERE id = ?',
            [product]
          );
          if (newProduct?.[0]?.pname) {
            newProductName = newProduct[0].pname;
          }
        }
      } catch (error) {
        console.log('Could not fetch product names');
      }
      
      changes.push(`Product: ${oldProductName} → ${newProductName}`);
    }
    
    if (slip !== oldData.slip && slipFile && slipFile.size > 0) {
      changes.push(`Slip: Updated with new file`);
    }

    // Execute transaction
    const result = await executeTransaction(async (connection) => {
      // Update transfer record
      await connection.execute(
        `UPDATE stock_transfers SET 
          station_from = ?,
          station_to = ?,
          driver_id = ?,
          vehicle_id = ?,
          transfer_quantity = ?,
          status = ?,
          slip = ?,
          product = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          station_from,
          station_to,
          driver_id,
          vehicle_id,
          transfer_quantity,
          status,
          slip,
          product,
          id
        ]
      );

      // Check if transfer_logs table exists
      let logsTableExists = false;
      try {
        await connection.execute("SHOW TABLES LIKE 'transfer_logs'");
        logsTableExists = true;
      } catch (error) {
        console.log('transfer_logs table not found, skipping log creation');
      }

      // Create log entry if table exists
      if (logsTableExists && changes.length > 0) {
        let action = 'Updated transfer details';
        
        if (oldData.status !== status) {
          action = `Status changed to ${getStatusText(status)}`;
        }
        
        await connection.execute(
          `INSERT INTO transfer_logs 
            (transfer_id, action, changes, updated_by, created_at)
          VALUES (?, ?, ?, ?, NOW())`,
          [
            id,
            action,
            JSON.stringify(changes),
            user_id
          ]
        );
      }

      // Check if status is "Completed" (3) to update stock
      if (status === '3' && oldData.status !== '3') {
        let productName = product;
        
        // Try to get product name if products table exists
        try {
          const [productInfo] = await connection.execute(
            "SELECT pname FROM products WHERE id = ?",
            [product]
          );
          if (productInfo.length > 0) {
            productName = productInfo[0].pname;
          }
        } catch (error) {
          console.log('Could not fetch product name, using ID');
        }

        // Update stock at destination station
        const [stockRows] = await connection.execute(
          'SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?',
          [station_to, product]
        );

        let stockAction = '';
        
        if (stockRows.length > 0) {
          const stock_to = parseFloat(stockRows[0].stock) || 0;
          const new_stock_to = stock_to + transfer_quantity;

          await connection.execute(
            'UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?',
            [new_stock_to, station_to, product]
          );

          // Insert into filling_history if table exists
          try {
            await connection.execute("SHOW TABLES LIKE 'filling_history'");
            await connection.execute(
              `INSERT INTO filling_history 
                (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date)
              VALUES (?, ?, 'Inward', ?, ?, ?, NOW())`,
              [station_to, product, stock_to, transfer_quantity, new_stock_to]
            );
          } catch (error) {
            console.log('filling_history table not found, skipping');
          }

          stockAction = `Stock updated: ${stock_to} → ${new_stock_to} ${productName}`;
        } else {
          // If no stock record exists, create one
          await connection.execute(
            `INSERT INTO filling_station_stocks (fs_id, product, stock) 
             VALUES (?, ?, ?)`,
            [station_to, product, transfer_quantity]
          );

          // Insert into filling_history if table exists
          try {
            await connection.execute("SHOW TABLES LIKE 'filling_history'");
            await connection.execute(
              `INSERT INTO filling_history 
                (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date)
              VALUES (?, ?, 'Inward', 0, ?, ?, NOW())`,
              [station_to, product, transfer_quantity, transfer_quantity]
            );
          } catch (error) {
            console.log('filling_history table not found, skipping');
          }

          stockAction = `Stock created: ${transfer_quantity} ${productName} added`;
        }

        // Add stock update to log if logs table exists
        if (logsTableExists && stockAction) {
          await connection.execute(
            `INSERT INTO transfer_logs 
              (transfer_id, action, changes, updated_by, created_at)
            VALUES (?, ?, ?, ?, NOW())`,
            [
              id,
              'Stock updated',
              JSON.stringify([stockAction]),
              user_id
            ]
          );
        }
      }

      return { 
        success: true, 
        changes: changes,
        statusChanged: oldData.status !== status,
        stockUpdated: status === '3' && oldData.status !== '3'
      };
    });

    // Prepare response message based on changes
    let message = 'Record updated successfully!';
    
    if (result.statusChanged) {
      message = `Status changed to ${getStatusText(status)} successfully!`;
    }
    
    if (result.stockUpdated) {
      message += ' Stock has been added to destination station.';
    }
    
    if (result.changes.length > 0) {
      message += ` Changes: ${result.changes.join(', ')}`;
    }

    return NextResponse.json({
      success: true,
      message: message,
      changes: result.changes,
      statusChanged: result.statusChanged,
      stockUpdated: result.stockUpdated
    });

  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Error updating record: ' + error.message },
      { status: 500 }
    );
  }
}