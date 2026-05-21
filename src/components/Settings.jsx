import React, { useState } from 'react';
import { X, Settings as SettingsIcon, RotateCcw } from 'lucide-react';

const RAM_OPTIONS = [32, 64, 128, 256];
const PAGE_OPTIONS = [2, 4, 8, 16];

const Settings = ({ isOpen, onClose, ramSizeKB, setRamSizeKB, pageSizeKB, setPageSizeKB, onApply }) => {
  const [localRam, setLocalRam] = useState(ramSizeKB);
  const [localPage, setLocalPage] = useState(pageSizeKB);

  if (!isOpen) return null;

  const frames = Math.floor(localRam / localPage);

  const handleApply = () => {
    setRamSizeKB(localRam);
    setPageSizeKB(localPage);
    onApply(localRam, localPage);
    onClose();
  };

  const OptionGroup = ({ label, options, current, onChange, suffix }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid',
              borderColor: current === opt ? 'var(--primary)' : 'var(--card-border)',
              background: current === opt ? 'rgba(0,242,255,0.1)' : 'var(--bg-soft)',
              color: current === opt ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: current === opt ? 700 : 400,
              cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
            }}
          >
            {opt} {suffix}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card" style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
              <SettingsIcon size={18} />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Configuración del Sistema</h2>
          </div>
          <button className="header-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <OptionGroup label="Tamaño de RAM" options={RAM_OPTIONS} current={localRam} onChange={setLocalRam} suffix="KB" />
        <OptionGroup label="Tamaño de Página / Marco" options={PAGE_OPTIONS} current={localPage} onChange={setLocalPage} suffix="KB" />

        <div style={{
          background: 'rgba(0,242,255,0.06)', borderRadius: '12px', padding: '0.75rem 1rem',
          border: '1px solid rgba(0,242,255,0.15)', fontSize: '0.78rem', color: 'var(--text-muted)',
        }}>
          ℹ️ En Segmentación Paginada la RAM se divide en <strong>marcos fijos</strong> del tamaño de página elegido. Los segmentos se dividen en páginas que se cargan <strong>solo cuando se acceden</strong> (paginación por demanda).
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--bg-soft)', borderRadius: '12px', padding: '1rem',
          border: '1px solid var(--card-border)', fontSize: '0.82rem',
          display: 'flex', flexDirection: 'column', gap: '0.4rem',
        }}>
          {[
            ['RAM total', `${localRam} KB`, 'var(--primary)'],
            ['Tamaño de página', `${localPage} KB`, 'var(--secondary)'],
            ['Marcos en RAM', `${frames} marcos`, 'var(--tertiary)'],
            ['Disco (Backing Store)', `${localRam * 2} KB`, '#f97316'],
            ['Fragmentación', 'Interna (última pág.)', 'var(--accent-orange)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
              <span style={{ color: c, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--card-border)',
            background: 'var(--bg-soft)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600,
          }}>
            Cancelar
          </button>
          <button onClick={handleApply} style={{
            flex: 2, padding: '0.7rem', borderRadius: '10px', border: 'none',
            background: 'var(--primary)', color: '#000', cursor: 'pointer', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}>
            <RotateCcw size={16} />
            Aplicar y Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
