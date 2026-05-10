const { executeQuery } = require('./src/lib/db');

async function migrate() {
  try {
    console.log('Adding temperature and blood_report to farming_health...');
    await executeQuery(`
      ALTER TABLE farming_health 
      ADD COLUMN IF NOT EXISTS temperature DECIMAL(5,2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS blood_report VARCHAR(255) DEFAULT NULL
    `);
    console.log('Migration successful');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
