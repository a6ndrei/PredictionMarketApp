const fs = require('fs');
let c = fs.readFileSync('src/api/handlers.ts', 'utf8');
c = c.replace('return newBet[0];', 'if (!newBet[0]) throw new Error("Bet failed"); return newBet[0];');
fs.writeFileSync('src/api/handlers.ts', c);
