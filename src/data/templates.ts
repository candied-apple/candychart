import { MarkerType } from "@xyflow/react";
import type { FlowchartTemplate, FlowEdge } from "../types/flowchart";

export function makeStyledEdge(params: {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}): FlowEdge {
  const { id, source, target, sourceHandle, targetHandle } = params;
  let label: string | undefined;
  let stroke = "#8a8a8a";

  if (sourceHandle === "true") {
    label = "Evet";
    stroke = "#34d399";
  } else if (sourceHandle === "false") {
    label = "Hayır";
    stroke = "#fb7185";
  } else if (sourceHandle === "loop") {
    label = "Döngü";
    stroke = "#a78bfa";
  } else if (sourceHandle === "exit") {
    label = "Bitti";
    stroke = "#a3a3a3";
  }

  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "smoothstep",
    interactionWidth: 36,
    label,
    style: { stroke, strokeWidth: 2 },
    labelStyle: {
      fill: stroke,
      fontWeight: 700,
      fontSize: 11,
    },
    labelBgStyle: {
      fill: "#1f1f1f",
      fillOpacity: 0.94,
    },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 18,
      height: 18,
    },
  };
}

export const FLOWCHART_TEMPLATES: FlowchartTemplate[] = [
  {
    id: "sum-for",
    name: "1'den N'e Toplam (For Döngüsü)",
    description: "Kullanıcıdan N alıp uzun altıgen For döngüsü ile toplamı hesaplar.",
    nodes: [
      {
        id: "n-start",
        type: "start",
        position: { x: 240, y: 32 },
        data: { kind: "start", label: "Başlat" },
      },
      {
        id: "n-input",
        type: "input",
        position: { x: 216, y: 128 },
        data: {
          kind: "input",
          label: "Girdi",
          varName: "n",
          prompt: "Kaça kadar toplansın? (N değeri)",
          valueType: "number",
        },
      },
      {
        id: "n-init",
        type: "process",
        position: { x: 224, y: 240 },
        data: {
          kind: "process",
          label: "Başlangıç",
          code: "toplam = 0",
        },
      },
      {
        id: "n-for",
        type: "for",
        position: { x: 192, y: 352 },
        data: {
          kind: "for",
          label: "For Döngüsü",
          forHeader: "[ i=1; i<=n; i++ ]",
        },
      },
      {
        id: "n-body",
        type: "process",
        position: { x: 224, y: 496 },
        data: {
          kind: "process",
          label: "Topla",
          code: "toplam = toplam + i",
        },
      },
      {
        id: "n-output",
        type: "output",
        position: { x: 496, y: 344 },
        data: {
          kind: "output",
          label: "Çıktı",
          expression: '"1.." + n + " Toplamı =", toplam',
        },
      },
      {
        id: "n-end",
        type: "end",
        position: { x: 528, y: 496 },
        data: { kind: "end", label: "Bitir" },
      },
    ],
    edges: [
      makeStyledEdge({ id: "e1", source: "n-start", target: "n-input" }),
      makeStyledEdge({ id: "e2", source: "n-input", target: "n-init" }),
      makeStyledEdge({ id: "e3", source: "n-init", target: "n-for" }),
      makeStyledEdge({
        id: "e4",
        source: "n-for",
        target: "n-body",
        sourceHandle: "loop",
      }),
      makeStyledEdge({
        id: "e5",
        source: "n-body",
        target: "n-for",
        targetHandle: "loop-back",
      }),
      makeStyledEdge({
        id: "e6",
        source: "n-for",
        target: "n-output",
        sourceHandle: "exit",
      }),
      makeStyledEdge({ id: "e7", source: "n-output", target: "n-end" }),
    ],
  },
  {
    id: "even-odd",
    name: "Tek / Çift Sayı (If-Else Karar)",
    description: "Elmas karar düğümü ile girilen sayının tek veya çift olduğunu bulur.",
    nodes: [
      {
        id: "n-start",
        type: "start",
        position: { x: 304, y: 32 },
        data: { kind: "start", label: "Başlat" },
      },
      {
        id: "n-input",
        type: "input",
        position: { x: 280, y: 128 },
        data: {
          kind: "input",
          label: "Girdi",
          varName: "sayi",
          prompt: "Kontrol edilecek tam sayıyı girin",
          valueType: "number",
        },
      },
      {
        id: "n-dec",
        type: "decision",
        position: { x: 272, y: 240 },
        data: {
          kind: "decision",
          label: "Çift mi?",
          condition: "sayi % 2 == 0",
        },
      },
      {
        id: "n-out-even",
        type: "output",
        position: { x: 80, y: 384 },
        data: {
          kind: "output",
          label: "Çift Sonucu",
          expression: 'sayi + " bir ÇİFT sayıdır."',
        },
      },
      {
        id: "n-out-odd",
        type: "output",
        position: { x: 480, y: 384 },
        data: {
          kind: "output",
          label: "Tek Sonucu",
          expression: 'sayi + " bir TEK sayıdır."',
        },
      },
      {
        id: "n-end",
        type: "end",
        position: { x: 304, y: 528 },
        data: { kind: "end", label: "Bitir" },
      },
    ],
    edges: [
      makeStyledEdge({ id: "e1", source: "n-start", target: "n-input" }),
      makeStyledEdge({ id: "e2", source: "n-input", target: "n-dec" }),
      makeStyledEdge({
        id: "e3",
        source: "n-dec",
        target: "n-out-even",
        sourceHandle: "true",
      }),
      makeStyledEdge({
        id: "e4",
        source: "n-dec",
        target: "n-out-odd",
        sourceHandle: "false",
      }),
      makeStyledEdge({ id: "e5", source: "n-out-even", target: "n-end" }),
      makeStyledEdge({ id: "e6", source: "n-out-odd", target: "n-end" }),
    ],
  },
  {
    id: "factorial",
    name: "Faktöriyel Hesabı (Karar + For)",
    description: "Negatif sayı kontrolü yapar, ardından For döngüsü ile n! değerini hesaplar.",
    nodes: [
      {
        id: "n-start",
        type: "start",
        position: { x: 240, y: 16 },
        data: { kind: "start", label: "Başlat" },
      },
      {
        id: "n-input",
        type: "input",
        position: { x: 216, y: 112 },
        data: {
          kind: "input",
          label: "Girdi",
          varName: "n",
          prompt: "Faktöriyeli alınacak sayıyı (n >= 0) girin",
          valueType: "number",
        },
      },
      {
        id: "n-dec",
        type: "decision",
        position: { x: 208, y: 224 },
        data: {
          kind: "decision",
          label: "Negatif mi?",
          condition: "n < 0",
        },
      },
      {
        id: "n-err",
        type: "output",
        position: { x: 16, y: 368 },
        data: {
          kind: "output",
          label: "Uyarı",
          expression: '"Hata: Negatif sayıların faktöriyeli hesaplanamaz."',
        },
      },
      {
        id: "n-init",
        type: "process",
        position: { x: 400, y: 368 },
        data: {
          kind: "process",
          label: "Başlangıç",
          code: "sonuc = 1",
        },
      },
      {
        id: "n-for",
        type: "for",
        position: { x: 368, y: 480 },
        data: {
          kind: "for",
          label: "For Döngüsü",
          forHeader: "i=1; i<=n; i++",
        },
      },
      {
        id: "n-mul",
        type: "process",
        position: { x: 400, y: 624 },
        data: {
          kind: "process",
          label: "Çarpma",
          code: "sonuc *= i",
        },
      },
      {
        id: "n-out",
        type: "output",
        position: { x: 672, y: 472 },
        data: {
          kind: "output",
          label: "Çıktı",
          expression: 'n + "! = " + sonuc',
        },
      },
      {
        id: "n-end",
        type: "end",
        position: { x: 256, y: 736 },
        data: { kind: "end", label: "Bitir" },
      },
    ],
    edges: [
      makeStyledEdge({ id: "e1", source: "n-start", target: "n-input" }),
      makeStyledEdge({ id: "e2", source: "n-input", target: "n-dec" }),
      makeStyledEdge({
        id: "e3",
        source: "n-dec",
        target: "n-err",
        sourceHandle: "true",
      }),
      makeStyledEdge({
        id: "e4",
        source: "n-dec",
        target: "n-init",
        sourceHandle: "false",
      }),
      makeStyledEdge({ id: "e5", source: "n-err", target: "n-end" }),
      makeStyledEdge({ id: "e6", source: "n-init", target: "n-for" }),
      makeStyledEdge({
        id: "e7",
        source: "n-for",
        target: "n-mul",
        sourceHandle: "loop",
      }),
      makeStyledEdge({
        id: "e8",
        source: "n-mul",
        target: "n-for",
        targetHandle: "loop-back",
      }),
      makeStyledEdge({
        id: "e9",
        source: "n-for",
        target: "n-out",
        sourceHandle: "exit",
      }),
      makeStyledEdge({ id: "e10", source: "n-out", target: "n-end" }),
    ],
  },
  {
    id: "grade-average",
    name: "Vize & Final Not Hesaplama",
    description: "Çoklu girdi, ağırlıklı ortalama işlemi ve geçme/kalma kararı.",
    nodes: [
      {
        id: "n-start",
        type: "start",
        position: { x: 304, y: 16 },
        data: { kind: "start", label: "Başlat" },
      },
      {
        id: "n-input",
        type: "input",
        position: { x: 280, y: 112 },
        data: {
          kind: "input",
          label: "Notları Al",
          varName: "vize, final",
          prompt: "Vize ve Final notlarını virgülle girin (ör: 60, 75)",
          valueType: "number",
        },
      },
      {
        id: "n-calc",
        type: "process",
        position: { x: 272, y: 224 },
        data: {
          kind: "process",
          label: "Ortalama Hesabı",
          code: "ort = vize * 0.4 + final * 0.6",
        },
      },
      {
        id: "n-out-ort",
        type: "output",
        position: { x: 280, y: 336 },
        data: {
          kind: "output",
          label: "Ortalamayı Yaz",
          expression: '"Ortalamanız:", round(ort)',
        },
      },
      {
        id: "n-dec",
        type: "decision",
        position: { x: 256, y: 448 },
        data: {
          kind: "decision",
          label: "Geçti mi?",
          condition: "ort >= 50 && final >= 45",
        },
      },
      {
        id: "n-pass",
        type: "output",
        position: { x: 80, y: 592 },
        data: {
          kind: "output",
          label: "Geçti",
          expression: '"Tebrikler, dersi GEÇTİNİZ!"',
        },
      },
      {
        id: "n-fail",
        type: "output",
        position: { x: 464, y: 592 },
        data: {
          kind: "output",
          label: "Kaldı",
          expression: '"Maalesef dersten KALDINIZ."',
        },
      },
      {
        id: "n-end",
        type: "end",
        position: { x: 304, y: 720 },
        data: { kind: "end", label: "Bitir" },
      },
    ],
    edges: [
      makeStyledEdge({ id: "e1", source: "n-start", target: "n-input" }),
      makeStyledEdge({ id: "e2", source: "n-input", target: "n-calc" }),
      makeStyledEdge({ id: "e3", source: "n-calc", target: "n-out-ort" }),
      makeStyledEdge({ id: "e4", source: "n-out-ort", target: "n-dec" }),
      makeStyledEdge({
        id: "e5",
        source: "n-dec",
        target: "n-pass",
        sourceHandle: "true",
      }),
      makeStyledEdge({
        id: "e6",
        source: "n-dec",
        target: "n-fail",
        sourceHandle: "false",
      }),
      makeStyledEdge({ id: "e7", source: "n-pass", target: "n-end" }),
      makeStyledEdge({ id: "e8", source: "n-fail", target: "n-end" }),
    ],
  },
  {
    id: "blank",
    name: "Boş Başlangıç Şablonu",
    description: "Sadece Başlat ve Bitir düğümleri ile temiz bir tuval başlatır.",
    nodes: [
      {
        id: "n-start",
        type: "start",
        position: { x: 288, y: 64 },
        data: { kind: "start", label: "Başlat" },
      },
      {
        id: "n-end",
        type: "end",
        position: { x: 288, y: 400 },
        data: { kind: "end", label: "Bitir" },
      },
    ],
    edges: [],
  },
];
