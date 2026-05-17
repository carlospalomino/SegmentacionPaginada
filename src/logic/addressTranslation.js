/**
 * addressTranslation.js
 * Traducción de dirección lógica para Segmentación Paginada.
 *
 * Dirección lógica: (segNum, offset)
 * Proceso interno:
 *   pageNum      = floor(offset / PAGE_SIZE_KB)
 *   frameOffset  = offset % PAGE_SIZE_KB
 *   entry        = segment.pageTable[pageNum]
 *   if !entry.valid → PAGE FAULT
 *   physicalAddr = entry.frame × PAGE_SIZE_KB + frameOffset  [en KB]
 */

/**
 * translate
 * @param {object} segment      - { segType, size, limit, pageTable: [{pageNum, frame, valid}] }
 * @param {number} offset       - Desplazamiento lógico dentro del segmento (en KB)
 * @param {number} pageSizeKB   - Tamaño de página en KB
 * @returns {{ ok, pageFault, physicalAddr, pageNum, frameOffset, frame, error }}
 */
export function translate(segment, offset, pageSizeKB) {
  if (!segment) {
    return { ok: false, pageFault: false, physicalAddr: null, error: 'Segmento no existe.' };
  }

  // Protección de límite (segmentation fault)
  if (offset >= segment.limit) {
    return {
      ok: false,
      pageFault: false,
      physicalAddr: null,
      error: `¡SEGMENTATION FAULT! Offset ${offset} ≥ Límite ${segment.limit} KB.`,
    };
  }

  const pageNum     = Math.floor(offset / pageSizeKB);
  const frameOffset = offset % pageSizeKB;
  const entry       = segment.pageTable?.[pageNum];

  if (!entry || !entry.valid) {
    // PAGE FAULT — la página no está en RAM
    return {
      ok: false,
      pageFault: true,
      physicalAddr: null,
      pageNum,
      frameOffset,
      frame: null,
      error: null,
    };
  }

  const physicalAddr = entry.frame * pageSizeKB + frameOffset;
  return {
    ok: true,
    pageFault: false,
    physicalAddr,
    pageNum,
    frameOffset,
    frame: entry.frame,
    error: null,
  };
}

/**
 * checkTlb — busca en la TLB por (procId, segNum, pageNum)
 * @param {Array}  tlbEntries  - [{ procId, segNum, pageNum, frame }]
 * @returns {object|null}
 */
export function checkTlb(tlbEntries, procId, segNum, pageNum) {
  return tlbEntries.find(
    e => e.procId === procId && e.segNum === segNum && e.pageNum === pageNum
  ) || null;
}

/**
 * updateTlb — inserta o actualiza una entrada (máx 4 entradas, LRU implícito)
 */
export function updateTlb(tlbEntries, procId, segNum, pageNum, frame) {
  const filtered = tlbEntries.filter(
    e => !(e.procId === procId && e.segNum === segNum && e.pageNum === pageNum)
  );
  return [{ procId, segNum, pageNum, frame }, ...filtered].slice(0, 4);
}
