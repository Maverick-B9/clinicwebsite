const fs = require('fs');
const path = require('path');

function checkFile(filePath, regex) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return regex.test(content);
  } catch (e) {
    return false;
  }
}

function checkDir(dir, regex) {
  let found = false;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      if (checkDir(fullPath, regex)) found = true;
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (checkFile(fullPath, regex)) found = true;
    }
  }
  return found;
}

const srcDir = 'd:/projects/asoka/src';
const pagesDir = path.join(srcDir, 'app/pages');

console.log('5. user = true:', checkDir(srcDir, /const\s+user\s*=\s*true/));
console.log('9. react-router-dom:', checkDir(srcDir, /react-router-dom/));
console.log('10. PATIENTS array:', checkDir(pagesDir, /const\s+PATIENTS/));
console.log('11. APPTS array:', checkDir(pagesDir, /const\s+APPTS/));
console.log('12. MEDS_LIST array:', checkDir(pagesDir, /const\s+MEDS_LIST/));
console.log('13. patients.service runTransaction:', checkFile(path.join(srcDir, 'lib/services/patients.service.ts'), /runTransaction/));
console.log('14. visits.service runTransaction:', checkFile(path.join(srcDir, 'lib/services/visits.service.ts'), /runTransaction/));
console.log('16. DiagnosesCard useFieldArray:', checkFile(path.join(srcDir, 'app/components/visits/DiagnosesCard.tsx'), /useFieldArray/));
console.log('20. AllergyBanner acknowledgedAllergies:', checkFile(path.join(srcDir, 'app/components/common/AllergyBanner.tsx'), /acknowledgedAllergies/));
console.log('21. SignaturePad toDataURL:', checkFile(path.join(srcDir, 'app/components/visits/SignaturePad.tsx'), /toDataURL/));
