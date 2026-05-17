/**
 * buildPageFaultSteps.js
 * Cola de pasos para PAGE FAULT en modo "Paso a Paso".
 *
 * Flujo A — hay marco libre:
 *   CPU→MMU → [TLB MISS] → SEG TABLE → PAGE TABLE (V=0) → PAGE FAULT →
 *   FRAME ASSIGN → DISK→RAM → TABLE UPDATE → [TLB UPDATE] → DONE
 *
 * Flujo B — RAM llena (reemplazo necesario):
 *   CPU→MMU → [TLB MISS] → SEG TABLE → PAGE TABLE (V=0) → PAGE FAULT →
 *   VICTIM SELECT → EVICT → [TLB INVALIDATE] → DISK→RAM → TABLE UPDATE → [TLB UPDATE] → DONE
 */

import { selectVictim } from './pageReplacement.js';

/**
 * buildPageFaultStepQueue
 * @returns {{ steps: Array, error: string|null }}
 */
export function buildPageFaultStepQueue({
  pid, segIdx, pageNum, processes, freeFrameList,
  replacementAlgo, frameQueue, frameLastAccess,
  pageSizeKB, frameOffset, isTlbEnabled, tlbEntries,
  setFlowAction, setActiveSegNum, setActiveFrame, setEvictingFrame,
  setActiveDiskEntry, setIsTlbHit, setTlbStats, setTlbEntries,
  setProcesses, setDiskPages, setFreeFrameList, setPageFaults, addLog,
  frameQueueRef, frameLastAccessRef,
}) {
  // ── Pre-calcular víctima / marco asignado ──────────────────────
  let assignedFrame;
  let victim = null;
  const needsReplacement = freeFrameList.length === 0;

  if (needsReplacement) {
    victim = selectVictim(processes, replacementAlgo, frameQueue, frameLastAccess);
    if (!victim) {
      return { steps: [], error: 'Error crítico: RAM llena y no hay página víctima seleccionable.' };
    }
    assignedFrame = victim.frame;
  } else {
    assignedFrame = freeFrameList[0];
  }

  const victimProc = victim ? processes.find(p => p.id === victim.procId) : null;
  const steps = [];

  // ── 1. CPU → MMU ──────────────────────────────────────────────
  steps.push({
    action: 'CPU_TO_MMU',
    desc: `CPU genera dirección lógica → Seg ${segIdx}, Pág ${pageNum}. La envía a la MMU.`,
    execute: () => {
      setFlowAction('CPU_TO_MMU');
      setActiveSegNum(segIdx);
    },
  });

  // ── 2. TLB MISS (opcional) ────────────────────────────────────
  if (isTlbEnabled) {
    steps.push({
      action: 'TLB_SEARCH',
      desc: `MMU busca en TLB: (Seg ${segIdx}, Pág ${pageNum}) — esta página está en DISCO, nunca puede estar en caché.`,
      execute: () => {
        setFlowAction('TLB_SEARCH');
        setTlbStats(prev => ({ ...prev, accesses: prev.accesses + 1 }));
      },
    });
    steps.push({
      action: 'TLB_MISS',
      desc: `TLB MISS ❌ — No encontrado. La TLB no almacena páginas que están en disco.`,
      execute: () => {
        setIsTlbHit(false);
        setFlowAction('TLB_MISS');
        addLog(`TLB MISS: Seg ${segIdx} Pág ${pageNum} no está en caché (en DISCO)`, 'warning');
      },
    });
  }

  // ── 3. Tabla de Segmentos ─────────────────────────────────────
  steps.push({
    action: 'MMU_SEARCH',
    desc: `MMU consulta Tabla de Segmentos → Seg ${segIdx} encontrado. Accediendo a su Tabla de Páginas...`,
    execute: () => setFlowAction('MMU_SEARCH'),
  });

  // ── 4. Tabla de Páginas → bit V=0 → PAGE FAULT ───────────────
  steps.push({
    action: 'PAGE_FAULT_DETECTED',
    desc: `Tabla de Páginas Seg ${segIdx}: Pág ${pageNum} → bit V=0 ¡PÁGINA EN DISCO! → ¡PAGE FAULT! El SO toma el control.`,
    execute: () => {
      setFlowAction('PAGE_FAULT_DETECTED');
      setPageFaults(prev => prev + 1);
      addLog(`¡PAGE FAULT! Seg ${segIdx} Pág ${pageNum} — bit V=0, página en DISCO. SO interviene.`, 'error');
    },
  });

  // ── 5. Reemplazo (solo si RAM llena) ─────────────────────────
  if (needsReplacement && victim) {
    steps.push({
      action: 'VICTIM_SELECT',
      desc: `[${replacementAlgo}] SO selecciona víctima: Proc ${victim.procId} Seg ${victim.segIdx} Pág ${victim.pageNum} en Marco F${victim.frame}.`,
      execute: () => {
        setFlowAction('EVICT');
        setEvictingFrame(victim.frame);
        addLog(`[${replacementAlgo}] Víctima: ${victim.procId} Seg ${victim.segIdx} Pág ${victim.pageNum} → Marco F${victim.frame}`, 'warning');
      },
    });

    steps.push({
      action: 'EVICT',
      desc: `Expulsando víctima del Marco F${victim.frame} → Disco. Tabla de páginas del proceso ${victim.procId} actualizada (V: 1→0).`,
      execute: () => {
        // Actualizar tabla de páginas de la víctima
        setProcesses(prev => prev.map(p => {
          if (p.id !== victim.procId) return p;
          return {
            ...p,
            segments: p.segments.map((s, si) => {
              if (si !== victim.segIdx) return s;
              return {
                ...s,
                pageTable: s.pageTable.map(pg =>
                  pg.pageNum === victim.pageNum ? { ...pg, frame: null, valid: false } : pg
                ),
              };
            }),
          };
        }));
        // Añadir página víctima al disco
        if (victimProc) {
          setDiskPages(prev => [...prev, {
            procId: victim.procId,
            segIdx: victim.segIdx,
            segType: victimProc.segments[victim.segIdx]?.segType || '?',
            pageNum: victim.pageNum,
            color: victimProc.color,
          }]);
        }
        // Limpiar refs de seguimiento
        frameQueueRef.current = frameQueueRef.current.filter(e => e.frame !== victim.frame);
        delete frameLastAccessRef.current[victim.frame];
        // Invalidar TLB si aplica
        if (isTlbEnabled) {
          setTlbEntries(prev => prev.filter(
            e => !(e.procId === victim.procId && e.segNum === victim.segIdx && e.pageNum === victim.pageNum)
          ));
        }
        setEvictingFrame(null);
        setFlowAction(null);
        addLog(`Marco F${victim.frame} liberado. Página víctima enviada al disco.`, 'warning');
      },
    });
  } else if (!needsReplacement) {
    steps.push({
      action: 'FRAME_ASSIGN',
      desc: `SO asigna Marco libre F${assignedFrame} desde la Free Frame List al proceso ${pid}.`,
      execute: () => {
        setFreeFrameList(prev => prev.filter(f => f !== assignedFrame));
        addLog(`Marco libre F${assignedFrame} asignado para Seg ${segIdx} Pág ${pageNum}`, 'info');
      },
    });
  }

  // ── 6. Cargar desde disco ─────────────────────────────────────
  steps.push({
    action: 'DISK_TO_RAM',
    desc: `SO copia Pág ${pageNum} del Seg ${segIdx} (Proc ${pid}) desde el Disco al Marco F${assignedFrame} en RAM.`,
    execute: () => {
      setActiveDiskEntry({ procId: pid, segIdx, pageNum });
      setFlowAction('DISK_TO_RAM');
      setActiveFrame(assignedFrame);
    },
  });

  // ── 7. Actualizar tabla de páginas ────────────────────────────
  steps.push({
    action: 'TABLE_UPDATE',
    desc: `Tabla de Páginas de Seg ${segIdx} actualizada: Pág ${pageNum} → Marco F${assignedFrame}, bit V: 0→1.`,
    execute: () => {
      setProcesses(prev => prev.map(p => {
        if (p.id !== pid) return p;
        return {
          ...p,
          segments: p.segments.map((s, si) => {
            if (si !== segIdx) return s;
            return {
              ...s,
              pageTable: s.pageTable.map(pg =>
                pg.pageNum === pageNum ? { ...pg, frame: assignedFrame, valid: true } : pg
              ),
            };
          }),
        };
      }));
      // Quitar del disco
      setDiskPages(prev => prev.filter(
        dp => !(dp.procId === pid && dp.segIdx === segIdx && dp.pageNum === pageNum)
      ));
      // Registrar en refs de seguimiento
      frameQueueRef.current.push({ frame: assignedFrame, procId: pid, segIdx, pageNum });
      frameLastAccessRef.current[assignedFrame] = Date.now();

      setActiveDiskEntry(null);
      setFlowAction('MMU_TO_RAM');
      addLog(`Pág ${pageNum} de Seg ${segIdx} (${pid}) cargada en Marco F${assignedFrame} ✅`, 'success');
    },
  });

  // ── 8. Actualizar TLB (opcional) ─────────────────────────────
  if (isTlbEnabled) {
    steps.push({
      action: 'TLB_UPDATE',
      desc: `TLB actualizada: (${pid}, Seg ${segIdx}, Pág ${pageNum}) → F${assignedFrame}.`,
      execute: () => {
        setTlbEntries(prev => {
          const filtered = prev.filter(
            e => !(e.procId === pid && e.segNum === segIdx && e.pageNum === pageNum)
          );
          return [{ procId: pid, segNum: segIdx, pageNum, frame: assignedFrame }, ...filtered].slice(0, 4);
        });
        addLog(`TLB UPDATE: Seg ${segIdx} Pág ${pageNum} → F${assignedFrame} guardado en caché`, 'info');
      },
    });
  }

  // ── 9. DONE ──────────────────────────────────────────────────
  steps.push({
    action: 'DONE',
    desc: `✅ Page Fault resuelto. Proceso ${pid} reanudado. Dir. Física = F${assignedFrame} × ${pageSizeKB}KB + ${frameOffset} KB.`,
    execute: () => {
      setFlowAction(null);
      setActiveFrame(null);
      setActiveSegNum(null);
      setIsTlbHit(false);
    },
  });

  return { steps, error: null };
}
