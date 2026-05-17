import React, { useState } from 'react';
import { Binary, Play, ChevronDown, ChevronRight } from 'lucide-react';

const MMU = ({
  selectedProcess,
  simulateAccess,
  isTranslating,
  activeSegNum,
  offset,
  flowAction,
  isTlbEnabled,
  tlbEntries,
  pageSizeKB,
}) => {
  const [expandedSeg, setExpandedSeg] = useState(null);

  const isActive = ['CPU_TO_MMU', 'MMU_SEARCH', 'TLB_HIT', 'TLB_MISS', 'TLB_SEARCH',
    'MMU_TO_RAM', 'PAGE_TABLE_HIT', 'PAGE_FAULT_DETECTED'].includes(flowAction);

  return (
    <section className={`node glass-card ${isActive ? 'active' : flowAction === 'SEG_FAULT' ? 'active-seg' : ''}`}
      style={{ flex: 1.4 }}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--secondary)' }}><Binary size={24} /></div>
        <div>
          <h3 className="display-font">MMU</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Memory Management Unit</p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '4px' }}>

        {/* TLB */}
        {isTlbEnabled && (
          <div className="input-group" style={{
            padding: '0.6rem',
            background: 'rgba(0,242,255,0.04)',
            borderColor: flowAction === 'TLB_HIT' ? 'var(--tertiary)'
              : flowAction === 'TLB_MISS' ? 'var(--accent-red)'
              : 'var(--accent-cyan)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>TLB CACHÉ</p>
              {flowAction === 'TLB_HIT' && <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 'bold' }}>HIT ✓</span>}
              {flowAction === 'TLB_MISS' && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 'bold' }}>MISS ✗</span>}
            </div>
            {tlbEntries.length > 0 ? (
              <table className="seg-table" style={{ fontSize: '0.65rem' }}>
                <thead>
                  <tr><th>PID</th><th>Seg</th><th>Pág</th><th>Marco</th></tr>
                </thead>
                <tbody>
                  {tlbEntries.map((e, i) => {
                    const isHit = flowAction === 'TLB_HIT'
                      && selectedProcess?.id === e.procId
                      && activeSegNum === e.segNum;
                    return (
                      <tr key={i} style={isHit ? { background: 'rgba(16,185,129,0.2)' } : {}}>
                        <td>{e.procId}</td>
                        <td>{e.segNum}</td>
                        <td style={{ color: 'var(--primary)' }}>{e.pageNum}</td>
                        <td style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>F{e.frame}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>TLB Vacía</p>
            )}
          </div>
        )}

        {/* Tabla de Segmentos + Tablas de Páginas */}
        <div className="input-group" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
            TABLA DE SEGMENTOS
          </p>
          {!selectedProcess ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
              <p style={{ fontSize: '0.8rem' }}>Selecciona un proceso</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedProcess.segments.map((seg, si) => {
                const pagesInRam = seg.pageTable.filter(pg => pg.valid).length;
                const isActiveSeg = activeSegNum === si;
                const isExpanded = expandedSeg === si;
                const activePage = isActiveSeg ? Math.floor(offset / pageSizeKB) : null;

                return (
                  <div key={si} style={{
                    marginBottom: '0.5rem',
                    border: `1px solid ${isActiveSeg ? seg.color : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: isActiveSeg ? `${seg.color}08` : 'transparent',
                    transition: 'all 0.3s',
                  }}>
                    {/* Header del segmento */}
                    <div
                      onClick={() => setExpandedSeg(isExpanded ? null : si)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', cursor: 'pointer' }}
                    >
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: seg.color }}>{si}</span>
                      <span style={{ fontSize: '0.65rem', background: `${seg.color}22`, color: seg.color, borderRadius: '4px', padding: '1px 5px' }}>
                        {seg.segType}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {pagesInRam}/{seg.pageTable.length} RAM
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); simulateAccess(si); }}
                        disabled={isTranslating}
                        title={`Acceder Seg ${si} con offset ${offset} KB`}
                        style={{ padding: '2px 6px', borderRadius: '4px', background: isActiveSeg ? seg.color : 'rgba(255,255,255,0.08)', color: isActiveSeg ? '#000' : 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '0.6rem' }}
                      >
                        <Play size={10} />
                      </button>
                    </div>

                    {/* Tabla de páginas expandible */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.4rem 0.6rem' }}>
                        <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                          TABLA DE PÁGINAS — Pág Size: {pageSizeKB} KB
                        </p>
                        <table className="seg-table" style={{ fontSize: '0.6rem' }}>
                          <thead>
                            <tr><th>Pág#</th><th>Marco</th><th>V</th><th>Frag.Int.</th></tr>
                          </thead>
                          <tbody>
                            {seg.pageTable.map(pg => {
                              const isActPg = isActiveSeg && activePage === pg.pageNum;
                              const internalFrag = pg.pageNum === seg.pageTable.length - 1
                                ? (seg.pageTable.length * pageSizeKB) - seg.size : 0;
                              return (
                                <tr key={pg.pageNum} style={isActPg ? { background: 'rgba(0,242,255,0.15)' } : {}}>
                                  <td style={{ fontWeight: isActPg ? 'bold' : 'normal', color: isActPg ? 'var(--primary)' : 'inherit' }}>
                                    {pg.pageNum}
                                  </td>
                                  <td style={{ color: pg.valid ? 'var(--secondary)' : 'var(--accent-red)', fontWeight: 'bold' }}>
                                    {pg.valid ? `F${pg.frame}` : 'DISCO'}
                                  </td>
                                  <td>
                                    <span style={{ color: pg.valid ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                      {pg.valid ? '1' : '0'}
                                    </span>
                                  </td>
                                  <td style={{ color: internalFrag > 0 ? 'var(--accent-orange)' : 'var(--text-muted)', fontSize: '0.55rem' }}>
                                    {internalFrag > 0 ? `${internalFrag}KB` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dirección física resultado */}
        {activeSegNum !== null && selectedProcess && (() => {
          const seg = selectedProcess.segments[activeSegNum];
          if (!seg) return null;
          const pageNum = Math.floor(offset / pageSizeKB);
          const frameOffset = offset % pageSizeKB;
          const pg = seg.pageTable[pageNum];
          const physAddr = pg?.valid ? pg.frame * pageSizeKB + frameOffset : null;
          return (
            <div className="address-display" style={{ borderColor: flowAction === 'SEG_FAULT' || flowAction === 'PAGE_FAULT_DETECTED' ? 'var(--accent-red)' : 'var(--secondary)' }}>
              <div className="address-bits">
                <div className="bit-group">
                  <span className="bit-label">Marco</span>
                  <span className="bit-value" style={{ color: 'var(--secondary)' }}>
                    {pg?.valid ? `F${pg.frame}` : '—'}
                  </span>
                </div>
                <div className="bit-group">
                  <span className="bit-label">Offset</span>
                  <span className="bit-value">{frameOffset} KB</span>
                </div>
                <div className="bit-group">
                  <span className="bit-label">Dir. Física</span>
                  <span className="bit-value" style={{ color: physAddr !== null ? 'var(--primary)' : '#ef4444', fontSize: '1rem' }}>
                    {physAddr !== null ? `${physAddr} KB` : flowAction === 'PAGE_FAULT_DETECTED' ? '⚡ PF' : '🚫 TRAP'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.5rem', textAlign: 'center', opacity: 0.5, marginTop: '0.2rem' }}>
                DIR. FÍSICA = Marco × {pageSizeKB}KB + Offset
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};

export default MMU;
