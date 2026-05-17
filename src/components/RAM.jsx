import React, { useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const RAM = ({ occupiedFrames, activeFrame, evictingFrame, pageSize, TOTAL_FRAMES }) => {
  const blockRefs = useRef({});

  useEffect(() => {
    if (activeFrame !== null && blockRefs.current[activeFrame]) {
      blockRefs.current[activeFrame].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeFrame]);

  // Calcular la altura proporcional (430px dividido entre marcos)
  const PX_PER_FRAME = Math.max(430 / Math.max(TOTAL_FRAMES, 1), 22);

  return (
    <section className="node glass-card" style={{ flex: 0.9, display: 'flex', flexDirection: 'column' }}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--tertiary)' }}><Layers size={24} /></div>
        <div>
          <h3 className="display-font">RAM</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Memoria Física · {TOTAL_FRAMES * pageSize} KB</p>
        </div>
      </div>

      {/* Address scale */}
      <div className="ram-map" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', height: '430px' }}>
        {Array.from({ length: TOTAL_FRAMES }).map((_, i) => {
          const frame = occupiedFrames[i];
          const heightPx = PX_PER_FRAME;

          if (!frame) {
            return (
              <div
                key={`hole-${i}`}
                className="seg-block"
                style={{ 
                  height: `${heightPx}px`, 
                  minHeight: '22px',
                  borderLeft: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ opacity: 0.5, fontSize: '0.6rem', fontFamily: 'var(--font-mono)', flexShrink: 0, flex: 1 }}>
                  F{i}
                </span>
                <span style={{ fontSize: '0.55rem', opacity: 0.3, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                  [{i * pageSize} - {(i + 1) * pageSize} KB]
                </span>
              </div>
            );
          }

          const isActive = activeFrame === i;
          const isEvicting = evictingFrame === i;
          const extraClass = isEvicting ? 'relocating' : '';

          return (
            <motion.div
              key={`frame-${i}`}
              ref={el => { blockRefs.current[i] = el; }}
              layout
              className={`seg-block ${isActive ? 'highlight' : ''} ${extraClass}`}
              style={{
                position: 'relative',
                overflow: 'hidden',
                height: `${heightPx}px`,
                minHeight: '22px',
                borderLeft: `4px solid ${frame.color}`,
                background: isActive ? `${frame.color}35` : isEvicting ? 'rgba(239,68,68,0.15)' : `${frame.color}18`,
                boxShadow: isActive ? `0 0 16px ${frame.color}55` : isEvicting ? 'inset 0 0 10px rgba(239,68,68,0.5)' : 'none',
                transition: 'all 0.3s ease',
              }}
              initial={{ opacity: 0.6, scaleX: 0.95 }}
              animate={{ opacity: 1, scaleX: 1 }}
            >
              {/* Dirección base */}
              <span style={{ opacity: 0.45, marginRight: '0.4rem', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', flexShrink: 0, zIndex: 2, position: 'relative' }}>
                F{i}
              </span>

              {/* Tipo badge */}
              <span style={{
                background: `${frame.color}33`, color: frame.color,
                borderRadius: '4px', padding: '0px 5px',
                fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, marginRight: '0.3rem',
                zIndex: 2, position: 'relative'
              }}>
                {frame.segType}
              </span>

              {/* PID */}
              <span style={{ fontSize: '0.65rem', flex: 1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', zIndex: 2, position: 'relative' }}>
                {frame.procId} (Pág {frame.pageNum})
              </span>

              {/* Rango de Direcciones */}
              <span style={{ fontSize: '0.55rem', opacity: 0.5, flexShrink: 0, fontFamily: 'var(--font-mono)', zIndex: 2, position: 'relative' }}>
                [{i * pageSize} - {(i + 1) * pageSize} KB]
              </span>

              {/* Internal fragmentation badge */}
              {frame.internalFrag > 0 && (
                <div className="frag-badge">
                  <span>F.I.</span>
                  <span>{frame.internalFrag}K</span>
                </div>
              )}

              {/* Internal fragmentation red gradient overlay */}
              {frame.internalFrag > 0 && (
                <motion.div
                  className="frag-overlay"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.round((frame.internalFrag / pageSize) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              )}

            </motion.div>
          );
        })}

        {TOTAL_FRAMES === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
            <p style={{ fontSize: '0.8rem' }}>RAM vacía</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RAM;
