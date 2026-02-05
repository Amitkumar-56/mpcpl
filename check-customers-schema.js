// check-customers-schema.js
// Check customers table schema to find date columns

const { executeQuery } = require('./src/lib/db');

async function checkSchema() {
  try {
    console.log('🔍 Checking customers table schema...\n');
    
    // Get table structure
    const structure = await executeQuery('DESCRIBE customers');
    
    console.log('Customers table columns:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // Look for date/time columns specifically
    const dateColumns = structure.filter(col => 
      col.Type.toLowerCase().includes('date') || 
      col.Type.toLowerCase().includes('time') ||
      col.Field.toLowerCase().includes('date') ||
      col.Field.toLowerCase().includes('time')
    );
    
    console.log('\n📅 Date/Time columns found:');
    if (dateColumns.length > 0) {
      dateColumns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    } else {
      console.log('  No date/time columns found. Will use id for ordering.');
    }
    
    // Check if there are any records to see what data exists
    console.log('\n📊 Sample data check:');
    const sample = await executeQuery('SELECT id, name FROM customers LIMIT 3');
    console.log(`Found ${sample.length} sample records:`);
    sample.forEach(row => {
      console.log(`  ID: ${row.id}, Name: ${row.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Script error:', error);
  process.exit(1);
});
