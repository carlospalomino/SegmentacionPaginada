/**
 * segmentGrowth.js
 * Lógica de crecimiento dinámico de segmentos en Segmentación Simple.
 *
 * En ejecución, segmentos como Heap (crece hacia arriba) y Stack (crece hacia abajo)
 * pueden necesitar más memoria. El SO tiene dos estrategias:
 *
 *  1. CRECIMIENTO IN-PLACE  → hay un hueco adyacente al segmento: se consume.
 *  2. REUBICACIÓN           → no hay hueco adyacente pero sí uno más grande en otro lugar.
 *  3. FALLA                 → no hay ningún hueco suficientemente grande.
 *
 * @module segmentGrowth
 */

import { allocate } from './memoryAllocation.js';

// ─────────────────────────────────────────────────────────────────
// growSegment
// Intenta hacer crecer un segmento en deltaKB kilobytes.
//
// @param {string}  procId    - ID del proceso
// @param {number}  segIndex  - Índice del segmento en proc.segments
// @param {number}  deltaKB   - KB adicionales que necesita
// @param {Array}   processes - Estado actual de procesos en RAM
// @param {Array}   holeList  - Lista actual de huecos libres
// @param {string}  algorithm - 'FIRST' | 'BEST' | 'WORST' (para reubicación)
//
// @returns {{
//   strategy: 'IN_PLACE' | 'RELOCATE' | 'FAIL',
//   newProcesses: Array,
//   newHoleList: Array,
//   oldBase: number|null,
//   newBase: number,
//   newSize: number,
//   error: string|null
// }}
// ─────────────────────────────────────────────────────────────────
export function growSegment(procId, segIndex, deltaKB, processes, holeList, algorithm) {
  const proc = processes.find(p => p.id === procId);
  if (!proc) return { strategy: 'FAIL', error: `Proceso ${procId} no encontrado.`, newProcesses: processes, newHoleList: holeList };

  const seg = proc.segments[segIndex];
  if (!seg || seg.base === null) return { strategy: 'FAIL', error: `Segmento ${segIndex} no está en RAM.`, newProcesses: processes, newHoleList: holeList };

  const newSize = seg.size + deltaKB;
  const segEnd = seg.base + seg.size; // dirección donde termina el segmento actual

  // ── Estrategia 1: Crecimiento IN-PLACE ──────────────────────────
  // Buscamos un hueco cuyo inicio coincida exactamente con el fin del segmento
  const adjacentHoleIdx = holeList.findIndex(h => h.start === segEnd);

  if (adjacentHoleIdx !== -1) {
    const adjacentHole = holeList[adjacentHoleIdx];
    if (adjacentHole.size >= deltaKB) {
      // Hay espacio adyacente suficiente → crecer in-place
      const newHoleList = holeList
        .map((h, i) => {
          if (i !== adjacentHoleIdx) return h;
          if (h.size === deltaKB) return null; // el hueco desaparece completamente
          return { start: h.start + deltaKB, size: h.size - deltaKB };
        })
        .filter(Boolean);

      const newProcesses = processes.map(p => {
        if (p.id !== procId) return p;
        return {
          ...p,
          totalSize: p.totalSize + deltaKB,
          segments: p.segments.map((s, i) => {
            if (i !== segIndex) return s;
            return { ...s, size: newSize, limit: newSize };
          }),
        };
      });

      return {
        strategy: 'IN_PLACE',
        newProcesses,
        newHoleList,
        oldBase: seg.base,
        newBase: seg.base,
        newSize,
        error: null,
      };
    }
  }

  // ── Estrategia 2: REUBICACIÓN ────────────────────────────────────
  // No hay hueco adyacente suficiente → buscar un hueco que quepa newSize
  // Primero liberar el hueco actual del segmento
  const holesWithFreed = _addAndMergeHole(holeList, { start: seg.base, size: seg.size });
  const result = allocate(holesWithFreed, newSize, algorithm);

  if (result) {
    const newProcesses = processes.map(p => {
      if (p.id !== procId) return p;
      return {
        ...p,
        totalSize: p.totalSize + deltaKB,
        segments: p.segments.map((s, i) => {
          if (i !== segIndex) return s;
          return { ...s, base: result.base, size: newSize, limit: newSize };
        }),
      };
    });

    return {
      strategy: 'RELOCATE',
      newProcesses,
      newHoleList: result.newHoles,
      oldBase: seg.base,
      newBase: result.base,
      newSize,
      error: null,
    };
  }

  // ── Estrategia 3: FALLA ──────────────────────────────────────────
  return {
    strategy: 'FAIL',
    newProcesses: processes,
    newHoleList: holeList,
    oldBase: seg.base,
    newBase: seg.base,
    newSize: seg.size,
    error: `No hay espacio para crecer ${deltaKB} KB. Intenta Compactar o Swap Out de otro proceso.`,
  };
}

// ─────────────────────────────────────────────────────────────────
// Helper: añadir un hueco y fusionar adyacentes
// ─────────────────────────────────────────────────────────────────
function _addAndMergeHole(holeList, newHole) {
  const sorted = [...holeList, newHole].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (last.start + last.size === sorted[i].start) {
      last.size += sorted[i].size;
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}
