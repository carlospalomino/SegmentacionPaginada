import React, { useState } from 'react';
import { Cpu, Plus, Trash2, TrendingUp } from 'lucide-react';
import { SEG_TYPES } from '../constants/segTypes.js';

// Dirección lógica: (segNum, pageNum, frameOffset)
const LogicalAddress = ({ activeSegNum, offset, pageSizeKB, proc }) => {
  if (!proc || activeSegNum === null) return null;
  const seg = proc.segments[activeSegNum];
  if (!seg) return null;
  const pageNum = Math.floor(offset / pageSizeKB);
  const frameOffset = offset % pageSizeKB;
  return (
    <div className="address-display">
      <div className="address-bits">
        <div className="bit-group">
          <span className="bit-label">Seg</span>
          <span className="bit-value" style={{ color: seg.color }}>{activeSegNum}</span>
        </div>
        <div className="bit-group">
          <span className="bit-label">Pág</span>
          <span className="bit-value" style={{ color: 'var(--primary)' }}>{pageNum}</span>
        </div>
        <div className="bit-group">
          <span className="bit-label">Offset</span>
          <span className="bit-value">{frameOffset} KB</span>
        </div>
      </div>
      <div style={{ marginTop: '0.4rem', fontSize: '0.65rem', fontWeight: 'bold', color: seg.color }}>
        {seg.segType} · {seg.pageTable.length} páginas · Límite {seg.limit} KB
      </div>
      <div style={{ fontSize: '0.5rem', textAlign: 'center', opacity: 0.5, marginTop: '0.2rem' }}>
        DIRECCIÓN LÓGICA (Seg | Pág | Offset)
      </div>
    </div>
  );
};

const CPU = ({
  processes,
  selectedProcessId, setSelectedProcessId,
  newProcConfig, setNewProcConfig,
  addProcess, removeProcess,
  activeSegNum, offset, setOffset,
  flowAction,
  pageSizeKB,
  growSegment
}) => {
  const [growDelta, setGrowDelta] = useState(4);
  const [growSegIdx, setGrowSegIdx] = useState(0);
  const selectedProcess = processes.find(p => p.id === selectedProcessId);

  return (
    <section className={`node glass-card ${flowAction === 'CPU_TO_MMU' ? 'active' : ''}`}>
      <div className="node-header">
        <div className="node-icon" style={{ color: 'var(--primary)' }}><Cpu size={24} /></div>
        <div>
          <h3 className="display-font">CPU</h3>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Genera direcciones lógicas</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>

        {/* Config nuevo proceso */}
        <div className="input-group">
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>NUEVO PROCESO (tamaño segmentos en KB)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem' }}>
            {SEG_TYPES.map(({ key, type, color }) => (
              <div key={key}>
                <label style={{ fontSize: '0.6rem', color, display: 'block', marginBottom: '2px' }}>{type}</label>
                <input
                  type="number" min={pageSizeKB} max={64} step={pageSizeKB}
                  value={newProcConfig[key]}
                  onChange={e => setNewProcConfig(prev => ({ ...prev, [key]: Math.max(pageSizeKB, Number(e.target.value)) }))}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
          <button onClick={addProcess} className="btn-add" style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={16} /> Crear Proceso
          </button>
        </div>

        {/* Lista de procesos */}
        <div style={{ flex: 1, minHeight: '120px', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>PROCESOS ACTIVOS</p>
          {processes.length === 0 && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.5, textAlign: 'center', marginTop: '1rem' }}>
              Sin procesos activos
            </p>
          )}
          {processes.map(p => {
            const pagesInRam = p.segments.reduce((acc, s) => acc + s.pageTable.filter(pg => pg.valid).length, 0);
            const totalPages = p.segments.reduce((acc, s) => acc + s.pageTable.length, 0);
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProcessId(p.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.6rem', marginBottom: '0.35rem', borderRadius: '10px',
                  background: selectedProcessId === p.id ? `${p.color}15` : 'transparent',
                  border: `1px solid ${selectedProcessId === p.id ? p.color : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.id}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      {pagesInRam}/{totalPages} págs en RAM
                    </span>
                  </div>
                </div>
                <Trash2 size={14} className="trash"
                  onClick={e => { e.stopPropagation(); removeProcess(p.id); }} />
              </div>
            );
          })}
        </div>

        {/* Offset control */}
        {selectedProcess && (
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>OFFSET (KB)</label>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>{offset} KB</span>
            </div>
            <input
              type="range" min={0}
              max={Math.max(...selectedProcess.segments.map(s => s.limit)) - 1}
              value={offset}
              onChange={e => setOffset(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>Pág {Math.floor(offset / pageSizeKB)}</span>
              <span>Offset dentro del frame: {offset % pageSizeKB} KB</span>
            </div>
          </div>
        )}

        <LogicalAddress
          activeSegNum={activeSegNum}
          offset={offset}
          pageSizeKB={pageSizeKB}
          proc={selectedProcess}
        />

        {/* Panel de CRECIMIENTO DE SEGMENTO */}
        {selectedProcess && growSegment && (
          <div className="input-group" style={{ padding: '0.6rem', borderColor: '#10b981', background: 'rgba(16,185,129,0.04)', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={12} color="#10b981" />
              <p style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#10b981' }}>CRECER SEGMENTO</p>
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              {selectedProcess.segments.map((seg, idx) => (
                <button
                  key={idx}
                  onClick={() => setGrowSegIdx(idx)}
                  style={{
                    padding: '2px 7px', borderRadius: '6px', border: '1px solid',
                    borderColor: growSegIdx === idx ? seg.color : 'var(--card-border)',
                    background: growSegIdx === idx ? `${seg.color}22` : 'transparent',
                    color: growSegIdx === idx ? seg.color : 'var(--text-muted)',
                    fontSize: '0.6rem', fontWeight: growSegIdx === idx ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {seg.segType}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>+ KB:</span>
              <input
                type="number" min="1" max="64" value={growDelta}
                onChange={e => setGrowDelta(Math.max(1, Number(e.target.value)))}
                style={{ width: '52px', textAlign: 'center', padding: '0.2rem 0.3rem', fontSize: '0.75rem' }}
              />
              <button
                onClick={() => growSegment(selectedProcessId, growSegIdx, growDelta)}
                disabled={!!flowAction}
                style={{
                  flex: 1, padding: '0.3rem 0.5rem', borderRadius: '8px', border: 'none',
                  background: flowAction ? 'rgba(16,185,129,0.2)' : '#10b981',
                  color: flowAction ? '#10b981' : '#000',
                  fontSize: '0.65rem', fontWeight: 700, cursor: flowAction ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                  transition: 'all 0.2s',
                }}
              >
                <TrendingUp size={11} /> Crecer
              </button>
            </div>

            {selectedProcess.segments[growSegIdx] && (
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                Actual: <strong style={{ color: selectedProcess.segments[growSegIdx].color }}>
                  {selectedProcess.segments[growSegIdx].limit} KB
                </strong>
                {' '}→ Nuevo: <strong style={{ color: '#10b981' }}>
                  {selectedProcess.segments[growSegIdx].limit + growDelta} KB
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export { CPU };
