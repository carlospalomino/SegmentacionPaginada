import { SEG_TYPES } from '../constants/segTypes.js';

// Colores base para procesos
const PROC_COLORS = ['#06b6d4', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

// Helpers para construir escenarios
const buildSeg = (typeKey, size, frames) => {
  const t = SEG_TYPES.find(s => s.key === typeKey);
  const pageSizeKB = 4;
  const numPages = Math.ceil(size / pageSizeKB);
  
  const pageTable = [];
  for (let i = 0; i < numPages; i++) {
    const frame = frames[i] !== undefined ? frames[i] : null;
    pageTable.push({
      pageNum: i,
      frame,
      valid: frame !== null
    });
  }

  return {
    segType: t.type,
    color: t.color,
    size: size,
    limit: size,
    pageTable,
    isShared: false
  };
};

export const ACADEMIC_SCENARIOS = [
  {
    id: 'frag-ext',
    title: 'Adiós a la Fragmentación Externa',
    ramSizeKB: 128,
    pageSizeKB: 4,
    description: 'La RAM está llena de "huecos" (marcos intercalados libres). Intentamos crear un proceso nuevo (P3). Gracias a la paginación subyacente, sus páginas se dispersan exitosamente en los huecos no contiguos.',
    setup: () => {
      // P1 y P2 ocupan marcos PARES, dejando los IMPARES libres → RAM fragmentada.
      // Cada proceso tiene los 4 segmentos estándar: Code, Data, Heap, Stack.
      // P1: frames 0,2,4,6,8,10,12,14  (2 frames por segmento × 4 segs = 8 frames)
      // P2: frames 16,18,20,22,24,26,28,30  (2 frames por segmento × 4 segs = 8 frames)
      // Libres (impares): 1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31
      const p1Segs = [
        buildSeg('code',  8, [0, 2]),
        buildSeg('data',  8, [4, 6]),
        buildSeg('heap',  8, [8, 10]),
        buildSeg('stack', 8, [12, 14])
      ];
      const p2Segs = [
        buildSeg('code',  8, [16, 18]),
        buildSeg('data',  8, [20, 22]),
        buildSeg('heap',  8, [24, 26]),
        buildSeg('stack', 8, [28, 30])
      ];

      return {
        nextPid: 3,
        processes: [
          { id: 'P1', color: PROC_COLORS[0], segments: p1Segs },
          { id: 'P2', color: PROC_COLORS[1], segments: p2Segs }
        ],
        diskPages: [],
        tlbEntries: [],
        pageFaults: 0,
        logs: [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: 'Escenario cargado: La RAM tiene 16 marcos libres pero intercalados (impares). Intenta crear un proceso P3 — sus páginas se dispersarán en esos huecos no contiguos gracias a la paginación.', type: 'info' }]
      };
    }
  },
  {
    id: 'dynamic-growth',
    title: 'Crecimiento Dinámico sin Reubicación',
    ramSizeKB: 64,
    pageSizeKB: 4,
    description: 'El Heap de P1 (4 KB) está rodeado de otras páginas. Haz clic en "Crecer Segmento" (+4 KB). En lugar de fallar o reubicar todo el segmento, simplemente se le asigna un marco libre aleatorio a la nueva página.',
    setup: () => {
      // P1 tiene un Heap de 4KB (1 página) en el frame 5.
      // P2 rodea a P1, ocupando frames 4 y 6.
      const p1Segs = [
        buildSeg('code', 8, [0, 1]),
        buildSeg('heap', 4, [5])
      ];
      const p2Segs = [
        buildSeg('code', 4, [4]),
        buildSeg('data', 4, [6])
      ];

      return {
        nextPid: 3,
        processes: [
          { id: 'P1', color: PROC_COLORS[0], segments: p1Segs },
          { id: 'P2', color: PROC_COLORS[1], segments: p2Segs }
        ],
        diskPages: [],
        tlbEntries: [],
        pageFaults: 0,
        logs: [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: 'Escenario cargado: Selecciona P1 y crece el segmento Heap. Luego mueve el offset para provocar el Page Fault y alojar la nueva página.', type: 'info' }]
      };
    }
  },
  {
    id: 'shared-code',
    title: 'Librerías Compartidas (Código Compartido)',
    ramSizeKB: 64,
    pageSizeKB: 4,
    description: 'P1 y P2 ejecutan el mismo programa. Observa cómo sus Segmentos "Código" (ambos de 8 KB) apuntan exactamente a los mismos marcos físicos (Frames 0 y 1), ahorrando memoria RAM.',
    setup: () => {
      const p1Segs = [
        buildSeg('code', 8, [0, 1]),
        buildSeg('data', 4, [2]),
        buildSeg('stack', 4, [3])
      ];
      
      const p2Segs = [
        { ...p1Segs[0], isShared: true }, // Copia exacta del segmento de código, apunta a [0, 1]
        buildSeg('data', 4, [4]),
        buildSeg('stack', 4, [5])
      ];

      return {
        nextPid: 3,
        processes: [
          { id: 'P1', color: PROC_COLORS[0], segments: p1Segs },
          { id: 'P2', color: PROC_COLORS[1], segments: p2Segs }
        ],
        diskPages: [],
        tlbEntries: [],
        pageFaults: 0,
        logs: [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: 'Escenario cargado: Observa las tablas de páginas de Código en P1 y P2, ambas apuntan a los mismos marcos físicos.', type: 'info' }]
      };
    }
  },
  {
    id: 'internal-frag',
    title: 'Costo de la Fragmentación Interna',
    ramSizeKB: 64,
    pageSizeKB: 4,
    description: 'P1 se creó con tamaños irregulares (Código: 5KB, Datos: 3KB). Al usar páginas de 4KB, observa el residuo (espacio desperdiciado) que sufre CADA segmento únicamente en su última página.',
    setup: () => {
      const p1Segs = [
        buildSeg('code', 5, [0, 1]), // Ocupa 2 páginas, desperdicia 3KB en el frame 1
        buildSeg('data', 3, [2]),    // Ocupa 1 página, desperdicia 1KB en el frame 2
        buildSeg('heap', 6, [3, 4]), // Ocupa 2 páginas, desperdicia 2KB en el frame 4
        buildSeg('stack', 4, [5])    // Ocupa 1 página exacta, desperdicia 0KB
      ];

      return {
        nextPid: 2,
        processes: [
          { id: 'P1', color: PROC_COLORS[0], segments: p1Segs }
        ],
        diskPages: [],
        tlbEntries: [],
        pageFaults: 0,
        logs: [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: 'Escenario cargado: Analiza el espacio sobrante en la RAM (indicado en gris) dentro de los últimos marcos de cada segmento de P1.', type: 'info' }]
      };
    }
  }
];
