const { executeQuery } = require('./src/lib/db');

async function checkPendingTankers() {
    try {
        const rows = await executeQuery("SELECT id, closing_station, closing_date, pdf_path, status FROM tanker_history WHERE status != 'approved' ORDER BY id DESC LIMIT 5");
        console.log('Pending Tankers:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPendingTankers();
