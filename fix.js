const fs = require('fs');

const files = ['public/app.js', 'public/app-enhancements.js'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Add API_BASE definition if missing
    if (!content.includes('const API_BASE =')) {
        content = "const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';\n" + content;
    }

    // Fix incorrect previous replacements like fetch(${API_BASE}/...)
    content = content.replace(/fetch\(\$\{API_BASE\}\//g, "fetch(`${API_BASE}/");

    // Fix single quote closings where they should be backticks
    content = content.replace(/(`\$\{API_BASE\}[^'\n]+)'\)/g, "$1`)");
    content = content.replace(/(`\$\{API_BASE\}[^'\n]+)',/g, "$1`,");

    // Fix original fetch('/api/...) untouched
    content = content.replace(/fetch\('(\/api\/[^']+)'\)/g, "fetch(`${API_BASE}$1`)");
    content = content.replace(/fetch\('(\/api\/[^']+)',/g, "fetch(`${API_BASE}$1`,");

    // Also the app-enhancements.js has /pages/
    content = content.replace(/fetch\('(\/pages\/[^']+)'\)/g, "fetch(`${API_BASE}$1`)");

    // Fix socket.io connection
    content = content.replace(/io\(\)/g, "io(API_BASE || '/')");

    fs.writeFileSync(file, content);
});

console.log("Fixed files successfully");
