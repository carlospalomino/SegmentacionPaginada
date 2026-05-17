import React from 'react';
import { Database } from 'lucide-react';

const Disk = ({ diskPages, diskSizeKB, flowAction, activeDiskEntry }) => {
  const isActive = flowAction === 'DISK_TO_RAM' || flowAction === 'EVICT';

  // Agrupar por proceso para mejor visualización
  const byProc = diskPages.reduce((acc, dp) => {
    if (!acc[dp.procId]) acc[dp.procId] = { color: dp.color, pages: [] };
    acc[dp.procId].pages.push(dp);
    return acc;
  }, {});

  return (
    <section className={`node glass-card ${isActive ? 'active' : ''}`}
      style={{ borderColor: isActive ? 'var(--accent-orange)' : undefined }}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--accent-orange)' }}>
          <Database size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="display-font">DISCO</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Backing Store — {diskSizeKB} KB</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>PÁGINAS</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-orange)' }}>
            {diskPages.length}
          </div>
        </div>
      </div>

      {flowAction === 'DISK_TO_RAM' && (
        <div style={{
          padding: '0.4rem 0.6rem',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '8px',
          marginBottom: '0.5rem',
          fontSize: '0.7rem',
          color: 'var(--accent-orange)',
          fontWeight: 600,
          animation: 'pulse 1s infinite',
          textAlign: 'center',
        }}>
          ⬆ Cargando página desde disco...
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {diskPages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
            <p style={{ fontSize: '0.8rem' }}>Sin páginas en disco</p>
          </div>
        ) : (
          Object.entries(byProc).map(([procId, { color, pages }]) => (
            <div key={procId} style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color, marginBottom: '0.3rem' }}>
                {procId}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {pages.map((dp, i) => {
                  const isThisActive = activeDiskEntry
                    && activeDiskEntry.procId === dp.procId
                    && activeDiskEntry.segIdx === dp.segIdx
                    && activeDiskEntry.pageNum === dp.pageNum;
                  return (
                    <div
                      key={i}
                      title={`${dp.procId} ${dp.segType} Pág${dp.pageNum}`}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: isThisActive ? color : `${color}22`,
                        border: `1px solid ${isThisActive ? color : `${color}55`}`,
                        boxShadow: isThisActive ? `0 0 10px ${color}` : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1px',
                        transition: 'all 0.3s',
                        animation: isThisActive ? 'pulse 0.5s infinite' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '0.45rem', color: isThisActive ? '#000' : color, fontWeight: 'bold' }}>
                        {dp.segType?.charAt(0) || '?'}
                      </span>
                      <span style={{ fontSize: '0.4rem', color: isThisActive ? '#000' : 'var(--text-muted)' }}>
                        P{dp.pageNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default Disk;
