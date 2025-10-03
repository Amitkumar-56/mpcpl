'use server';
import { getConnection } from '@/lib/database';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const POST = async (req) => {
  try {
    const formData = await req.formData();

    const supplyData = {
      supply_type: formData.get('supply_type'),
      supplier_id: formData.get('supplier_id'),
      transporter_id: formData.get('transporter_id') || 0,
      product_id: formData.get('product_id'),
      station_id: formData.get('station_id'),
      tanker_no: formData.get('tanker_no'),
      driver_no: formData.get('driver_no'),
      weight_type: formData.get('weight_type'),
      kg: formData.get('weight_type') === 'kg' ? formData.get('kg') : 0,
      ltr: formData.get('weight_type') === 'ltr' ? formData.get('ltr') : 0,
      density: formData.get('density') || 0,
      product_name: formData.get('product_name'),
      invoice_number: formData.get('invoice_number'),
      transport_number: formData.get('transport_number'),
      invoice_date: formData.get('invoice_date'),
      v_invoice_value: formData.get('v_invoice_value'),
      t_invoice_value: formData.get('t_invoice_value'),
    };

    if (supplyData.kg && supplyData.density > 0) {
      supplyData.ltr = supplyData.kg / supplyData.density;
    }

    // Handle slip image
    const slipImage = formData.get('slip_image');
    let slip_image = '-';
    if (slipImage && slipImage.size > 0) {
      const bytes = await slipImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${slipImage.name}`;
      const path = join(process.cwd(), 'public/uploads/', filename);
      await writeFile(path, buffer);
      slip_image = filename;
    }

    const connection = await getConnection();
    const query = `
      INSERT INTO stock SET 
        invoice_number=?, invoice_date=?, transport_number=?, fs_id=?, 
        product_id=?, product_name=?, transporter_id=?, supplier_id=?, 
        tanker_no=?, weight_type=?, kg=?, ltr=?, density=?, driver_no=?, 
        v_invoice_value=?, t_invoice_value=?, payable=?, t_payable=?, 
        payment=0, t_payment=0, slip_image=?, staff_id=?, status=1, supply_type=?
    `;
    const values = [
      supplyData.invoice_number, supplyData.invoice_date, supplyData.transport_number,
      supplyData.station_id, supplyData.product_id, supplyData.product_name,
      supplyData.transporter_id, supplyData.supplier_id, supplyData.tanker_no,
      supplyData.weight_type, supplyData.kg, supplyData.ltr, supplyData.density,
      supplyData.driver_no, supplyData.v_invoice_value, supplyData.t_invoice_value,
      supplyData.v_invoice_value, supplyData.t_invoice_value, slip_image, 1, supplyData.supply_type
    ];

    await connection.execute(query, values);
    await connection.end();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error adding supply:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
