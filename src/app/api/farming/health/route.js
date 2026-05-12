import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendHealthReportEmail } from "@/lib/email";
import { ensureFarmingTables } from "@/lib/farming_init";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const animal_id = searchParams.get('animal_id');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.*, a.tag_id as animal_tag, a.name as animal_name, d.name as doctor_name 
      FROM farming_health h
      JOIN farming_animals a ON h.animal_id = a.id
      LEFT JOIN farming_doctors d ON h.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (animal_id) {
      query += ` AND h.animal_id = ?`;
      params.push(animal_id);
    }

    query += ` ORDER BY h.treatment_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const records = await executeQuery(query, params);

    // Total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM farming_health WHERE 1=1 ${animal_id ? 'AND animal_id = ?' : ''}`;
    const countParams = animal_id ? [animal_id] : [];
    const countResult = await executeQuery(countQuery, countParams);
    const total = Number(countResult[0]?.total || 0);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      animal_id, type, doctor_id, treatment_type, disease_name,
      medicine_name, dosage, cost, treatment_date, next_followup, symptoms, notes,
      temperature, blood_report, recipient_email
    } = body;

    if (!animal_id || !treatment_type) {
      return NextResponse.json({ success: false, error: 'Animal and Treatment type are required' }, { status: 400 });
    }

    // Fever Detection Logic
    let isFever = false;
    const tempNum = parseFloat(temperature);
    if (!isNaN(tempNum)) {
      if (type === 'cow' && tempNum > 102.5) isFever = true;
      else if (type === 'goat' && tempNum > 103.5) isFever = true;
      else if (type === 'chicken' && tempNum > 107.0) isFever = true;
      else if (tempNum > 102.0) isFever = true; // Default
    }

    const result = await executeQuery(`
      INSERT INTO farming_health 
        (animal_id, type, doctor_id, treatment_type, disease_name, medicine_name, dosage, cost, treatment_date, next_followup, symptoms, notes, temperature, blood_report)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      animal_id, type, doctor_id || null, treatment_type, disease_name,
      medicine_name, dosage, cost || 0, treatment_date, next_followup || null, symptoms, notes,
      temperature || null, blood_report || null
    ]);

    // Fetch details for email
    const [animalDetails] = await executeQuery(`SELECT tag_id, name FROM farming_animals WHERE id = ?`, [animal_id]);
    const [doctorDetails] = await executeQuery(`SELECT name FROM farming_doctors WHERE id = ?`, [doctor_id]);

    const emailData = {
      animal_tag: animalDetails?.tag_id,
      animal_name: animalDetails?.name,
      type,
      disease_name,
      temperature,
      symptoms,
      doctor_name: doctorDetails?.name,
      treatment_date
    };

    // Update animal health status if sick or has fever
    if ((disease_name && disease_name !== '') || isFever) {
      await executeQuery(`UPDATE farming_animals SET health_status = 'sick' WHERE id = ?`, [animal_id]);
    } else {
      await executeQuery(`UPDATE farming_animals SET health_status = 'healthy' WHERE id = ?`, [animal_id]);
    }

    // Send Email Notification (to custom recipient and CC admin)
    // Always sends to admin by default inside the utility
    await sendHealthReportEmail(emailData, recipient_email);

    return NextResponse.json({ success: true, id: result.insertId, fever_detected: isFever });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
