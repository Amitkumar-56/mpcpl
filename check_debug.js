const { executeQuery } = require('./src/lib/db');

async function checkData() {
  try {
    console.log('Checking requests...');
    const requests = await executeQuery(`
      SELECT status, fs_id, COUNT(*) as count 
      FROM filling_requests 
      WHERE status IN ('Pending', 'Processing')
      GROUP BY status, fs_id
    `);
    console.log('Pending/Processing Requests by Station:', requests);

    console.log('\nChecking Staff/Incharge Users...');
    const users = await executeQuery(`
      SELECT id, name, role, fs_id 
      FROM employee_profile 
      WHERE role IN (1, 2)
      LIMIT 10
    `);
    console.log('Sample Staff/Incharge Users:', users);

    if (users.length > 0) {
      const user = users[0];
      console.log(`\nSimulating query for user ${user.name} (Role: ${user.role}, FS_ID: ${user.fs_id})...`);
      
      if (!user.fs_id) {
        console.log('User has no FS_ID assigned.');
      } else {
        const fsIds = String(user.fs_id).split(',').map(id => id.trim()).filter(id => id);
        if (fsIds.length > 0) {
          const placeholders = fsIds.map(() => '?').join(',');
          const sql = `
            SELECT COUNT(*) as count 
            FROM filling_requests fr 
            WHERE 1=1 
            AND fr.fs_id IN (${placeholders}) 
            AND fr.status IN ('Pending', 'Processing')
          `;
          const params = [...fsIds, 'Pending', 'Processing'];
          console.log('Query:', sql);
          console.log('Params:', params);
          
          // Note: We can't easily execute this with placeholders in this script without full db setup,
          // but we can execute a raw query with values interpolated for testing.
          const rawSql = `
            SELECT COUNT(*) as count 
            FROM filling_requests fr 
            WHERE 1=1 
            AND fr.fs_id IN (${fsIds.join(',')}) 
            AND fr.status IN ('Pending', 'Processing')
          `;
          const result = await executeQuery(rawSql);
          console.log('Result:', result);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Mocking executeQuery for the script if unable to import
// But wait, I can import if I run it with proper environment.
// I'll assume I can't run 'node script.js' easily if it depends on next.js env.
// I will try to read the .env file to see DB credentials and use mysql2 directly if needed.
// Or I can try to use the existing db lib.
