import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id"); // optional

    const connection = await executeQuery();
    let query = "SELECT * FROM filling_requests";
    const params = [];

    if (id) {
      query += " WHERE id = ?";
      params.push(id);
    }

    const [results] = await connection.execute(query, params);

    if (id && results.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Error fetching filling requests:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    const id = formData.get('id');
    const product_id = formData.get('product');
    const station_id = formData.get('station');
    const vehicle_number = formData.get('vehicle_number');
    const driver_number = formData.get('driver_number');
    const qty = Number(formData.get('qty'));
    const aqty = Number(formData.get('aqty'));
    const customer_id = formData.get('customer');

    const doc1 = formData.get('doc1');
    const doc2 = formData.get('doc2');
    const doc3 = formData.get('doc3');

    const connection = await executeQuery();
    await connection.beginTransaction();

    try {
      const [currentRecord] = await connection.execute(
        'SELECT aqty, rid FROM filling_requests WHERE id = ?',
        [id]
      );

      if (currentRecord.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      const old_aqty = currentRecord[0].aqty;

      await connection.execute(
        `UPDATE filling_requests SET 
          product = ?, fs_id = ?, vehicle_number = ?, driver_number = ?, 
          qty = ?, aqty = ?, cid = ? 
         WHERE id = ?`,
        [product_id, station_id, vehicle_number, driver_number, qty, aqty, customer_id, id]
      );

      // Adjust balances & stock
      if (aqty !== old_aqty) {
        const [priceData] = await connection.execute(
          'SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND com_id = ?',
          [station_id, product_id, customer_id]
        );

        if (priceData.length > 0) {
          const price = priceData[0].price;
          const qty_diff = Math.abs(aqty - old_aqty);
          const amount = qty_diff * price;

          if (aqty > old_aqty) {
            await connection.execute(
              'UPDATE customer_balances SET balance = balance + ?, amtlimit = amtlimit - ? WHERE com_id = ?',
              [amount, amount, customer_id]
            );
            await connection.execute(
              'UPDATE filling_station_stocks SET stock = stock - ? WHERE fs_id = ? AND product = ?',
              [qty_diff, station_id, product_id]
            );
          } else {
            await connection.execute(
              'UPDATE customer_balances SET balance = balance - ?, amtlimit = amtlimit + ? WHERE com_id = ?',
              [amount, amount, customer_id]
            );
            await connection.execute(
              'UPDATE filling_station_stocks SET stock = stock + ? WHERE fs_id = ? AND product = ?',
              [qty_diff, station_id, product_id]
            );
          }
        }
      }

      // TODO: Handle file uploads if needed (doc1, doc2, doc3)

      await connection.commit();

      return NextResponse.json({ success: true, message: 'Record updated successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
