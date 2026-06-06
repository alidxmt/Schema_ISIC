import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  X, 
  Database,
  Layers,
  FolderOpen,
  Settings,
  HelpCircle,
  FileSpreadsheet,
  Network
} from 'lucide-react';
import { 
  ISICSectionNode, 
  ISICDivisionNode, 
  ISICGroupNode, 
  ISICClassNode, 
  ISICEntity,
  Lineage
} from '../types';
import { findLineage } from '../utils/csvParser';
import { Language, UI_TRANSLATIONS } from '../utils/translations';

interface SidebarTreeProps {
  treeData: ISICSectionNode[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string, lineage: Lineage) => void;
  language: Language;
}

export default function SidebarTree({ 
  treeData, 
  selectedEntityId, 
  onSelectEntity,
  language
}: SidebarTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const t = UI_TRANSLATIONS[language];

  // Track open state for Section/Division/Group/Class nodes
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if a query matches a text string
  const matchesQuery = (text: string, query: string) => {
    return text.toLowerCase().includes(query.toLowerCase());
  };

  // Filter and auto-calculate expansions
  const { filteredTree, counts } = useMemo(() => {
    let matchCount = 0;
    let totalEntities = 0;
    const query = searchQuery.trim();

    if (!query) {
      // Count total entities in raw data
      treeData.forEach(s => {
        s.children.forEach(d => {
          d.children.forEach(g => {
            g.children.forEach(c => {
              totalEntities += c.children.length;
            });
          });
        });
      });
      return { filteredTree: treeData, counts: { total: totalEntities, matched: totalEntities, isSearching: false } };
    }

    const autoExpands: Record<string, boolean> = {};
    const filtered: ISICSectionNode[] = [];

    treeData.forEach(sec => {
      let secMatches = false;
      const matchedDivisions: ISICDivisionNode[] = [];

      sec.children.forEach(div => {
        let divMatches = false;
        const matchedGroups: ISICGroupNode[] = [];

        div.children.forEach(grp => {
          let grpMatches = false;
          const matchedClasses: ISICClassNode[] = [];

          grp.children.forEach(cls => {
            let clsMatches = false;
            const matchedEntities: ISICEntity[] = [];

            // Class matching or child entity matching
            const classText = `${cls.code} ${cls.label}`;
            const classHasQuery = matchesQuery(classText, query);

            cls.children.forEach(entity => {
              const entityText = `${entity.name} ${entity.description} ${entity.type}`;
              if (classHasQuery || matchesQuery(entityText, query)) {
                matchedEntities.push(entity);
                matchCount++;
              }
            });

            if (matchedEntities.length > 0) {
              clsMatches = true;
              matchedClasses.push({
                ...cls,
                children: matchedEntities
              });
              // Auto expand parent class
              autoExpands[`cls-${cls.code}`] = true;
            }
          });

          const groupText = `${grp.code} ${grp.label}`;
          if (matchedClasses.length > 0 || matchesQuery(groupText, query)) {
            // If class didn't filter but group matches, we could show all.
            // But we filter leaves, so if group matches, let's keep all elements of that group.
            let classesToKeep = matchedClasses;
            if (matchedClasses.length === 0 && matchesQuery(groupText, query)) {
              grp.children.forEach(cls => {
                matchedClasses.push(cls);
                matchCount += cls.children.length;
              });
              classesToKeep = grp.children;
            }

            if (classesToKeep.length > 0) {
              grpMatches = true;
              matchedGroups.push({
                ...grp,
                children: classesToKeep
              });
              autoExpands[`grp-${grp.code}`] = true;
            }
          }
        });

        const divisionText = `${div.code} ${div.label}`;
        if (matchedGroups.length > 0 || matchesQuery(divisionText, query)) {
          let groupsToKeep = matchedGroups;
          if (matchedGroups.length === 0 && matchesQuery(divisionText, query)) {
            div.children.forEach(grp => {
              matchedGroups.push(grp);
              grp.children.forEach(cls => {
                matchCount += cls.children.length;
              });
            });
            groupsToKeep = div.children;
          }

          if (groupsToKeep.length > 0) {
            divMatches = true;
            matchedDivisions.push({
              ...div,
              children: groupsToKeep
            });
            autoExpands[`div-${div.code}`] = true;
          }
        }
      });

      const sectionText = `${sec.code} ${sec.label}`;
      if (matchedDivisions.length > 0 || matchesQuery(sectionText, query)) {
        let divisionsToKeep = matchedDivisions;
        if (matchedDivisions.length === 0 && matchesQuery(sectionText, query)) {
          sec.children.forEach(div => {
            matchedDivisions.push(div);
            div.children.forEach(g => {
              g.children.forEach(c => {
                matchCount += c.children.length;
              });
            });
          });
          divisionsToKeep = sec.children;
        }

        if (divisionsToKeep.length > 0) {
          secMatches = true;
          filtered.push({
            ...sec,
            children: divisionsToKeep
          });
          autoExpands[`sec-${sec.code}`] = true;
        }
      }
    });

    // Merge computed auto-expanded keys
    setTimeout(() => {
      setExpandedKeys(prev => ({ ...prev, ...autoExpands }));
    }, 0);

    return { 
      filteredTree: filtered, 
      counts: { total: treeData.length, matched: matchCount, isSearching: true } 
    };
  }, [treeData, searchQuery]);

  // Clean the search query
  const clearSearch = () => {
    setSearchQuery('');
    setExpandedKeys({});
  };

  const handleEntityClick = (entityId: string) => {
    const lineage = findLineage('', entityId, language);
    if (lineage) {
      onSelectEntity(entityId, lineage);
    }
  };

  const currentDir = language === 'pe' ? 'rtl' : 'ltr';

  const getTranslatedType = (type: string) => {
    if (type === 'Operations Log') return language === 'pe' ? 'لاگ عملیات' : language === 'de' ? 'Betriebsprotokoll' : 'Operations Log';
    if (type === 'Inventory Tracker') return language === 'pe' ? 'ردیاب موجودی' : language === 'de' ? 'Bestands-Tracker' : 'Inventory Tracker';
    return language === 'pe' ? 'لاگ کیفیت' : language === 'de' ? 'Qualitätsprotokoll' : 'Quality Log';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0d] border-r border-white/[0.07] text-zinc-400 w-full" id="sidebar-panel">
      {/* Search Header */}
      <div className="p-4 border-b border-white/[0.07] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1 px-1.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.03)]">
            <Network className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-wide text-xs uppercase">{t.taxonomyTitle}</h1>
            <p className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase">{t.taxonomySubtitle}</p>
          </div>
        </div>

        {/* Input component */}
        <div className="relative">
          <Search className={`absolute ${currentDir === 'rtl' ? 'right-3' : 'left-3'} top-2.5 h-4 w-4 text-zinc-500`} />
          <input
            id="isic-search"
            type="text"
            className={`w-full py-1.5 bg-black/40 border border-white/[0.07] hover:border-white/[0.12] focus:border-amber-550 focus:ring-1 focus:ring-amber-550 rounded text-xs text-white placeholder-zinc-650 focus:outline-none transition-all font-sans ${currentDir === 'rtl' ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className={`absolute top-2.5 text-zinc-550 hover:text-zinc-350 transition-colors cursor-pointer ${currentDir === 'rtl' ? 'left-2.5' : 'right-2.5'}`}
              title="Clear Quick search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results indicator */}
        <div className="flex items-center justify-between text-[10px] text-zinc-550 font-mono tracking-wider uppercase">
          <span>{t.targetingLabel}</span>
          <span>
            {counts.isSearching ? (
              <span className="text-amber-400 font-medium">{counts.matched} {t.matchingItems}</span>
            ) : (
              <span>{t.hierarchyReady}</span>
            )}
          </span>
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 custom-scrollbar select-none" id="sidebar-tree-container">
        {filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Layers className="w-8 h-8 text-zinc-750 mb-3 stroke-1" />
            <span className="text-xs font-medium text-zinc-550 uppercase tracking-wider">{t.noMatches}</span>
            <span className="text-[10px] text-zinc-600 mt-1.5 max-w-[210px]">{t.tryKeywords}</span>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map((sec) => {
              const secKey = `sec-${sec.code}`;
              const isSecExpanded = !!expandedKeys[secKey];
              return (
                <div key={sec.code} className="space-y-1 animate-fade-in">
                  {/* Section Head */}
                  <div 
                    onClick={() => toggleExpand(secKey)}
                    className="flex items-start gap-1.5 p-1.5 hover:bg-white/[0.03] rounded cursor-pointer group transition-all text-zinc-300 hover:text-white"
                  >
                    <span className="mt-0.5 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      {isSecExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <div className="text-[11px] leading-relaxed">
                      <span className={`font-mono bg-black/60 px-1 py-0.5 rounded text-amber-400 font-bold border border-white/[0.05] align-middle ${currentDir === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`}>
                        {t.breadcrumbsSect} {sec.code}
                      </span>
                      <span className="font-medium inline-block align-middle">{sec.label}</span>
                    </div>
                  </div>

                  {/* Divisions children */}
                  {isSecExpanded && (
                    <div className={`space-y-1 ${currentDir === 'rtl' ? 'mr-3 pr-2.5 border-r border-white/[0.05]' : 'ml-3 pl-2.5 border-l border-white/[0.05]'}`}>
                      {sec.children.map((div) => {
                        const divKey = `div-${div.code}`;
                        const isDivExpanded = !!expandedKeys[divKey];
                        return (
                          <div key={div.code} className="space-y-1">
                            {/* Division Head */}
                            <div 
                              onClick={() => toggleExpand(divKey)}
                              className="flex items-start gap-1.5 p-1.5 hover:bg-white/[0.03] rounded cursor-pointer group transition-all text-zinc-400 hover:text-zinc-200"
                            >
                              <span className="mt-0.5 text-zinc-700 group-hover:text-zinc-500 transition-colors">
                                {isDivExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </span>
                              <div className="text-[11px]">
                                <span className={`font-mono text-zinc-550 ${currentDir === 'rtl' ? 'ml-1' : 'mr-1'}`}>
                                  {t.breadcrumbsDiv} {div.code} —
                                </span>
                                <span>{div.label}</span>
                              </div>
                            </div>

                            {/* Groups children */}
                            {isDivExpanded && (
                              <div className={`space-y-1 ${currentDir === 'rtl' ? 'mr-2.5 pr-2 border-r border-white/[0.04]' : 'ml-2.5 pl-2 border-l border-white/[0.04]'}`}>
                                {div.children.map((grp) => {
                                  const grpKey = `grp-${grp.code}`;
                                  const isGrpExpanded = !!expandedKeys[grpKey];
                                  return (
                                    <div key={grp.code} className="space-y-1">
                                      {/* Group Head */}
                                      <div 
                                        onClick={() => toggleExpand(grpKey)}
                                        className="flex items-start gap-1.5 p-1.5 hover:bg-white/[0.03] rounded cursor-pointer group transition-all text-zinc-400 hover:text-zinc-200"
                                      >
                                        <span className="mt-0.5 text-zinc-700 group-hover:text-zinc-500 transition-colors">
                                          {isGrpExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </span>
                                        <div className="text-[10px]">
                                          <span className={`font-mono text-amber-500/70 ${currentDir === 'rtl' ? 'ml-1' : 'mr-1'}`}>
                                            {t.breadcrumbsGrp} {grp.code} —
                                          </span>
                                          <span>{grp.label}</span>
                                        </div>
                                      </div>

                                      {/* Classes children */}
                                      {isGrpExpanded && (
                                        <div className={`space-y-1 ${currentDir === 'rtl' ? 'mr-2 pr-2 border-r border-white/[0.03]' : 'ml-2 pl-2 border-l border-white/[0.03]'}`}>
                                          {grp.children.map((cls) => {
                                            const clsKey = `cls-${cls.code}`;
                                            const isClsExpanded = !!expandedKeys[clsKey];
                                            return (
                                              <div key={cls.code} className="space-y-0.5">
                                                {/* Class Head */}
                                                <div 
                                                  onClick={() => toggleExpand(clsKey)}
                                                  className="flex items-start gap-1 p-1 py-1 px-1.5 bg-white/[0.01] hover:bg-white/[0.04] rounded text-zinc-450 hover:text-zinc-200 cursor-pointer transition-all border border-transparent hover:border-white/[0.05]"
                                                >
                                                  <span className="mt-0.5 text-zinc-700">
                                                    {isClsExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                                  </span>
                                                  <div className="text-[10px] leading-tight flex items-center flex-wrap gap-1">
                                                    <span className={`font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/10 text-[9px] ${currentDir === 'rtl' ? 'ml-0.5' : 'mr-0.5'}`}>
                                                      {t.breadcrumbsClass} {cls.code}
                                                    </span>
                                                    <span>{cls.label}</span>
                                                  </div>
                                                </div>

                                                {/* Leaves children (Entities) */}
                                                {isClsExpanded && (
                                                  <div className={`py-1 space-y-0.5 ${currentDir === 'rtl' ? 'mr-1 pr-2 border-r border-white/[0.06]' : 'ml-1 pl-2 border-l border-white/[0.06]'}`}>
                                                    {cls.children.map((ent) => {
                                                      const isSelected = selectedEntityId === ent.id;
                                                      return (
                                                        <div
                                                          key={ent.id}
                                                          id={`node-${ent.id}`}
                                                          onClick={() => handleEntityClick(ent.id)}
                                                          className={`flex items-start gap-2 p-1.5 px-2 rounded cursor-pointer transition-all ${
                                                            isSelected 
                                                              ? 'bg-amber-500/10 text-amber-250 font-medium border-l-2 border-amber-500 shadow-lg shadow-black/60' 
                                                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border-l-2 border-transparent'
                                                          }`}
                                                        >
                                                          <Database className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-700'}`} />
                                                          <div className="flex flex-col text-[10px] leading-none">
                                                            <span className="font-sans leading-tight">{ent.name.split(' - ')[1] || ent.name}</span>
                                                            <span className="text-[8px] text-zinc-650 mt-1 uppercase font-mono tracking-wider">{getTranslatedType(ent.type)}</span>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helper Footer */}
      <div className="p-3 border-t border-white/[0.07] bg-black/40 text-[9px] text-zinc-550 flex items-center justify-between font-mono tracking-wider">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-600" />
          {t.taxonomyLevelsText}
        </span>
        <span className="text-zinc-650">{t.taxonomyStandardText}</span>
      </div>
    </div>
  );
}
