const fs = require('fs');

// 1. App.tsx changes
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Fix: Prune legacy hardcoded gestures that accidentally got permanently stuck in localStorage
const oldInit = `    const custom = saved ? JSON.parse(saved) : [];`;
const newInit = `    let custom = saved ? JSON.parse(saved) : [];
    // Scrub localStorage of any old hardcoded defaults that got cached (their IDs are strings like 'HELLO' instead of timestamps)
    custom = custom.filter((g: any) => !isNaN(Number(g.id)));
    localStorage.setItem('sign-speak-gestures', JSON.stringify(custom));`;
app = app.replace(oldInit, newInit);

// Fix: Add alert feedback to Plus button so user doesn't think it's broken
const oldAddWord = `  const addWordToBuffer = () => {
    if (detectedText !== 'WAITING...' && !wordBuffer.includes(detectedText)) {
      setWordBuffer([...wordBuffer, detectedText]);
    }
  };`;
const newAddWord = `  const addWordToBuffer = () => {
    if (detectedText === 'WAITING...') {
      alert("Please hold a recognized hand sign in front of the camera before adding to the sentence!");
      return;
    }
    if (!wordBuffer.includes(detectedText)) {
      setWordBuffer([...wordBuffer, detectedText]);
    }
  };`;
app = app.replace(oldAddWord, newAddWord);

// Fix: Add alert feedback to Generate button so user doesn't think it's broken
const oldGenerate = `  const handleGenerateSentence = async () => {
    if (wordBuffer.length === 0) return;`;
const newGenerate = `  const handleGenerateSentence = async () => {
    if (wordBuffer.length === 0) {
      alert("Add at least one word to the sequence buffer (using the + button) before generating a sentence!");
      return;
    }`;
app = app.replace(oldGenerate, newGenerate);

fs.writeFileSync('src/App.tsx', app);

// 2. index.css changes to fix the ugly scrollbar
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.no-scrollbar')) {
  css += `\n/* Hide scrollbar for Chrome, Safari and Opera */\n.no-scrollbar::-webkit-scrollbar {\n  display: none;\n}\n/* Hide scrollbar for IE, Edge and Firefox */\n.no-scrollbar {\n  -ms-overflow-style: none;  /* IE and Edge */\n  scrollbar-width: none;  /* Firefox */\n}\n`;
  fs.writeFileSync('src/index.css', css);
}

console.log("App patched for resilience!");
