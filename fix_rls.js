const fs = require('fs');
const path = require('path');

function getSqlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.')) continue;
        const stat = fs.statSync(path.join(dir, file));
        if (stat.isDirectory()) {
            getSqlFiles(path.join(dir, file), fileList);
        } else if (file.endsWith('.sql')) {
            fileList.push(path.join(dir, file));
        }
    }
    return fileList;
}

const sqlFiles = getSqlFiles('.');
let changedFiles = 0;

for (const file of sqlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace user_metadata with app_metadata
    content = content.replace(/auth\.jwt\(\)\s*->\s*'user_metadata'\s*->>\s*'school_id'/g, "auth.jwt() -> 'app_metadata' ->> 'school_id'");
    content = content.replace(/auth\.jwt\(\)\s*->\s*''user_metadata''\s*->>\s*''school_id''/g, "auth.jwt() -> ''app_metadata'' ->> ''school_id''");

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
    }
}
console.log('Fixed RLS in ' + changedFiles + ' SQL files.');