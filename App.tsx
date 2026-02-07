import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Brain, Delete, Sun, Moon, RotateCcw, Users, User, ArrowRight, Lock, ShieldCheck, Check, Lightbulb } from 'lucide-react';

// --- Types & Constants ---
type GameMode = 'solo' | 'multiplayer';
type GameStatus = 'menu' | 'setup' | 'handover' | 'playing' | 'won' | 'lost';

interface Guess {
  code: string;
  bulls: number;
  cows: number;
  isRevealed?: boolean; // New property for the hint feature
}

const MAX_ATTEMPTS = 10;
const CODE_LENGTH = 4;

// --- Components ---

// 1. Feedback Indicator (The dots)
const FeedbackDisplay = ({ bulls, cows }: { bulls: number; cows: number }) => {
  const misses = 4 - bulls - cows;
  return (
    <div className="flex gap-2">
      {[...Array(bulls)].map((_, i) => (
        <div key={`b-${i}`} className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] ring-2 ring-emerald-500/20" />
      ))}
      {[...Array(cows)].map((_, i) => (
        <div key={`c-${i}`} className="w-3 h-3 rounded-full bg-transparent border-[3px] border-amber-400 box-border" />
      ))}
      {[...Array(misses)].map((_, i) => (
        <div key={`m-${i}`} className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  );
};

// 2. The Input "Vault" Display (The 4 boxes)
const InputDisplay = ({ value, status, shake }: { value: string, status: GameStatus, shake: boolean }) => {
  const digits = value.split('');
  
  return (
    <div className={`flex gap-2 justify-center mb-4 ${shake ? 'shake-anim' : ''}`}>
      {[0, 1, 2, 3].map((i) => {
        const hasValue = digits[i] !== undefined;
        // Show actual number
        const displayChar = hasValue ? digits[i] : ''; 
        
        return (
          <div 
            key={i}
            className={`
              w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-mono font-bold transition-all duration-200
              ${hasValue 
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 shadow-md transform -translate-y-1' 
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-transparent'}
              ${status === 'won' ? 'border-emerald-500 text-emerald-500' : ''}
              ${status === 'lost' ? 'border-rose-500 text-rose-500' : ''}
            `}
          >
            {displayChar}
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  // --- State ---
  const [darkMode, setDarkMode] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  
  const [secretCode, setSecretCode] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [shakeInput, setShakeInput] = useState(false);
  const [hintAvailable, setHintAvailable] = useState(true);
  
  const historyRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Default to dark mode if system prefers, or simple logic
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    // Scroll to bottom whenever guesses change
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [guesses, gameStatus]);

  // --- Logic ---

  const generateSecretCode = (): string => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      code += digits[randomIndex];
      digits.splice(randomIndex, 1);
    }
    return code;
  };

  const calculateFeedback = (secret: string, guess: string) => {
    let bulls = 0;
    let cows = 0;
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (guess[i] === secret[i]) {
        bulls++;
      } else if (secret.includes(guess[i])) {
        cows++;
      }
    }
    return { bulls, cows };
  };

  const triggerShake = () => {
    setShakeInput(true);
    setTimeout(() => setShakeInput(false), 400);
  };

  const handleKeypadPress = (key: string) => {
    if (shakeInput) return;

    if (key === 'ENTER') {
      submitAction();
    } else if (key === 'DEL') {
      setCurrentInput((prev) => prev.slice(0, -1));
    } else {
      if (currentInput.length >= CODE_LENGTH) return;
      if (currentInput.includes(key)) {
        triggerShake();
        return;
      }
      setCurrentInput((prev) => prev + key);
    }
  };

  const submitAction = () => {
    if (currentInput.length !== CODE_LENGTH) {
      triggerShake();
      return;
    }

    // 1. SETUP MODE (Player 1 sets code)
    if (gameStatus === 'setup') {
      setSecretCode(currentInput);
      setCurrentInput('');
      setGameStatus('handover'); 
      return;
    }

    // 2. PLAYING MODE (Player 2 guesses)
    const { bulls, cows } = calculateFeedback(secretCode, currentInput);
    const newGuess: Guess = { code: currentInput, bulls, cows, isRevealed: false };
    const newGuesses = [...guesses, newGuess];
    
    setGuesses(newGuesses);
    setCurrentInput('');

    if (bulls === CODE_LENGTH) {
      setGameStatus('won');
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus('lost');
    }
  };

  const useHint = () => {
    if (!hintAvailable || guesses.length === 0) return;
    
    // Create a copy of guesses
    const updatedGuesses = [...guesses];
    // Mark the last guess as revealed
    updatedGuesses[updatedGuesses.length - 1].isRevealed = true;
    
    setGuesses(updatedGuesses);
    setHintAvailable(false);
  };

  const startGame = (mode: GameMode) => {
    setGuesses([]);
    setCurrentInput('');
    setSecretCode('');
    setHintAvailable(true);
    
    if (mode === 'solo') {
      setSecretCode(generateSecretCode());
      setGameStatus('playing');
    } else {
      setGameStatus('setup');
    }
  };

  const resetGame = () => {
    setGameStatus('menu');
    setGuesses([]);
    setCurrentInput('');
    setSecretCode('');
    setHintAvailable(true);
  };

  // --- Sub-Components ---

  const Keypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'ENTER'];
    return (
      <div className="w-full max-w-[420px] mx-auto px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-2">
          {keys.map((k) => {
            const isSpecial = k === 'DEL' || k === 'ENTER';
            const isEnter = k === 'ENTER';
            return (
              <button
                key={k}
                onClick={() => handleKeypadPress(k)}
                className={`
                  h-12 sm:h-14 rounded-2xl text-xl font-medium transition-all duration-100 active:scale-95 flex items-center justify-center select-none touch-manipulation
                  ${isEnter 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:bg-emerald-600' 
                    : isSpecial 
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-rose-500 dark:text-rose-400 active:bg-zinc-200 dark:active:bg-zinc-700' 
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 shadow-sm active:bg-zinc-50 dark:active:bg-zinc-700'}
                `}
              >
                {k === 'DEL' ? <Delete strokeWidth={2.5} size={20} /> : k === 'ENTER' ? <Check strokeWidth={3} size={24} /> : k}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans overflow-hidden text-zinc-900 dark:text-zinc-50 select-none">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .shake-anim { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
        
        /* Utility for bottom mask */
        .mask-image-b {
           mask-image: linear-gradient(to bottom, transparent 0%, black 15px, black 100%);
           -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15px, black 100%);
        }
      `}</style>

      {/* --- Header --- */}
      <header className="flex-none h-14 sm:h-16 px-5 flex justify-between items-center z-20 border-b border-transparent">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={resetGame}>
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-zinc-900 shadow-sm">
            <Brain size={18} strokeWidth={3} />
          </div>
          <span className="font-bold tracking-tighter text-lg leading-none">SMASH<span className="font-light text-zinc-400">CODE</span></span>
        </div>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 active:scale-90 transition-transform"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto min-h-0">
        
        {/* 1. MENU STATE */}
        {gameStatus === 'menu' && (
          <div className="flex-1 flex flex-col justify-center px-8 animate-in fade-in zoom-in-95 duration-500 pb-10">
            <div className="mb-10 space-y-3">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-[0.9]">
                CRACK<br/>THE<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-emerald-500">CIPHER.</span>
              </h1>
              <p className="text-zinc-500 font-medium leading-relaxed max-w-[260px] text-sm sm:text-base">
                Logic & deduction. Find the unique 4-digit sequence.
              </p>
            </div>

            <div className="space-y-3">
              <button onClick={() => startGame('solo')} className="w-full h-16 sm:h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center px-6 gap-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group active:scale-98">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                  <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-violet-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg tracking-tight">Solo Run</div>
                  <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Beat the CPU</div>
                </div>
              </button>

              <button onClick={() => startGame('multiplayer')} className="w-full h-16 sm:h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center px-6 gap-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group active:scale-98">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                  <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg tracking-tight">Versus</div>
                  <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Challenge a Friend</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. SETUP STATE (Multiplayer P1) */}
        {gameStatus === 'setup' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            {/* Upper Setup Area */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
              <div className="bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4">
                Player 1
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Create Key</h2>
              <p className="text-zinc-500 mb-8 text-xs">Enter 4 unique digits.</p>
              <InputDisplay value={currentInput} status={gameStatus} shake={shakeInput} />
            </div>
            
            {/* Keypad Container */}
            <div className="flex-none bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-t-3xl pt-3">
              <Keypad />
            </div>
          </div>
        )}

        {/* 3. HANDOVER STATE */}
        {gameStatus === 'handover' && (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Lock className="w-7 h-7 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Device Handover</h2>
            <p className="text-zinc-500 mb-8 max-w-[240px] text-sm">
              Pass device to <strong>Player 2</strong>.<br/>Keep the code secret.
            </p>
            <button 
              onClick={() => setGameStatus('playing')}
              className="w-full max-w-[200px] h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Start Guessing
            </button>
          </div>
        )}

        {/* 4. PLAYING STATE */}
        {(gameStatus === 'playing' || gameStatus === 'won' || gameStatus === 'lost') && (
          <>
            {/* History List (Scrollable, takes remaining space) */}
            <div 
              ref={historyRef}
              className="flex-1 overflow-y-auto no-scrollbar px-5 pb-2 pt-4 mask-image-b flex flex-col gap-2 min-h-0"
            >
               {guesses.length === 0 && (
                 <div className="m-auto text-center opacity-40">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-mono text-[10px] tracking-widest uppercase">System Secure</p>
                 </div>
               )}
               
               {/* Spacer to allow scrolling to bottom */}
               <div className="flex-1 min-h-[10px]" />

               {guesses.map((g, idx) => (
                 <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-300 dark:text-zinc-600 font-bold w-4">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      {/* --- DIGIT RENDERING LOGIC --- */}
                      <div className="flex gap-2">
                        {g.code.split('').map((digit, dIdx) => {
                          let colorClass = "text-zinc-700 dark:text-zinc-300"; // Default
                          
                          if (g.isRevealed) {
                            if (digit === secretCode[dIdx]) {
                              // Bull (Exact)
                              colorClass = "text-emerald-500 font-black drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                            } else if (secretCode.includes(digit)) {
                              // Cow (Wrong pos)
                              colorClass = "text-amber-400 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";
                            } else {
                              // Miss
                              colorClass = "text-zinc-300 dark:text-zinc-700 opacity-30";
                            }
                          }

                          return (
                            <span key={dIdx} className={`font-mono text-lg font-bold tracking-widest transition-colors duration-500 ${colorClass}`}>
                              {digit}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <FeedbackDisplay bulls={g.bulls} cows={g.cows} />
                 </div>
               ))}
            </div>

            {/* Input & Keypad Area (Fixed bottom) */}
            <div className="flex-none bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md pt-3 border-t border-zinc-100 dark:border-zinc-900 z-10 rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.02)]">
              {!(gameStatus === 'won' || gameStatus === 'lost') ? (
                <>
                  <div className="flex justify-between px-8 mb-1 items-end h-8">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Attempt {guesses.length + 1}/{MAX_ATTEMPTS}</span>
                    
                    {/* HINT BUTTON */}
                    {guesses.length > 0 && (
                      <button 
                        onClick={useHint} 
                        disabled={!hintAvailable}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all
                          ${hintAvailable 
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 hover:scale-105 active:scale-95' 
                            : 'bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'}`}
                      >
                        <Lightbulb size={12} strokeWidth={3} className={hintAvailable ? "fill-amber-500 text-amber-500" : ""} />
                        {hintAvailable ? "Hint (1)" : "Used"}
                      </button>
                    )}
                  </div>
                  <InputDisplay value={currentInput} status={gameStatus} shake={shakeInput} />
                  <Keypad />
                </>
              ) : (
                <div className="h-[280px] flex items-center justify-center pb-10">
                   <button onClick={resetGame} className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                     <RotateCcw size={20} /> Play Again
                   </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* --- Full Screen Results Overlay --- */}
      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50/90 dark:bg-zinc-950/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="transform scale-100 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center p-6">
            
            <div className={`mb-5 p-4 rounded-full ${gameStatus === 'won' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
              {gameStatus === 'won' ? <Trophy size={40} strokeWidth={1.5} /> : <Delete size={40} strokeWidth={1.5} />}
            </div>

            <h2 className="text-3xl font-black tracking-tighter mb-2">
              {gameStatus === 'won' ? 'UNLOCKED' : 'FAILED'}
            </h2>
            
            <p className="text-zinc-500 font-medium mb-8">
              {gameStatus === 'won' 
                ? `Sequence found in ${guesses.length} attempts.` 
                : 'Security lockout initiated.'}
            </p>

            <div className="relative mb-10 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 mb-2 font-bold text-center">Secret Key</div>
              <div className="flex gap-3 justify-center">
                {secretCode.split('').map((char, i) => (
                  <div key={i} className="w-10 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-xl font-mono font-bold text-zinc-900 dark:text-white">
                    {char}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={resetGame}
              className="w-56 h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl"
            >
              Restart System
            </button>
          </div>
        </div>
      )}
    </div>
  );
}