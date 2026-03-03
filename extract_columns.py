import json

with open(r'C:\Users\USER\.gemini\antigravity\brain\4ac2139d-604f-4b4d-a74d-6403faa2fb46\.system_generated\steps\875\output.txt', 'r') as f:
    data = json.load(f)

target_tables = [
    'emergency_alerts', 
    'health_incident_logs', 
    'emergency_drills', 
    'safeguarding_policies', 
    'facility_registers', 
    'equipment_inventory',
    'inspections',
    'report_cards'
]

for table in data:
    if table['name'] in target_tables:
        print(f"Table: {table['name']}")
        columns = [c['name'] for c in table['columns']]
        print(f"Columns: {columns}")
        print("-" * 20)
