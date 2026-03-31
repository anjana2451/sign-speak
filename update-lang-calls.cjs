const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update TranslatorView rendering logic

// 1. the speak calls
code = code.replace(
  "speak(sentence, 'en-US');",
  "speak(lang === 'en' ? sentence : sentenceML, lang === 'en' ? 'en-US' : 'ml-IN');"
);

code = code.replace(
  "speak(gesture.name, 'en-US');",
  "speak(lang === 'en' ? gesture.name : gesture.label_ml, lang === 'en' ? 'en-US' : 'ml-IN');"
);

// wait the manual 3rd speak call on volume button:
code = code.replace(
  "<button \n                onClick={() => speak(detectedText)}\n                className=\"bg-[#FFC107] text-black p-4 rounded-2xl shadow-lg active:scale-95 transition-transform\"",
  "<button \n                onClick={() => speak(lang === 'en' ? detectedText : detectedTextML, lang === 'en' ? 'en-US' : 'ml-IN')}\n                className=\"bg-[#FFC107] text-black p-4 rounded-2xl shadow-lg active:scale-95 transition-transform\""
);

// 2. Output texts inside TranslatorView
const oldGeneratedBlock = `              <>
                <p className="text-xl font-black leading-tight mb-1">{generatedSentence}</p>
                <p className="text-sm font-bold opacity-80">{generatedSentenceML}</p>
              </>`;
const newGeneratedBlock = `              <>
                <p className="text-xl font-black leading-tight mb-1">{lang === 'en' ? generatedSentence : generatedSentenceML}</p>
                <p className="text-sm font-bold opacity-80">{lang === 'en' ? generatedSentenceML : generatedSentence}</p>
              </>`;
code = code.replace(oldGeneratedBlock, newGeneratedBlock);

const oldDetectedBlock = `            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{detectedText}</h2>
              <p className="text-2xl font-bold text-[#FFC107]">{detectedTextML}</p>
            </div>`;
const newDetectedBlock = `            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{lang === 'en' ? detectedText : detectedTextML}</h2>
              <p className="text-2xl font-bold text-[#FFC107]">{lang === 'en' ? detectedTextML : detectedText}</p>
            </div>`;
code = code.replace(oldDetectedBlock, newDetectedBlock);


// Update ListenerView
const oldRecognitionLang = "recognition.lang = 'ml-IN'; // Default to Malayalam";
const newRecognitionLang = "recognition.lang = lang === 'en' ? 'en-US' : 'ml-IN';";
code = code.replace(oldRecognitionLang, newRecognitionLang);

// Delete the hardcoded UI EN / ML buttons in ListenerView
const oldListenerUIButtons = `<div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button className="px-4 py-1.5 rounded-lg bg-[#FFC107] text-black text-[10px] font-black uppercase">EN</button>
          <button className="px-4 py-1.5 rounded-lg text-slate-400 dark:text-white/40 text-[10px] font-black uppercase">ML</button>
        </div>`;
code = code.replace(oldListenerUIButtons, "<div></div>"); // replace with empty div to maintain spacing

// Modify ListenerView Output texts
const oldListenerOutput = `<h2 className="text-5xl font-black text-slate-900 dark:text-white/90 leading-tight tracking-tighter">
          {transcript || "How can I help you today?"}
        </h2>
        
        <p className="text-3xl font-bold text-[#FFC107] leading-snug">
          {transcriptML || "ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?"}
        </p>`;
// wait, we replaced text-white/90 earlier with text-slate-900 dark:text-white/90? 
// No, the original was `text-white/90`. It might be `text-slate-900 dark:text-white/90`? Let's use a regex instead for safety.

code = code.replace(
  /\{transcript \|\| "How can I help you today\?"\}/,
  "{lang === 'en' ? (transcript || 'How can I help you today?') : (transcriptML || 'ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?')}"
);
code = code.replace(
  /\{transcriptML \|\| "ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും\?"\}/,
  "{lang === 'en' ? (transcriptML || 'ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?') : (transcript || 'How can I help you today?')}"
);

fs.writeFileSync('src/App.tsx', code);
console.log('Language toggles strictly bound over App.tsx components successfully!');
