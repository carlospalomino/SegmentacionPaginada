/**
 * scenarios.js
 * Configuraciones de escenarios académicos predefinidos para clases de Sistemas Operativos (UTP).
 */

export const ACADEMIC_SCENARIOS = [
  {
    id: 'frag-ext',
    title: 'Fragmentación Externa',
    description: 'RAM alternada con pequeños huecos. Intenta crear un proceso nuevo y observa cómo falla a pesar de haber suficiente memoria total libre.',
    ramSizeKB: 128,
    isSwappingEnabled: false,
    isTlbEnabled: false,
    processes: [
      {
        id: 'P1',
        color: '#3b82f6',
        totalSize: 32,
        segments: [
          { segType: 'Código', base: 0, size: 8, limit: 8, color: 'var(--seg-code)' },
          { segType: 'Datos', base: 20, size: 8, limit: 8, color: 'var(--seg-data)' },
          { segType: 'Heap', base: 40, size: 8, limit: 8, color: 'var(--seg-heap)' },
          { segType: 'Pila', base: 60, size: 8, limit: 8, color: 'var(--seg-stack)' }
        ]
      },
      {
        id: 'P2',
        color: '#ec4899',
        totalSize: 20,
        segments: [
          { segType: 'Código', base: 80, size: 5, limit: 5, color: 'var(--seg-code)' },
          { segType: 'Datos', base: 90, size: 5, limit: 5, color: 'var(--seg-data)' },
          { segType: 'Heap', base: 100, size: 5, limit: 5, color: 'var(--seg-heap)' },
          { segType: 'Pila', base: 110, size: 5, limit: 5, color: 'var(--seg-stack)' }
        ]
      }
    ],
    holeList: [
      { start: 8, size: 12 },
      { start: 28, size: 12 },
      { start: 48, size: 12 },
      { start: 68, size: 12 },
      { start: 85, size: 5 },
      { start: 95, size: 5 },
      { start: 105, size: 5 },
      { start: 115, size: 13 }
    ],
    diskProcs: []
  },
  {
    id: 'growth-reloc',
    title: 'Crecimiento y Reubicación',
    description: 'El segmento Heap de P1 está rodeado por Datos y Pila. Si lo haces crecer, forzará al SO a reubicarlo al gran hueco libre del final.',
    ramSizeKB: 128,
    isSwappingEnabled: false,
    isTlbEnabled: true,
    processes: [
      {
        id: 'P1',
        color: '#a855f7',
        totalSize: 40,
        segments: [
          { segType: 'Código', base: 0, size: 10, limit: 10, color: 'var(--seg-code)' },
          { segType: 'Datos', base: 10, size: 10, limit: 10, color: 'var(--seg-data)' },
          { segType: 'Heap', base: 20, size: 10, limit: 10, color: 'var(--seg-heap)' }, // Rodeado por Datos y Pila
          { segType: 'Pila', base: 30, size: 10, limit: 10, color: 'var(--seg-stack)' }
        ]
      }
    ],
    holeList: [
      { start: 40, size: 88 }
    ],
    diskProcs: []
  },
  {
    id: 'rescue-swap',
    title: 'Swapping de Rescate',
    description: 'La RAM está al 100% de capacidad. Para cargar el proceso P3 que está en disco, deberás hacer un "Swap Out" manual de P1 o P2.',
    ramSizeKB: 128,
    isSwappingEnabled: true,
    isTlbEnabled: false,
    processes: [
      {
        id: 'P1',
        color: '#ef4444',
        totalSize: 64,
        segments: [
          { segType: 'Código', base: 0, size: 16, limit: 16, color: 'var(--seg-code)' },
          { segType: 'Datos', base: 16, size: 16, limit: 16, color: 'var(--seg-data)' },
          { segType: 'Heap', base: 32, size: 16, limit: 16, color: 'var(--seg-heap)' },
          { segType: 'Pila', base: 48, size: 16, limit: 16, color: 'var(--seg-stack)' }
        ]
      },
      {
        id: 'P2',
        color: '#3b82f6',
        totalSize: 64,
        segments: [
          { segType: 'Código', base: 64, size: 16, limit: 16, color: 'var(--seg-code)' },
          { segType: 'Datos', base: 80, size: 16, limit: 16, color: 'var(--seg-data)' },
          { segType: 'Heap', base: 96, size: 16, limit: 16, color: 'var(--seg-heap)' },
          { segType: 'Pila', base: 112, size: 16, limit: 16, color: 'var(--seg-stack)' }
        ]
      }
    ],
    holeList: [],
    diskProcs: [
      {
        id: 'P3',
        color: '#10b981',
        totalSize: 32,
        segments: [
          { segType: 'Código', size: 8, limit: 8, color: 'var(--seg-code)' },
          { segType: 'Datos', size: 8, limit: 8, color: 'var(--seg-data)' },
          { segType: 'Heap', size: 8, limit: 8, color: 'var(--seg-heap)' },
          { segType: 'Pila', size: 8, limit: 8, color: 'var(--seg-stack)' }
        ]
      }
    ]
  }
];
