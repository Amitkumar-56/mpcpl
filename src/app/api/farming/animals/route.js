// src/app/api/farming/animals/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET all animals with filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const batch_id = searchParams.get('batch_id');
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    const parents_only = searchParams.get('parents_only');

    // Single animal FULL detail
    if (id) {
      const animal = await executeQuery(`
        SELECT a.*, 
          m.tag_id as mother_tag, m.name as mother_name, m.breed as mother_breed, m.id as mother_record_id,
          f.tag_id as father_tag, f.name as father_name, f.breed as father_breed, f.id as father_record_id,
          b.batch_code, b.batch_name
        FROM farming_animals a
        LEFT JOIN farming_animals m ON a.mother_id = m.id
        LEFT JOIN farming_animals f ON a.father_id = f.id
        LEFT JOIN farming_batches b ON a.batch_id = b.id
        WHERE a.id = ?
      `, [id]);

      if (animal.length === 0) {
        return NextResponse.json({ success: false, error: 'Animal not found' }, { status: 404 });
      }

      // Get ALL offspring (children) with their other parent info
      const offspring = await executeQuery(`
        SELECT c.id, c.tag_id, c.name, c.gender, c.breed, c.date_of_birth, c.status, c.health_status, c.weight,
          CASE WHEN c.mother_id = ? THEN 'mother' ELSE 'father' END as parent_role,
          CASE WHEN c.mother_id = ? THEN op.name ELSE om.name END as other_parent_name,
          CASE WHEN c.mother_id = ? THEN op.tag_id ELSE om.tag_id END as other_parent_tag
        FROM farming_animals c
        LEFT JOIN farming_animals om ON c.mother_id = om.id
        LEFT JOIN farming_animals op ON c.father_id = op.id
        WHERE c.mother_id = ? OR c.father_id = ?
        ORDER BY c.date_of_birth DESC
      `, [id, id, id, id, id]);

      // Get siblings (same mother or father)
      const siblings = await executeQuery(`
        SELECT s.id, s.tag_id, s.name, s.gender, s.date_of_birth, s.status
        FROM farming_animals s
        WHERE s.id != ? AND (
          (s.mother_id IS NOT NULL AND s.mother_id = (SELECT mother_id FROM farming_animals WHERE id = ?))
          OR (s.father_id IS NOT NULL AND s.father_id = (SELECT father_id FROM farming_animals WHERE id = ?))
        )
        ORDER BY s.date_of_birth DESC
        LIMIT 20
      `, [id, id, id]);

      // Get production records
      const production = await executeQuery(`
        SELECT * FROM farming_production WHERE animal_id = ? ORDER BY production_date DESC LIMIT 50
      `, [id]);

      // Get health records
      const health = await executeQuery(`
        SELECT * FROM farming_health WHERE animal_id = ? ORDER BY treatment_date DESC LIMIT 30
      `, [id]);

      // Get feed records
      const feed = await executeQuery(`
        SELECT * FROM farming_feed WHERE animal_id = ? ORDER BY feed_date DESC LIMIT 30
      `, [id]);

      // Get inward history
      const inwardHistory = await executeQuery(`
        SELECT * FROM farming_inward WHERE animal_id = ? ORDER BY inward_date DESC
      `, [id]);

      // Get outward history
      const outwardHistory = await executeQuery(`
        SELECT * FROM farming_outward WHERE animal_id = ? ORDER BY outward_date DESC
      `, [id]);

      // Production summary
      const productionSummary = await executeQuery(`
        SELECT product_name, unit, SUM(quantity) as total_qty, COUNT(*) as total_entries,
          MAX(production_date) as last_date
        FROM farming_production WHERE animal_id = ?
        GROUP BY product_name, unit
      `, [id]);

      // FINANCIAL CALCULATIONS
      // 1. Total Feed Cost
      const feedStats = await executeQuery(`
        SELECT SUM(total_cost) as total_feed_cost, COUNT(*) as feed_entries 
        FROM farming_feed WHERE animal_id = ?
      `, [id]);

      // 2. Total Health Cost
      const healthStats = await executeQuery(`
        SELECT SUM(cost) as total_health_cost, COUNT(*) as health_entries
        FROM farming_health WHERE animal_id = ?
      `, [id]);

      // 3. Outward Revenue (Sale of animal or specific products)
      const outwardStats = await executeQuery(`
        SELECT SUM(total_price) as total_outward_revenue, COUNT(*) as outward_entries
        FROM farming_outward WHERE animal_id = ?
      `, [id]);

      // 4. Mates (Partners who fathered/mothered children with this animal)
      let mates = [];
      if (animal[0].gender === 'female') {
        mates = await executeQuery(`
          SELECT DISTINCT f.id, f.tag_id, f.name, f.breed
          FROM farming_animals c
          JOIN farming_animals f ON c.father_id = f.id
          WHERE c.mother_id = ?
        `, [id]);
      } else if (animal[0].gender === 'male') {
        mates = await executeQuery(`
          SELECT DISTINCT m.id, m.tag_id, m.name, m.breed
          FROM farming_animals c
          JOIN farming_animals m ON c.mother_id = m.id
          WHERE c.father_id = ?
        `, [id]);
      }

      const stats = {
        total_feed_cost: Number(feedStats[0]?.total_feed_cost || 0),
        total_health_cost: Number(healthStats[0]?.total_health_cost || 0),
        total_purchase_cost: Number(animal[0].purchase_price || 0),
        total_outward_revenue: Number(outwardStats[0]?.total_outward_revenue || 0),
        feed_entries: feedStats[0]?.feed_entries || 0,
        health_entries: healthStats[0]?.health_entries || 0,
        outward_entries: outwardStats[0]?.outward_entries || 0,
      };

      stats.total_expenses = stats.total_purchase_cost + stats.total_feed_cost + stats.total_health_cost;
      stats.net_profit_loss = stats.total_outward_revenue - stats.total_expenses;

      return NextResponse.json({
        success: true,
        data: {
          ...animal[0],
          offspring,
          offspring_count: offspring.length,
          siblings,
          mates,
          production,
          productionSummary,
          health,
          feed,
          inwardHistory,
          outwardHistory,
          financials: stats
        }
      });
    }

    // LIST animals
    let query = `
      SELECT a.*, 
        m.tag_id as mother_tag, m.name as mother_name,
        f.tag_id as father_tag, f.name as father_name,
        b.batch_code, b.batch_name,
        (SELECT COUNT(*) FROM farming_animals c WHERE c.mother_id = a.id OR c.father_id = a.id) as offspring_count
      FROM farming_animals a
      LEFT JOIN farming_animals m ON a.mother_id = m.id
      LEFT JOIN farming_animals f ON a.father_id = f.id
      LEFT JOIN farming_batches b ON a.batch_id = b.id
      WHERE 1=1
    `;
    let params = [];

    if (type) { query += ` AND a.type = ?`; params.push(type); }
    if (status) { query += ` AND a.status = ?`; params.push(status); }
    if (gender) { query += ` AND a.gender = ?`; params.push(gender); }
    if (batch_id) { query += ` AND a.batch_id = ?`; params.push(batch_id); }
    if (search) {
      query += ` AND (a.tag_id LIKE ? OR a.name LIKE ? OR a.breed LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    // parents_only = only animals that can be parents (female for mother, male for father)
    if (parents_only === 'female') { query += ` AND a.gender = 'female'`; }
    if (parents_only === 'male') { query += ` AND a.gender = 'male'`; }

    query += ` ORDER BY a.created_at DESC`;
    const animals = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: animals });
  } catch (error) {
    console.error("Animals GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new animal (parent or child)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, type, breed, gender, date_of_birth, weight, color,
      mother_id, father_id, batch_id, purchase_price, source, health_status,
      notes, photo_url, entry_type
    } = body;

    if (!type) {
      return NextResponse.json({ success: false, error: 'Animal Type is required' }, { status: 400 });
    }
    if (!gender || gender === 'unknown') {
      return NextResponse.json({ success: false, error: 'Gender (Male/Female) is required' }, { status: 400 });
    }

    // ===== AUTO-GENERATE TAG ID =====
    // Format: COW-F-0001 or GOAT-M-0012
    const prefix = type.toUpperCase().slice(0, 3);
    const genderCode = gender === 'female' ? 'F' : 'M';

    // Get next number by counting existing animals of this type
    const countResult = await executeQuery(
      `SELECT COUNT(*) as cnt FROM farming_animals WHERE type = ?`, [type]
    );
    const nextNum = (countResult[0]?.cnt || 0) + 1;
    const tag_id = `${prefix}-${genderCode}-${String(nextNum).padStart(4, '0')}`;

    // ===== AUTO-GENERATE BARCODE =====
    const timestamp = Date.now().toString().slice(-6);
    const barcode = `FARM-${prefix}-${genderCode}${String(nextNum).padStart(4, '0')}-${timestamp}`;

    const result = await executeQuery(`
      INSERT INTO farming_animals 
        (tag_id, barcode, name, type, breed, gender, date_of_birth, weight, color,
         mother_id, father_id, batch_id, purchase_price, source, health_status, notes, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tag_id, barcode, name || '', type, breed || '', gender,
      date_of_birth || null, weight || 0, color || '',
      mother_id || null, father_id || null, batch_id || null,
      purchase_price || 0, source || '', health_status || 'healthy',
      notes || '', photo_url || ''
    ]);

    const animalId = result.insertId;

    // Update batch count
    if (batch_id) {
      await executeQuery(`UPDATE farming_batches SET total_count = total_count + 1 WHERE id = ?`, [batch_id]);
    }

    // If this is a birth entry, auto-create inward record
    if (entry_type === 'birth' && (mother_id || father_id)) {
      // Get mother and father names for notes
      let motherInfo = 'N/A', fatherInfo = 'N/A';
      if (mother_id) {
        const m = await executeQuery(`SELECT name, tag_id FROM farming_animals WHERE id = ?`, [mother_id]);
        if (m.length > 0) motherInfo = `${m[0].name || m[0].tag_id}`;
      }
      if (father_id) {
        const f = await executeQuery(`SELECT name, tag_id FROM farming_animals WHERE id = ?`, [father_id]);
        if (f.length > 0) fatherInfo = `${f[0].name || f[0].tag_id}`;
      }

      await executeQuery(`
        INSERT INTO farming_inward (type, animal_id, batch_id, inward_type, quantity, weight, inward_date, notes)
        VALUES (?, ?, ?, 'birth', 1, ?, ?, ?)
      `, [
        type, animalId, batch_id || null, weight || 0,
        date_of_birth || new Date().toISOString().split('T')[0],
        `Born - Mother: ${motherInfo}, Father: ${fatherInfo}`
      ]);
    }

    // If purchase entry, auto-create inward record
    if (entry_type === 'purchase') {
      await executeQuery(`
        INSERT INTO farming_inward (type, animal_id, batch_id, inward_type, quantity, weight, unit_price, total_price, supplier_name, inward_date, notes)
        VALUES (?, ?, ?, 'purchase', 1, ?, ?, ?, ?, ?, ?)
      `, [
        type, animalId, batch_id || null, weight || 0,
        purchase_price || 0, purchase_price || 0, source || '',
        date_of_birth || new Date().toISOString().split('T')[0],
        notes || ''
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Animal registered successfully',
      id: animalId,
      tag_id,
      barcode
    });
  } catch (error) {
    console.error("Animals POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update animal
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Animal ID is required' }, { status: 400 });
    }

    const fields = [];
    const values = [];
    const allowedFields = [
      'name', 'breed', 'gender', 'date_of_birth', 'weight', 'color',
      'mother_id', 'father_id', 'batch_id', 'purchase_price', 'source',
      'health_status', 'status', 'notes', 'photo_url'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    await executeQuery(`UPDATE farming_animals SET ${fields.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: 'Animal updated successfully' });
  } catch (error) {
    console.error("Animals PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
