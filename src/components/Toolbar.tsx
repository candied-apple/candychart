import { useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileCode2,
  Maximize2,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isRunning = status === "running";
  const isWaiting = status === "waiting_input";

  return (
    <header className="h-14 shrink-0 border-b border-neutral-800 bg-neutral-900 text-neutral-100 px-4 flex items-center justify-between gap-3 select-none z-30">
      {/* Left: Brand & Templates */}
      <div className="flex items-center gap-3 min-w-0">
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
            onClick={() => setTplOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            <FileCode2 className="h-3.5 w-3.5 text-neutral-300" />
            <span>Örnek Şablonlar</span>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          </button>

          {tplOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setTplOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-80 rounded-xl border border-neutral-700 bg-neutral-800 p-1.5 shadow-xl z-50">
                {FLOWCHART_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      setTplOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
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

        {/* Canvas Utilities */}
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
      </div>

      {/* Right: Execution Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {errorCount > 0 && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
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
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
        >
          <StepForward className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Adım At</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={status === "idle"}
          title="Çalıştırmayı Sıfırla"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
          <span className="hidden md:inline">Sıfırla</span>
        </button>

        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || isWaiting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isRunning ? "Çalışıyor..." : "Çalıştır"}</span>
        </button>
      </div>
    </header>
  );
}
