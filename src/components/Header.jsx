import React from 'react';
import { Zap, Sun, Moon, RotateCcw, Settings, Layers } from 'lucide-react';

const Divider = () => (
  <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }} />
);

const ToggleControl = ({ label, active, onChange, activeColor }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.5rem' }}>
    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
    <label className="switch" style={{ transform: 'scale(0.8)', margin: '-2px 0' }}>
      <input type="checkbox" checked={active} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider round" style={active ? { backgroundColor: activeColor } : {}}></span>
    </label>
  </div>
);

const AlgoSelector = ({ current = 'FIFO', onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.5rem' }}>
    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>REEMPLAZO</span>
    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-soft)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      {['FIFO', 'LRU'].map(algo => (
        <button
          key={algo}
          onClick={() => onChange(algo)}
          style={{
            padding: '2px 8px', borderRadius: '6px', border: 'none',
            background: current === algo ? 'var(--accent-orange)' : 'transparent',
            color: current === algo ? '#000' : 'var(--text-muted)',
            fontWeight: current === algo ? 700 : 500,
            fontSize: '0.6rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {algo}
        </button>
      ))}
    </div>
  </div>
);

const StatBadge = ({ label, value, isAlert, color }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: isAlert ? 'rgba(239,68,68,0.1)' : 'var(--bg-soft)',
    border: `1px solid ${isAlert ? 'rgba(239,68,68,0.3)' : 'var(--card-border)'}`,
    borderRadius: '12px', padding: '0.3rem 0.8rem', minWidth: '64px'
  }}>
    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isAlert ? '#ef4444' : (color || 'var(--text-main)'), lineHeight: 1.1 }}>{value}</span>
  </div>
);

const Header = ({
  darkMode, setDarkMode,
  occupiedFrames, TOTAL_FRAMES,
  pageFaults,
  resetSimulator, onOpenSettings, onOpenHelp,
  isTlbEnabled, setIsTlbEnabled,
  showFreeFrameList, setShowFreeFrameList,
  stepByStepMode, setStepByStepMode,
  replacementAlgo, setReplacementAlgo,
}) => {
  const usedFrames = occupiedFrames ? occupiedFrames.filter(f => f !== null).length : 0;
  const ramPct = TOTAL_FRAMES > 0 ? Math.round((usedFrames / TOTAL_FRAMES) * 100) : 0;

  return (
    <header className="glass-card" style={{ padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="pulse" style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '12px', color: 'black' }}>
          <Layers size={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.3rem', margin: 0, lineHeight: 1.2 }}>
              MemoryFlow <span style={{ fontWeight: 300, opacity: 0.7 }}>Segmentación Paginada</span>
            </h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(0,242,255,0.15)', border: '1px solid rgba(0,242,255,0.4)',
              borderRadius: '6px', padding: '2px 6px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 4px var(--primary)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: 'var(--primary)', whiteSpace: 'nowrap' }}>DEMAND PAGING</span>
            </div>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
            Marcos Fijos · Paginación por Demanda · TLB · FIFO / LRU
          </p>
        </div>
      </div>

      {/* Center: Controls */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-soft)', border: '1px solid var(--card-border)',
        borderRadius: '16px', padding: '0.2rem 0.5rem',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <AlgoSelector current={replacementAlgo} onChange={setReplacementAlgo} />
        <Divider />
        <ToggleControl label="TLB" active={isTlbEnabled} onChange={setIsTlbEnabled} activeColor="var(--accent-cyan)" />
        <Divider />
        <ToggleControl label="MARCOS LIBRES" active={showFreeFrameList} onChange={setShowFreeFrameList} activeColor="var(--tertiary)" />
        <Divider />
        <ToggleControl label="PASO A PASO" active={stepByStepMode} onChange={setStepByStepMode} activeColor="var(--secondary)" />
      </div>

      {/* Right: Stats & Actions */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <StatBadge label="PAGE FAULTS" value={pageFaults} isAlert={pageFaults > 0} />
          <StatBadge label="USO RAM" value={`${ramPct}%`} color="var(--tertiary)" />
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => setDarkMode(!darkMode)} className="header-btn" title="Alternar Tema">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={resetSimulator} className="header-btn" title="Reiniciar Simulador">
            <RotateCcw size={16} />
          </button>
          <button onClick={onOpenSettings} className="header-btn" title="Configuración">
            <Settings size={16} />
          </button>
          <button onClick={onOpenHelp} className="help-btn" style={{ marginLeft: '0.2rem' }} title="Ayuda">
            ?
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
