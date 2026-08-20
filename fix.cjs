const fs = require('fs');
const path = require('path');
const d = 'd:/projects/asoka/src/app/pages';
fs.readdirSync(d).filter(f => f.endsWith('.tsx')).forEach(f => {
  let p = path.join(d, f);
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/from '\.\.\/common\/SharedUI'/g, "from '../components/common/SharedUI'");
  c = c.replace(/from '\.\.\/visits\//g, "from '../components/visits/");
  fs.writeFileSync(p, c);
});
console.log('Done');
