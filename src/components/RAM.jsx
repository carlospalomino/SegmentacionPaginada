import React, { useEffect, useRef } from 'react';
import { Layers, ArrowDownToLine } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * RAM Component para Segmentación Simple
 * La RAM se visualiza como bloques de altura proporcional al tamaño del segmento.
 * Los huecos libres aparecen con un patrón de rayas.
 */
const RAM = ({ ramBlocks, totalRam, activeBase, onCompact, isCompacting, onSwapOut, isSwapping, growingBase, growStrategy }) => {
  const blockRefs = useRef({});
  const seenPids = new Set();

  useEffect(() => {
    if (activeBase !== null && blockRefs.current[activeBase]) {
      blockRefs.current[activeBase].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeBase]);

  // totalRam en KB → cada KB = 1 unidad de altura base
  // Usamos la proporción para renderizar alturas relativas
  const PX_PER_KB = 430 / Math.max(totalRam, 1);

  return (
    <section className="node glass-card" style={{ flex: 0.9, display: 'flex', flexDirection: 'column' }}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--tertiary)' }}><Layers size={24} /></div>
        <div>
          <h3 className="display-font">RAM</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Memoria Física · {totalRam} KB</p>
        </div>
      </div>

      {/* Compact button */}
      <button
        onClick={onCompact}
        disabled={isCompacting}
        style={{
          marginBottom: '0.75rem',
          padding: '0.4rem 0.8rem',
          background: isCompacting ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.15)',
          border: '1px solid var(--secondary)',
          borderRadius: '8px', color: 'var(--secondary)', cursor: 'pointer',
          fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center',
        }}
        title="Compactar RAM: mueve todos los segmentos al inicio y agrupa los huecos"
      >
        {isCompacting ? '⏳ Compactando...' : '⚡ Compactar RAM'}
      </button>

      {/* Address scale */}
      <div className="ram-map" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', height: '430px' }}>
        {(() => { seenPids.clear(); return null; })()}
        {ramBlocks.map((block, i) => {
          const heightPx = Math.max(block.size * PX_PER_KB, 18);

          if (block.type === 'hole') {
            return (
              <div
                key={`hole-${block.start}`}
                className="hole-block"
                style={{ height: `${heightPx}px`, minHeight: '18px' }}
              >
                <span style={{ userSelect: 'none' }}>
                  Hueco libre · {block.start} KB → {block.start + block.size} KB ({block.size} KB)
                </span>
              </div>
            );
          }

          // Es un segmento ocupado
          const isActive = activeBase === block.base;
          const isGrowing   = growingBase !== null && growingBase === block.base && growStrategy === 'IN_PLACE';
          const isRelocating = growingBase !== null && growingBase === block.base && growStrategy === 'RELOCATE';
          const isFailing   = growingBase !== null && growingBase === block.base && growStrategy === 'FAIL';
          const isFirstOfProc = !seenPids.has(block.procId);
          if (isFirstOfProc) seenPids.add(block.procId);

          const extraClass = isGrowing ? 'growing' : isRelocating ? 'relocating' : isFailing ? 'grow-fail' : '';

          return (
            <motion.div
              key={`seg-${block.procId}-${block.segType}-${block.base}`}
              ref={el => { blockRefs.current[block.base] = el; }}
              layout
              className={`seg-block ${isActive ? 'highlight' : ''} ${extraClass}`}
              style={{
                height: `${heightPx}px`,
                minHeight: '22px',
                borderLeft: `4px solid ${block.color}`,
                background: isActive ? `${block.color}35` : `${block.color}18`,
                boxShadow: isActive ? `0 0 16px ${block.color}55` : 'none',
                transition: 'all 0.3s ease',
              }}
              initial={{ opacity: 0.6, scaleX: 0.95 }}
              animate={{ opacity: 1, scaleX: 1 }}
            >
              {/* Dirección base */}
              <span style={{ opacity: 0.45, marginRight: '0.4rem', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {block.base}
              </span>

              {/* Tipo badge */}
              <span style={{
                background: `${block.color}33`, color: block.color,
                borderRadius: '4px', padding: '0px 5px',
                fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, marginRight: '0.3rem',
              }}>
                {block.segType}
              </span>

              {/* PID */}
              <span style={{ fontSize: '0.65rem', flex: 1, fontWeight: 600 }}>{block.procId}</span>

              {/* Tamaño */}
              <span style={{ fontSize: '0.6rem', opacity: 0.5, flexShrink: 0 }}>{block.size} KB</span>

              {/* Swap Out (solo en el primer bloque del proceso) */}
              {isFirstOfProc && onSwapOut && (
                <button
                  onClick={() => onSwapOut(block.procId)}
                  disabled={isSwapping}
                  title={`Swap Out: expulsar proceso ${block.procId} al disco`}
                  style={{
                    marginLeft: '0.4rem', padding: '1px 5px',
                    background: 'rgba(249,115,22,0.2)', border: '1px solid #f97316',
                    borderRadius: '4px', color: '#f97316', cursor: isSwapping ? 'not-allowed' : 'pointer',
                    fontSize: '0.55rem', fontWeight: 700, flexShrink: 0, opacity: isSwapping ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', gap: '2px', transition: 'all 0.2s',
                  }}
                >
                  <ArrowDownToLine size={9} /> OUT
                </button>
              )}
            </motion.div>
          );
        })}

        {ramBlocks.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
            <p style={{ fontSize: '0.8rem' }}>RAM vacía</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RAM;
