const fs = require('fs');
const p = 'src/components/ui/combobox.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/className\)/g, 'className as any)');
fs.writeFileSync(p, c);
