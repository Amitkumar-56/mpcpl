const { executeQuery } = require('./src/lib/db');

async function setup() {
  try {
    console.log('Updating farming_health table...');
    await executeQuery(`ALTER TABLE farming_health ADD COLUMN IF NOT EXISTS temperature VARCHAR(50)`);
    await executeQuery(`ALTER TABLE farming_health ADD COLUMN IF NOT EXISTS blood_report TEXT`);
    console.log('Table updated successfully!');
  } catch (error) {
    console.error('Error updating table:', error);
  } finally {
    process.exit();
  }
}

setup();
