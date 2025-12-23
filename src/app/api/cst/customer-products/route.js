import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    console.log('🔍 API Called with URL:', request.url);
    console.log('👤 Customer ID from params:', customerId);

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing customer ID' 
      }, { status: 400 });
    }

    console.log('🛍️ Fetching products for customer:', customerId);

    // Step 1: First get customer's data and allowed product IDs
    const customerQuery = `SELECT id, name, product FROM customers WHERE id = ?`;
    const customerResult = await executeQuery(customerQuery, [customerId]);
    
    console.log('📋 Customer query result:', customerResult);

    if (customerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Customer not found' 
      }, { status: 404 });
    }

    const customerData = customerResult[0];
    console.log('👤 Customer found:', customerData);

    // Check if customer has products assigned
    if (!customerData.product || customerData.product.trim() === '') {
      console.log('ℹ️ No products assigned to customer - product column is empty');
      
      // If no products in customer table, fetch ALL products (not sub-products)
      const allProductsQuery = `
        SELECT 
          p.id, 
          p.pname as product_name,
          p.id as product_id
        FROM products p
        ORDER BY p.pname
      `;
      
      const allProductsData = await executeQuery(allProductsQuery);
      console.log('📦 All products (fallback):', allProductsData);

      return NextResponse.json({ 
        success: true, 
        products: allProductsData || [],
        count: allProductsData.length,
        message: 'Using all products (customer product column empty)'
      });
    }

    // Convert comma separated product IDs to array
    const allowedProductIds = customerData.product.split(',').map(id => id.trim()).filter(id => id !== '');
    console.log('📋 Allowed product IDs for customer:', allowedProductIds);

    if (allowedProductIds.length === 0) {
      console.log('ℹ️ No valid product IDs found after processing');
      
      // Fallback to all products (not sub-products)
      const allProductsQuery = `
        SELECT 
          p.id, 
          p.pname as product_name,
          p.id as product_id
        FROM products p
        ORDER BY p.pname
      `;
      
      const allProductsData = await executeQuery(allProductsQuery);
      
      return NextResponse.json({ 
        success: true, 
        products: allProductsData || [],
        count: allProductsData.length,
        message: 'Using all products (no valid product IDs)'
      });
    }

    // Step 2: Fetch products (not sub-products) based on customer's allowed product IDs
    const productsQuery = `
      SELECT 
        p.id, 
        p.pname as product_name,
        p.id as product_id
      FROM products p
      WHERE p.id IN (${allowedProductIds.map(() => '?').join(',')})
      ORDER BY p.pname
    `;
    
    console.log('🔍 Products query:', productsQuery);
    console.log('📊 Query parameters:', allowedProductIds);
    
    const productsData = await executeQuery(productsQuery, allowedProductIds);
    console.log('✅ Filtered products data:', productsData);

    return NextResponse.json({ 
      success: true, 
      products: productsData || [],
      count: productsData.length,
      customerProductIds: allowedProductIds, // for debugging
      customerName: customerData.name
    });

  } catch (error) {
    console.error("❌ Customer Products API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}