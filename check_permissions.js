const { executeQuery } = require('./src/lib/db.js');

async function checkPermissions() {
    try {
        console.log('Checking permissions for Employee 24 and Role 4...\n');

        // Check for employee 24
        const emp24 = await executeQuery('SELECT * FROM role_permissions WHERE employee_id = 24', []);
        console.log('Permissions for Employee 24:');
        console.log(emp24);
        console.log('\n---\n');

        // Check for role 4
        const role4 = await executeQuery('SELECT * FROM role_permissions WHERE role = 4', []);
        console.log('Permissions for Role 4:');
        console.log(role4);
        console.log('\n---\n');

        // Check for Customer module
        const customerModule = await executeQuery('SELECT * FROM role_permissions WHERE module_name = ?', ['Customer']);
        console.log('Permissions for Customer module:');
        console.log(customerModule);
        console.log('\n---\n');

        // Check structure of role_permissions table
        const structure = await executeQuery('DESCRIBE role_permissions', []);
        console.log('role_permissions table structure:');
        console.log(structure);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPermissions();
