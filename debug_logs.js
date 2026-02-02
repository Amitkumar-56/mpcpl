
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

async function checkLogs() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB');

        // 1. Find LR002
        const [lrs] = await connection.query("SELECT id, lr_id FROM shipment WHERE lr_id = 'LR002'");
        if (lrs.length > 0) {
            const lr = lrs[0];
            console.log(`Found LR002 with ID: ${lr.id}`);

            // 2. Insert Test Log if none exists
            const [existing] = await connection.query("SELECT id FROM audit_log WHERE record_type = 'lr' AND record_id = ?", [lr.id]);
            if (existing.length === 0) {
                console.log('Inserting test log for LR002...');
                const values = [
                    'LR Management', `LR-${lr.lr_id}`, 'Recovery',
                    1, 'System', 'add', 'Recovered initial log',
                    null, null, null, 'lr', lr.id,
                    new Date().toISOString().split('T')[0],
                    new Date().toTimeString().split(' ')[0]
                ];

                await connection.query(
                    `INSERT INTO audit_log (
                      page, unique_code, section, user_id, user_name, action, remarks,
                      old_value, new_value, field_name, record_type, record_id,
                      action_date, action_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    values
                );
                console.log('Test log inserted!');
            } else {
                console.log('Log already exists for LR002');
            }
        } else {
            console.log('LR002 not found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkLogs();
