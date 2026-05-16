import React from 'react';
import { HardDrive, ArrowUpFromLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Disk.jsx — DISCO (Backing Store) para Segmentación Simple
 *
 * En segmentación, el swapping ocurre a nivel de PROCESO COMPLETO:
 * cuando la RAM no tiene espacio suficiente para un segmento, el SO
 * puede expulsar un proceso entero al disco para liberar memoria contigua.
 *
 * diskProcs: [{ id, color, totalSize, segments: [...] }]
 * activeSwapProcId: string|null — proceso que está siendo traído de vuelta
 */
const Disk = ({
  diskProcs = [],
  diskSizeKB,
  flowAction,
  activeSwapProcId,
  onSwapIn,
  isSwapping,
}) => {
  const usedKB = diskProcs.reduce((acc, p) => acc + p.totalSize, 0);
  const usedPercent = diskSizeKB > 0 ? Math.min(100, Math.round((usedKB / diskSizeKB) * 100)) : 0;
  const freeKB = Math.max(0, diskSizeKB - usedKB);

  const isActive = flowAction === 'DISK_TO_RAM' || flowAction === 'RAM_TO_DISK';

  return (
    <section
      className={`node glass-card disk-node ${isActive ? 'active' : ''}`}
      style={{
        flex: 0.85,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Header */}
      <div className="node-header">
        <div className="node-icon" style={{ color: '#f97316' }}>
          <HardDrive size={24} />
        </div>
        <div>
          <h3 className="display-font">DISCO</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            Backing Store · {diskSizeKB} KB
          </p>
        </div>
      </div>

      {/* Barra de uso */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
          <span>Procesos en disco: {diskProcs.length}</span>
          <span style={{ color: usedPercent > 70 ? '#ef4444' : '#f97316' }}>{usedPercent}% usado</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${usedPercent}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', background: '#f97316', borderRadius: '2px' }}
          />
        </div>
      </div>

      {/* Nota conceptual */}
      <div style={{
        background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: '8px', padding: '0.4rem 0.6rem', marginBottom: '0.75rem',
        fontSize: '0.6rem', color: 'rgba(249,115,22,0.8)', lineHeight: 1.4,
      }}>
        ⚠️ En Segmentación Simple el swapping expulsa el <strong>proceso completo</strong>.
        Sus segmentos se liberan de la RAM y se almacenan aquí.
      </div>

      {/* Lista de procesos en disco */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <AnimatePresence>
          {diskProcs.map(proc => {
            const isBeingLoaded = activeSwapProcId === proc.id && flowAction === 'DISK_TO_RAM';
            return (
              <motion.div
                key={proc.id}
                layout
                initial={{ opacity: 0, x: 30 }}
                animate={{
                  opacity: 1, x: 0,
                  boxShadow: isBeingLoaded ? `0 0 16px ${proc.color}88` : 'none',
                }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3 }}
                className="disk-entry"
                style={{
                  borderLeft: `3px solid ${proc.color}`,
                  background: isBeingLoaded ? `${proc.color}22` : undefined,
                  outline: isBeingLoaded ? `1px solid ${proc.color}66` : 'none',
                }}
              >
                <div className="disk-entry-info">
                  {/* PID + color dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: proc.color, flexShrink: 0 }} />
                    <span className="disk-entry-id">{proc.id}</span>
                    {isBeingLoaded && (
                      <span style={{ fontSize: '0.55rem', color: proc.color, fontWeight: 'bold', animation: 'pulse 0.8s infinite' }}>
                        ↩ cargando...
                      </span>
                    )}
                  </div>
                  {/* Segmentos almacenados */}
                  <div className="disk-entry-segs">
                    {proc.segments.map((s, i) => (
                      <span key={i} style={{ marginRight: '0.4rem' }}>
                        <span style={{ color: s.color }}>{s.segType}</span>
                        <span style={{ opacity: 0.6 }}> {s.size}KB</span>
                      </span>
                    ))}
                    <span style={{ opacity: 0.5 }}>· Total: {proc.totalSize} KB</span>
                  </div>
                </div>

                {/* Botón Swap In */}
                <button
                  className="swap-in-btn"
                  onClick={() => onSwapIn(proc.id)}
                  disabled={isSwapping}
                  title={`Cargar ${proc.id} de vuelta a RAM`}
                  style={{ background: proc.color }}
                >
                  <ArrowUpFromLine size={11} />
                  Swap In
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {diskProcs.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: 0.35 }}>
            <HardDrive size={28} />
            <p style={{ fontSize: '0.75rem' }}>Disco vacío</p>
            <p style={{ fontSize: '0.62rem', color: '#f97316' }}>Libre: {freeKB} KB</p>
          </div>
        )}

        {diskProcs.length > 0 && freeKB > 0 && (
          <div className="disk-free">
            Libre: {freeKB} KB
          </div>
        )}
      </div>
    </section>
  );
};

export default Disk;
