/**
 * memoryAllocation.js
 * Algoritmos de asignación de huecos libres para Segmentación Simple.
 * Cada hueco: { start: number, size: number }
 * Retorna: { base: number, newHoles: Array } o null si no hay espacio.
 */

/**
 * First Fit — asigna el primer hueco suficientemente grande
 */
export function firstFit(holes, segSize) {
  for (let i = 0; i < holes.length; i++) {
    if (holes[i].size >= segSize) {
      return _allocate(holes, i, segSize);
    }
  }
  return null;
}

/**
 * Best Fit — asigna el hueco más pequeño que alcance
 */
export function bestFit(holes, segSize) {
  let bestIdx = -1;
  let bestSize = Infinity;
  for (let i = 0; i < holes.length; i++) {
    if (holes[i].size >= segSize && holes[i].size < bestSize) {
      bestIdx = i;
      bestSize = holes[i].size;
    }
  }
  if (bestIdx === -1) return null;
  return _allocate(holes, bestIdx, segSize);
}

/**
 * Worst Fit — asigna el hueco más grande disponible
 */
export function worstFit(holes, segSize) {
  let worstIdx = -1;
  let worstSize = -1;
  for (let i = 0; i < holes.length; i++) {
    if (holes[i].size >= segSize && holes[i].size > worstSize) {
      worstIdx = i;
      worstSize = holes[i].size;
    }
  }
  if (worstIdx === -1) return null;
  return _allocate(holes, worstIdx, segSize);
}

/**
 * Helper interno: realiza la asignación y devuelve la nueva lista de huecos
 */
function _allocate(holes, idx, segSize) {
  const hole = holes[idx];
  const base = hole.start;
  const newHoles = [...holes];

  if (hole.size === segSize) {
    // El hueco desaparece exactamente
    newHoles.splice(idx, 1);
  } else {
    // El hueco se encoge
    newHoles[idx] = { start: hole.start + segSize, size: hole.size - segSize };
  }

  return { base, newHoles };
}

/**
 * allocate — dispatcher que elige el algoritmo según la cadena dada
 */
export function allocate(holes, segSize, algorithm) {
  switch (algorithm) {
    case 'BEST':  return bestFit(holes, segSize);
    case 'WORST': return worstFit(holes, segSize);
    default:      return firstFit(holes, segSize); // FIRST (default)
  }
}

/**
 * compactMemory — mueve todos los segmentos al inicio y agrupa todos los
 * huecos en un único hueco al final.
 *
 * @param {Array} segments  - Array de segmentos { id, procId, segType, base, size, color, limit }
 * @param {number} totalRam - Tamaño total de la RAM en KB
 * @returns {{ newSegments: Array, newHoles: Array }}
 */
export function compactMemory(segments, totalRam) {
  // Ordenar por dirección base actual
  const sorted = [...segments].sort((a, b) => a.base - b.base);
  let cursor = 0;
  const newSegments = sorted.map(seg => {
    const moved = { ...seg, base: cursor };
    cursor += seg.size;
    return moved;
  });

  const freeSize = totalRam - cursor;
  const newHoles = freeSize > 0 ? [{ start: cursor, size: freeSize }] : [];

  return { newSegments, newHoles };
}
