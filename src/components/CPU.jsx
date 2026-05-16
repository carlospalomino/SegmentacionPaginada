import React from 'react';
import { Cpu, Plus, Trash2 } from 'lucide-react';

// Tipos de segmento predefinidos con colores fijos
export const SEG_TYPES = [
  { type: 'Código',  key: 'code',  color: 'var(--seg-code)',  defaultSize: 8  },
  { type: 'Datos',   key: 'data',  color: 'var(--seg-data)',  defaultSize: 4  },
  { type: 'Heap',    key: 'heap',  color: 'var(--seg-heap)',  defaultSize: 6  },
  { type: 'Pila',    key: 'stack', color: 'var(--seg-stack)', defaultSize: 5  },
];

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
}) => {
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>

        {/* Config nuevo proceso */}
        <div className="input-group">
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>NUEVO PROCESO</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {SEG_TYPES.map(({ type, key, color, defaultSize }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.7rem', flex: 1, color: 'var(--text-main)' }}>{type}</span>
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
              </div>
            ))}
          </div>
          <button onClick={addProcess} className="btn-add" style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Crear Proceso
          </button>
        </div>

        {/* Lista de procesos */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
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
      </div>
    </section>
  );
};

export { CPU, LogicalAddress };
