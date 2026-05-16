/**
 * buildSimulationSteps.js
 * Construye la cola de pasos para el modo Paso a Paso.
 * Cada paso: { action, desc, execute }
 */

import { translate, checkTlb, updateTlb } from './addressTranslation.js';

/**
 * buildAccessSteps
 * Genera los pasos para simular un acceso a memoria lógica <segNum, offset>
 */
export function buildAccessSteps({
  proc, segNum, offset,
  isTlbEnabled, tlbEntries,
  setFlowAction, setActiveSegNum, setActiveRamBase,
  setIsTlbHit, setTlbStats, setTlbEntries,
  addLog,
}) {
  const steps = [];
  const segment = proc.segments[segNum];

  // Paso 1: CPU → MMU
  steps.push({
    action: 'CPU_TO_MMU',
    desc: `CPU envía dirección lógica: <Segmento ${segNum}, Offset ${offset}> del proceso ${proc.id}`,
    execute: () => {
      setFlowAction('CPU_TO_MMU');
      setActiveSegNum(segNum);
    },
  });

  if (isTlbEnabled) {
    const hit = checkTlb(tlbEntries, proc.id, segNum);

    // Paso 2: Buscar en TLB
    steps.push({
      action: 'TLB_SEARCH',
      desc: `MMU busca en la TLB: ${proc.id} Segmento ${segNum}`,
      execute: () => {
        setFlowAction('TLB_SEARCH');
        setTlbStats(prev => ({ ...prev, accesses: prev.accesses + 1 }));
      },
    });

    if (hit) {
      // Verificar límite desde TLB
      if (offset >= hit.limit) {
        steps.push({
          action: 'SEG_FAULT',
          desc: `🚫 ¡SEGMENTATION FAULT! (TLB) Offset ${offset} ≥ Límite ${hit.limit}`,
          execute: () => {
            setFlowAction('SEG_FAULT');
            setTlbStats(prev => ({ ...prev, hits: prev.hits + 1 }));
            setIsTlbHit(true);
            addLog(`TLB HIT luego SEG FAULT: ${proc.id} Seg ${segNum} — Offset ${offset} ≥ ${hit.limit}`, 'error');
          },
        });
      } else {
        steps.push({
          action: 'TLB_HIT',
          desc: `✅ TLB HIT! Segmento ${segNum} → Base=${hit.base} KB (sin consultar tabla)`,
          execute: () => {
            setIsTlbHit(true);
            setTlbStats(prev => ({ ...prev, hits: prev.hits + 1 }));
            setFlowAction('TLB_HIT');
            addLog(`TLB HIT: ${proc.id} Seg ${segNum} → Base ${hit.base} KB, Dir. Física = ${hit.base + offset} KB`, 'success');
          },
        });
        steps.push({
          action: 'MMU_TO_RAM',
          desc: `Acceso directo al bloque de RAM en base ${hit.base} KB (Dir. Física = ${hit.base + offset} KB)`,
          execute: () => {
            setFlowAction('MMU_TO_RAM');
            setActiveRamBase(hit.base);
          },
        });
      }
    } else {
      // TLB MISS
      steps.push({
        action: 'TLB_MISS',
        desc: `TLB MISS: Segmento ${segNum} no está en caché → consultar Tabla de Segmentos`,
        execute: () => {
          setIsTlbHit(false);
          setFlowAction('TLB_MISS');
          addLog(`TLB MISS: ${proc.id} Seg ${segNum} no en TLB`, 'warning');
        },
      });

      if (!segment || segment.base === null) {
        steps.push({
          action: 'SEG_FAULT',
          desc: `⚠️ Segmento ${segNum} no está cargado en RAM (base = null)`,
          execute: () => {
            setFlowAction('SEG_FAULT');
            addLog(`Segmento ${segNum} de ${proc.id} no está en RAM`, 'error');
          },
        });
      } else {
        const { ok, physicalAddress, error } = translate(segment, offset);

        steps.push({
          action: 'TLB_UPDATE',
          desc: `TLB actualizada: ${proc.id} Seg ${segNum} → Base ${segment.base} KB, Límite ${segment.limit} KB`,
          execute: () => {
            setTlbEntries(prev => updateTlb(prev, proc.id, segNum, segment.base, segment.limit));
            addLog(`TLB UPDATE: ${proc.id} Seg ${segNum} guardado`);
          },
        });

        steps.push({
          action: 'MMU_SEARCH',
          desc: `MMU consulta Tabla de Segmentos: Seg ${segNum} → Base=${segment.base}, Límite=${segment.limit}`,
          execute: () => setFlowAction('MMU_SEARCH'),
        });

        if (ok) {
          steps.push({
            action: 'MMU_TO_RAM',
            desc: `Verificación OK (${offset} < ${segment.limit}) → Dir. Física = ${physicalAddress} KB`,
            execute: () => {
              setFlowAction('MMU_TO_RAM');
              setActiveRamBase(segment.base);
              addLog(`Acceso OK: Dir. Física = ${physicalAddress} KB`, 'success');
            },
          });
        } else {
          steps.push({
            action: 'SEG_FAULT',
            desc: `🚫 ${error}`,
            execute: () => {
              setFlowAction('SEG_FAULT');
              addLog(error, 'error');
            },
          });
        }
      }
    }
  } else {
    // Sin TLB
    if (!segment || segment.base === null) {
      steps.push({
        action: 'SEG_FAULT',
        desc: `Segmento ${segNum} no está cargado en RAM`,
        execute: () => {
          setFlowAction('SEG_FAULT');
          addLog(`Segmento ${segNum} de ${proc.id} no está en RAM`, 'error');
        },
      });
    } else {
      const { ok, physicalAddress, error } = translate(segment, offset);
      steps.push({
        action: 'MMU_SEARCH',
        desc: `MMU consulta Tabla de Segmentos: Seg ${segNum} → Base=${segment.base}, Límite=${segment.limit}`,
        execute: () => setFlowAction('MMU_SEARCH'),
      });

      if (ok) {
        steps.push({
          action: 'MMU_TO_RAM',
          desc: `Verificación OK (offset ${offset} < límite ${segment.limit}) → Dir. Física = ${physicalAddress} KB`,
          execute: () => {
            setFlowAction('MMU_TO_RAM');
            setActiveRamBase(segment.base);
            addLog(`Acceso OK: Dir. Física = ${physicalAddress} KB`, 'success');
          },
        });
      } else {
        steps.push({
          action: 'SEG_FAULT',
          desc: `🚫 ${error}`,
          execute: () => {
            setFlowAction('SEG_FAULT');
            addLog(error, 'error');
          },
        });
      }
    }
  }

  steps.push({
    action: 'DONE',
    desc: `✅ Ciclo de traducción completado para Seg ${segNum}, Offset ${offset}`,
    execute: () => setFlowAction(null),
  });

  return steps;
}
