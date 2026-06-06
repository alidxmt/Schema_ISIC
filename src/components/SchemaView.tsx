import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Copy, 
  Sparkles, 
  Check, 
  HelpCircle, 
  FileJson, 
  Table, 
  Cpu, 
  AlertCircle,
  FileSpreadsheet,
  Globe,
  Layers,
  Code
} from 'lucide-react';
import { Lineage, SchemaSpecification } from '../types';
import { Language, UI_TRANSLATIONS } from '../utils/translations';

interface SchemaViewProps {
  selectedEntityId: string | null;
  lineage: any; // Contains the full details of active path
  language: Language;
}

export default function SchemaView({ selectedEntityId, lineage, language }: SchemaViewProps) {
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<SchemaSpecification | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const t = UI_TRANSLATIONS[language];

  // Reassuring messages during code/schema synthesis
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const loadingMessages = t.loadingMessages;

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setLoadingMessageIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading, loadingMessages.length]);

  // Clean state when active entity changes
  React.useEffect(() => {
    setSchema(null);
    setErrorMsg(null);
  }, [selectedEntityId]);

  const generateSchema = async () => {
    if (!lineage) return;
    setLoading(true);
    setErrorMsg(null);
    setSchema(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityName: lineage.entity_name,
          divisionLabel: lineage.division_label,
          classLabel: lineage.class_label,
          entityDescription: lineage.entity_description,
          entityType: lineage.entity_type,
          classCode: lineage.class_code,
          language: language // Pass chosen language code to backend
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI Architect backend.");
      }

      // Add extra ISIC contexts if returned object misses them
      const fullSchema: SchemaSpecification = {
        entityName: data.entityName || lineage.entity_name,
        isicClass: lineage.class_label,
        isicCode: lineage.class_code,
        divisionLabel: lineage.division_label,
        classLabel: lineage.class_label,
        architectureNotes: data.architectureNotes || "No notes generated.",
        fields: data.fields || []
      };

      setSchema(fullSchema);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!schema) return;
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportJSON = () => {
    if (!schema) return;
    const jsonStr = JSON.stringify(schema, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.entityName.toLowerCase().replace(/\s+/g, '_')}_schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!schema || !schema.fields) return;
    
    // Construct CSV rows
    const headers = [t.colName, t.colSqlType, t.colDesc, t.colMock, t.colConstraints];
    const rows = schema.fields.map(f => [
      f.fieldName,
      f.dataType,
      f.description,
      f.exampleValue,
      f.constraints
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.entityName.toLowerCase().replace(/\s+/g, '_')}_fields.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to color/style SQL Types
  const getTypeColorClass = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('UUID') || t.includes('PRIMARY')) return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50';
    if (t.includes('TIMESTAMP') || t.includes('DATE')) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
    if (t.includes('VARCHAR') || t.includes('TEXT')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
    if (t.includes('INT') || t.includes('NUMBER') || t.includes('DECIMAL') || t.includes('NUMERIC')) return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
    if (t.includes('BOOLEAN') || t.includes('BOOL')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
    return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-800';
  };

  const isRtl = language === 'pe';

  const getTranslatedType = (type: string) => {
    if (type === 'Operations Log') return language === 'pe' ? 'لاگ عملیات' : language === 'de' ? 'Betriebsprotokoll' : 'Operations Log';
    if (type === 'Inventory Tracker') return language === 'pe' ? 'ردیاب موجودی' : language === 'de' ? 'Bestands-Tracker' : 'Inventory Tracker';
    return language === 'pe' ? 'لاگ کیفیت' : language === 'de' ? 'Qualitätsprotokoll' : 'Quality Log';
  };

  if (!selectedEntityId || !lineage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050506] p-8 text-center" id="empty-state">
        <div className="max-w-md space-y-5">
          <div className="w-16 h-16 rounded-full bg-zinc-900/60 border border-white/[0.08] flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.04)]">
            <Layers className="w-6 h-6 stroke-1" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{t.emptySelectTitle}</h2>
            <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
              {t.emptySelectDesc}
            </p>
          </div>
          <div className="pt-5 border-t border-white/[0.06] flex justify-center items-center gap-6 text-[10px] text-zinc-550 font-mono tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-650" />
              {t.emptyRelationalLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-zinc-650" />
              {t.emptyDdlLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050506] text-zinc-300 overflow-hidden" id="workspace">
      {/* Header breadcrumbs */}
      <div className="shrink-0 p-5 bg-[#0a0a0d] border-b border-white/[0.07] flex flex-col gap-2" id="workspace-header">
        <div className={`flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-zinc-500 tracking-wider uppercase`}>
          <span>{t.breadcrumbsSect} {lineage.section_code}</span>
          <span className="text-zinc-700">&gt;</span>
          <span className="truncate max-w-[120px]" title={lineage.division_label}>{t.breadcrumbsDiv} {lineage.division_code}</span>
          <span className="text-zinc-700">&gt;</span>
          <span className="truncate max-w-[120px]" title={lineage.group_label}>{t.breadcrumbsGrp} {lineage.group_code}</span>
          <span className="text-zinc-700">&gt;</span>
          <span className="text-amber-500/90 truncate max-w-[150px]" title={lineage.class_label}>{t.breadcrumbsClass} {lineage.class_code}</span>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white tracking-wide uppercase">{lineage.entity_name}</h2>
          <span className="text-[9px] bg-white/[0.03] px-2.5 py-0.5 rounded border border-white/[0.08] text-zinc-400 font-mono tracking-wider uppercase">
            {getTranslatedType(lineage.entity_type)}
          </span>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" id="workspace-content">
        
        {/* Active entity info card */}
        <div className={`bg-[#0c0c10]/90 border border-white/[0.07] rounded-xl p-5 space-y-3.5 shadow-xl transition-all hover:border-white/[0.12] ${isRtl ? 'text-right' : 'text-left'}`} id="entity-info-card">
          <div className="flex items-start gap-3.5">
            <div className={`p-2 bg-amber-500/10 text-amber-455 rounded border border-amber-500/20 shrink-0`}>
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[9px] text-amber-450 font-mono tracking-wider font-semibold uppercase">{t.classificationBadge}</span>
              <h3 className="text-xs font-semibold text-white font-mono mt-0.5 uppercase tracking-wide">{lineage.class_label}</h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                {lineage.entity_description}
              </p>
            </div>
          </div>
        </div>

        {/* Action center (Pre-generation or Loading) */}
        {!schema && !loading && (
          <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-b from-white/[0.01] to-transparent border border-dashed border-white/[0.08] rounded-xl space-y-5" id="generate-panel">
            <Sparkles className="w-7 h-7 text-amber-400" />
            <div className="text-center space-y-1.5 px-4">
              <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">{t.noStructureTitle}</h4>
              <p className="text-[11px] text-zinc-550 max-w-sm leading-relaxed">
                {t.noStructureDesc}
              </p>
            </div>

            <button
              id="btn-generate-spec"
              onClick={generateSchema}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded shadow-lg hover:shadow-amber-500/10 transition-all font-sans cursor-pointer group active:scale-97"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              {t.btnGenerateSchema}
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-5" id="schema-loader">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 border border-amber-500/30 border-t-amber-400 rounded-full animate-spin"></div>
              <Cpu className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <span className="text-xs font-medium text-zinc-300 tracking-wide">{loadingMessages[loadingMessageIdx]}</span>
              <p className="text-[9px] text-zinc-550 font-mono uppercase tracking-wider">{t.loadingSubtitle}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed" id="api-error">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-white uppercase tracking-wider text-[10px]">{t.errorTitle}</p>
              <p>{errorMsg}</p>
              {errorMsg.toLowerCase().includes('gemini_api_key') && (
                <div className="bg-black/50 p-3 rounded border border-white/[0.05] text-[10px] text-zinc-450 mt-2.5 space-y-1.5">
                  <p className="font-semibold text-amber-400 uppercase tracking-wider text-[9px]">{t.errorRequired}</p>
                  <p>{t.errorStep1}</p>
                  <p>{t.errorStep2}</p>
                  <p>{t.errorStep3}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generated Schema Display */}
        {schema && (
          <div className="space-y-6 animate-fade-in" id="schema-payload">
            
            {/* Architecture guidelines */}
            <div className="bg-amber-500/[0.02] border border-amber-500/[0.08] rounded-xl p-5 space-y-2.5 shadow-[inset_0_1px_3px_rgba(251,191,36,0.01)]" id="architecture-notes">
              <div className={`flex items-center gap-1.5 text-amber-400 text-[10px] font-mono font-semibold tracking-wider uppercase`}>
                <Cpu className="w-3.5 h-3.5" />
                {t.notesTitle}
              </div>
              <p className={`text-xs text-zinc-455 leading-relaxed font-sans ${isRtl ? 'text-right' : 'text-left'}`}>
                {schema.architectureNotes}
              </p>
            </div>

            {/* Generated Stats overview */}
            <div className="flex items-center justify-between text-[10px] font-mono bg-[#0c0c10] p-3.5 rounded-lg border border-white/[0.06] px-4">
              <div className="flex items-center gap-4 text-zinc-400">
                <span>{t.tableLabel}: <code className="text-white font-semibold bg-black/60 px-2 py-0.5 rounded border border-white/[0.05]">{schema.entityName}</code></span>
                <span className="text-zinc-700">|</span>
                <span>{t.attributesLabel}: <span className="text-amber-400 font-semibold">{schema.fields?.length || 0}</span></span>
              </div>
              <span className="text-[9px] text-zinc-550 bg-white/[0.03] px-2 py-0.5 rounded uppercase tracking-wider">{t.indexCoherentBadge}</span>
            </div>

            {/* Fields table */}
            <div className="border border-white/[0.07] rounded-xl overflow-hidden bg-black/35 shadow-2xl" id="fields-table-container">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse" id="fields-table">
                  <thead>
                    <tr className="bg-[#0a0a0d] text-zinc-500 text-[9px] uppercase font-mono tracking-wider border-b border-white/[0.07]">
                      <th className="py-3 px-4 font-semibold">{t.colName}</th>
                      <th className="py-3 px-3 font-semibold">{t.colSqlType}</th>
                      <th className="py-3 px-4 font-semibold">{t.colConstraints}</th>
                      <th className="py-3 px-4 font-semibold">{t.colDesc}</th>
                      <th className="py-3 px-3 font-semibold">{t.colMock}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {schema.fields && schema.fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-white select-all text-left">
                          {f.fieldName}
                        </td>
                        <td className="py-3.5 px-3 text-left">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-mono leading-none font-medium uppercase ${getTypeColorClass(f.dataType)}`}>
                            {f.dataType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          {f.constraints ? (
                            <code className="text-zinc-400 font-mono text-[9px] bg-black/30 px-1.5 py-0.5 rounded border border-white/[0.04] leading-normal max-w-[150px] inline-block truncate" title={f.constraints}>
                              {f.constraints}
                            </code>
                          ) : (
                            <span className="text-zinc-650">-</span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-zinc-455 leading-relaxed max-w-xs font-sans ${isRtl ? 'text-right' : 'text-left'}`}>
                          {f.description}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[10px] text-amber-500 text-left">
                          {f.exampleValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Action checklist or hint */}
            <div className="text-[10px] text-zinc-650 font-mono text-center flex items-center justify-center gap-1.5 uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-700" />
              {t.tipText}
            </div>

          </div>
        )}

      </div>

      {/* Export Action Bar Footer */}
      {schema && (
        <div className="shrink-0 p-4 bg-[#0a0a0d] border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3" id="workspace-footer">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-wider text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{t.reconciledBadge}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              id="btn-copy-clipboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-zinc-350 hover:text-white rounded text-xs font-medium transition-all active:scale-95 cursor-pointer uppercase tracking-wide"
              title="Copy JSON specification to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {t.btnCopied}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {t.btnCopyJson}
                </>
              )}
            </button>

            <button
              onClick={exportJSON}
              id="btn-export-json"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-zinc-350 hover:text-white rounded text-xs font-medium transition-all active:scale-95 cursor-pointer uppercase tracking-wide text-zinc-350 hover:text-white"
              title="Export JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-500" />
              {t.btnExportJson}
            </button>

            <button
              onClick={exportCSV}
              id="btn-export-csv"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] text-zinc-350 hover:text-white rounded text-xs font-medium transition-all active:scale-95 cursor-pointer uppercase tracking-wide text-zinc-350 hover:text-white"
              title="Export CSV"
            >
              <Table className="w-3.5 h-3.5 text-emerald-500" />
              {t.btnExportCsv}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
