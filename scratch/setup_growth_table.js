const { executeQuery } = require('./src/lib/db');

async function setup() {
  try {
    console.log('Creating farming_growth table...');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_growth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        animal_id INT NOT NULL,
        weight DECIMAL(10,2) NOT NULL,
        height DECIMAL(10,2),
        length DECIMAL(10,2),
        chest_girth DECIMAL(10,2),
        recorded_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES farming_animals(id) ON DELETE CASCADE,
        INDEX idx_animal (animal_id),
        INDEX idx_date (recorded_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit();
  }
}

setup();
