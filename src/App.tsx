/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import * as drawingUtils from '@mediapipe/drawing_utils';
import { Camera, Mic, History, Volume2, Settings, Menu, X, RefreshCw, Plus, Save, Trash2, Video, Phone, PhoneOff, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recognizeGesture, normalizeLandmarks, Gesture, Landmark } from './lib/gestures';
import { translateText, generateSentence } from './services/geminiService';

// --- Types & Constants ---
type Mode = 'translator' | 'listener' | 'history' | 'settings';

interface RecognitionResult {
  text: string;
  text_ml: string;
  confidence: number;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  type: 'translation';
  text: string;
  text_ml: string;
  timestamp: number;
  duration?: number;
}

// --- Components ---

export default function App() {
  const [activeMode, setActiveMode] = useState<Mode>('translator');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'light'|'dark'>(() => {
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

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('sign-speak-history');
    return saved ? JSON.parse(saved) : [];
  });

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    const updated = [newItem, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('sign-speak-history', JSON.stringify(updated));
  };

  const [showVoiceModal, setShowVoiceModal] = useState(false);

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'dark bg-[#0A0F14]' : 'bg-slate-50'} text-slate-900 dark:text-white font-sans overflow-hidden transition-colors duration-300`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0F14]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="p-1">
            <Menu className="w-6 h-6 text-[#FFC107]" />
          </button>
          <h1 className="text-xl font-black tracking-tighter text-[#FFC107]">SIGN-SPEAK</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-[#FFC107] overflow-hidden bg-gray-800 flex items-center justify-center">
           <span className="text-xs font-bold">AS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeMode === 'translator' && (
            <motion.div key="translator" className="h-full">
              <TranslatorView lang={lang} onSave={(text, ml) => addToHistory({ type: 'translation', text, text_ml: ml })} />
            </motion.div>
          )}
          {activeMode === 'listener' && (
            <motion.div key="listener" className="h-full">
              <ListenerView lang={lang} />
            </motion.div>
          )}
          
          {activeMode === 'settings' && (
            <motion.div key="settings" className="h-full">
              <SettingsView theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />
            </motion.div>
          )}
          {activeMode === 'history' && (
            <motion.div key="history" className="h-full">
              <HistoryView items={history} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="flex items-center justify-around py-4 bg-slate-100 dark:bg-[#12181F] border-t border-slate-100 dark:border-white/5 pb-8">
        <NavButton 
          active={activeMode === 'translator'} 
          icon={<Camera />} 
          label="TRANSLATOR" 
          onClick={() => setActiveMode('translator')} 
        />
        <NavButton 
          active={activeMode === 'listener'} 
          icon={<Mic />} 
          label="LISTENER" 
          onClick={() => setActiveMode('listener')} 
        />
        <NavButton 
          active={activeMode === 'history'} 
          icon={<History />} 
          label="HISTORY" 
          onClick={() => setActiveMode('history')} 
        />
        <NavButton 
          active={activeMode === 'settings'} 
          icon={<Settings />} 
          label="SETTINGS" 
          onClick={() => setActiveMode('settings')} 
        />
      </nav>

      {/* Side Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-white dark:bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              key="sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-slate-100 dark:bg-[#12181F] z-[70] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-2xl font-black text-[#FFC107]">MENU</h2>
                <button onClick={() => setIsMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-6">
                <MenuItem icon={<Settings />} label="Settings" onClick={() => { setIsMenuOpen(false); setActiveMode('settings'); }} />
                <MenuItem icon={<Volume2 />} label="Voice Selection" onClick={() => { setIsMenuOpen(false); setShowVoiceModal(true); }} />
                <MenuItem icon={<RefreshCw />} label="Recalibrate" onClick={() => window.location.reload()} />
              </div>
              <div className="absolute bottom-12 left-8 right-8">
                <div className="p-4 bg-[#FFC107]/10 rounded-2xl border border-[#FFC107]/20">
                  <p className="text-xs text-[#FFC107] font-bold uppercase mb-1">Hackathon MVP v1.0</p>
                  <p className="text-[10px] text-slate-400 dark:text-white/40">Built for 48h Communication Challenge</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice Selection Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <VoiceModal onClose={() => setShowVoiceModal(false)} currentLang={lang} />
        )}
      </AnimatePresence>
    </div>
  );
}

function VoiceModal({ onClose, currentLang }: { onClose: () => void, currentLang: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const saveVoice = (voiceURI: string) => {
    localStorage.setItem(`sign-speak-voice-${currentLang}`, voiceURI);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        key="voice-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-white dark:bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        key="voice-modal"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-100 dark:bg-[#12181F] border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm relative z-10 shadow-2xl flex flex-col max-h-[80vh]"
      >
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Select Voice</h3>
        <p className="text-xs text-[#FFC107] font-bold mb-6 uppercase tracking-widest">For Language: {currentLang.toUpperCase()}</p>
        <div className="overflow-y-auto space-y-2 pr-2 no-scrollbar">
          {voices.length === 0 ? (
            <p className="text-slate-500 text-sm font-bold">Loading voices...</p>
          ) : (
            voices.map(v => (
              <button 
                key={v.voiceURI}
                onClick={() => saveVoice(v.voiceURI)}
                className="w-full text-left p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#FFC107] transition-colors"
              >
                <p className="font-bold text-sm truncate">{v.name}</p>
                <p className="text-xs text-slate-400 dark:text-white/40">{v.lang}</p>
              </button>
            ))
          )}
        </div>
        <button onClick={onClose} className="mt-6 w-full bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white py-3 rounded-xl font-bold uppercase track-widest">
          Close
        </button>
      </motion.div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-[#FFC107] scale-110' : 'text-slate-400 dark:text-white/40'}`}
    >
      <div className={`p-3 rounded-2xl ${active ? 'bg-[#FFC107] text-black shadow-[0_0_20px_rgba(255,193,7,0.3)]' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 3 : 2 })}
      </div>
      <span className="text-[10px] font-black tracking-widest mt-1">{label}</span>
    </button>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 w-full p-3 hover:bg-slate-100 dark:bg-white/5 rounded-xl transition-colors text-slate-800 dark:text-white/80">
      {icon}
      <span className="font-bold">{label}</span>
    </button>
  );
}

// --- Translator View (Sign to Speech) ---
function TranslatorView({ onSave, lang }: { onSave?: (text: string, ml: string) => void, lang: 'en'|'ml' }) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const lastDetectedTextRef = useRef<string>('WAITING...');
  const currentLandmarksRef = useRef<Landmark[] | null>(null);
  const currentLandmarksLeftRef = useRef<Landmark[] | null>(null);
  
  const [detectedText, setDetectedText] = useState<string>('WAITING...');
  const [detectedTextML, setDetectedTextML] = useState<string>('കാത്തിരിക്കുന്നു...');
  const [isTracking, setIsTracking] = useState(false);
  const [confidence, setConfidence] = useState(0);
  
  // Word Buffer for Sentence Generation
  const [wordBuffer, setWordBuffer] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);
  const [generatedSentenceML, setGeneratedSentenceML] = useState<string | null>(null);

  // Dynamic Gestures
  const [gestures, setGestures] = useState<Gesture[]>(() => {
    const saved = localStorage.getItem('sign-speak-gestures');
    let custom = saved ? JSON.parse(saved) : [];
    // Scrub localStorage of any old hardcoded defaults that got cached (their IDs are strings like 'HELLO' instead of timestamps)
    custom = custom.filter((g: any) => !isNaN(Number(g.id)));
    localStorage.setItem('sign-speak-gestures', JSON.stringify(custom));
    
    // Default built-in gestures for UI visibility
    const defaults: Gesture[] = [];
    
    // Combine defaults with custom, avoiding duplicates if names match
    const combined = [...defaults];
    custom.forEach((c: Gesture) => {
      if (!defaults.some(d => d.name === c.name)) {
        combined.push(c);
      }
    });
    
    return combined;
  });
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [newGestureName, setNewGestureName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const speak = useCallback((text: string, langCode: string = 'en-US') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    
    const baseLang = langCode.split('-')[0];
    const savedVoiceURI = localStorage.getItem(`sign-speak-voice-${baseLang}`);
    if (savedVoiceURI) {
      const match = window.speechSynthesis.getVoices().find(v => v.voiceURI === savedVoiceURI);
      if (match) utterance.voice = match;
    }
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleGenerateSentence = async () => {
    if (wordBuffer.length === 0) {
      alert("Add at least one word to the sequence buffer (using the + button) before generating a sentence!");
      return;
    }
    setIsGenerating(true);
    try {
      const sentence = await generateSentence(wordBuffer);
      setGeneratedSentence(sentence);
      const sentenceML = await translateText(sentence, 'ml');
      setGeneratedSentenceML(sentenceML);
      speak(lang === 'en' ? sentence : sentenceML, lang === 'en' ? 'en-US' : 'ml-IN');
      if (onSave) onSave(sentence, sentenceML);
    } catch (e) {
      console.error("Sentence generation failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const addWordToBuffer = () => {
    if (detectedText === 'WAITING...') {
      alert("Please hold a recognized hand sign in front of the camera before adding to the sentence!");
      return;
    }
    if (!wordBuffer.includes(detectedText)) {
      setWordBuffer([...wordBuffer, detectedText]);
    }
  };

  const clearBuffer = () => {
    setWordBuffer([]);
    setGeneratedSentence(null);
    setGeneratedSentenceML(null);
  };

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const { width, height } = canvas;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsTracking(true);
      
      let rightHand: Landmark[] | null = null;
      let leftHand: Landmark[] | null = null;

      // Draw all detected hands and identify left/right
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handedness = results.multiHandedness[index].label; // "Left" or "Right"
        if (handedness === 'Right') rightHand = landmarks;
        else leftHand = landmarks;

        drawingUtils.drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { 
          color: handedness === 'Right' ? '#FFC107' : '#00E5FF', 
          lineWidth: 5 
        });
        drawingUtils.drawLandmarks(canvasCtx, landmarks, { color: '#FFFFFF', lineWidth: 2, radius: 4 });
      });

      // Update refs for recording (Right is primary, Left is secondary)
      currentLandmarksRef.current = rightHand || leftHand;
      currentLandmarksLeftRef.current = (rightHand && leftHand) ? leftHand : null;

      // --- Robust Recognition ---
      if (!isRecordingMode) {
        const primaryHand = rightHand || leftHand;
        const secondaryHand = rightHand ? leftHand : null;

        if (primaryHand) {
          const { gesture, score } = recognizeGesture(primaryHand, gestures, secondaryHand);
          
          if (gesture && gesture.name !== lastDetectedTextRef.current) {
            lastDetectedTextRef.current = gesture.name;
            setDetectedText(gesture.name);
            setDetectedTextML(gesture.label_ml);
            setConfidence(Math.round(score * 100));
            speak(lang === 'en' ? gesture.name : gesture.label_ml, lang === 'en' ? 'en-US' : 'ml-IN');
          }
        }
      }
    } else {
      setIsTracking(false);
      currentLandmarksRef.current = null;
      currentLandmarksLeftRef.current = null;
      lastDetectedTextRef.current = ''; // Reset to allow repeating the same gesture
    }
    canvasCtx.restore();
  }, [gestures, isRecordingMode, speak]);

  const handleSaveGesture = async () => {
    if (!currentLandmarksRef.current || !newGestureName) return;

    const normalizedPrimary = normalizeLandmarks(currentLandmarksRef.current);
    const normalizedSecondary = currentLandmarksLeftRef.current ? normalizeLandmarks(currentLandmarksLeftRef.current) : undefined;
    
    // Use Gemini to get Malayalam label
    let labelML = newGestureName;
    try {
      labelML = await translateText(newGestureName, 'ml');
    } catch (e) {
      console.error("Gemini translation failed", e);
    }

    const newGesture: Gesture = {
      id: Date.now().toString(),
      name: newGestureName.toUpperCase(),
      label_ml: labelML,
      landmarks: normalizedPrimary,
      landmarksLeft: normalizedSecondary,
      isTwoHanded: !!normalizedSecondary
    };

    const updated = [...gestures, newGesture];
    setGestures(updated);
    localStorage.setItem('sign-speak-gestures', JSON.stringify(updated));
    
    setNewGestureName('');
    setShowSaveModal(false);
    setIsRecordingMode(false);
  };

  const deleteGesture = (id: string) => {
    const updated = gestures.filter(g => g.id !== id);
    setGestures(updated);
    
    // Only save custom gestures to localStorage
    localStorage.setItem('sign-speak-gestures', JSON.stringify(updated));
  };

  useEffect(() => {
    if (handsRef.current) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    let isMounted = true;
    let isProcessing = false;

    const processVideo = async () => {
      if (!isMounted || !webcamRef.current?.video || !handsRef.current) return;
      
      const videoElement = webcamRef.current.video;
      if (videoElement.readyState === 4 && !isProcessing) {
        isProcessing = true;
        try {
          await handsRef.current.send({ image: videoElement });
        } catch (e) {
          console.error("MediaPipe Error:", e);
        }
        isProcessing = false;
      }
      requestAnimationFrame(processVideo);
    };
    
    processVideo();

    return () => {
      isMounted = false;
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, [onResults]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Camera Feed */}
      <div className="relative flex-1 bg-white dark:bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          className="w-full h-full object-cover opacity-60"
          videoConstraints={{ facingMode: 'user' }}
          mirrored={false}
          screenshotFormat="image/jpeg"
          forceScreenshotSourceSize={false}
          imageSmoothing={true}
          disablePictureInPicture={true}
          onUserMedia={() => {}}
          onUserMediaError={() => {}}
          screenshotQuality={0.92}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        
        {/* Corner Brackets */}
        <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-[#FFC107] rounded-tl-xl" />
        <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-[#FFC107] rounded-tr-xl" />
      </div>

      {/* Result Card */}
      <div className="p-6 bg-gradient-to-t from-[#0A0F14] to-transparent -mt-24 relative z-10">
        {/* Word Buffer Display */}
        {wordBuffer.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
            {wordBuffer.map((word, idx) => (
              <span key={idx} className="px-3 py-1 bg-[#FFC107]/20 text-[#FFC107] rounded-full text-xs font-black">
                {word}
              </span>
            ))}
            <button onClick={clearBuffer} className="ml-auto p-1 text-slate-400 dark:text-white/40 hover:text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Generated Sentence Display */}
        {(generatedSentence || isGenerating) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-[#FFC107] text-black rounded-3xl shadow-[0_0_30px_rgba(255,193,7,0.4)]"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-black uppercase tracking-widest">Generating Sentence...</span>
              </div>
            ) : (
              <>
                <p className="text-xl font-black leading-tight mb-1">{lang === 'en' ? generatedSentence : generatedSentenceML}</p>
                <p className="text-sm font-bold opacity-80">{lang === 'en' ? generatedSentenceML : generatedSentence}</p>
              </>
            )}
          </motion.div>
        )}

        <div className="bg-slate-100 dark:bg-[#12181F]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{lang === 'en' ? detectedText : detectedTextML}</h2>
              <p className="text-2xl font-bold text-[#FFC107]">{lang === 'en' ? detectedTextML : detectedText}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={addWordToBuffer}
                className="bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-30"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
              <button 
                onClick={handleGenerateSentence}
                className="bg-[#00E5FF] text-black p-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-30"
              >
                <RefreshCw size={24} strokeWidth={3} className={isGenerating ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => speak(lang === 'en' ? detectedText : detectedTextML, lang === 'en' ? 'en-US' : 'ml-IN')}
                className="bg-[#FFC107] text-black p-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                <Volume2 size={28} strokeWidth={3} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                className="h-full bg-[#FFC107]"
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">
                  {isRecordingMode ? 'RECORDING MODE' : isTracking ? 'Real-time tracking active' : 'Searching for hand...'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsRecordingMode(!isRecordingMode)}
                  className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isRecordingMode ? 'text-red-500' : 'text-slate-400 dark:text-white/40'}`}
                >
                  <Plus size={12} /> {isRecordingMode ? 'EXIT RECORDING' : 'RECORD GESTURE'}
                </button>
                {isRecordingMode && isTracking && (
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    className="text-[10px] font-black text-[#FFC107] uppercase tracking-widest flex items-center gap-1"
                  >
                    <Save size={12} /> CAPTURE GESTURE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Saved Gestures List */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {gestures.map(g => (
            <div key={g.id} className="flex-shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-white/80">{g.name}</span>
                  {g.isTwoHanded && <span className="text-[6px] bg-blue-500/20 text-blue-400 px-1 rounded border border-blue-500/30 font-bold uppercase">2H</span>}
                </div>
                <span className="text-[8px] text-[#FFC107]">{g.label_ml}</span>
              </div>
              <button onClick={() => deleteGesture(g.id)} className="text-red-500/50 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="absolute inset-0 bg-white dark:bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-100 dark:bg-[#12181F] border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">SAVE GESTURE</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest block mb-2">Gesture Name (English)</label>
                  <input 
                    type="text" 
                    value={newGestureName}
                    onChange={(e) => setNewGestureName(e.target.value)}
                    placeholder="e.g. HELLO, WATER, HELP"
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#FFC107] transition-colors"
                  />
                </div>
                <button 
                  onClick={handleSaveGesture}
                  className="w-full bg-[#FFC107] text-black font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  SAVE & TRANSLATE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Listener View (Speech to Text) ---
function ListenerView({ lang }: { lang: 'en'|'ml' }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptML, setTranscriptML] = useState('');

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'en' ? 'en-US' : 'ml-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscriptML(result);
      // In a real app, we'd call Gemini here to translate ML to EN
      setTranscript("Translating..."); 
    };

    recognition.start();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="h-full p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">
            {isListening ? 'Listening...' : 'Ready to listen'}
          </span>
        </div>
        <div></div>
      </div>

      <div className="flex-1 space-y-8">
        <h2 className="text-5xl font-black text-white/90 leading-tight tracking-tighter">
          {lang === 'en' ? (transcript || 'How can I help you today?') : (transcriptML || 'ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?')}
        </h2>
        
        <p className="text-3xl font-bold text-[#FFC107] leading-snug">
          {lang === 'en' ? (transcriptML || 'ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?') : (transcript || 'How can I help you today?')}
        </p>
      </div>

      <div className="flex flex-col items-center gap-8 pb-12">
        {isListening && (
          <div className="flex items-end gap-1 h-12">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [10, 40, 10] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-1.5 bg-[#FFC107] rounded-full"
              />
            ))}
          </div>
        )}

        <button 
          onClick={startListening}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 ${isListening ? 'bg-red-500 text-slate-900 dark:text-white' : 'bg-[#FFC107] text-black'}`}
        >
          <Mic size={40} strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
}

// --- VRI View (Video Remote Interpretation) ---
function VRIView({ onEnd }: { onEnd?: (duration: number) => void }) {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const webcamRef = useRef<Webcam>(null);
  const timerRef = useRef<any>(null);

  const startCall = () => {
    setIsCalling(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsCalling(false);
      setIsConnected(true);
      startTimer();
      // Add initial greeting to transcript
      setTranscript(["Interpreter: Hello! I am your ISL interpreter. How can I help you today?"]);
    }, 2000);
  };

  const endCall = () => {
    if (isConnected && onEnd) onEnd(callDuration);
    setIsConnected(false);
    setIsCalling(false);
    stopTimer();
    setCallDuration(0);
    setTranscript([]);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isConnected) {
      const messages = [
        "Interpreter: I'm ready. You can start signing.",
        "Interpreter: [To Hearing Person] He says he needs help with the bank application.",
        "Interpreter: [To User] The hearing person is asking for your ID."
      ];
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < messages.length) {
          setTranscript(prev => {
            const next = [...prev, messages[index]];
            return next.slice(-3);
          });
          index++;
        } else {
          clearInterval(interval);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-white dark:bg-black relative"
    >
      {!isConnected && !isCalling ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-32 h-32 bg-[#FFC107]/10 rounded-full flex items-center justify-center mb-8 border-2 border-[#FFC107]/20">
            <Video size={64} className="text-[#FFC107]" />
          </div>
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">On-Demand VRI</h2>
          <p className="text-slate-500 dark:text-white/60 mb-12 max-w-xs font-medium leading-relaxed">
            Connect instantly with a certified Indian Sign Language interpreter for real-time communication.
          </p>
          <button 
            onClick={startCall}
            className="w-full max-w-xs bg-[#FFC107] text-black font-black py-5 rounded-3xl shadow-[0_0_40px_rgba(255,193,7,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <Phone size={24} fill="currentColor" />
            CONNECT TO INTERPRETER
          </button>
          
          <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-[10px] font-black text-[#FFC107] uppercase mb-1">Available</p>
              <p className="text-xl font-bold">24/7</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-[10px] font-black text-[#FFC107] uppercase mb-1">Wait Time</p>
              <p className="text-xl font-bold">&lt; 1 min</p>
            </div>
          </div>
        </div>
      ) : isCalling ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0A0F14]">
          <div className="relative">
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[#FFC107] rounded-full"
            />
            <div className="relative w-32 h-32 bg-[#FFC107] rounded-full flex items-center justify-center z-10">
              <User size={64} className="text-black" />
            </div>
          </div>
          <h2 className="text-2xl font-black mt-12 mb-2 animate-pulse uppercase tracking-widest">Connecting...</h2>
          <p className="text-slate-400 dark:text-white/40 font-bold">Assigning best available interpreter</p>
          
          <button 
            onClick={endCall}
            className="mt-24 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Remote Interpreter (Top) */}
          <div className="flex-1 bg-slate-200 dark:bg-[#1A1F26] relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
               <User size={120} />
               <p className="mt-4 font-black tracking-widest uppercase">Remote Interpreter</p>
            </div>
            
            {/* Simulated Video Feed Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            
            <div className="absolute top-6 left-6 flex items-center gap-3 bg-white dark:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 dark:border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-black tracking-widest uppercase">Live • {formatTime(callDuration)}</span>
            </div>

            <div className="absolute top-6 right-6 flex gap-2">
               <button className="p-3 bg-slate-200 dark:bg-white/10 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10">
                  <Settings size={20} />
               </button>
            </div>

            {/* Captions Overlay */}
            <div className="absolute bottom-8 left-6 right-6 space-y-2">
              {transcript.map((t, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-black/60 backdrop-blur-xl p-4 rounded-2xl border-l-4 border-[#FFC107] max-w-[85%]"
                >
                  <p className="text-sm font-bold leading-relaxed">{t}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Local User (Bottom Right PIP) */}
          <div className="absolute bottom-32 right-6 w-32 h-48 bg-white dark:bg-black rounded-3xl overflow-hidden border-2 border-slate-300 dark:border-white/20 shadow-2xl z-20">
            <Webcam
              ref={webcamRef}
              audio={false}
              className="w-full h-full object-cover"
              videoConstraints={{ facingMode: 'user' }}
              mirrored={false}
              screenshotFormat="image/jpeg"
              forceScreenshotSourceSize={false}
              imageSmoothing={true}
              disablePictureInPicture={true}
              onUserMedia={() => {}}
              onUserMediaError={() => {}}
              screenshotQuality={0.92}
            />
          </div>

          {/* Call Controls */}
          <div className="h-28 bg-slate-100 dark:bg-[#12181F] border-t border-slate-100 dark:border-white/5 flex items-center justify-around px-8 z-30">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-2xl transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60'}`}
            >
              {isMuted ? <Mic size={24} className="opacity-40" /> : <Mic size={24} />}
            </button>
            <button className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 dark:text-white/60">
              <MessageSquare size={24} />
            </button>
            <button 
              onClick={endCall}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-90 transition-transform"
            >
              <PhoneOff size={28} />
            </button>
            <button className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 dark:text-white/60">
              <RefreshCw size={24} />
            </button>
            <button className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 dark:text-white/60">
              <Volume2 size={24} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- History View ---
function HistoryView({ items }: { items: HistoryItem[] }) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 h-full overflow-y-auto"
    >
      <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">RECENT CONVERSATIONS</h2>
      <div className="space-y-4 pb-20">
        {items.length === 0 ? (
          <div className="p-8 text-center bg-slate-100 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10">
            <History size={48} className="mx-auto mb-4 text-slate-300 dark:text-white/20" />
            <p className="text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest text-xs">No history yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="p-5 bg-slate-100 dark:bg-[#12181F] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase bg-[#FFC107]/20 text-[#FFC107]`}>
                    {item.type}
                  </div>
                  <span className="text-[10px] font-black text-slate-300 dark:text-white/20 uppercase tracking-widest">{formatTime(item.timestamp)}</span>
                </div>
                <Volume2 size={16} className="text-[#FFC107]" />
              </div>
              <p className="font-black text-slate-900 dark:text-white leading-tight mb-1">{item.text}</p>
              <p className="text-[#FFC107] text-sm font-bold">{item.text_ml}</p>
              {item.duration && (
                <p className="mt-3 text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Duration: {formatDuration(item.duration)}</p>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}


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
            <div className={`w-6 h-6 bg-[#FFC107] rounded-full absolute top-1 transition-transform ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
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
              className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${lang === 'en' ? 'bg-[#FFC107] text-black' : 'text-slate-500 dark:text-white/40'}`}
            >
              ENG
            </button>
            <button 
              onClick={() => setLang('ml')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${lang === 'ml' ? 'bg-[#FFC107] text-black' : 'text-slate-500 dark:text-white/40'}`}
            >
              MAL
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

