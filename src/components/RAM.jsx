import React from 'react';
import { HardDrive } from 'lucide-react';

const RAM = ({ occupiedFrames, activeFrame, evictingFrame, pageSize, TOTAL_FRAMES }) => {
  const cols = Math.min(8, TOTAL_FRAMES);

  return (
    <section className={`node glass-card ${activeFrame !== null ? 'active' : ''}`}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--secondary)' }}>
          <HardDrive size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="display-font">RAM</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            {TOTAL_FRAMES} marcos × {pageSize} KB
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>LIBRES</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {occupiedFrames.filter(f => f === null).length}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '4px',
        alignContent: 'start',
      }}>
        {occupiedFrames.map((frame, idx) => {
          const isEmpty = frame === null;
          const isActive = activeFrame === idx;
          const isEvicting = evictingFrame === idx;

          let bg = 'rgba(255,255,255,0.03)';
          let border = '1px solid var(--border-color)';
          let glow = 'none';

          if (isEvicting) {
            bg = 'rgba(239,68,68,0.15)';
            border = '2px solid #ef4444';
            glow = '0 0 8px rgba(239,68,68,0.5)';
          } else if (isActive) {
            bg = 'rgba(0,242,255,0.15)';
            border = '2px solid var(--primary)';
            glow = '0 0 10px var(--primary-glow)';
          } else if (!isEmpty) {
            bg = `${frame.color}22`;
            border = `1px solid ${frame.color}55`;
          }

          return (
            <div
              key={idx}
              title={isEmpty
                ? `Marco F${idx} — libre`
                : `F${idx}: ${frame.procId} ${frame.segType} Pág${frame.pageNum}${frame.internalFrag > 0 ? ` (${frame.internalFrag}KB frag)` : ''}`
              }
              style={{
                background: bg,
                border,
                boxShadow: glow,
                borderRadius: '6px',
                padding: '4px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.3s ease',
                cursor: 'default',
                minHeight: '52px',
              }}
            >
              <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', opacity: 0.6 }}>F{idx}</span>
              {!isEmpty ? (
                <>
                  <div style={{
                    width: '100%', height: '4px',
                    background: frame.color,
                    borderRadius: '2px',
                    opacity: 0.8,
                  }} />
                  <span style={{ fontSize: '0.5rem', fontWeight: 'bold', color: frame.color, lineHeight: 1.1, textAlign: 'center' }}>
                    {frame.procId}
                  </span>
                  <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', lineHeight: 1, textAlign: 'center' }}>
                    {frame.segType}
                  </span>
                  <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', lineHeight: 1 }}>
                    P{frame.pageNum}
                  </span>
                  {frame.internalFrag > 0 && (
                    <div style={{
                      width: '100%', height: `${(frame.internalFrag / pageSize) * 100}%`,
                      minHeight: '3px',
                      background: 'rgba(245,158,11,0.4)',
                      borderRadius: '2px',
                      marginTop: '1px',
                    }}
                      title={`Frag. interna: ${frame.internalFrag} KB`}
                    />
                  )}
                </>
              ) : (
                <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', opacity: 0.3, marginTop: '4px' }}>
                  libre
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RAM;
