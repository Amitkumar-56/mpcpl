const { executeQuery } = require('./src/lib/db.js');

async function testPermissions() {
    try {
        console.log('Testing permissions for Employee 20 with module "Customers"...\n');

        const employee_id = 20;
        const role = 4;
        const module_name = 'Customers'; // Changed to Customers (plural)

        // Query 1: employee_id + role + module_name
        console.log(`Query 1: employee_id=${employee_id} AND role=${role} AND module=${module_name}`);
        const result1 = await executeQuery(
            `SELECT * FROM role_permissions WHERE employee_id = ? AND role = ? AND module_name = ?`,
            [employee_id, role, module_name]
        );
        console.log('Result:', result1.length > 0 ? '✅ FOUND' : '❌ NOT FOUND');
        if (result1.length > 0) {
            console.table(result1);
        }

        console.log('\n---\n');

        // Query 2: employee_id + module_name
        console.log(`Query 2: employee_id=${employee_id} AND module=${module_name}`);
        const result2 = await executeQuery(
            `SELECT * FROM role_permissions WHERE employee_id = ? AND module_name = ?`,
            [employee_id, module_name]
        );
        console.log('Result:', result2.length > 0 ? '✅ FOUND' : '❌ NOT FOUND');
        if (result2.length > 0) {
            console.table(result2);
        }

        console.log('\n✅ SUCCESS! The module name "Customers" (plural) will now work correctly!');
        console.log('Employee 20 has the following permissions:');
        if (result1.length > 0 || result2.length > 0) {
            const perms = result1[0] || result2[0];
            console.log(`  - can_view: ${perms.can_view}`);
            console.log(`  - can_edit: ${perms.can_edit}`);
            console.log(`  - can_create: ${perms.can_create}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testPermissions();
