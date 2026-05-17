/**
 * pageReplacement.js
 * Selección de página víctima para reemplazo en RAM llena.
 * Soporta FIFO y LRU.
 *
 * frameQueue      : [{ frame, procId, segIdx, pageNum }]  — orden FIFO de carga
 * frameLastAccess : { [frame]: timestamp }                 — para LRU
 */

/**
 * selectVictim
 * @param {Array}  processes        - Estado actual de procesos
 * @param {string} algo             - 'FIFO' | 'LRU'
 * @param {Array}  frameQueue       - Cola FIFO
 * @param {object} frameLastAccess  - Mapa de último acceso
 * @returns {{ frame, procId, segIdx, pageNum } | null}
 */
export function selectVictim(processes, algo, frameQueue, frameLastAccess) {
  // Conjunto de marcos actualmente en RAM
  const usedFrames = new Set(
    processes.flatMap(p =>
      p.segments.flatMap(s =>
        s.pageTable.filter(pg => pg.valid).map(pg => pg.frame)
      )
    )
  );

  if (algo === 'FIFO') {
    // Recorrer la cola desde el más antiguo, elegir el primero que esté en RAM
    for (const entry of frameQueue) {
      if (usedFrames.has(entry.frame)) return entry;
    }
  } else {
    // LRU — elegir el marco con timestamp de último acceso más antiguo
    let victim = null;
    let minTime = Infinity;
    for (const p of processes) {
      p.segments.forEach((s, segIdx) => {
        s.pageTable.forEach(pg => {
          if (pg.valid && pg.frame !== null) {
            const t = frameLastAccess[pg.frame] ?? 0;
            if (t < minTime) {
              minTime = t;
              victim = { frame: pg.frame, procId: p.id, segIdx, pageNum: pg.pageNum };
            }
          }
        });
      });
    }
    return victim;
  }

  return null;
}
