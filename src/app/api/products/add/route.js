import { executeQuery } from '@/lib/db';

export async function POST(req) {
  try {
    const { pname, pcodes } = await req.json();

    if (!pname || !Array.isArray(pcodes) || pcodes.length === 0) {
      return new Response(JSON.stringify({ message: 'Product name and codes are required' }), { status: 400 });
    }

  const result = await executeQuery('INSERT INTO products (pname) VALUES (?)', [pname]);
const productId = result.insertId;

for (const code of pcodes) {
  await executeQuery('INSERT INTO product_codes (product_id, pcode) VALUES (?, ?)', [productId, code]);
}

    return new Response(JSON.stringify({ message: 'Product added successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error inserting product:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
  }
}
