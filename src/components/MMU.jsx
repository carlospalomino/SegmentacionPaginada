import React from 'react';
import { Binary, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MMU = ({
  selectedProcess,
  simulateAccess,
  isTranslating,
  activeSegNum,
  offset,
  flowAction,
  isTlbEnabled,
  tlbEntries,
}) => {
  return (
    <section className={`node glass-card ${
      flowAction === 'MMU_TO_RAM' || flowAction === 'CPU_TO_MMU' || flowAction === 'MMU_SEARCH'
        ? 'active'
        : flowAction === 'SEG_FAULT'
        ? 'active-seg'
        : ''
    }`}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--secondary)' }}><Binary size={24} /></div>
        <div>
          <h3 className="display-font">MMU</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Memory Management Unit</p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* TLB */}
          {isTlbEnabled && (
            <div className="input-group" style={{
              padding: '0.6rem',
              background: 'rgba(0, 242, 255, 0.04)',
              borderColor: flowAction === 'TLB_HIT' ? 'var(--tertiary)' : flowAction === 'TLB_MISS' ? 'var(--accent-red)' : 'var(--accent-cyan)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>TLB (CACHÉ)</p>
                {flowAction === 'TLB_HIT' && <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>HIT!</span>}
                {flowAction === 'TLB_MISS' && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 'bold' }}>MISS</span>}
              </div>
              {tlbEntries.length > 0 ? (
                <table className="seg-table" style={{ fontSize: '0.72rem' }}>
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>SEG</th>
                      <th>BASE</th>
                      <th>LÍMITE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tlbEntries.map((e, i) => {
                      const isHit = flowAction === 'TLB_HIT' && selectedProcess?.id === e.procId && activeSegNum === e.segNum;
                      return (
                        <tr key={i} style={isHit ? { background: 'rgba(16,185,129,0.2)' } : {}}>
                          <td>{e.procId}</td>
                          <td>{e.segNum}</td>
                          <td style={{ color: 'var(--accent-cyan)' }}>{e.base}</td>
                          <td>{e.limit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0' }}>TLB Vacía</p>
              )}
            </div>
          )}

          {/* Tabla de Segmentos */}
          <div className="input-group">
            <p style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--secondary)', marginBottom: '0.5rem' }}>TABLA DE SEGMENTOS</p>
            {selectedProcess ? (
              <table className="seg-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>TIPO</th>
                    <th>BASE</th>
                    <th>LÍMITE</th>
                    <th>REF</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProcess.segments.map((seg, idx) => (
                    <tr
                      key={idx}
                      className={`seg-row ${activeSegNum === idx ? 'highlight' : ''}`}
                    >
                      <td style={{ color: seg.color, fontWeight: 700 }}>{idx}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', background: `${seg.color}22`,
                          color: seg.color, borderRadius: '4px', padding: '1px 5px',
                          fontSize: '0.65rem', fontWeight: 600,
                        }}>
                          {seg.segType}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        {seg.base !== null ? (
                          <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{seg.base} KB</span>
                        ) : (
                          <span style={{ color: 'var(--accent-red)', fontSize: '0.6rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{seg.limit} KB</td>
                      <td>
                        <button
                          onClick={() => simulateAccess(idx)}
                          disabled={isTranslating}
                          title={`Acceder al segmento ${idx} (${seg.segType})`}
                        >
                          <Play size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                <p style={{ fontSize: '0.8rem' }}>Selecciona un proceso</p>
              </div>
            )}
          </div>
        </div>

        {/* Dirección Física */}
        {activeSegNum !== null && selectedProcess && (() => {
          const seg = selectedProcess.segments[activeSegNum];
          const physAddr = seg?.base !== null && seg?.base !== undefined ? seg.base + offset : null;
          return (
            <div className="address-display" style={{ marginTop: '0.75rem', borderColor: 'var(--secondary)' }}>
              <div className="address-bits">
                <div className="bit-group">
                  <span className="bit-label">Base</span>
                  <span className="bit-value" style={{ color: 'var(--secondary)' }}>{seg?.base ?? '—'}</span>
                </div>
                <div className="bit-group">
                  <span className="bit-label">Offset</span>
                  <span className="bit-value" style={{ color: 'var(--secondary)' }}>{offset}</span>
                </div>
                <div className="bit-group">
                  <span className="bit-label">Dir. Física</span>
                  <span className="bit-value" style={{ color: flowAction === 'SEG_FAULT' ? '#ef4444' : 'var(--primary)', fontSize: '1rem' }}>
                    {physAddr !== null ? `${physAddr} KB` : '🚫 TRAP'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.5rem', textAlign: 'center', opacity: 0.5, marginTop: '0.2rem' }}>
                DIRECCIÓN FÍSICA (Base + Offset)
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};

export default MMU;
