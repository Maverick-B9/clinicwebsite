const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content
    .replace(/P\.sageLight/g, 'P.violetLight')
    .replace(/P\.sageDark/g, 'P.violetDark')
    .replace(/P\.sage/g, 'P.violet')
    .replace(/P\.ochreLight/g, 'P.goldLight')
    .replace(/P\.ochre/g, 'P.gold')
    .replace(/variant=["']sage["']/g, 'variant="violet"')
    .replace(/variant=["']ochre["']/g, 'variant="gold"')
    .replace(/sage:\[/g, 'violet:[')
    .replace(/ochre:\[/g, 'gold:[');
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated', f);
  }
});
