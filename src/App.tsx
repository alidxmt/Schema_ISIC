/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  parseISICHeadersAndTree, 
  findLineage 
} from './utils/csvParser';
import SidebarTree from './components/SidebarTree';
import SchemaView from './components/SchemaView';
import { 
  ISICSectionNode, 
  Lineage 
} from './types';
import { 
  Database, 
  HelpCircle, 
  Info,
  Globe,
  Settings,
  Cpu,
  Layers,
  X,
  FileCheck
} from 'lucide-react';
import { Language, UI_TRANSLATIONS } from './utils/translations';

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [treeData, setTreeData] = useState<ISICSectionNode[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedLineage, setSelectedLineage] = useState<any | null>(null);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(true);

  const t = UI_TRANSLATIONS[language];

  // Parse the hierarchical tree data once on mount or when language changes
  useEffect(() => {
    try {
      const data = parseISICHeadersAndTree(language);
      setTreeData(data);
      if (selectedEntityId) {
        const line = findLineage('', selectedEntityId, language);
        if (line) {
          setSelectedLineage(line);
        }
      }
    } catch (err) {
      console.error("Error parsing ISIC CSV classification:", err);
    }
  }, [language, selectedEntityId]);

  const handleSelectEntity = (entityId: string, lineage: Lineage) => {
    setSelectedEntityId(entityId);
    setSelectedLineage(lineage);
    // Dismiss help card once an item is picked
    setShowWelcomeGuide(false);
  };

  const isRtl = language === 'pe';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col h-screen bg-[#050506] font-sans text-zinc-350 antialiased overflow-hidden" id="app-root">
      
      {/* Top Main Navigation Header */}
      <header className="shrink-0 h-14 bg-[#0a0a0d]/90 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between px-6 z-10" id="main-header">
        <div className="flex items-center gap-2.5">
          <div className="p-1 px-1.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)]">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm tracking-wide uppercase">{t.appTitle}</h1>
            <p className="text-[9px] text-zinc-500 font-mono tracking-wider leading-none uppercase">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Quick shortcuts info bar */}
          <div className="hidden lg:flex items-center gap-6 text-[10px] font-mono text-zinc-400 tracking-wider">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-500/80" />
              {t.globalStandard}
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-500/80" />
              {t.schemaInterpreter}
            </span>
          </div>

          {/* Multilingual Switcher - En | De | Pe */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded">
            <button 
              onClick={() => setLanguage('en')} 
              className={`hover:text-white transition-all cursor-pointer ${language === 'en' ? 'text-amber-400 font-bold' : ''}`}
              title="English"
            >
              En
            </button>
            <span className="text-zinc-700">|</span>
            <button 
              onClick={() => setLanguage('de')} 
              className={`hover:text-white transition-all cursor-pointer ${language === 'de' ? 'text-amber-400 font-bold' : ''}`}
              title="Deutsch"
            >
              De
            </button>
            <span className="text-zinc-700">|</span>
            <button 
              onClick={() => setLanguage('pe')} 
              className={`hover:text-white transition-all cursor-pointer font-sans ${language === 'pe' ? 'text-amber-400 font-bold text-sm' : 'text-xs'}`}
              title="فارسی"
            >
              Pe
            </button>
          </div>

          <button 
            onClick={() => setShowWelcomeGuide(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-900/80 border border-transparent hover:border-white/[0.06] transition-all cursor-pointer"
            title="App Architecture Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace Area */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row" id="main-workspace-grid">
        
        {/* Left Side Tree Navigation Panel (320px wide or responsive) */}
        <div className="w-full md:w-80 h-1/2 md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.07] bg-[#08080a]">
          <SidebarTree 
            treeData={treeData}
            selectedEntityId={selectedEntityId}
            onSelectEntity={handleSelectEntity}
            language={language}
          />
        </div>

        {/* Right Side Workspace Center Panel */}
        <div className="flex-1 h-1/2 md:h-full flex flex-col relative bg-[#050506]">
          
          {/* Architect Onboarding Guide overlay card */}
          {showWelcomeGuide && (
            <div className={`absolute inset-x-6 top-6 z-20 bg-[#0d0d10] border border-white/[0.08] p-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-2xl mx-auto space-y-4 animate-fade-in ${isRtl ? 'text-right' : 'text-left'}`} id="welcome-onboarding-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4.5 h-4.5 text-amber-400" />
                  <h3 className="font-semibold text-white tracking-wide text-sm uppercase">{t.welcomeTitle}</h3>
                </div>
                <button 
                  onClick={() => setShowWelcomeGuide(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-white/[0.05] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-zinc-400 leading-relaxed space-y-3">
                <p>{t.welcomeIntro}</p>
                
                <h4 className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px] pt-1">{t.welcomeInteractTitle}</h4>
                <ul className="list-decimal pl-4.5 space-y-1.5 text-zinc-400 font-sans">
                  <li>{t.welcomeStep1}</li>
                  <li>{t.welcomeStep2}</li>
                  <li>{t.welcomeStep3}</li>
                  <li>{t.welcomeStep4}</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500/60" />
                  {t.welcomeFooter}
                </span>
                <span className="text-zinc-600">{t.welcomeFooterSub}</span>
              </div>
            </div>
          )}

          <SchemaView 
            selectedEntityId={selectedEntityId}
            lineage={selectedLineage}
            language={language}
          />
        </div>

      </div>

    </div>
  );
}
