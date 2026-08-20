const fs = require('fs');
const path = require('path');

function search(dir, regex) {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(search(fullPath, regex));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push(`${fullPath}:${i + 1}:${lines[i].trim()}`);
          }
        }
      } catch (e) {}
    }
  }
  return results;
}

const srcDir = 'd:/projects/asoka/src';
const pagesDir = path.join(srcDir, 'app/pages');

console.log('grep -r "ASK-034" src/app/pages/');
console.log(search(pagesDir, /ASK-034/).join('\n'));

console.log('grep -r "Meera Krishnan" src/app/pages/');
console.log(search(pagesDir, /Meera Krishnan/).join('\n'));

console.log('grep -r "Belladonna" src/app/pages/');
console.log(search(pagesDir, /Belladonna/).join('\n'));

console.log('grep -r "const WEEKLY_DATA" src/');
console.log(search(srcDir, /const WEEKLY_DATA/).join('\n'));

console.log('grep -r "const REVENUE_DATA" src/');
console.log(search(srcDir, /const REVENUE_DATA/).join('\n'));

console.log('grep -r "const DISEASE_DATA" src/');
console.log(search(srcDir, /const DISEASE_DATA/).join('\n'));

console.log('grep -n "signatureUrl" src/types/index.ts');
console.log(search(path.join(srcDir, 'types'), /signatureUrl/).join('\n'));

console.log('grep -n "signatureUrl" src/lib/pdf/prescription.ts');
console.log(search(path.join(srcDir, 'lib/pdf'), /signatureUrl/).join('\n'));

console.log('grep -n "signatureUrl" src/lib/services/visits.service.ts');
console.log(search(path.join(srcDir, 'lib/services'), /signatureUrl/).join('\n'));
