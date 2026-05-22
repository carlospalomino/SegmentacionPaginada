import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import { CPU } from './components/CPU.jsx';
import MMU from './components/MMU.jsx';
import RAM from './components/RAM.jsx';
import Disk from './components/Disk.jsx';
import { Connector, Footer } from './components/Common.jsx';
import Dashboard from './components/Dashboard.jsx';
import Settings from './components/Settings.jsx';
import HelpModal from './components/HelpModal.jsx';
import Scenarios from './components/Scenarios.jsx';
import { SEG_TYPES } from './constants/segTypes.js';

import { buildPageTable } from './logic/memoryAllocation.js';
import { translate, checkTlb, updateTlb } from './logic/addressTranslation.js';
import { buildAccessSteps } from './logic/buildSimulationSteps.js';
import { buildPageFaultStepQueue } from './logic/buildPageFaultSteps.js';
import { selectVictim } from './logic/pageReplacement.js';

const COUNTER_NS = 'simulador-segpaginada-utp';
const PROC_COLORS = ['#00f2ff', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
const DEFAULT_RAM_KB = 64;
const DEFAULT_PAGE_KB = 4;

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [ramSizeKB, setRamSizeKB] = useState(DEFAULT_RAM_KB);
  const [pageSizeKB, setPageSizeKB] = useState(DEFAULT_PAGE_KB);
  const [replacementAlgo, setReplacementAlgo] = useState('FIFO');

  const TOTAL_FRAMES = Math.floor(ramSizeKB / pageSizeKB);

  const [visitCount, setVisitCount] = useState(0);
  const [globalSims, setGlobalSims] = useState(0);
  const [sessionSims, setSessionSims] = useState(0);

  // Procesos: { id, color, segments: [{ segType, color, size, limit, pageTable:[{pageNum,frame,valid}] }] }
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [nextPid, setNextPid] = useState(1);
  const [newProcConfig, setNewProcConfig] = useState({ code: 8, data: 4, heap: 6, stack: 5 });

  // Marcos libres
  const [freeFrameList, setFreeFrameList] = useState(() =>
    Array.from({ length: Math.floor(DEFAULT_RAM_KB / DEFAULT_PAGE_KB) }, (_, i) => i)
  );

  // Disco: páginas individuales { procId, segIdx, segType, pageNum, color }
  const [diskPages, setDiskPages] = useState([]);
  const [activeDiskEntry, setActiveDiskEntry] = useState(null);
  const [sharedCodeFrom, setSharedCodeFrom] = useState('');
  const [activeScenarioId, setActiveScenarioId] = useState(null);

  // TLB
  const [isTlbEnabled, setIsTlbEnabled] = useState(false);
  const [tlbEntries, setTlbEntries] = useState([]);
  const [tlbStats, setTlbStats] = useState({ hits: 0, accesses: 0 });
  const [isTlbHit, setIsTlbHit] = useState(false);

  // Animación
  const [flowAction, setFlowAction] = useState(null);
  const [activeSegNum, setActiveSegNum] = useState(null);
  const [activeFrame, setActiveFrame] = useState(null);
  const [evictingFrame, setEvictingFrame] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [offset, setOffset] = useState(2);

  // Métricas
  const [pageFaults, setPageFaults] = useState(0);
  const [totalAccesses, setTotalAccesses] = useState(0);
  const [logs, setLogs] = useState([]);

  // Paso a paso
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const [showFreeFrameList, setShowFreeFrameList] = useState(false);
  const [stepQueue, setStepQueue] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Refs para FIFO/LRU
  const frameQueueRef = useRef([]);
  const frameLastAccessRef = useRef({});
  // Snapshots para modo paso a paso (permite retroceder pasos correctamente)
  const stepSnapshotsRef = useRef([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

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

  // ── Mapa de marcos ocupados para RAM ──────────────────────────
  const occupiedFrames = useMemo(() => {
    const map = new Array(TOTAL_FRAMES).fill(null);
    processes.forEach(proc => {
      proc.segments.forEach((seg, si) => {
        seg.pageTable.forEach(pg => {
          if (pg.valid && pg.frame !== null) {
            const existing = map[pg.frame];
            if (existing) {
              if (!existing.procIds.includes(proc.id)) {
                existing.procIds.push(proc.id);
              }
            } else {
              map[pg.frame] = {
                procIds: [proc.id],
                segIdx: si,
                segType: seg.segType,
                pageNum: pg.pageNum,
                color: seg.isShared ? '#a855f7' : proc.color, // Usar púrpura para marcos compartidos o color del proceso original
                internalFrag: pg.pageNum === seg.pageTable.length - 1
                  ? (seg.pageTable.length * pageSizeKB) - seg.size
                  : 0,
              };
            }
          }
        });
      });
    });
    return map;
  }, [processes, TOTAL_FRAMES, pageSizeKB]);

  // ── CARGAR ESCENARIO ──────────────────────────────────────────
  const handleLoadScenario = useCallback((scenario) => {
    const newRamSize = scenario.ramSizeKB || DEFAULT_RAM_KB;
    const newPageSize = scenario.pageSizeKB || DEFAULT_PAGE_KB;
    
    setRamSizeKB(newRamSize);
    setPageSizeKB(newPageSize);
    setActiveScenarioId(scenario.id);
    const data = scenario.setup(newPageSize);
    
    // Auto-generar diskPages: solo páginas que NO están en RAM (valid=false)
    const newDiskPages = [];
    data.processes.forEach(p => {
      p.segments.forEach((seg, si) => {
        if (!seg.isShared) {
          seg.pageTable.forEach(pg => {
            if (!pg.valid) {
              newDiskPages.push({
                procId: p.id,
                segIdx: si,
                segType: seg.segType,
                pageNum: pg.pageNum,
                color: seg.color
              });
            }
          });
        }
      });
    });


    setProcesses(data.processes);
    setDiskPages(newDiskPages);
    setTlbEntries(data.tlbEntries || []);
    setPageFaults(data.pageFaults || 0);
    setNextPid(data.nextPid);
    setSelectedProcessId(data.processes[0]?.id || null);
    
    const totalFrames = Math.floor(newRamSize / newPageSize);
    const occupied = new Set();
    data.processes.forEach(p => {
      p.segments.forEach(seg => {
        seg.pageTable.forEach(pg => {
          if (pg.valid && pg.frame !== null) occupied.add(pg.frame);
        });
      });
    });
    const initialFreeFrames = [];
    for (let i = 0; i < totalFrames; i++) {
      if (!occupied.has(i)) initialFreeFrames.push(i);
    }
    setFreeFrameList(initialFreeFrames);

    frameQueueRef.current = [];
    frameLastAccessRef.current = {};
    
    // Populate FIFO/LRU queues with existing valid frames
    data.processes.forEach(p => {
      p.segments.forEach(seg => {
        seg.pageTable.forEach(pg => {
          if (pg.valid && pg.frame !== null) {
            frameQueueRef.current.push({ frame: pg.frame, procId: p.id, segIdx: p.segments.indexOf(seg), pageNum: pg.pageNum });
            frameLastAccessRef.current[pg.frame] = Date.now() + pg.frame; // Spread access times slightly
          }
        });
      });
    });

    if (data.logs) {
      setLogs(data.logs);
    }
    setFlowAction(null);
  }, []);

  const addProcess = useCallback(async () => {
    setActiveScenarioId(null);
    const newProcId = `P${nextPid}`;
    const color = PROC_COLORS[(nextPid - 1) % PROC_COLORS.length];

    setFlowAction('CPU_TO_MMU');
    await new Promise(r => setTimeout(r, 400));
    setFlowAction(null);

    let targetParentProc = null;
    if (sharedCodeFrom) {
      targetParentProc = processes.find(p => p.id === sharedCodeFrom);
    }

    const segments = SEG_TYPES.map(({ key, type, color: segColor }) => {
      let size = newProcConfig[key];
      let pageTable;
      let isShared = false;

      if (targetParentProc && type === 'Código') {
        const parentCodeSeg = targetParentProc.segments.find(s => s.segType === 'Código');
        if (parentCodeSeg) {
          size = parentCodeSeg.size;
          // Copiar la tabla de páginas para que apunten a los mismos marcos físicos
          pageTable = parentCodeSeg.pageTable.map(pt => ({ ...pt }));
          isShared = true;
        }
      }

      if (!isShared) {
        pageTable = buildPageTable(size, pageSizeKB);
      }

      return { segType: type, color: segColor, size, limit: size, pageTable, isShared };
    });

    const totalPages = segments.reduce((acc, s) => acc + s.pageTable.length, 0);

    // Todas las páginas inician en DISCO, EXCEPTO las compartidas (el padre ya las tiene en disco)
    const newDiskPages = [];
    segments.forEach((s, si) => {
      if (!s.isShared) {
        s.pageTable.forEach(pg => {
          newDiskPages.push({ procId: newProcId, segIdx: si, segType: s.segType, pageNum: pg.pageNum, color });
        });
      }
    });

    setProcesses(prev => [...prev, { id: newProcId, color, segments }]);
    setDiskPages(prev => [...prev, ...newDiskPages]);
    setSelectedProcessId(newProcId);
    setNextPid(p => p + 1);
    setSharedCodeFrom('');
    incrementSimCounter();
    addLog(`Proceso ${newProcId} creado: ${totalPages} páginas (Compartiendo código: ${sharedCodeFrom ? 'Sí' : 'No'}).`, 'success');
  }, [nextPid, newProcConfig, pageSizeKB, incrementSimCounter, addLog, sharedCodeFrom, processes]);

  // ── ELIMINAR PROCESO ──────────────────────────────────────────
  const removeProcess = useCallback((id) => {
    const proc = processes.find(p => p.id === id);
    if (proc) {
      const framesToRelease = [];
      proc.segments.forEach(s => {
        s.pageTable.forEach(pg => {
          if (pg.valid && pg.frame !== null) {
            // No liberar si otro proceso activo comparte el mismo marco físico
            const isSharedFrame = processes.some(other =>
              other.id !== id &&
              other.segments.some(os =>
                os.pageTable.some(opg => opg.valid && opg.frame === pg.frame)
              )
            );
            if (!isSharedFrame) {
              framesToRelease.push(pg.frame);
            }
          }
        });
      });
      if (framesToRelease.length > 0) {
        setFreeFrameList(prev => [...prev, ...framesToRelease].sort((a, b) => a - b));
      }
      frameQueueRef.current = frameQueueRef.current.filter(e => e.procId !== id);
      framesToRelease.forEach(f => delete frameLastAccessRef.current[f]);
    }
    setProcesses(prev => prev.filter(p => p.id !== id));
    setDiskPages(prev => prev.filter(dp => dp.procId !== id));
    if (selectedProcessId === id) setSelectedProcessId(null);
    addLog(`Proceso ${id} terminado. Marcos liberados.`, 'warning');
  }, [processes, selectedProcessId, addLog]);

  const handleGrowSegment = useCallback((procId, segIdx, deltaKB) => {
    let newDiskEntries = [];
    setProcesses(prev => prev.map(p => {
      if (p.id !== procId) return p;
      const newSegs = [...p.segments];
      const seg = { ...newSegs[segIdx] };
      
      const newLimit = seg.limit + deltaKB;
      const oldNumPages = seg.pageTable.length;
      const newNumPages = Math.ceil(newLimit / pageSizeKB);
      
      const newPageTable = [...seg.pageTable];
      if (newNumPages > oldNumPages) {
        for (let pNum = oldNumPages; pNum < newNumPages; pNum++) {
          newPageTable.push({ pageNum: pNum, frame: null, valid: false });
          newDiskEntries.push({
            procId: p.id,
            segIdx: segIdx,
            segType: seg.segType,
            pageNum: pNum,
            color: seg.color
          });
        }
      }
      
      seg.limit = newLimit;
      seg.size = newLimit;
      seg.pageTable = newPageTable;
      newSegs[segIdx] = seg;
      
      return { ...p, segments: newSegs };
    }));
    
    if (newDiskEntries.length > 0) {
      setDiskPages(prev => [...prev, ...newDiskEntries]);
    }
  }, [pageSizeKB]);

  // ── PAGE FAULT HANDLER (auto mode) ───────────────────────────
  const handlePageFault = useCallback(async (pid, segIdx, pageNum, frameOffset) => {
    setPageFaults(prev => prev + 1);
    addLog(`¡PAGE FAULT! ${pid} Seg${segIdx} Pág${pageNum} — bit V=0. SO cargando desde disco...`, 'error');

    let assignedFrame;

    if (freeFrameList.length === 0) {
      const victim = selectVictim(processes, replacementAlgo, frameQueueRef.current, frameLastAccessRef.current);
      if (!victim) { addLog('Error: RAM llena y sin víctima.', 'error'); return false; }

      addLog(`[${replacementAlgo}] Víctima: ${victim.procId} Seg${victim.segIdx} Pág${victim.pageNum} → F${victim.frame}`, 'warning');
      setEvictingFrame(victim.frame);
      setFlowAction('EVICT');
      await new Promise(r => setTimeout(r, 900));

      const vProc = processes.find(p => p.id === victim.procId);
      setProcesses(prev => prev.map(p => {
        if (p.id !== victim.procId) return p;
        return {
          ...p, segments: p.segments.map((s, si) => si !== victim.segIdx ? s : {
            ...s, pageTable: s.pageTable.map(pg =>
              pg.pageNum === victim.pageNum ? { ...pg, frame: null, valid: false } : pg
            )
          })
        };
      }));
      if (vProc) setDiskPages(prev => [...prev, { procId: victim.procId, segIdx: victim.segIdx, segType: vProc.segments[victim.segIdx]?.segType, pageNum: victim.pageNum, color: vProc.color }]);
      if (isTlbEnabled) setTlbEntries(prev => prev.filter(e => !(e.procId === victim.procId && e.segNum === victim.segIdx && e.pageNum === victim.pageNum)));
      frameQueueRef.current = frameQueueRef.current.filter(e => e.frame !== victim.frame);
      delete frameLastAccessRef.current[victim.frame];
      assignedFrame = victim.frame;
      setEvictingFrame(null); setFlowAction(null);
      await new Promise(r => setTimeout(r, 300));
    } else {
      assignedFrame = freeFrameList[0];
      setFreeFrameList(prev => prev.slice(1));
    }

    setActiveDiskEntry({ procId: pid, segIdx, pageNum });
    setFlowAction('DISK_TO_RAM');
    setActiveFrame(assignedFrame);
    await new Promise(r => setTimeout(r, 900));

    setProcesses(prev => prev.map(p => {
      if (p.id !== pid) return p;
      return {
        ...p, segments: p.segments.map((s, si) => si !== segIdx ? s : {
          ...s, pageTable: s.pageTable.map(pg =>
            pg.pageNum === pageNum ? { ...pg, frame: assignedFrame, valid: true } : pg
          )
        })
      };
    }));
    setDiskPages(prev => prev.filter(dp => !(dp.procId === pid && dp.segIdx === segIdx && dp.pageNum === pageNum)));
    frameQueueRef.current.push({ frame: assignedFrame, procId: pid, segIdx, pageNum });
    frameLastAccessRef.current[assignedFrame] = Date.now();
    if (isTlbEnabled) setTlbEntries(prev => updateTlb(prev, pid, segIdx, pageNum, assignedFrame));

    setFlowAction('MMU_TO_RAM');
    await new Promise(r => setTimeout(r, 600));
    addLog(`Pág${pageNum} de ${pid} Seg${segIdx} → Marco F${assignedFrame} ✅`, 'success');
    setActiveDiskEntry(null); setActiveFrame(null); setFlowAction(null);
    return assignedFrame;
  }, [freeFrameList, processes, replacementAlgo, isTlbEnabled, addLog]);

  // ── SNAPSHOT (para modo paso a paso) ────────────────────────────
  const captureSnapshot = useCallback(() => ({
    processes,
    diskPages,
    freeFrameList: [...freeFrameList],
    tlbEntries:    [...tlbEntries],
    pageFaults,
    frameQueue:    [...frameQueueRef.current],
    frameLastAccess: { ...frameLastAccessRef.current },
  }), [processes, diskPages, freeFrameList, tlbEntries, pageFaults]);

  const restoreSnapshot = (snap) => {
    setProcesses(snap.processes);
    setDiskPages(snap.diskPages);
    setFreeFrameList(snap.freeFrameList);
    setTlbEntries(snap.tlbEntries);
    setPageFaults(snap.pageFaults);
    frameQueueRef.current = [...snap.frameQueue];
    frameLastAccessRef.current = { ...snap.frameLastAccess };
  };

  // ── SIMULAR ACCESO ────────────────────────────────────────────
  const selectedProcess = useMemo(() => processes.find(p => p.id === selectedProcessId), [processes, selectedProcessId]);

  const simulateAccess = useCallback(async (segIdx) => {
    if (isTranslating || !selectedProcess) return;
    const seg = selectedProcess.segments[segIdx];
    if (!seg) return;

    const result = translate(seg, offset, pageSizeKB);
    setIsTranslating(true);
    setTotalAccesses(p => p + 1);

    if (result.error && !result.pageFault) {
      setFlowAction('SEG_FAULT');
      setActiveSegNum(segIdx);
      addLog(result.error, 'error');
      await new Promise(r => setTimeout(r, 1500));
      setFlowAction(null); setActiveSegNum(null); setIsTranslating(false);
      return;
    }

    // PAGE FAULT
    if (result.pageFault) {
      setActiveSegNum(segIdx);
      if (isTlbEnabled) {
        setFlowAction('TLB_MISS');
        setTlbStats(prev => ({ ...prev, accesses: prev.accesses + 1 }));
        await new Promise(r => setTimeout(r, 600));
      }

      if (stepByStepMode) {
        const { steps, error } = buildPageFaultStepQueue({
          pid: selectedProcess.id, segIdx, pageNum: result.pageNum,
          processes, freeFrameList, replacementAlgo,
          frameQueue: frameQueueRef.current, frameLastAccess: frameLastAccessRef.current,
          pageSizeKB, frameOffset: result.frameOffset, isTlbEnabled, tlbEntries,
          setFlowAction, setActiveSegNum, setActiveFrame, setEvictingFrame,
          setActiveDiskEntry, setIsTlbHit, setTlbStats, setTlbEntries,
          setProcesses, setDiskPages, setFreeFrameList, setPageFaults, addLog,
          frameQueueRef, frameLastAccessRef,
        });
        if (error) { addLog(error, 'error'); setIsTranslating(false); return; }
        // Snapshot inicial (estado antes del paso 0) para poder retroceder
        stepSnapshotsRef.current = [captureSnapshot()];
        setStepQueue(steps); setCurrentStepIndex(0); steps[0].execute();
        return;
      }

      await handlePageFault(selectedProcess.id, segIdx, result.pageNum, result.frameOffset);
      setIsTranslating(false); setActiveSegNum(null);
      return;
    }

    // ACCESO NORMAL
    incrementSimCounter();
    frameLastAccessRef.current[result.frame] = Date.now();

    if (stepByStepMode) {
      const steps = buildAccessSteps({
        pid: selectedProcess.id, segIdx, pageNum: result.pageNum,
        frame: result.frame, pageSizeKB, frameOffset: result.frameOffset,
        isTlbEnabled, tlbEntries,
        setFlowAction, setActiveSegNum, setActiveFrame,
        setIsTlbHit, setTlbStats, setTlbEntries, addLog,
      });
      // Snapshot inicial (estado antes del paso 0) para poder retroceder
      stepSnapshotsRef.current = [captureSnapshot()];
      setStepQueue(steps); setCurrentStepIndex(0); steps[0].execute();
      return;
    }

    setActiveSegNum(segIdx);
    setFlowAction('CPU_TO_MMU');
    await new Promise(r => setTimeout(r, 500));

    if (isTlbEnabled) {
      const tlbHit = checkTlb(tlbEntries, selectedProcess.id, segIdx, result.pageNum);
      setTlbStats(prev => ({ ...prev, accesses: prev.accesses + 1 }));
      if (tlbHit) {
        setIsTlbHit(true);
        setTlbStats(prev => ({ ...prev, hits: prev.hits + 1 }));
        setFlowAction('TLB_HIT');
        addLog(`TLB HIT: Seg${segIdx} Pág${result.pageNum} → F${tlbHit.frame}`, 'success');
        await new Promise(r => setTimeout(r, 700));
      } else {
        setFlowAction('TLB_MISS');
        addLog(`TLB MISS: Seg${segIdx} Pág${result.pageNum} — consultando tablas`, 'warning');
        setTlbEntries(prev => updateTlb(prev, selectedProcess.id, segIdx, result.pageNum, result.frame));
        await new Promise(r => setTimeout(r, 700));
      }
    }

    setFlowAction('MMU_SEARCH');
    await new Promise(r => setTimeout(r, 600));
    setFlowAction('MMU_TO_RAM');
    setActiveFrame(result.frame);
    addLog(`Acceso OK: ${selectedProcess.id} Seg${segIdx} Pág${result.pageNum} → F${result.frame} | Dir.Física=${result.physicalAddr}KB`, 'success');
    await new Promise(r => setTimeout(r, 900));
    setFlowAction(null); setActiveSegNum(null); setActiveFrame(null);
    setIsTranslating(false); setIsTlbHit(false);
  }, [isTranslating, selectedProcess, offset, pageSizeKB, isTlbEnabled, tlbEntries, stepByStepMode,
    processes, freeFrameList, replacementAlgo, handlePageFault, incrementSimCounter, addLog, captureSnapshot]);

  // ── PASO A PASO ───────────────────────────────────────────────
  // captureSnapshot y restoreSnapshot están definidos arriba (antes de simulateAccess)
  const nextStep = () => {
    if (currentStepIndex >= stepQueue.length - 1) { cancelSteps(); return; }
    const next = currentStepIndex + 1;
    stepSnapshotsRef.current[next] = captureSnapshot();
    setCurrentStepIndex(next);
    stepQueue[next].execute();
  };
  const prevStep = () => {
    if (currentStepIndex <= 0) return;
    const prev = currentStepIndex - 1;
    const snap = stepSnapshotsRef.current[prev];
    if (snap) restoreSnapshot(snap);
    setFlowAction(null); setActiveFrame(null); setIsTlbHit(false);
    setCurrentStepIndex(prev);
    stepQueue[prev].execute();
  };
  const cancelSteps = () => {
    setStepQueue([]); setCurrentStepIndex(-1); setFlowAction(null);
    setIsTranslating(false); setIsTlbHit(false); setActiveSegNum(null); setActiveFrame(null);
    stepSnapshotsRef.current = [];
  };

  // ── RESET ─────────────────────────────────────────────────────
  const resetSimulator = useCallback((customTotalFrames) => {
    const framesCount = typeof customTotalFrames === 'number' ? customTotalFrames : TOTAL_FRAMES;
    setProcesses([]); setDiskPages([]); setNextPid(1); setSelectedProcessId(null);
    setFreeFrameList(Array.from({ length: framesCount }, (_, i) => i));
    setTlbEntries([]); setTlbStats({ hits: 0, accesses: 0 }); setIsTlbHit(false);
    setFlowAction(null); setActiveSegNum(null); setActiveFrame(null); setEvictingFrame(null);
    setActiveDiskEntry(null); setPageFaults(0); setTotalAccesses(0); setLogs([]);
    setStepQueue([]); setCurrentStepIndex(-1); setIsTranslating(false);
    frameQueueRef.current = []; frameLastAccessRef.current = {};
  }, [TOTAL_FRAMES]);

  const handleApplySettings = useCallback((newRam, newPage) => {
    const totalFrames = Math.floor(newRam / newPage);
    resetSimulator(totalFrames);
  }, [resetSimulator]);

  const diskSizeKB = ramSizeKB * 2;

  return (
    <div className="dashboard">
      <Header
        darkMode={darkMode} setDarkMode={setDarkMode}
        occupiedFrames={occupiedFrames} TOTAL_FRAMES={TOTAL_FRAMES}
        resetSimulator={resetSimulator}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        isTlbEnabled={isTlbEnabled} setIsTlbEnabled={setIsTlbEnabled}
        showFreeFrameList={showFreeFrameList} setShowFreeFrameList={setShowFreeFrameList}
        stepByStepMode={stepByStepMode} setStepByStepMode={setStepByStepMode}
        pageFaults={pageFaults}
        replacementAlgo={replacementAlgo} setReplacementAlgo={setReplacementAlgo}
      />

      <main className="flow-viewport">
        <Scenarios onLoadScenario={handleLoadScenario} activeScenarioId={activeScenarioId} />

        <div className="nodes-container">
          <CPU
            processes={processes}
            selectedProcessId={selectedProcessId}
            setSelectedProcessId={setSelectedProcessId}
            newProcConfig={newProcConfig}
            setNewProcConfig={setNewProcConfig}
            addProcess={addProcess}
            removeProcess={removeProcess}
            offset={offset} setOffset={setOffset}
            activeSegNum={activeSegNum}
            flowAction={flowAction}
            pageSizeKB={pageSizeKB}
            growSegment={handleGrowSegment}
            sharedCodeFrom={sharedCodeFrom}
            setSharedCodeFrom={setSharedCodeFrom}
          />

          <Connector active={flowAction === 'CPU_TO_MMU'} />

          <MMU
            selectedProcess={selectedProcess}
            simulateAccess={simulateAccess}
            isTranslating={isTranslating}
            activeSegNum={activeSegNum}
            offset={offset}
            flowAction={flowAction}
            isTlbEnabled={isTlbEnabled}
            tlbEntries={tlbEntries}
            freeFrameList={freeFrameList}
            showFreeFrameList={showFreeFrameList}
            pageSizeKB={pageSizeKB}
          />

          <Connector
            active={flowAction === 'MMU_TO_RAM' || flowAction === 'PAGE_TABLE_HIT'}
            color="var(--secondary)" glow="var(--secondary-glow)"
          />

          <RAM
            occupiedFrames={occupiedFrames}
            activeFrame={activeFrame}
            evictingFrame={evictingFrame}
            pageSize={pageSizeKB}
            TOTAL_FRAMES={TOTAL_FRAMES}
          />

          <Connector
            active={flowAction === 'DISK_TO_RAM'}
            color="var(--accent-orange)" glow="rgba(245,158,11,0.5)"
          />

          <Disk
            diskPages={diskPages}
            diskSizeKB={diskSizeKB}
            flowAction={flowAction}
            activeDiskEntry={activeDiskEntry}
          />
        </div>

        {/* Panel Paso a Paso */}
        {stepQueue.length > 0 && currentStepIndex >= 0 && (
          <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderColor: 'var(--primary)', boxShadow: '0 0 20px var(--primary-glow)' }}>
            <div style={{ background: 'var(--primary)', color: '#000', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px', flexShrink: 0 }}>
              {currentStepIndex + 1}/{stepQueue.length}
            </div>
            <p style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{stepQueue[currentStepIndex]?.desc}</p>
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

        <Dashboard
          metrics={{
            ramUsage: Math.round((occupiedFrames.filter(f => f !== null).length / TOTAL_FRAMES) * 100),
            occupiedFrames: occupiedFrames.filter(f => f !== null).length,
            totalFrames: TOTAL_FRAMES,
            freeFrames: freeFrameList.length,
            diskPageCount: diskPages.length,
            pageFaults,
            totalAccesses,
            tlbHitRate: tlbStats.accesses > 0 ? Math.round((tlbStats.hits / tlbStats.accesses) * 100) : 0,
            tlbHits: tlbStats.hits,
            tlbAccesses: tlbStats.accesses,
          }}
          logs={logs}
        />

        <Footer visitCount={visitCount} globalSims={globalSims} sessionSims={sessionSims} />
      </main>

      <Settings
        isOpen={showSettings} onClose={() => setShowSettings(false)}
        ramSizeKB={ramSizeKB} setRamSizeKB={setRamSizeKB}
        pageSizeKB={pageSizeKB} setPageSizeKB={setPageSizeKB}
        onApply={handleApplySettings}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
