/**
 * buildSimulationSteps.js
 * Cola de pasos para el modo "Paso a Paso" — acceso NORMAL (página ya en RAM).
 *
 * Flujo sin TLB:
 *   CPU → MMU → Tabla Segmentos → Tabla Páginas → RAM
 *
 * Flujo con TLB HIT:
 *   CPU → MMU → TLB HIT → RAM  (saltea tablas en memoria)
 *
 * Flujo con TLB MISS:
 *   CPU → MMU → TLB MISS → Tabla Segmentos → Tabla Páginas → TLB UPDATE → RAM
 */

/**
 * buildAccessSteps
 * @param {object} params
 * @returns {Array} steps — [{ action, desc, execute }]
 */
export function buildAccessSteps({
  pid, segIdx, pageNum, frame, pageSizeKB, frameOffset,
  isTlbEnabled, tlbEntries,
  setFlowAction, setActiveSegNum, setActiveFrame,
  setIsTlbHit, setTlbStats, setTlbEntries, addLog,
}) {
  const steps = [];

  // ── Paso 1: CPU → MMU ─────────────────────────────────────────
  steps.push({
    action: 'CPU_TO_MMU',
    desc: `CPU genera dirección lógica → Seg ${segIdx}, Pág ${pageNum}. La envía a la MMU.`,
    execute: () => {
      setFlowAction('CPU_TO_MMU');
      setActiveSegNum(segIdx);
    },
  });

  if (isTlbEnabled) {
    // ── Paso 2: Buscar en TLB ─────────────────────────────────
    steps.push({
      action: 'TLB_SEARCH',
      desc: `MMU busca (Seg ${segIdx}, Pág ${pageNum}) en la TLB antes de consultar las tablas en RAM.`,
      execute: () => {
        setFlowAction('TLB_SEARCH');
        setTlbStats(prev => ({ ...prev, accesses: prev.accesses + 1 }));
      },
    });

    const tlbHit = tlbEntries.find(
      e => e.procId === pid && e.segNum === segIdx && e.pageNum === pageNum
    );

    if (tlbHit) {
      // ── TLB HIT ──────────────────────────────────────────────
      steps.push({
        action: 'TLB_HIT',
        desc: `TLB HIT ✅ — Traducción encontrada en caché: Seg ${segIdx} Pág ${pageNum} → Marco F${tlbHit.frame}. No se accede a tablas en RAM.`,
        execute: () => {
          setIsTlbHit(true);
          setTlbStats(prev => ({ ...prev, hits: prev.hits + 1 }));
          setFlowAction('TLB_HIT');
          addLog(`TLB HIT: Seg ${segIdx} Pág ${pageNum} → Marco F${tlbHit.frame}`, 'success');
        },
      });

      steps.push({
        action: 'MMU_TO_RAM',
        desc: `MMU genera dirección física: F${tlbHit.frame} × ${pageSizeKB}KB + ${frameOffset} KB. Accediendo a RAM...`,
        execute: () => {
          setFlowAction('MMU_TO_RAM');
          setActiveFrame(tlbHit.frame);
        },
      });

      steps.push({
        action: 'DONE',
        desc: `✅ Acceso completado. Dir. Física = ${tlbHit.frame * pageSizeKB + frameOffset} KB.`,
        execute: () => {
          setFlowAction(null);
          setIsTlbHit(false);
          setActiveSegNum(null);
          setActiveFrame(null);
        },
      });

      return steps; // Termina aquí por TLB HIT
    }

    // ── TLB MISS ──────────────────────────────────────────────
    steps.push({
      action: 'TLB_MISS',
      desc: `TLB MISS ❌ — (Seg ${segIdx}, Pág ${pageNum}) no está en caché. MMU debe consultar las tablas en memoria principal.`,
      execute: () => {
        setIsTlbHit(false);
        setFlowAction('TLB_MISS');
        addLog(`TLB MISS: Seg ${segIdx} Pág ${pageNum} — consultando tablas en RAM`, 'warning');
      },
    });
  }

  // ── Paso: Tabla de Segmentos ─────────────────────────────────
  steps.push({
    action: 'MMU_SEARCH',
    desc: `MMU consulta Tabla de Segmentos → encuentra Seg ${segIdx}. Ahora busca en su Tabla de Páginas.`,
    execute: () => {
      setFlowAction('MMU_SEARCH');
    },
  });

  // ── Paso: Tabla de Páginas ───────────────────────────────────
  steps.push({
    action: 'PAGE_TABLE_HIT',
    desc: `Tabla de Páginas de Seg ${segIdx}: Pág ${pageNum} → Marco F${frame} (bit V=1, página en RAM). ✅`,
    execute: () => {
      setFlowAction('PAGE_TABLE_HIT');
      if (isTlbEnabled) {
        setTlbEntries(prev => {
          const filtered = prev.filter(
            e => !(e.procId === pid && e.segNum === segIdx && e.pageNum === pageNum)
          );
          return [{ procId: pid, segNum: segIdx, pageNum, frame }, ...filtered].slice(0, 4);
        });
        addLog(`TLB UPDATE: (Seg ${segIdx}, Pág ${pageNum}) → F${frame} guardado en caché`, 'info');
      }
    },
  });

  // ── Paso: MMU → RAM ──────────────────────────────────────────
  steps.push({
    action: 'MMU_TO_RAM',
    desc: `MMU genera dirección física: F${frame} × ${pageSizeKB}KB + ${frameOffset} KB. Accediendo a Marco F${frame} en RAM...`,
    execute: () => {
      setFlowAction('MMU_TO_RAM');
      setActiveFrame(frame);
    },
  });

  // ── Paso final ───────────────────────────────────────────────
  steps.push({
    action: 'DONE',
    desc: `✅ Acceso completado. Dir. Física = ${frame * pageSizeKB + frameOffset} KB. Marco F${frame} devuelve el dato.`,
    execute: () => {
      setFlowAction(null);
      setIsTlbHit(false);
      setActiveSegNum(null);
      setActiveFrame(null);
    },
  });

  return steps;
}
