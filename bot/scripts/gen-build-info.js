import fs from 'fs';
import path from 'path';

const now = new Date();
const formatted = now.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
}).replace(/,/g, '');

const content = `// Автоматически сгенерировано\nexport const buildTime = "${formatted.trim()}";\n`;

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../src/build-info.ts'), content);