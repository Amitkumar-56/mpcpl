import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ 
        error: "Product ID is required" 
      }, { status: 400 });
    }

    // Get product details with recipe
    const productQuery = await executeQuery(`
      SELECT 
        p.*,
        -- Default recipe for household products
        JSON_OBJECT(
          'raw_materials', JSON_ARRAY(
            JSON_OBJECT('material_name', 'Methanol', 'quantity', '100', 'unit', 'litre', 'purity', '99.9%'),
            JSON_OBJECT('material_name', 'Carbon Source', 'quantity', '50', 'unit', 'kg', 'purity', '95%'),
            JSON_OBJECT('material_name', 'Catalyst', 'quantity', '10', 'unit', 'kg', 'purity', '98%'),
            JSON_OBJECT('material_name', 'Additives', 'quantity', '5', 'unit', 'kg', 'purity', '90%')
          ),
          'process_parameters', JSON_OBJECT(
            'temperature', '25',
            'pressure', '1.0',
            'reaction_time', '4.0',
            'mixing_speed', '1200'
          ),
          'expected_yield', '85'
        ) as recipe_data
      FROM products p
      WHERE p.id = ?
      LIMIT 1
    `, [parseInt(id)]);

    if (productQuery.length === 0) {
      return NextResponse.json({ 
        error: "Product not found" 
      }, { status: 404 });
    }

    const product = productQuery[0];
    
    // Parse recipe data and merge with product info
    let recipeData = {};
    try {
      recipeData = JSON.parse(product.recipe_data || '{}');
    } catch (error) {
      console.error('Error parsing recipe data:', error);
      recipeData = {
        raw_materials: [
          { material_name: 'Methanol', quantity: '100', unit: 'litre', purity: '99.9%' },
          { material_name: 'Carbon Source', quantity: '50', unit: 'kg', purity: '95%' },
          { material_name: 'Catalyst', quantity: '10', unit: 'kg', purity: '98%' },
          { material_name: 'Additives', quantity: '5', unit: 'kg', purity: '90%' }
        ],
        process_parameters: {
          temperature: '25',
          pressure: '1.0',
          reaction_time: '4.0',
          mixing_speed: '1200'
        },
        expected_yield: '85'
      };
    }

    // Merge product data with recipe
    const productWithRecipe = {
      ...product,
      raw_materials: recipeData.raw_materials || [],
      process_temperature: recipeData.process_parameters?.temperature || '',
      process_pressure: recipeData.process_parameters?.pressure || '',
      reaction_time: recipeData.process_parameters?.reaction_time || '',
      mixing_speed: recipeData.process_parameters?.mixing_speed || '',
      expected_yield: recipeData.expected_yield || '85'
    };

    return NextResponse.json({ 
      success: true, 
      data: productWithRecipe 
    });
  } catch (error) {
    console.error("Error fetching product recipe:", error);
    return NextResponse.json({ 
      error: "Server error: " + error.message 
    }, { status: 500 });
  }
}
