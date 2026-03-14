import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Search, X, Loader2, Power, Briefcase, ShoppingCart, Gamepad2, Map, Video, PlaySquare } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function ApiKeyCheck({ onReady }: { onReady: () => void }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          onReady();
        } else {
          setChecking(false);
        }
      } else {
        onReady();
      }
    };
    checkKey();
  }, [onReady]);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        onReady();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (checking) {
    return <div className="flex items-center justify-center h-screen bg-zinc-900 text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-900 text-white p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">API Key Required</h1>
      <p className="mb-6 max-w-md text-zinc-400">
        To use the high-quality image generation features, you need to select a paid Google Cloud project API key.
        <br/><br/>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Billing Documentation</a>
      </p>
      <button
        onClick={handleSelectKey}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
      >
        Select API Key
      </button>
    </div>
  );
}

function ImageGenApp() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setImageUrl(`data:image/png;base64,${base64EncodeString}`);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        setError("No image generated.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-zinc-200">
      <div className="flex gap-2">
        <input 
          type="text" 
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generateImage()}
          placeholder="Describe an image to generate..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        />
        <button 
          onClick={generateImage}
          disabled={loading || !prompt.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-sm">Generating image...</span>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={prompt} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <div className="text-zinc-600 text-sm flex flex-col items-center gap-2">
            <ImageIcon className="w-12 h-12 opacity-20" />
            <span>Enter a prompt to generate an image</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchApp() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSources([]);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setResult(response.text || "");
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedSources = chunks.map((chunk: any) => chunk.web).filter(Boolean);
        setSources(extractedSources);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-zinc-200">
      <div className="flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && performSearch()}
          placeholder="Search the web with Gemini..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button 
          onClick={performSearch}
          disabled={loading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            
            {sources.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Sources</h3>
                <div className="flex flex-col gap-2">
                  {sources.map((source, i) => (
                    <a 
                      key={i} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 hover:underline truncate flex items-center gap-2"
                    >
                      <div className="w-4 h-4 bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-500 shrink-0">{i + 1}</div>
                      <span className="truncate">{source.title || source.uri}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
            <Search className="w-12 h-12 opacity-20" />
            <span className="text-sm">Enter a query to search the web</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Window({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="absolute top-8 left-8 right-8 bottom-16 bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 flex flex-col overflow-hidden z-40"
    >
      <div className="h-8 bg-zinc-800 flex items-center justify-between px-3 cursor-default select-none">
        <div className="text-xs font-semibold text-zinc-300">{title}</div>
        <div className="flex items-center gap-2">
          <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400"></button>
          <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400"></button>
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group">
            <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-zinc-950 relative">
        {children}
      </div>
    </motion.div>
  );
}

function WorkApp({ money, setMoney }: { money: number, setMoney: (m: number) => void }) {
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);

  const doJob = (reward: number, duration: number) => {
    if (working) return;
    setWorking(true);
    setProgress(0);
    
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);
      if (currentStep >= steps) {
        clearInterval(timer);
        setMoney(money + reward);
        setWorking(false);
      }
    }, interval);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-zinc-200 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <h2 className="text-xl font-bold text-green-400 flex items-center gap-2"><Briefcase /> Freelance Portal</h2>
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Data Entry</h3>
          <p className="text-xs text-zinc-400">Quick and easy, low pay.</p>
        </div>
        <button onClick={() => doJob(20, 2000)} disabled={working} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm">Earn $20</button>
      </div>
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Write Code</h3>
          <p className="text-xs text-zinc-400">Requires focus, medium pay.</p>
        </div>
        <button onClick={() => doJob(100, 5000)} disabled={working} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm">Earn $100</button>
      </div>
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Fix Server Bug</h3>
          <p className="text-xs text-zinc-400">Stressful, high pay.</p>
        </div>
        <button onClick={() => doJob(300, 10000)} disabled={working} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm">Earn $300</button>
      </div>
      
      {working && (
        <div className="mt-auto">
          <div className="text-xs text-zinc-400 mb-1">Working...</div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all duration-75" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreApp({ money, setMoney, hasArcade, setHasArcade, arcadeItems, setArcadeItems }: any) {
  const buyArcade = () => {
    if (money >= 1500 && !hasArcade) {
      setMoney(money - 1500);
      setHasArcade(true);
    }
  };

  const buyItem = (item: string, price: number) => {
    if (money >= price && !arcadeItems.includes(item)) {
      setMoney(money - price);
      setArcadeItems([...arcadeItems, item]);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-zinc-200 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><ShoppingCart /> Real Estate & Upgrades</h2>
      
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">Abandoned Arcade</h3>
            <p className="text-sm text-zinc-400 max-w-xs">An old arcade place downtown.</p>
          </div>
          <div className="text-2xl font-mono text-green-400">$1,500</div>
        </div>
        
        {hasArcade ? (
          <div className="bg-zinc-800 text-zinc-400 text-center py-2 rounded font-bold">OWNED</div>
        ) : (
          <button 
            onClick={buyArcade} 
            disabled={money < 1500} 
            className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 px-4 py-2 rounded font-bold transition-colors"
          >
            Purchase Property
          </button>
        )}
      </div>

      {hasArcade && (
        <>
          <h3 className="text-lg font-bold text-pink-400 mt-4 border-b border-zinc-800 pb-2">Arcade Machines</h3>
          
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
            <div>
              <h4 className="font-bold">Pac-Boy Machine</h4>
              <p className="text-xs text-zinc-400">A classic dot-eating game.</p>
            </div>
            {arcadeItems.includes('pacboy') ? (
              <span className="text-zinc-500 font-bold">OWNED</span>
            ) : (
              <button onClick={() => buyItem('pacboy', 500)} disabled={money < 500} className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm">Buy $500</button>
            )}
          </div>

          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
            <div>
              <h4 className="font-bold">Fighter Machine</h4>
              <p className="text-xs text-zinc-400">1v1 fighting game cabinet.</p>
            </div>
            {arcadeItems.includes('fighter') ? (
              <span className="text-zinc-500 font-bold">OWNED</span>
            ) : (
              <button onClick={() => buyItem('fighter', 800)} disabled={money < 800} className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm">Buy $800</button>
            )}
          </div>

          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
            <div>
              <h4 className="font-bold">Racing Simulator</h4>
              <p className="text-xs text-zinc-400">High-speed racing cabinet.</p>
            </div>
            {arcadeItems.includes('racing') ? (
              <span className="text-zinc-500 font-bold">OWNED</span>
            ) : (
              <button onClick={() => buyItem('racing', 1200)} disabled={money < 1200} className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm">Buy $1,200</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function YouTubeApp({ money, setMoney, subs, setSubs, games, setGames }: any) {
  const [hasChannel, setHasChannel] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const buyGame = (game: string, price: number) => {
    if (money >= price && !games.includes(game)) {
      setMoney(money - price);
      setGames([...games, game]);
    }
  };

  const doAction = (act: string, duration: number, rewardMoney: number, rewardSubs: number) => {
    if (action) return;
    setAction(act);
    setProgress(0);
    
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);
      if (currentStep >= steps) {
        clearInterval(timer);
        setMoney(money + rewardMoney);
        setSubs(subs + rewardSubs);
        setAction(null);
      }
    }, interval);
  };

  if (!hasChannel) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-white p-4">
        <Video className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-3xl font-bold text-red-500 mb-4">YouTuber Life</h2>
        <p className="text-zinc-400 mb-6">Start your streaming career today!</p>
        <button onClick={() => setHasChannel(true)} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold">Create Channel</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-zinc-200 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-bold text-red-500 flex items-center gap-2"><PlaySquare /> My Channel</h2>
        <div className="text-sm font-mono text-zinc-300">{subs.toLocaleString()} Subscribers</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex flex-col gap-2">
          <h3 className="font-bold text-lg">Record Video</h3>
          <p className="text-xs text-zinc-400">Make a standard gameplay video.</p>
          <button onClick={() => doAction('Recording Video...', 3000, 10 + Math.floor(subs * 0.1), Math.floor(Math.random() * 10) + 1)} disabled={!!action || games.length === 0} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm mt-auto">Record (Needs Game)</button>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex flex-col gap-2">
          <h3 className="font-bold text-lg">Canlı Yayın (Live)</h3>
          <p className="text-xs text-zinc-400">Stream to your fans! High rewards.</p>
          <button onClick={() => doAction('Streaming Live...', 5000, 50 + Math.floor(subs * 0.5), Math.floor(Math.random() * 50) + 10)} disabled={!!action || games.length === 0} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded font-bold text-sm mt-auto">Go Live (Needs Game)</button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-zinc-300 mt-2 border-b border-zinc-800 pb-2">Game Store</h3>
      <div className="flex flex-col gap-2">
        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
          <div><h4 className="font-bold">Blockcraft</h4><p className="text-xs text-zinc-400">Popular sandbox game.</p></div>
          {games.includes('blockcraft') ? <span className="text-zinc-500 font-bold text-sm">OWNED</span> : <button onClick={() => buyGame('blockcraft', 50)} disabled={money < 50 || !!action} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded font-bold text-sm">Buy $50</button>}
        </div>
        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
          <div><h4 className="font-bold">Grand Auto</h4><p className="text-xs text-zinc-400">Action open-world.</p></div>
          {games.includes('grandauto') ? <span className="text-zinc-500 font-bold text-sm">OWNED</span> : <button onClick={() => buyGame('grandauto', 120)} disabled={money < 120 || !!action} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded font-bold text-sm">Buy $120</button>}
        </div>
      </div>

      {action && (
        <div className="mt-auto bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <div className="text-sm font-bold text-zinc-200 mb-2">{action}</div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full transition-all duration-75" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArcadeRoom({ arcadeItems }: { arcadeItems: string[] }) {
  return (
    <div className="relative w-full h-screen bg-indigo-950 overflow-hidden flex items-center justify-center font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-purple-900" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4c1d95 20%, #3b0764 80%)' }}>
          <div className="w-full h-full opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #3b0764 25%, #3b0764 75%, #000 75%, #000)', backgroundPosition: '0 0, 20px 20px', backgroundSize: '40px 40px' }}></div>
        </div>
        
        <div className="absolute top-0 left-0 w-full h-1/2 bg-zinc-900 border-b-4 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)]"></div>
        
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-pink-500 font-bold text-6xl tracking-widest" style={{ textShadow: '0 0 10px #ec4899, 0 0 20px #ec4899, 0 0 40px #ec4899' }}>ARCADE</div>
        
        {arcadeItems.includes('pacboy') && (
          <div className="absolute bottom-1/4 left-1/4 w-32 h-64 bg-blue-900 border-4 border-blue-950 rounded-t-xl shadow-2xl flex flex-col items-center">
            <div className="w-full h-16 bg-blue-800 rounded-t-lg border-b-4 border-blue-950 flex items-center justify-center"><div className="text-white font-bold text-xs animate-pulse">PAC-BOY</div></div>
            <div className="w-28 h-24 bg-black mt-2 border-4 border-zinc-800 rounded shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]"></div>
            <div className="w-full h-12 bg-blue-700 mt-2 transform -skew-x-12 flex items-center justify-center gap-4">
              <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
              <div className="w-2 h-8 bg-zinc-400 rounded-full"></div>
            </div>
          </div>
        )}

        {arcadeItems.includes('fighter') && (
          <div className="absolute bottom-1/4 right-1/4 w-32 h-64 bg-red-900 border-4 border-red-950 rounded-t-xl shadow-2xl flex flex-col items-center">
            <div className="w-full h-16 bg-red-800 rounded-t-lg border-b-4 border-red-950 flex items-center justify-center"><div className="text-white font-bold text-xs animate-pulse">FIGHTER</div></div>
            <div className="w-28 h-24 bg-black mt-2 border-4 border-zinc-800 rounded shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]"></div>
            <div className="w-full h-12 bg-red-700 mt-2 transform skew-x-12 flex items-center justify-center gap-2">
              <div className="w-2 h-8 bg-zinc-400 rounded-full"></div>
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_5px_blue]"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_5px_yellow]"></div>
            </div>
          </div>
        )}

        {arcadeItems.includes('racing') && (
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-40 h-56 bg-emerald-900 border-4 border-emerald-950 rounded-t-xl shadow-2xl flex flex-col items-center">
            <div className="w-full h-12 bg-emerald-800 rounded-t-lg border-b-4 border-emerald-950 flex items-center justify-center"><div className="text-white font-bold text-xs animate-pulse">RACER X</div></div>
            <div className="w-36 h-20 bg-black mt-2 border-4 border-zinc-800 rounded shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]"></div>
            <div className="w-20 h-20 rounded-full border-4 border-zinc-700 mt-2 flex items-center justify-center">
              <div className="w-4 h-4 bg-zinc-800 rounded-full"></div>
            </div>
          </div>
        )}
      </div>
      
      {arcadeItems.length === 0 && (
        <div className="relative z-10 bg-black/50 p-8 rounded-2xl backdrop-blur-sm border border-white/10 text-center">
          <Gamepad2 className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-2">Your Arcade is Empty!</h2>
          <p className="text-zinc-300 max-w-md">Go back to your computer and buy some arcade machines from the Real Estate app.</p>
        </div>
      )}
    </div>
  );
}

type AppType = 'image' | 'search' | 'work' | 'store' | 'youtube' | null;

function ComputerOS({ money, setMoney, hasArcade, setHasArcade, arcadeItems, setArcadeItems, subs, setSubs, games, setGames }: any) {
  const [activeApp, setActiveApp] = useState<AppType>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-teal-900 flex flex-col relative text-zinc-100 font-sans">
      <div className="flex-1 p-4 flex flex-wrap gap-4 items-start content-start">
        <button 
          onDoubleClick={() => setActiveApp('image')}
          onClick={() => setActiveApp('image')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg group w-24"
        >
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-center drop-shadow-md">Image Gen</span>
        </button>

        <button 
          onDoubleClick={() => setActiveApp('search')}
          onClick={() => setActiveApp('search')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg group w-24"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Search className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-center drop-shadow-md">Web Search</span>
        </button>

        <button 
          onDoubleClick={() => setActiveApp('work')}
          onClick={() => setActiveApp('work')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg group w-24"
        >
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-center drop-shadow-md">Freelance</span>
        </button>

        <button 
          onDoubleClick={() => setActiveApp('store')}
          onClick={() => setActiveApp('store')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg group w-24"
        >
          <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-center drop-shadow-md">Real Estate</span>
        </button>

        <button 
          onDoubleClick={() => setActiveApp('youtube')}
          onClick={() => setActiveApp('youtube')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg group w-24"
        >
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Video className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-center drop-shadow-md">YouTuber</span>
        </button>
      </div>

      <AnimatePresence>
        {activeApp === 'image' && (
          <Window title="Image Generator" onClose={() => setActiveApp(null)}>
            <ImageGenApp />
          </Window>
        )}
        {activeApp === 'search' && (
          <Window title="Web Search" onClose={() => setActiveApp(null)}>
            <SearchApp />
          </Window>
        )}
        {activeApp === 'work' && (
          <Window title="Freelance Portal" onClose={() => setActiveApp(null)}>
            <WorkApp money={money} setMoney={setMoney} />
          </Window>
        )}
        {activeApp === 'store' && (
          <Window title="Real Estate" onClose={() => setActiveApp(null)}>
            <StoreApp money={money} setMoney={setMoney} hasArcade={hasArcade} setHasArcade={setHasArcade} arcadeItems={arcadeItems} setArcadeItems={setArcadeItems} />
          </Window>
        )}
        {activeApp === 'youtube' && (
          <Window title="YouTuber Life" onClose={() => setActiveApp(null)}>
            <YouTubeApp money={money} setMoney={setMoney} subs={subs} setSubs={setSubs} games={games} setGames={setGames} />
          </Window>
        )}
      </AnimatePresence>

      <div className="h-10 bg-zinc-900/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <button className="w-6 h-6 bg-white/20 rounded-sm flex items-center justify-center hover:bg-white/30">
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          </button>
          {activeApp && (
            <div className="px-3 py-1 bg-white/10 rounded text-xs border-b-2 border-blue-400">
              {activeApp === 'image' && 'Image Generator'}
              {activeApp === 'search' && 'Web Search'}
              {activeApp === 'work' && 'Freelance Portal'}
              {activeApp === 'store' && 'Real Estate'}
              {activeApp === 'youtube' && 'YouTuber Life'}
            </div>
          )}
        </div>
        <div className="text-xs font-mono">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function Room({ money, setMoney, hasArcade, setHasArcade, arcadeItems, setArcadeItems, setCurrentLocation, subs, setSubs, games, setGames }: any) {
  const [isSleeping, setIsSleeping] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);

  const handleSleep = () => {
    setIsSleeping(true);
    setTimeout(() => {
      setIsSleeping(false);
    }, 2000);
  };

  if (zoomedIn) {
    return (
      <div className="relative w-full h-screen bg-stone-900 flex items-center justify-center">
        <button onClick={() => setZoomedIn(false)} className="absolute top-4 left-4 z-50 bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 flex items-center gap-2">
          <X className="w-4 h-4" /> Back to Room
        </button>
        <div className="w-[1000px] h-[650px] bg-zinc-900 rounded-xl border-[12px] border-zinc-800 shadow-2xl flex flex-col relative">
          <div className="flex-1 bg-black overflow-hidden relative rounded-sm">
            <ComputerOS money={money} setMoney={setMoney} hasArcade={hasArcade} setHasArcade={setHasArcade} arcadeItems={arcadeItems} setArcadeItems={setArcadeItems} subs={subs} setSubs={setSubs} games={games} setGames={setGames} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-stone-800 overflow-hidden flex items-end justify-center font-sans pb-20">
      {/* Background walls */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2/3 bg-stone-700 border-b-8 border-stone-900"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-stone-800"></div>
      </div>

      {/* Bed */}
      <div 
        onClick={handleSleep}
        className="absolute bottom-20 left-20 w-64 h-40 bg-indigo-900 rounded-lg border-4 border-indigo-950 shadow-xl cursor-pointer hover:brightness-110 transition-all group flex items-end p-4"
      >
        <div className="absolute top-4 left-4 w-20 h-12 bg-white/80 rounded-full"></div>
        <div className="w-full h-24 bg-indigo-600 rounded-t-xl border-t-4 border-indigo-500"></div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Click to Sleep
        </div>
      </div>

      {/* Desk & Computer */}
      <div className="relative z-10 flex flex-col items-center">
        <div 
          onClick={() => setZoomedIn(true)}
          className="w-96 h-64 bg-zinc-900 rounded-xl border-[8px] border-zinc-800 shadow-2xl flex flex-col relative cursor-pointer hover:scale-105 transition-transform group"
        >
          <div className="flex-1 bg-teal-900 overflow-hidden relative rounded-sm flex items-center justify-center">
            <div className="text-white font-bold opacity-50">CLICK TO USE COMPUTER</div>
          </div>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Use Computer
          </div>
        </div>
        <div className="w-16 h-12 bg-zinc-700 border-x-4 border-zinc-800"></div>
        <div className="w-80 h-4 bg-amber-800 rounded-t-lg"></div>
        <div className="w-72 h-32 bg-amber-900/50 border-x-4 border-amber-950/30"></div>
      </div>

      {/* Car / Garage Door */}
      <div 
        onClick={() => {
          if (hasArcade) {
            setCurrentLocation('arcade');
          } else {
            alert("You need to buy the arcade first from the Real Estate app!");
          }
        }}
        className="absolute bottom-20 right-20 w-72 h-64 bg-zinc-800 rounded-t-xl border-4 border-zinc-900 shadow-xl cursor-pointer hover:brightness-110 transition-all group flex flex-col items-center justify-end overflow-hidden"
      >
        <div className="w-full h-full absolute top-0 left-0 flex flex-col justify-between py-2 opacity-30">
          {[...Array(6)].map((_, i) => <div key={i} className="w-full h-1 bg-black"></div>)}
        </div>
        <div className="relative z-10 w-48 h-24 bg-red-600 rounded-t-3xl border-4 border-red-800 mb-4 flex justify-center">
          <div className="w-32 h-10 bg-sky-200/50 mt-2 rounded-t-xl border-2 border-zinc-800"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {hasArcade ? "Drive to Arcade" : "Buy Arcade First"}
        </div>
      </div>

      {/* Sleep overlay */}
      <AnimatePresence>
        {isSleeping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white"
          >
            <div className="text-4xl mb-4">Zzz...</div>
            <div className="text-zinc-500">Resting and advancing time...</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [money, setMoney] = useState(0);
  const [hasArcade, setHasArcade] = useState(false);
  const [arcadeItems, setArcadeItems] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<'room' | 'arcade'>('room');
  const [subs, setSubs] = useState(0);
  const [games, setGames] = useState<string[]>([]);

  return (
    <>
      {!ready ? (
        <ApiKeyCheck onReady={() => setReady(true)} />
      ) : (
        <div className="relative w-full h-screen">
          <div className="absolute top-4 right-4 z-50 flex gap-4">
            <div className="bg-zinc-900/80 backdrop-blur text-green-400 px-4 py-2 rounded-xl border border-zinc-700 font-mono text-xl shadow-lg flex items-center gap-2">
              <span className="text-zinc-500 text-sm">BANK:</span> ${money}
            </div>
            {currentLocation === 'arcade' && (
              <button 
                onClick={() => setCurrentLocation('room')}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
              >
                <Map className="w-5 h-5" />
                Go Home
              </button>
            )}
          </div>

          {currentLocation === 'room' ? (
            <Room money={money} setMoney={setMoney} hasArcade={hasArcade} setHasArcade={setHasArcade} arcadeItems={arcadeItems} setArcadeItems={setArcadeItems} setCurrentLocation={setCurrentLocation} subs={subs} setSubs={setSubs} games={games} setGames={setGames} />
          ) : (
            <ArcadeRoom arcadeItems={arcadeItems} />
          )}
        </div>
      )}
    </>
  );
}
