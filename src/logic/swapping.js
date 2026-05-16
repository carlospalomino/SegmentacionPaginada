/**
 * swapping.js
 * Lógica de Swapping para Segmentación Simple.
 *
 * En segmentación simple el swapping ocurre a nivel de PROCESO COMPLETO:
 * cuando la RAM no tiene espacio para un nuevo segmento, el SO puede
 * expulsar un proceso entero al disco (Backing Store) para liberar sus huecos.
 *
 * El disco tiene tamaño = 2 × RAM (configurado en Settings).
 */

import { allocate } from './memoryAllocation.js';

// ─────────────────────────────────────────────────────────────────
// swapOut
// Expulsa un proceso de la RAM al disco.
//
// @param {string}   procId     - ID del proceso a expulsar
// @param {Array}    processes  - Lista de procesos en RAM
// @param {Array}    holeList   - Lista actual de huecos libres
// @param {Array}    diskProcs  - Lista actual de procesos en disco
// @param {number}   diskSizeKB - Tamaño total del disco en KB
//
// @returns {{ ok, newProcesses, newHoleList, newDiskProcs, freedKB, error }}
// ─────────────────────────────────────────────────────────────────
export function swapOut(procId, processes, holeList, diskProcs, diskSizeKB) {
  const proc = processes.find(p => p.id === procId);
  if (!proc) return { ok: false, error: `Proceso ${procId} no encontrado en RAM.` };

  // Verificar que el disco tiene espacio suficiente
  const diskUsedKB = diskProcs.reduce((acc, p) => acc + p.totalSize, 0);
  if (diskUsedKB + proc.totalSize > diskSizeKB) {
    return { ok: false, error: `Disco lleno: no hay espacio para ${procId} (${proc.totalSize} KB necesarios, ${diskSizeKB - diskUsedKB} KB libres en disco).` };
  }

  // Liberar los huecos de los segmentos del proceso en RAM
  let newHoleList = [...holeList];
  for (const seg of proc.segments) {
    if (seg.base !== null) {
      // Verificar si este segmento físico está siendo compartido con otro proceso activo
      const isShared = processes.some(p => p.id !== procId && p.segments.some(s => s.base === seg.base));
      if (!isShared) {
        newHoleList.push({ start: seg.base, size: seg.size });
      }
    }
  }
  newHoleList = _mergeHoles(newHoleList.sort((a, b) => a.start - b.start));

  // Quitar de RAM, añadir al disco (con base=null para indicar que no está en RAM)
  const swappedProc = {
    ...proc,
    segments: proc.segments.map(s => ({ ...s, base: null })),
  };

  const newProcesses = processes.filter(p => p.id !== procId);
  const newDiskProcs = [...diskProcs, swappedProc];

  return {
    ok: true,
    newProcesses,
    newHoleList,
    newDiskProcs,
    freedKB: proc.totalSize,
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────────
// swapIn
// Trae un proceso del disco de vuelta a la RAM.
// Usa el algoritmo de asignación indicado para colocar cada segmento.
//
// @param {string}   procId        - ID del proceso a traer
// @param {Array}    diskProcs     - Lista de procesos en disco
// @param {Array}    processes     - Lista de procesos en RAM
// @param {Array}    holeList      - Lista actual de huecos libres
// @param {string}   algorithm     - 'FIRST' | 'BEST' | 'WORST'
//
// @returns {{ ok, newProcesses, newHoleList, newDiskProcs, error }}
// ─────────────────────────────────────────────────────────────────
export function swapIn(procId, diskProcs, processes, holeList, algorithm) {
  const proc = diskProcs.find(p => p.id === procId);
  if (!proc) return { ok: false, error: `Proceso ${procId} no está en disco.` };

  // Intentar asignar cada segmento en RAM
  let currentHoles = [...holeList];
  const assignedSegs = [];

  for (const seg of proc.segments) {
    const result = allocate(currentHoles, seg.size, algorithm);
    if (!result) {
      return {
        ok: false,
        error: `Sin espacio en RAM para el segmento "${seg.segType}" de ${procId} (${seg.size} KB). Intenta compactar primero.`,
        newProcesses: processes,
        newHoleList: holeList,
        newDiskProcs: diskProcs,
      };
    }
    currentHoles = result.newHoles;
    assignedSegs.push({ ...seg, base: result.base });
  }

  // Éxito: actualizar estructuras
  const restoredProc = { ...proc, segments: assignedSegs };
  const newProcesses = [...processes, restoredProc];
  const newDiskProcs = diskProcs.filter(p => p.id !== procId);

  return {
    ok: true,
    newProcesses,
    newHoleList: currentHoles,
    newDiskProcs,
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────────
// canFitInRam
// Verifica si un proceso (dado su array de segmentos con sizes)
// puede cargarse en la RAM con el hueco disponible actual.
//
// @param {Array}  segments  - [{ size }]
// @param {Array}  holeList
// @param {string} algorithm
// @returns {boolean}
// ─────────────────────────────────────────────────────────────────
export function canFitInRam(segments, holeList, algorithm) {
  let currentHoles = [...holeList];
  for (const seg of segments) {
    const result = allocate(currentHoles, seg.size, algorithm);
    if (!result) return false;
    currentHoles = result.newHoles;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// Helper interno: fusionar huecos adyacentes
// ─────────────────────────────────────────────────────────────────
function _mergeHoles(sorted) {
  if (sorted.length === 0) return [];
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
