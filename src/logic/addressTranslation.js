/**
 * addressTranslation.js
 * Lógica de la MMU para Segmentación Simple.
 *
 * La dirección lógica es: <segNum, offset>
 * La dirección física es: Base[segNum] + offset
 * Condición de protección: offset < Límite[segNum]
 */

/**
 * translate
 * @param {object} segment - { id, base, limit, size }
 * @param {number} offset  - Desplazamiento dentro del segmento
 * @returns {{ ok: boolean, physicalAddress: number|null, error: string|null }}
 */
export function translate(segment, offset) {
  if (!segment) {
    return { ok: false, physicalAddress: null, error: 'Segmento no existe en la tabla.' };
  }

  if (offset >= segment.limit) {
    return {
      ok: false,
      physicalAddress: null,
      error: `¡SEGMENTATION FAULT! Offset ${offset} ≥ Límite ${segment.limit}. Acceso fuera de rango.`,
    };
  }

  const physicalAddress = segment.base + offset;
  return { ok: true, physicalAddress, error: null };
}

/**
 * checkTlb — busca una entrada en la TLB
 * @param {Array}  tlbEntries  - [{ procId, segNum, base, limit }]
 * @param {string} procId
 * @param {number} segNum
 * @returns {object|null}
 */
export function checkTlb(tlbEntries, procId, segNum) {
  return tlbEntries.find(e => e.procId === procId && e.segNum === segNum) || null;
}

/**
 * updateTlb — inserta o actualiza una entrada en la TLB (máx 4 entradas)
 */
export function updateTlb(tlbEntries, procId, segNum, base, limit) {
  const filtered = tlbEntries.filter(e => !(e.procId === procId && e.segNum === segNum));
  return [{ procId, segNum, base, limit }, ...filtered].slice(0, 4);
}
