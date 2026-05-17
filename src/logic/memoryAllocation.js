/**
 * memoryAllocation.js
 * Asignación de marcos para Segmentación Paginada.
 *
 * Ya NO hay huecos variables (la fragmentación externa desaparece).
 * La RAM se divide en marcos de tamaño fijo. Se mantiene una Free Frame List.
 */

/**
 * allocateFrames
 * Toma `count` marcos de la freeFrameList.
 *
 * @param {number[]} freeFrameList  - Lista de índices de marcos libres
 * @param {number}   count          - Cantidad de marcos necesarios
 * @returns {{ frames: number[], newFreeList: number[] } | null}
 */
export function allocateFrames(freeFrameList, count) {
  if (freeFrameList.length < count) return null; // No hay suficientes marcos

  const frames      = freeFrameList.slice(0, count);
  const newFreeList = freeFrameList.slice(count);
  return { frames, newFreeList };
}

/**
 * releaseFrames
 * Devuelve marcos a la freeFrameList (al terminar/swapear un proceso).
 *
 * @param {number[]} freeFrameList
 * @param {number[]} framesToRelease
 * @returns {number[]} nueva freeFrameList ordenada
 */
export function releaseFrames(freeFrameList, framesToRelease) {
  return [...freeFrameList, ...framesToRelease].sort((a, b) => a - b);
}

/**
 * buildPageTable
 * Construye la tabla de páginas inicial para un segmento.
 * Todas las páginas inician con valid=false (están en disco).
 *
 * @param {number} segSizeKB   - Tamaño del segmento en KB
 * @param {number} pageSizeKB  - Tamaño de página en KB
 * @returns {Array} pageTable  - [{ pageNum, frame: null, valid: false }]
 */
export function buildPageTable(segSizeKB, pageSizeKB) {
  const pageCount = Math.ceil(segSizeKB / pageSizeKB);
  return Array.from({ length: pageCount }, (_, i) => ({
    pageNum: i,
    frame: null,
    valid: false,
  }));
}
