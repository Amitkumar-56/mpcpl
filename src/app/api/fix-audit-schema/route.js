
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const results = [];

        // Check columns in audit_log
        const columns = await executeQuery('SHOW COLUMNS FROM audit_log');
        const columnNames = columns.map(c => c.Field);
        results.push({ existingColumns: columnNames });

        // List of columns we need
        const requiredColumns = [
            { name: 'record_type', type: 'VARCHAR(100) COMMENT "Type of record"' },
            { name: 'record_id', type: 'INT COMMENT "Record ID"' },
            { name: 'field_name', type: 'VARCHAR(255) COMMENT "Field name"' },
            { name: 'old_value', type: 'JSON COMMENT "Old value"' },
            { name: 'new_value', type: 'JSON COMMENT "New value"' }
        ];

        for (const col of requiredColumns) {
            if (!columnNames.includes(col.name)) {
                try {
                    // Check if it exists with differnt case? No, MySQL columns are case insensitive usually but let's assume strict.
                    const addQuery = `ALTER TABLE audit_log ADD COLUMN ${col.name} ${col.type}`;
                    await executeQuery(addQuery);
                    results.push({ message: `Added column ${col.name}` });
                } catch (err) {
                    results.push({ error: `Failed to add ${col.name}: ${err.message}` });
                }
            } else {
                results.push({ message: `Column ${col.name} already exists` });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
