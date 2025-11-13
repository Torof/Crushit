// Run this in the browser console to fix Aul's crush data
// Press F12 to open console, then paste and run this code

(async () => {
  const CRUSHES_KEY = '@crushes';

  // Load crushes
  const data = localStorage.getItem(CRUSHES_KEY);
  if (!data) {
    console.log('No crushes data found');
    return;
  }

  const crushes = JSON.parse(data);
  console.log('Current crushes:', crushes);

  // Find Aul
  const aulIndex = crushes.findIndex(c => c.name.toLowerCase() === 'aul');
  if (aulIndex === -1) {
    console.log('Aul not found');
    return;
  }

  const aul = crushes[aulIndex];
  console.log('Aul before fix:', aul);

  // Remove last 2 bad actions
  if (aul.cons && aul.cons.length >= 2) {
    aul.cons = aul.cons.slice(0, -2);
  }

  // Reduce mistakes by 2
  aul.mistakes = Math.max(0, aul.mistakes - 2);

  console.log('Aul after fix:', aul);

  // Save back
  crushes[aulIndex] = aul;
  localStorage.setItem(CRUSHES_KEY, JSON.stringify(crushes));

  console.log('✅ Fixed! Refresh the page to see changes.');
})();
