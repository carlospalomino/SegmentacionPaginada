import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import { CPU } from './components/CPU';
import MMU from './components/MMU';
import RAM from './components/RAM';
import Disk from './components/Disk';
import { Connector, Footer } from './components/Common';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import HelpModal from './components/HelpModal';
import { SEG_TYPES } from './constants/segTypes.js';

import { allocate, compactMemory } from './logic/memoryAllocation.js';
import { translate, checkTlb, updateTlb } from './logic/addressTranslation.js';
import { buildAccessSteps } from './logic/buildSimulationSteps.js';
import { swapOut, swapIn } from './logic/swapping.js';
import { growSegment } from './logic/segmentGrowth.js';

// Namespace único para contadores globales
const COUNTER_NS = 'simulador-segmentacion-simple-utp';

// Colores de proceso
const PROC_COLORS = ['#00f2ff','#a855f7','#10b981','#f59e0b','#ec4899','#6366f1'];

// Default
const DEFAULT_RAM_KB = 128;

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [ramSizeKB, setRamSizeKB] = useState(DEFAULT_RAM_KB);
  const [allocationAlgo, setAllocationAlgo] = useState('FIRST');

  // Contador global
  const [visitCount, setVisitCount] = useState(0);
  const [globalSims, setGlobalSims] = useState(0);
  const [sessionSims, setSessionSims] = useState(0);

  // Procesos: cada proceso = { id, color, totalSize, segments: [{ segType, color, size, base, limit }] }
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [nextPid, setNextPid] = useState(1);

  // Config nuevo proceso (tamaño de cada segmento)
  const [newProcConfig, setNewProcConfig] = useState({ code: 8, data: 4, heap: 6, stack: 5 });

  // Lista de huecos libres: [{ start, size }]
  const [holeList, setHoleList] = useState([{ start: 0, size: DEFAULT_RAM_KB }]);

  // Disco (Backing Store): tamaño = 2 × RAM
  const [isSwappingEnabled, setIsSwappingEnabled] = useState(false);
  const [diskProcs, setDiskProcs] = useState([]);
  const [isSwapping, setIsSwapping] = useState(false);
  const [activeSwapProcId, setActiveSwapProcId] = useState(null);

  // TLB
  const [isTlbEnabled, setIsTlbEnabled] = useState(false);
  const [tlbEntries, setTlbEntries] = useState([]);
  const [tlbStats, setTlbStats] = useState({ hits: 0, accesses: 0 });
  const [isTlbHit, setIsTlbHit] = useState(false);

  // Animaciones y estado activo
  const [flowAction, setFlowAction] = useState(null);
  const [activeSegNum, setActiveSegNum] = useState(null);
  const [activeRamBase, setActiveRamBase] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [offset, setOffset] = useState(2);

  // Métricas
  const [segFaults, setSegFaults] = useState(0);
  const [trapCount, setTrapCount] = useState(0);
  const [totalAccesses, setTotalAccesses] = useState(0);

  // Logs
  const [logs, setLogs] = useState([]);

  // Compaction
  const [isCompacting, setIsCompacting] = useState(false);

  // Segment Growth
  const [growingBase, setGrowingBase] = useState(null);
  const [growStrategy, setGrowStrategy] = useState(null);

  // Modo paso a paso
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const [stepQueue, setStepQueue] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  // Contadores globales (abacus)
  useEffect(() => {
    fetch(`https://abacus.jasoncameron.dev/hit/${COUNTER_NS}/visitas`)
      .then(r => r.json()).then(d => setVisitCount(d.value)).catch(() => {});
    fetch(`https://abacus.jasoncameron.dev/get/${COUNTER_NS}/simulaciones`)
      .then(r => r.json()).then(d => setGlobalSims(d.value)).catch(() => {});
  }, []);

  const incrementSimCounter = useCallback(() => {
    setSessionSims(p => p + 1);
    fetch(`https://abacus.jasoncameron.dev/hit/${COUNTER_NS}/simulaciones`)
      .then(r => r.json()).then(d => setGlobalSims(d.value)).catch(() => {});
  }, []);

  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ id: Date.now() + Math.random(), time, msg, type }, ...prev].slice(0, 25));
  }, []);

  // ─────────────────────────────────────────────────────
  // CREAR PROCESO
  // ─────────────────────────────────────────────────────
  const addProcess = useCallback(async () => {
    const newProcId = `P${nextPid}`;
    const color = PROC_COLORS[(nextPid - 1) % PROC_COLORS.length];

    // Construir segmentos
    const segDefs = SEG_TYPES.map(({ key, type, color: segColor }) => ({
      segType: type,
      key,
      color: segColor,
      size: newProcConfig[key],
      limit: newProcConfig[key],
      base: null,
    }));

    const totalSize = segDefs.reduce((acc, s) => acc + s.size, 0);

    // Intentar asignar cada segmento en la RAM
    let currentHoles = [...holeList];
    const assignedSegs = [];
    let failed = false;

    setFlowAction('CPU_TO_MMU');
    await new Promise(r => setTimeout(r, 400));

    for (const seg of segDefs) {
      const result = allocate(currentHoles, seg.size, allocationAlgo);
      if (!result) {
        failed = true;
        addLog(`⚠️ Sin espacio para el segmento "${seg.segType}" de ${newProcId} (${seg.size} KB). RAM fragmentada — intenta Compactar.`, 'error');
        break;
      }
      currentHoles = result.newHoles;
      assignedSegs.push({ ...seg, base: result.base });
    }

    setFlowAction(null);

    if (failed) {
      // Liberar los segmentos ya asignados (rollback parcial)
      addLog(`Proceso ${newProcId} NO pudo cargarse completamente.`, 'error');
      return;
    }

    const newProc = {
      id: newProcId,
      color,
      totalSize,
      segments: assignedSegs,
    };

    setProcesses(prev => [...prev, newProc]);
    setHoleList(currentHoles);
    setSelectedProcessId(newProcId);
    setNextPid(p => p + 1);
    incrementSimCounter();
    addLog(`Proceso ${newProcId} cargado en RAM (${totalSize} KB, ${segDefs.length} segmentos, algoritmo: ${allocationAlgo} Fit).`, 'success');
  }, [nextPid, newProcConfig, holeList, allocationAlgo, incrementSimCounter, addLog]);

  // ─────────────────────────────────────────────────────
  // ELIMINAR PROCESO (termina en RAM, no va al disco)
  // ─────────────────────────────────────────────────────
  const removeProcess = useCallback((id) => {
    const proc = processes.find(p => p.id === id);
    if (!proc) return;
    // Usamos swapOut solo para el cálculo de huecos (sin escribir al disco)
    const result = swapOut(id, processes, holeList, diskProcs, Infinity);
    if (!result.ok) { addLog(result.error, 'error'); return; }
    setProcesses(result.newProcesses);
    setHoleList(result.newHoleList);
    setTlbEntries(prev => prev.filter(e => e.procId !== id));
    if (selectedProcessId === id) setSelectedProcessId(null);
    addLog(`Proceso ${id} terminado. ${proc.totalSize} KB liberados.`, 'warning');
  }, [processes, holeList, diskProcs, selectedProcessId, addLog]);

  // ─────────────────────────────────────────────────────
  // SWAP OUT — expulsar proceso de RAM al disco
  // ─────────────────────────────────────────────────────
  const handleSwapOut = useCallback(async (id) => {
    if (isSwapping) return;
    const diskSizeKB = ramSizeKB * 2;
    setIsSwapping(true);
    setActiveSwapProcId(id);
    setFlowAction('RAM_TO_DISK');
    addLog(`⏳ Swap Out: expulsando proceso ${id} a disco...`, 'warning');
    await new Promise(r => setTimeout(r, 800));

    const result = swapOut(id, processes, holeList, diskProcs, diskSizeKB);
    if (!result.ok) {
      addLog(`❌ Swap Out fallido: ${result.error}`, 'error');
    } else {
      setProcesses(result.newProcesses);
      setHoleList(result.newHoleList);
      setDiskProcs(result.newDiskProcs);
      setTlbEntries(prev => prev.filter(e => e.procId !== id));
      if (selectedProcessId === id) setSelectedProcessId(null);
      addLog(`✅ Swap Out OK: ${id} en disco. ${result.freedKB} KB liberados en RAM.`, 'success');
    }

    setFlowAction(null);
    setActiveSwapProcId(null);
    setIsSwapping(false);
  }, [isSwapping, processes, holeList, diskProcs, ramSizeKB, selectedProcessId, addLog]);

  // ─────────────────────────────────────────────────────
  // SWAP IN — traer proceso del disco a la RAM
  // ─────────────────────────────────────────────────────
  const handleSwapIn = useCallback(async (id) => {
    if (isSwapping) return;
    setIsSwapping(true);
    setActiveSwapProcId(id);
    setFlowAction('DISK_TO_RAM');
    addLog(`⏳ Swap In: cargando proceso ${id} desde disco...`, 'warning');
    await new Promise(r => setTimeout(r, 800));

    const result = swapIn(id, diskProcs, processes, holeList, allocationAlgo);
    if (!result.ok) {
      addLog(`❌ Swap In fallido: ${result.error}`, 'error');
    } else {
      setProcesses(result.newProcesses);
      setHoleList(result.newHoleList);
      setDiskProcs(result.newDiskProcs);
      setSelectedProcessId(id);
      addLog(`✅ Swap In OK: ${id} cargado en RAM (${allocationAlgo} Fit).`, 'success');
    }

    setFlowAction(null);
    setActiveSwapProcId(null);
    setIsSwapping(false);
  }, [isSwapping, diskProcs, processes, holeList, allocationAlgo, addLog]);

  // ─────────────────────────────────────────────────────
  // CRECER SEGMENTO
  // ─────────────────────────────────────────────────────
  const handleGrowSegment = useCallback(async (procId, segIdx, deltaKB) => {
    if (isTranslating || isCompacting || isSwapping) return;
    const proc = processes.find(p => p.id === procId);
    if (!proc) return;
    const seg = proc.segments[segIdx];
    if (!seg || seg.base === null) return;

    setFlowAction('CPU_TO_MMU');
    await new Promise(r => setTimeout(r, 400));
    setFlowAction('MMU_SEARCH');
    await new Promise(r => setTimeout(r, 500));

    const result = growSegment(procId, segIdx, deltaKB, processes, holeList, allocationAlgo);

    // Mostrar animación en el bloque de RAM
    const targetBase = result.strategy === 'RELOCATE' ? result.newBase : seg.base;
    setGrowingBase(targetBase);
    setGrowStrategy(result.strategy);

    if (result.strategy === 'IN_PLACE') {
      setFlowAction('MMU_TO_RAM');
      addLog(`✅ ${proc.id} ${seg.segType}: IN-PLACE +${deltaKB} KB (${seg.size} → ${result.newSize} KB). Límite actualizado.`, 'success');
    } else if (result.strategy === 'RELOCATE') {
      setFlowAction('MMU_TO_RAM');
      addLog(`⚠️ ${proc.id} ${seg.segType}: REUBICADO a base ${result.newBase} KB (+${deltaKB} KB). TLB invalidada.`, 'warning');
      // Invalidar entrada TLB del segmento movido
      setTlbEntries(prev => prev.filter(e => !(e.procId === procId && e.segNum === segIdx)));
    } else {
      setFlowAction('SEG_FAULT');
      addLog(`❌ ${proc.id} ${seg.segType}: SIN ESPACIO para +${deltaKB} KB. ${result.error}`, 'error');
    }

    if (result.strategy !== 'FAIL') {
      setProcesses(result.newProcesses);
      setHoleList(result.newHoleList);
    }

    await new Promise(r => setTimeout(r, 900));
    setGrowingBase(null);
    setGrowStrategy(null);
    setFlowAction(null);
  }, [isTranslating, isCompacting, isSwapping, processes, holeList, allocationAlgo, addLog]);

  // ─────────────────────────────────────────────────────
  // COMPACTACIÓN
  // ─────────────────────────────────────────────────────
  const handleCompact = useCallback(async () => {
    if (isCompacting || processes.length === 0) return;
    setIsCompacting(true);
    addLog('⚡ Iniciando Compactación de RAM...', 'warning');
    setFlowAction('CPU_TO_MMU');
    await new Promise(r => setTimeout(r, 600));

    // Reunir todos los segmentos cargados
    const allSegs = processes.flatMap(p =>
      p.segments.filter(s => s.base !== null).map(s => ({ ...s, procId: p.id }))
    );
    const { newSegments, newHoles } = compactMemory(allSegs, ramSizeKB);

    // Reasignar bases en los procesos
    setProcesses(prev => prev.map(p => ({
      ...p,
      segments: p.segments.map(seg => {
        const moved = newSegments.find(s => s.procId === p.id && s.segType === seg.segType);
        return moved ? { ...seg, base: moved.base } : seg;
      }),
    })));

    // Invalidar TLB (las bases cambiaron)
    setTlbEntries([]);
    setHoleList(newHoles);

    setFlowAction(null);
    setIsCompacting(false);
    addLog(`Compactación completada. Hueco libre unificado: ${newHoles[0]?.size ?? 0} KB al final.`, 'success');
  }, [isCompacting, processes, ramSizeKB, addLog]);

  // ─────────────────────────────────────────────────────
  // SIMULAR ACCESO
  // ─────────────────────────────────────────────────────
  const simulateAccess = useCallback(async (segNum) => {
    if (isTranslating || !selectedProcessId) return;
    const proc = processes.find(p => p.id === selectedProcessId);
    if (!proc) return;

    setTotalAccesses(p => p + 1);
    setIsTranslating(true);
    setActiveSegNum(segNum);
    setActiveRamBase(null);

    if (stepByStepMode) {
      const steps = buildAccessSteps({
        proc, segNum, offset,
        isTlbEnabled, tlbEntries,
        setFlowAction, setActiveSegNum, setActiveRamBase,
        setIsTlbHit, setTlbStats, setTlbEntries,
        addLog,
      });
      setStepQueue(steps);
      setCurrentStepIndex(0);
      steps[0].execute();
      return;
    }

    // Modo automático
    setFlowAction('CPU_TO_MMU');
    await new Promise(r => setTimeout(r, 500));

    const seg = proc.segments[segNum];

    if (isTlbEnabled) {
      setFlowAction('TLB_SEARCH');
      setTlbStats(p => ({ ...p, accesses: p.accesses + 1 }));
      await new Promise(r => setTimeout(r, 500));

      const hit = checkTlb(tlbEntries, proc.id, segNum);
      if (hit) {
        setIsTlbHit(true);
        setTlbStats(p => ({ ...p, hits: p.hits + 1 }));
        setFlowAction('TLB_HIT');
        addLog(`TLB HIT: ${proc.id} Seg ${segNum} → Base ${hit.base} KB`, 'success');
        await new Promise(r => setTimeout(r, 600));

        if (offset >= hit.limit) {
          setFlowAction('SEG_FAULT');
          setSegFaults(p => p + 1);
          setTrapCount(p => p + 1);
          addLog(`🚫 SEG FAULT (TLB): Offset ${offset} ≥ Límite ${hit.limit}`, 'error');
          await new Promise(r => setTimeout(r, 1200));
        } else {
          setFlowAction('MMU_TO_RAM');
          setActiveRamBase(hit.base);
          incrementSimCounter();
          addLog(`Acceso OK (TLB): Dir. Física = ${hit.base + offset} KB`, 'success');
          await new Promise(r => setTimeout(r, 1000));
        }
      } else {
        setIsTlbHit(false);
        setFlowAction('TLB_MISS');
        addLog(`TLB MISS: ${proc.id} Seg ${segNum}`, 'warning');
        await new Promise(r => setTimeout(r, 700));

        if (seg && seg.base !== null) {
          setTlbEntries(prev => updateTlb(prev, proc.id, segNum, seg.base, seg.limit));
        }
        setFlowAction('MMU_SEARCH');
        await new Promise(r => setTimeout(r, 700));

        if (!seg || seg.base === null) {
          setFlowAction('SEG_FAULT');
          setSegFaults(p => p + 1);
          addLog(`Segmento ${segNum} no está en RAM`, 'error');
          await new Promise(r => setTimeout(r, 1200));
        } else {
          const { ok, physicalAddress, error } = translate(seg, offset);
          if (ok) {
            setFlowAction('MMU_TO_RAM');
            setActiveRamBase(seg.base);
            incrementSimCounter();
            addLog(`Acceso OK: Dir. Física = ${physicalAddress} KB`, 'success');
            await new Promise(r => setTimeout(r, 1000));
          } else {
            setFlowAction('SEG_FAULT');
            setSegFaults(p => p + 1);
            setTrapCount(p => p + 1);
            addLog(error, 'error');
            await new Promise(r => setTimeout(r, 1200));
          }
        }
      }
    } else {
      // Sin TLB
      setFlowAction('MMU_SEARCH');
      await new Promise(r => setTimeout(r, 700));

      if (!seg || seg.base === null) {
        setFlowAction('SEG_FAULT');
        setSegFaults(p => p + 1);
        addLog(`Segmento ${segNum} no está en RAM`, 'error');
        await new Promise(r => setTimeout(r, 1200));
      } else {
        const { ok, physicalAddress, error } = translate(seg, offset);
        if (ok) {
          setFlowAction('MMU_TO_RAM');
          setActiveRamBase(seg.base);
          incrementSimCounter();
          addLog(`Acceso OK: Dir. Física = ${physicalAddress} KB`, 'success');
          await new Promise(r => setTimeout(r, 1000));
        } else {
          setFlowAction('SEG_FAULT');
          setSegFaults(p => p + 1);
          setTrapCount(p => p + 1);
          addLog(error, 'error');
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }

    setFlowAction(null);
    await new Promise(r => setTimeout(r, 1500));
    setIsTranslating(false);
    setIsTlbHit(false);
    setActiveSegNum(null);
    setActiveRamBase(null);
  }, [isTranslating, selectedProcessId, processes, offset, isTlbEnabled, tlbEntries, stepByStepMode, addLog, incrementSimCounter]);

  // ─────────────────────────────────────────────────────
  // PASO A PASO
  // ─────────────────────────────────────────────────────
  const nextStep = () => {
    if (currentStepIndex >= stepQueue.length - 1) { cancelSteps(); return; }
    const next = currentStepIndex + 1;
    setCurrentStepIndex(next);
    stepQueue[next].execute();
  };

  const prevStep = () => {
    if (currentStepIndex <= 0) return;
    setFlowAction(null); setActiveRamBase(null); setIsTlbHit(false);
    const prev = currentStepIndex - 1;
    for (let i = 0; i <= prev; i++) stepQueue[i].execute();
    setCurrentStepIndex(prev);
  };

  const cancelSteps = () => {
    setStepQueue([]); setCurrentStepIndex(-1);
    setFlowAction(null); setIsTranslating(false);
    setIsTlbHit(false); setActiveSegNum(null); setActiveRamBase(null);
  };

  // ─────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────
  const resetSimulator = useCallback(() => {
    setProcesses([]);
    setDiskProcs([]);
    setHoleList([{ start: 0, size: ramSizeKB }]);
    setNextPid(1);
    setSelectedProcessId(null);
    setTlbEntries([]);
    setTlbStats({ hits: 0, accesses: 0 });
    setLogs([]);
    setSegFaults(0);
    setTrapCount(0);
    setTotalAccesses(0);
    setFlowAction(null);
    setActiveSegNum(null);
    setActiveRamBase(null);
    setIsTranslating(false);
    setIsSwapping(false);
    setActiveSwapProcId(null);
    cancelSteps();
  }, [ramSizeKB]);

  const handleApplySettings = useCallback(() => {
    resetSimulator();
    setHoleList([{ start: 0, size: ramSizeKB }]);
  }, [resetSimulator, ramSizeKB]);

  // ─────────────────────────────────────────────────────
  // DATOS DERIVADOS
  // ─────────────────────────────────────────────────────
  const selectedProcess = useMemo(
    () => processes.find(p => p.id === selectedProcessId),
    [processes, selectedProcessId]
  );

  // Construir lista de bloques para renderizar en RAM (segmentos + huecos intercalados)
  const ramBlocks = useMemo(() => {
    const items = [];
    // Segmentos de todos los procesos
    processes.forEach(p => {
      p.segments.forEach(seg => {
        if (seg.base !== null) {
          items.push({ type: 'seg', ...seg, procId: p.id });
        }
      });
    });
    // Huecos
    holeList.forEach(h => items.push({ type: 'hole', start: h.start, size: h.size }));
    // Ordenar por dirección
    return items.sort((a, b) => (a.base ?? a.start) - (b.base ?? b.start));
  }, [processes, holeList]);

  const ramUsedKB = useMemo(() =>
    processes.flatMap(p => p.segments).reduce((acc, s) => acc + (s.base !== null ? s.size : 0), 0),
    [processes]
  );

  const fragKB = useMemo(() => holeList.reduce((a, h) => a + h.size, 0), [holeList]);
  const fragPct = ramSizeKB > 0 ? Math.round((fragKB / ramSizeKB) * 100) : 0;

  const metrics = {
    ramUsagePct: ramSizeKB > 0 ? Math.round((ramUsedKB / ramSizeKB) * 100) : 0,
    ramUsedKB, ramTotalKB: ramSizeKB,
    fragPct, fragKB, freeHoles: holeList.length,
    segFaults, totalAccesses,
    tlbHits: tlbStats.hits, tlbAccesses: tlbStats.accesses,
  };

  return (
    <div className="dashboard" style={{ minHeight: '100vh' }}>
      <Header
        darkMode={darkMode} setDarkMode={setDarkMode}
        ramUsedKB={ramUsedKB} ramTotalKB={ramSizeKB}
        segFaults={segFaults} trapCount={trapCount}
        resetSimulator={resetSimulator}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        isTlbEnabled={isTlbEnabled} setIsTlbEnabled={setIsTlbEnabled}
        isSwappingEnabled={isSwappingEnabled} setIsSwappingEnabled={setIsSwappingEnabled}
        stepByStepMode={stepByStepMode} setStepByStepMode={setStepByStepMode}
        allocationAlgo={allocationAlgo} setAllocationAlgo={setAllocationAlgo}
      />

      <main className="flow-viewport">
        <div className="nodes-container">
          <CPU
            processes={processes}
            selectedProcessId={selectedProcessId}
            setSelectedProcessId={setSelectedProcessId}
            newProcConfig={newProcConfig}
            setNewProcConfig={setNewProcConfig}
            addProcess={addProcess}
            removeProcess={removeProcess}
            activeSegNum={activeSegNum}
            offset={offset}
            setOffset={setOffset}
            flowAction={flowAction}
            growSegment={handleGrowSegment}
          />

          <Connector active={flowAction === 'CPU_TO_MMU'} color="var(--primary)" glow="var(--primary-glow)" />

          <MMU
            selectedProcess={selectedProcess}
            simulateAccess={simulateAccess}
            isTranslating={isTranslating}
            activeSegNum={activeSegNum}
            offset={offset}
            flowAction={flowAction}
            isTlbEnabled={isTlbEnabled}
            tlbEntries={tlbEntries}
          />

          <Connector
            active={flowAction === 'MMU_TO_RAM' || flowAction === 'MMU_SEARCH'}
            color="var(--secondary)"
            glow="var(--secondary-glow)"
          />

          <RAM
            ramBlocks={ramBlocks}
            totalRam={ramSizeKB}
            activeBase={activeRamBase}
            onCompact={handleCompact}
            isCompacting={isCompacting}
            onSwapOut={isSwappingEnabled ? handleSwapOut : null}
            isSwapping={isSwapping}
            growingBase={growingBase}
            growStrategy={growStrategy}
          />

          {isSwappingEnabled && (
            <>
              <Connector
                active={flowAction === 'RAM_TO_DISK' || flowAction === 'DISK_TO_RAM'}
                color="#f97316"
                glow="rgba(249,115,22,0.4)"
              />

              <Disk
                diskProcs={diskProcs}
                diskSizeKB={ramSizeKB * 2}
                flowAction={flowAction}
                activeSwapProcId={activeSwapProcId}
                onSwapIn={handleSwapIn}
                isSwapping={isSwapping}
              />
            </>
          )}
        </div>

        {/* Panel paso a paso */}
        {stepQueue.length > 0 && currentStepIndex >= 0 && (
          <div className="glass-card" style={{
            padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
            borderColor: flowAction === 'SEG_FAULT' ? 'var(--accent-red)' : 'var(--primary)',
            boxShadow: flowAction === 'SEG_FAULT' ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 20px var(--primary-glow)',
          }}>
            <div style={{
              background: flowAction === 'SEG_FAULT' ? 'var(--accent-red)' : 'var(--primary)',
              color: '#000', fontWeight: 'bold', fontSize: '0.75rem',
              padding: '4px 10px', borderRadius: '8px', flexShrink: 0,
            }}>
              {currentStepIndex + 1}/{stepQueue.length}
            </div>
            <p style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>
              {stepQueue[currentStepIndex]?.desc}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button onClick={prevStep} disabled={currentStepIndex <= 0}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: currentStepIndex <= 0 ? 'not-allowed' : 'pointer', opacity: currentStepIndex <= 0 ? 0.3 : 1, fontSize: '0.75rem', fontWeight: 600 }}>
                ← Anterior
              </button>
              <button onClick={nextStep}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: currentStepIndex >= stepQueue.length - 1 ? 'var(--tertiary)' : 'var(--primary)', color: '#000', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                {currentStepIndex >= stepQueue.length - 1 ? 'Finalizar ✓' : 'Siguiente →'}
              </button>
              <button onClick={cancelSteps}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--accent-red)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.7rem' }}>
                ✕
              </button>
            </div>
          </div>
        )}

        <Dashboard metrics={metrics} logs={logs} />

        <Footer visitCount={visitCount} globalSims={globalSims} sessionSims={sessionSims} />
      </main>

      <Settings
        isOpen={showSettings} onClose={() => setShowSettings(false)}
        ramSizeKB={ramSizeKB} setRamSizeKB={setRamSizeKB}
        onApply={handleApplySettings}
      />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
