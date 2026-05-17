import React from 'react';
import { HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Disk = ({ diskPages, diskSizeKB, flowAction, activeDiskEntry }) => {
  // Agrupar páginas por proceso
  const byProc = diskPages.reduce((acc, dp) => {
    if (!acc[dp.procId]) acc[dp.procId] = { id: dp.procId, color: dp.color, pages: [] };
    acc[dp.procId].pages.push(dp);
    return acc;
  }, {});
  const diskProcs = Object.values(byProc);

  const usedPages = diskPages.length;
  // Approximation of usage (assuming standard pages like 4KB for percent, but we use an arbitrary base if pageSizeKB is not passed, let's just do a max visual bar)
  // Or simply percent based on an average page size of 4KB
  const usedKB = usedPages * 4;
  const usedPercent = diskSizeKB > 0 ? Math.min(100, Math.round((usedKB / diskSizeKB) * 100)) : 0;
  const freeKB = Math.max(0, diskSizeKB - usedKB);

  const isActive = flowAction === 'DISK_TO_RAM' || flowAction === 'EVICT';

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
          <span>Páginas en disco: {usedPages}</span>
          <span style={{ color: usedPercent > 70 ? '#ef4444' : '#f97316' }}>~{usedPercent}% usado</span>
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
        ⚠️ En Segmentación Paginada el swapping ocurre a nivel de <strong>página</strong>.
        Las páginas no utilizadas residen aquí hasta que ocurra un Page Fault.
      </div>

      {/* Lista de procesos en disco */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <AnimatePresence>
          {diskProcs.map(proc => {
            const isBeingLoaded = activeDiskEntry && activeDiskEntry.procId === proc.id && flowAction === 'DISK_TO_RAM';
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
                  padding: '0.5rem',
                  borderRadius: '6px',
                }}
              >
                <div className="disk-entry-info">
                  {/* PID + color dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: proc.color, flexShrink: 0 }} />
                    <span className="disk-entry-id" style={{ fontWeight: 'bold' }}>{proc.id}</span>
                    {isBeingLoaded && (
                      <span style={{ fontSize: '0.55rem', color: proc.color, fontWeight: 'bold', animation: 'pulse 0.8s infinite' }}>
                        ↩ cargando Pág {activeDiskEntry.pageNum}...
                      </span>
                    )}
                  </div>
                  {/* Segmentos almacenados */}
                  <div className="disk-entry-segs" style={{ 
                    marginTop: '0.6rem', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px' 
                  }}>
                    {proc.pages.map((dp, i) => {
                      const isThisActive = activeDiskEntry && activeDiskEntry.procId === dp.procId && activeDiskEntry.segIdx === dp.segIdx && activeDiskEntry.pageNum === dp.pageNum;
                      return (
                        <div key={i} style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          border: `1px solid ${isThisActive ? proc.color : 'rgba(255,255,255,0.1)'}`,
                          background: isThisActive ? `${proc.color}33` : 'rgba(0,0,0,0.2)',
                          color: isThisActive ? proc.color : 'var(--text-muted)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          fontSize: '0.55rem',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          <span style={{ 
                            padding: '2px 4px', 
                            background: isThisActive ? proc.color : 'rgba(255,255,255,0.08)', 
                            color: isThisActive ? '#000' : 'inherit',
                            borderRight: `1px solid ${isThisActive ? proc.color : 'rgba(255,255,255,0.1)'}` 
                          }}>
                            {dp.segType.substring(0, 3).toUpperCase()}
                          </span>
                          <span style={{ padding: '2px 4px' }}>
                            P{dp.pageNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {diskProcs.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: 0.35 }}>
            <HardDrive size={28} />
            <p style={{ fontSize: '0.75rem' }}>Disco vacío</p>
            <p style={{ fontSize: '0.62rem', color: '#f97316' }}>Páginas completas cargadas</p>
          </div>
        )}

        {diskProcs.length > 0 && freeKB > 0 && (
          <div className="disk-free" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            Libre (aprox): {freeKB} KB
          </div>
        )}
      </div>
    </section>
  );
};

export default Disk;
