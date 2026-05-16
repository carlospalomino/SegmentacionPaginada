import React, { useState } from 'react';
import { Cpu, Plus, Trash2, TrendingUp } from 'lucide-react';
import { SEG_TYPES } from '../constants/segTypes.js';

// Muestra la dirección lógica compuesta: <segNum, offset>
const LogicalAddress = ({ segNum, offset, proc }) => {
  if (!proc) return null;
  const seg = proc.segments[segNum];
  return (
    <div className="address-display">
      <div className="address-bits">
        <div className="bit-group">
          <span className="bit-label">Segmento</span>
          <span className="bit-value" style={{ color: seg?.color || 'var(--primary)' }}>
            {segNum !== null ? segNum : '--'}
          </span>
        </div>
        <div className="bit-group">
          <span className="bit-label">Offset</span>
          <span className="bit-value">
            {offset !== null ? offset : '--'} KB
          </span>
        </div>
      </div>
      {seg && segNum !== null && (
        <>
          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold', color: seg.color }}>
            {seg.segType} · Límite: {seg.limit} KB
          </div>
          <div style={{ fontSize: '0.5rem', opacity: 0.4, fontStyle: 'italic' }}>
            Dir. lógica: Seg {segNum}, Offset {offset}
          </div>
        </>
      )}
      <div style={{ fontSize: '0.5rem', textAlign: 'center', opacity: 0.5, marginTop: '0.2rem' }}>
        DIRECCIÓN LÓGICA
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
  growSegment,
  sharedCodeFrom, setSharedCodeFrom
}) => {
  const selectedProcess = processes.find(p => p.id === selectedProcessId);
  const [growDelta, setGrowDelta] = useState(4);
  const [growSegIdx, setGrowSegIdx] = useState(0);

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
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>NUEVO PROCESO</p>
          
          <div style={{ marginBottom: '0.8rem', padding: '0.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.7rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={sharedCodeFrom !== ''} 
                  onChange={e => setSharedCodeFrom(e.target.checked ? (processes[0]?.id || '') : '')} 
                  disabled={processes.length === 0} 
                  style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                Compartir Código existente
             </label>
             {sharedCodeFrom !== '' && processes.length > 0 && (
               <select 
                 value={sharedCodeFrom} 
                 onChange={e => setSharedCodeFrom(e.target.value)} 
                 style={{ marginTop: '0.4rem', width: '100%', padding: '0.25rem', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.7rem', outline: 'none' }}
               >
                 {processes.map(p => <option key={p.id} value={p.id}>Reutilizar código de {p.id}</option>)}
               </select>
             )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {SEG_TYPES.map(({ type, key, color, defaultSize }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.7rem', flex: 1, color: 'var(--text-main)', opacity: (sharedCodeFrom !== '' && type === 'Código') ? 0.4 : 1 }}>{type}</span>
                {sharedCodeFrom !== '' && type === 'Código' ? (
                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontStyle: 'italic', paddingRight: '0.3rem' }}>Compartido</span>
                ) : (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="64"
                      value={newProcConfig[key]}
                      onChange={e => setNewProcConfig(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      style={{ width: '52px', textAlign: 'center', padding: '0.25rem 0.3rem', fontSize: '0.75rem' }}
                      title={`Tamaño del segmento ${type} en KB`}
                    />
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>KB</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={addProcess} className="btn-add" style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Crear Proceso
          </button>
        </div>

        {/* Lista de procesos */}
        <div>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PROCESOS ACTIVOS</p>
          {processes.length === 0 && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', opacity: 0.5 }}>
              Sin procesos aún
            </p>
          )}
          {processes.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedProcessId(p.id)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.6rem', marginBottom: '0.35rem', borderRadius: '10px',
                background: selectedProcessId === p.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${selectedProcessId === p.id ? p.color : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{p.totalSize} KB</span>
                <Trash2 size={13} className="trash" onClick={e => { e.stopPropagation(); removeProcess(p.id); }} />
              </div>
            </div>
          ))}
        </div>

        {/* Offset slider + dirección lógica */}
        {selectedProcess && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Offset: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{offset} KB</span>
            </label>
            <input
              type="range" min="0" max="63" value={offset}
              onChange={e => setOffset(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <LogicalAddress segNum={activeSegNum} offset={offset} proc={selectedProcess} />
          </div>
        )}

        {/* Panel de CRECIMIENTO DE SEGMENTO */}
        {selectedProcess && growSegment && (
          <div className="input-group" style={{ padding: '0.6rem', borderColor: '#10b981', background: 'rgba(16,185,129,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={12} color="#10b981" />
              <p style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#10b981' }}>CRECER SEGMENTO</p>
            </div>

            {/* Selector de segmento */}
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

            {/* Delta KB */}
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

            {/* Info del segmento seleccionado */}
            {selectedProcess.segments[growSegIdx] && (
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                Actual: <strong style={{ color: selectedProcess.segments[growSegIdx].color }}>
                  {selectedProcess.segments[growSegIdx].size} KB
                </strong>
                {' '}→ Nuevo: <strong style={{ color: '#10b981' }}>
                  {selectedProcess.segments[growSegIdx].size + growDelta} KB
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export { CPU, LogicalAddress };
