const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\USER\\.gemini\\antigravity\\brain\\4ac2139d-604f-4b4d-a74d-6403faa2fb46\\.system_generated\\steps\\875\\output.txt', 'utf8'));

const target_tables = [
    'emergency_alerts',
    'health_incident_logs',
    'emergency_drills',
    'safeguarding_policies',
    'facility_registers',
    'equipment_inventory',
    'inspections',
    'report_cards'
];

target_tables.forEach(tableName => {
    const table = data.find(t => t.name === tableName);
    if (table) {
        console.log(`Table: ${table.name}`);
        const columns = table.columns.map(c => c.name);
        console.log(`Columns: ${columns.join(', ')}`);
        console.log("-" * 20);
    } else {
        console.log(`Table: ${tableName} NOT FOUND`);
    }
});
