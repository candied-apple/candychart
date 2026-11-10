import { useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileCode2,
  Maximize2,
  MoreVertical,
  Play,
  RotateCcw,
  StepForward,
  Upload,
  Workflow,
  Zap,
} from "lucide-react";
import { FLOWCHART_TEMPLATES } from "../data/templates";
import type { ExecutionStatus, FlowchartTemplate } from "../types/flowchart";

interface ToolbarProps {
  activeTemplateId: string;
  status: ExecutionStatus;
  animatedRun: boolean;
  errorCount: number;
  onSelectTemplate: (tpl: FlowchartTemplate) => void;
  onToggleAnimatedRun: () => void;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onFitView: () => void;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => void;
}

export function Toolbar({
  activeTemplateId,
  status,
  animatedRun,
  errorCount,
  onSelectTemplate,
  onToggleAnimatedRun,
  onRun,
  onStep,
  onReset,
  onFitView,
  onExportJson,
  onImportJson,
}: ToolbarProps) {
  const [tplOpen, setTplOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isRunning = status === "running";
  const isWaiting = status === "waiting_input";

  return (
    <header className="h-14 shrink-0 border-b border-neutral-800 bg-neutral-900 text-neutral-100 px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 select-none z-30">
      {/* Left: Brand & Templates */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 shadow-sm">
            <Workflow className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-bold tracking-tight text-white">
              CandyChart
            </div>
            <div className="text-[10px] text-neutral-400">
              Akış Şeması Programlama
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-neutral-800 hidden sm:block" />

        {/* Templates Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setTplOpen((v) => !v);
              setMoreOpen(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            <FileCode2 className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
            <span className="hidden sm:inline">Örnek Şablonlar</span>
            <span className="sm:hidden">Şablon</span>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
          </button>

          {tplOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setTplOpen(false)}
              />
              <div className="fixed sm:absolute left-3 sm:left-0 right-3 sm:right-auto top-14 sm:top-auto sm:mt-1.5 sm:w-80 max-h-[70dvh] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-800 p-1.5 shadow-xl z-50">
                {FLOWCHART_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      setTplOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      tpl.id === activeTemplateId
                        ? "bg-neutral-700 text-white border border-neutral-500"
                        : "text-neutral-200 hover:bg-neutral-700/60"
                    }`}
                  >
                    <div className="text-xs font-semibold">{tpl.name}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {tpl.description}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop / Large Tablet Canvas Utilities */}
        <div className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={onFitView}
            title="Görünümü Sığdır"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Sığdır</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            title="JSON Olarak Dışa Aktar"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Dışa Aktar</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="JSON İçe Aktar"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">İçe Aktar</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            file.text().then((txt) => onImportJson(txt));
            e.target.value = "";
          }}
        />
      </div>

      {/* Right: Execution Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {errorCount > 0 && (
          <span className="hidden lg:inline-flex items-center rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
            {errorCount} Sorun
          </span>
        )}

        <button
          type="button"
          onClick={onToggleAnimatedRun}
          title={
            animatedRun
              ? "Animasyonlu çalıştırma açık (adımları izleyebilirsiniz)"
              : "Anlık çalıştırma açık"
          }
          className={`hidden md:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            animatedRun
              ? "border-neutral-500 bg-neutral-700 text-white"
              : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>{animatedRun ? "Animasyonlu" : "Hızlı"}</span>
        </button>

        <button
          type="button"
          onClick={onStep}
          disabled={isRunning || isWaiting}
          title="Tek Adım Çalıştır"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 sm:px-3 py-1.5 min-h-[34px] text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
        >
          <StepForward className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Adım At</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={status === "idle"}
          title="Çalıştırmayı Sıfırla"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 min-h-[34px] text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
          <span className="hidden md:inline">Sıfırla</span>
        </button>

        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || isWaiting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 sm:px-4 py-1.5 min-h-[34px] text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isRunning ? "Çalışıyor..." : "Çalıştır"}</span>
        </button>

        {/* Mobile/Small Tablet More Menu */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => {
              setMoreOpen((v) => !v);
              setTplOpen(false);
            }}
            aria-label="Diğer seçenekler"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 min-h-[34px] min-w-[34px] text-neutral-300 hover:bg-neutral-700"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {moreOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMoreOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-neutral-700 bg-neutral-800 p-1.5 shadow-xl z-50 space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onToggleAnimatedRun();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-700"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Çalıştırma Modu
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-400">
                    {animatedRun ? "Animasyon" : "Hızlı"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onFitView();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-700"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Görünümü Sığdır
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportJson();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON Dışa Aktar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-neutral-200 hover:bg-neutral-700"
                >
                  <Upload className="h-3.5 w-3.5" />
                  JSON İçe Aktar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
