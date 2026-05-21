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
      // P1 y P2 intercalados para fragmentar la RAM.
      // Llenaremos los marcos pares, dejando los impares libres.
      const p1Segs = [
        buildSeg('code', 16, [0, 2, 4, 6]),
        buildSeg('data', 16, [8, 10, 12, 14])
      ];
      const p2Segs = [
        buildSeg('heap', 16, [16, 18, 20, 22]),
        buildSeg('stack', 16, [24, 26, 28, 30])
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
        logs: [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: 'Escenario cargado: Intenta crear un proceso P3 con segmentos grandes. Observa cómo ocupan los marcos libres sin importar que no sean contiguos.', type: 'info' }]
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
