const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add theme and language state imports and definitions
code = code.replace(
  "import { useState, useRef, useEffect, useCallback } from 'react';",
  "import { useState, useRef, useEffect, useCallback } from 'react';\nimport SettingsView from './components/SettingsView';"
);

// We need to add the Settings mode
code = code.replace(
  "type Mode = 'translator' | 'listener' | 'history';",
  "type Mode = 'translator' | 'listener' | 'history' | 'settings';"
);

// Inject Settings Icon into lucide-react imports
code = code.replace(
  "User, Settings, FileAudio, RotateCcw",
  "User, Settings, FileAudio, RotateCcw, Cog"
);

// Inside App component, inject state variables and sync them
const stateInjectionPoint = "const [history, setHistory] = useState<HistoryItem[]>(";
const stateInjections = `  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    return localStorage.getItem('sign-speak-theme') as 'light'|'dark' || 'dark';
  });
  const [lang, setLang] = useState<'en'|'ml'>(() => {
    return localStorage.getItem('sign-speak-lang') as 'en'|'ml' || 'en';
  });

  useEffect(() => {
    localStorage.setItem('sign-speak-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sign-speak-lang', lang);
  }, [lang]);

  `;
code = code.replace(stateInjectionPoint, stateInjections + stateInjectionPoint);

// Update root div to receive pure tailwind dark mode styling handling
// We inject 'dark' conditionally so children can use dark: modifier
code = code.replace(
  "<div className=\"h-screen w-full font-inter bg-black text-white flex flex-col relative overflow-hidden\">",
  "<div className={`h-screen w-full font-inter flex flex-col relative overflow-hidden bg-white text-slate-900 dark:bg-black dark:text-white ${theme}`}>"
);

// Regex replace tailwind constants
const reps = [
  [/bg-black/g,                     "bg-white dark:bg-black"],
  [/bg-\[\#0A0F14\]/g,              "bg-slate-50 dark:bg-[#0A0F14]"],
  [/bg-\[\#12181F\]/g,              "bg-slate-100 dark:bg-[#12181F]"],
  [/bg-\[\#1A1F26\]/g,              "bg-slate-200 dark:bg-[#1A1F26]"],
  [/text-white\/60/g,               "text-slate-500 dark:text-white/60"],
  [/text-white\/40/g,               "text-slate-400 dark:text-white/40"],
  [/text-white\/20/g,               "text-slate-300 dark:text-white/20"],
  [/border-white\/10/g,             "border-slate-200 dark:border-white/10"],
  [/border-white\/20/g,             "border-slate-300 dark:border-white/20"],
  [/border-white\/5/g,              "border-slate-100 dark:border-white/5"],
  [/bg-white\/5/g,                  "bg-slate-100 dark:bg-white/5"],
  [/bg-white\/10/g,                 "bg-slate-200 dark:bg-white/10"],
  [/text-white(?!\/)(?!\w)/g,       "text-slate-900 dark:text-white"]
];

for (const [r, s] of reps) {
  // Be careful not to replace text-white when it's part of another string like text-white/50 using word boundary
  // Actually regex handles it if we don't have overlapping ones. Since text-white is at the end of the array, it will match all pure text-white.
  // Wait, let's fix the regex to prevent replacing inside already replaced chunks:
  code = code.replace(r, s);
}
// Fix duplicate dark:text-[slate-...] that could happen if we recursively replaced
code = code.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, "text-slate-900 dark:text-white");
code = code.replace(/bg-white dark:bg-white dark:bg-black/g, "bg-white dark:bg-black");

// Inject the Settings Tab onto the navbar
const navBarBottom = `        <NavButton 
          active={activeMode === 'history'} 
          icon={<History />} 
          label="HISTORY" 
          onClick={() => setActiveMode('history')} 
        />`;
const navBarReplacement = navBarBottom + `\n        <NavButton \n          active={activeMode === 'settings'} \n          icon={<Cog />} \n          label="SETTINGS" \n          onClick={() => setActiveMode('settings')} \n        />`;
code = code.replace(navBarBottom, navBarReplacement);

// Inject the Settings conditional rendering
const historyViewCondition = `{activeMode === 'history' && (`;
const settingsViewCondition = `
          {activeMode === 'settings' && (
            <motion.div key="settings" className="h-full">
              <SettingsView theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />
            </motion.div>
          )}
          `;
code = code.replace(historyViewCondition, settingsViewCondition + historyViewCondition);

// Finally, inject the generic SettingsView component at the end of the file
const settingsViewComponent = `

// --- Settings View ---
function SettingsView({ theme, setTheme, lang, setLang }: { theme: 'light'|'dark', setTheme: (t: 'light'|'dark') => void, lang: 'en'|'ml', setLang: (l: 'en'|'ml') => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 h-full overflow-y-auto"
    >
      <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">SETTINGS</h2>
      <div className="space-y-6">
        
        {/* Theme Toggle */}
        <div className="p-5 bg-slate-100 dark:bg-[#12181F] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg">Appearance</h3>
            <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Light / Dark Mode</p>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-16 h-8 bg-[#FFC107]/20 rounded-full relative transition-colors"
          >
            <div className={\`w-6 h-6 bg-[#FFC107] rounded-full absolute top-1 transition-transform \${theme === 'dark' ? 'right-1' : 'left-1'}\`} />
          </button>
        </div>

        {/* Language Toggle */}
        <div className="p-5 bg-slate-100 dark:bg-[#12181F] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg">Language</h3>
            <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Default Output</p>
          </div>
          <div className="flex bg-slate-200 dark:bg-black/50 p-1 rounded-xl">
            <button 
              onClick={() => setLang('en')}
              className={\`px-4 py-2 rounded-lg text-sm font-black transition-colors \${lang === 'en' ? 'bg-[#FFC107] text-black' : 'text-slate-500 dark:text-white/40'}\`}
            >
              ENG
            </button>
            <button 
              onClick={() => setLang('ml')}
              className={\`px-4 py-2 rounded-lg text-sm font-black transition-colors \${lang === 'ml' ? 'bg-[#FFC107] text-black' : 'text-slate-500 dark:text-white/40'}\`}
            >
              MAL
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

`;

code = code + settingsViewComponent;

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx effectively updated with new SettingsView and unified theme tokens!');
