import type { DragEvent } from "react";
import type { FlowNodeType } from "../types/flowchart";

interface PaletteItem {
  kind: FlowNodeType;
  title: string;
  subtitle: string;
  accentBg: string;
  preview: React.ReactNode;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    kind: "start",
    title: "Başlat (Oval)",
    subtitle: "Akışın başlangıç noktası",
    accentBg: "hover:border-emerald-500/50 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 64 30" className="h-7 w-14 shrink-0">
        <rect
          x="2"
          y="2"
          width="60"
          height="26"
          rx="13"
          fill="#16251f"
          stroke="#10b981"
          strokeWidth="2.2"
        />
      </svg>
    ),
  },
  {
    kind: "end",
    title: "Bitir (Oval)",
    subtitle: "Programı sonlandırır",
    accentBg: "hover:border-rose-500/50 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 64 30" className="h-7 w-14 shrink-0">
        <rect
          x="2"
          y="2"
          width="60"
          height="26"
          rx="13"
          fill="#27161a"
          stroke="#f43f5e"
          strokeWidth="2.2"
        />
      </svg>
    ),
  },
  {
    kind: "input",
    title: "Girdi / Input",
    subtitle: "Paralelkenar • Değişken alır",
    accentBg: "hover:border-orange-500/50 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 64 30" className="h-7 w-14 shrink-0">
        <polygon
          points="10,2 62,2 54,28 2,28"
          fill="#261d17"
          stroke="#fb923c"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    kind: "process",
    title: "İşlem / Process",
    subtitle: "Dikdörtgen • Hesap & atama",
    accentBg: "hover:border-neutral-400/60 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 64 30" className="h-7 w-14 shrink-0">
        <rect
          x="3"
          y="3"
          width="58"
          height="24"
          rx="4"
          fill="#262626"
          stroke="#a3a3a3"
          strokeWidth="2.2"
        />
      </svg>
    ),
  },
  {
    kind: "decision",
    title: "Karar (If-Else)",
    subtitle: "Elmas • Evet / Hayır dalı",
    accentBg: "hover:border-amber-500/50 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 64 34" className="h-8 w-14 shrink-0">
        <polygon
          points="32,2 62,17 32,32 2,17"
          fill="#262015"
          stroke="#f59e0b"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    kind: "for",
    title: "For Döngüsü",
    subtitle: "Uzun Altıgen • [i=1; i<n; i++]",
    accentBg: "hover:border-violet-400/50 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 68 30" className="h-7 w-14 shrink-0">
        <polygon
          points="10,2 58,2 66,15 58,28 10,28 2,15"
          fill="#221b2b"
          stroke="#a78bfa"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    kind: "output",
    title: "Çıktı / Output",
    subtitle: "Dalgalı Kutu • Sonuç yazdır",
    accentBg: "hover:border-teal-400/50 hover:bg-neutral-800",
    preview: (
      <svg viewBox="0 0 64 32" className="h-7 w-14 shrink-0">
        <path
          d="M 3,3 L 61,3 L 61,24 Q 46,18 32,24 Q 18,30 3,24 Z"
          fill="#162524"
          stroke="#2dd4bf"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

interface PaletteSidebarProps {
  onAddNode: (kind: FlowNodeType) => void;
}

export function PaletteSidebar({ onAddNode }: PaletteSidebarProps) {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>, kind: FlowNodeType) => {
    event.dataTransfer.setData("application/candychart-node", kind);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-800 bg-neutral-900 flex flex-col h-full select-none">
      <div className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Akış Şeması Şekilleri
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Tuvale sürükleyin veya eklemek için tıklayın
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PALETTE_ITEMS.map((item) => (
          <button
            key={item.kind}
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, item.kind)}
            onClick={() => onAddNode(item.kind)}
            className={`w-full flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-800/50 p-2.5 text-left transition-all cursor-grab active:cursor-grabbing ${item.accentBg}`}
          >
            {item.preview}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-neutral-100 truncate">
                {item.title}
              </div>
              <div className="text-[11px] text-neutral-400 truncate">
                {item.subtitle}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 text-[11px] text-neutral-400 space-y-1.5">
        <div className="font-semibold text-neutral-300">Kısayollar & İpuçları</div>
        <ul className="space-y-1 list-disc pl-4 text-neutral-400">
          <li>Bağlamak için noktalardan ok çekin.</li>
          <li>Düğüm düzenlemek için tıklayın.</li>
          <li>Seçili öğeyi silmek için <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 text-[10px] text-neutral-200">Del</kbd> tuşuna basın.</li>
        </ul>
      </div>
    </aside>
  );
}
