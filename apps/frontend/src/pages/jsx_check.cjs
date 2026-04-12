const fs = require('fs');
const content = fs.readFileSync('c:/Raviteja/NeuZen AI/grey-hr/apps/frontend/src/pages/AdminDashboard.jsx', 'utf8');

let depth = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].split('//')[0]; // simple comment stripping
    const opens = (line.match(/<div|<\s*[^/]>|<[a-zA-Z]/g) || []).length;
    const closes = (line.match(/<\/div|<\/\s*>|<\/[a-zA-Z]/g) || []).length;
    depth += opens - closes;
    // We only care about root divs inside the return
    if (i > 1090 && depth < 0) {
        // console.log(`CRITICAL: Depth ${depth} at line ${i+1}: "${line.trim()}"`);
    }
}
console.log(`Total Opening Tags (Estimate): ${ (content.match(/<[a-zA-Z]|<>/g) || []).length }`);
console.log(`Total Closing Tags (Estimate): ${ (content.match(/<\/[a-zA-Z]|<\/>/g) || []).length }`);
