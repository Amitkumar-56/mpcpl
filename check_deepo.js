const { executeQuery } = require('./src/lib/db');

async function checkDeepo() {
    try {
        const rows = await executeQuery('SELECT id, pdf_path FROM deepo_history WHERE id = 2');
        console.log('Deepo Data:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDeepo();
