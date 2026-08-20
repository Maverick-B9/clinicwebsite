import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export async function getClinicalMetrics() {
  let diagnosesSnap;
  let prescriptionsSnap;
  
  try {
    [diagnosesSnap, prescriptionsSnap] = await Promise.all([
      getDocs(collectionGroup(db, 'diagnoses')),
      getDocs(collectionGroup(db, 'prescriptionItems'))
    ]);
  } catch (e: any) {
    console.error("Error fetching collection group:", e);
    return { topDiagnoses: [], topMedicines: [] };
  }

  const diagCount: Record<string, number> = {};
  if (diagnosesSnap) {
    diagnosesSnap.forEach(d => {
      const text = d.data().text;
      if (text) diagCount[text] = (diagCount[text] || 0) + 1;
    });
  }

  const medCount: Record<string, number> = {};
  if (prescriptionsSnap) {
    prescriptionsSnap.forEach(p => {
      const name = p.data().medicineName;
      if (name) medCount[name] = (medCount[name] || 0) + 1;
    });
  }

  const topDiagnoses = Object.entries(diagCount)
    .sort((a,b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
    .slice(0, 5);

  const topMedicines = Object.entries(medCount)
    .sort((a,b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
    .slice(0, 8);

  return { topDiagnoses, topMedicines };
}
