const { executeQuery } = require('./src/lib/db.js');

async function checkRolePermissions() {
    try {
        console.log('='.repeat(80));
        console.log('CHECKING ROLE_PERMISSIONS TABLE');
        console.log('='.repeat(80));

        // 1. Check all records for Employee 20
        console.log('\n1. All permissions for Employee 20:');
        const emp20 = await executeQuery(
            'SELECT * FROM role_permissions WHERE employee_id = 20',
            []
        );
        if (emp20.length === 0) {
            console.log('   ❌ NO RECORDS FOUND');
        } else {
            console.table(emp20);
        }

        // 2. Check all records for Employee 24
        console.log('\n2. All permissions for Employee 24:');
        const emp24 = await executeQuery(
            'SELECT * FROM role_permissions WHERE employee_id = 24',
            []
        );
        if (emp24.length === 0) {
            console.log('   ❌ NO RECORDS FOUND');
        } else {
            console.table(emp24);
        }

        // 3. Check all records for Role 4
        console.log('\n3. All permissions for Role 4:');
        const role4 = await executeQuery(
            'SELECT * FROM role_permissions WHERE role = 4 LIMIT 20',
            []
        );
        if (role4.length === 0) {
            console.log('   ❌ NO RECORDS FOUND');
        } else {
            console.table(role4);
        }

        // 4. Check all records for Customer module
        console.log('\n4. All permissions for "Customer" module:');
        const customerMod = await executeQuery(
            'SELECT * FROM role_permissions WHERE module_name = "Customer"',
            []
        );
        if (customerMod.length === 0) {
            console.log('   ❌ NO RECORDS FOUND');
        } else {
            console.table(customerMod);
        }

        // 5. Check all unique module names
        console.log('\n5. All unique module names in role_permissions:');
        const modules = await executeQuery(
            'SELECT DISTINCT module_name FROM role_permissions ORDER BY module_name',
            []
        );
        console.table(modules);

        // 6. Sample records from the table
        console.log('\n6. Sample records (first 10):');
        const sample = await executeQuery(
            'SELECT * FROM role_permissions LIMIT 10',
            []
        );
        console.table(sample);

        // 7. Count total records
        console.log('\n7. Total records in role_permissions:');
        const count = await executeQuery(
            'SELECT COUNT(*) as total FROM role_permissions',
            []
        );
        console.log(`   Total: ${count[0].total} records`);

        console.log('\n' + '='.repeat(80));
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkRolePermissions();
