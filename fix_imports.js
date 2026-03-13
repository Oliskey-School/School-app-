const fs = require('fs');

['studentService.ts', 'financeService.ts', 'authService.ts'].forEach(file => {
    const p = 'services/' + file;
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/'\.\/supabase'/g, "'../lib/supabase'");
    content = content.replace(/'\.\/api'/g, "'../lib/api'");
    fs.writeFileSync(p, content);
});
console.log('Fixed imports in services');