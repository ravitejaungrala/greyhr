const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('apps/frontend/src/pages/AdminDashboard.jsx', 'utf8');

try {
    parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx']
    });
    console.log('SUCCESS: No syntax errors found.');
} catch (err) {
    console.error(`ERROR at ${err.loc.line}:${err.loc.column}`);
    console.error(err.message);
    const lines = code.split('\n');
    const start = Math.max(0, err.loc.line - 5);
    const end = Math.min(lines.length, err.loc.line + 5);
    for (let i = start; i < end; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
