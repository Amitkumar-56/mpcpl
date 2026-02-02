
const mysql = require('mysql2/promise');

const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "masafipetro_dev",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

async function fixSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB');

        const [columns] = await connection.query('SHOW COLUMNS FROM audit_log');
        const columnNames = columns.map(c => c.Field);
        console.log('Existing columns:', columnNames);

        const requiredColumns = [
            { name: 'record_type', type: 'VARCHAR(100) COMMENT "Type of record"' },
            { name: 'record_id', type: 'INT COMMENT "Record ID"' },
            { name: 'field_name', type: 'VARCHAR(255) COMMENT "Field name"' },
            { name: 'old_value', type: 'JSON COMMENT "Old value"' },
            { name: 'new_value', type: 'JSON COMMENT "New value"' }
        ];

        for (const col of requiredColumns) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding column ${col.name}...`);
                const addQuery = `ALTER TABLE audit_log ADD COLUMN ${col.name} ${col.type}`;
                await connection.query(addQuery);
                console.log(`Added column ${col.name}`);
            } else {
                console.log(`Column ${col.name} already exists`);
            }
        }

        // Check if record_type index exists
        const [indexes] = await connection.query('SHOW INDEX FROM audit_log');
        const indexNames = indexes.map(i => i.Key_name);

        if (!indexNames.includes('idx_record_type')) {
            console.log('Adding index idx_record_type...');
            await connection.query('CREATE INDEX idx_record_type ON audit_log(record_type)');
        }
        if (!indexNames.includes('idx_record_id')) {
            console.log('Adding index idx_record_id...');
            await connection.query('CREATE INDEX idx_record_id ON audit_log(record_id)');
        }

        console.log('Schema fix complete');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixSchema();
