import React, { useState } from 'react';
import { X, Settings as SettingsIcon, RotateCcw } from 'lucide-react';

const RAM_OPTIONS = [32, 64, 128, 256, 512];

const Settings = ({ isOpen, onClose, ramSizeKB, setRamSizeKB, onApply }) => {
  const [localRam, setLocalRam] = useState(ramSizeKB);

  if (!isOpen) return null;

  const handleApply = () => {
    setRamSizeKB(localRam);
    onApply();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card" style={{ width: '380px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
              <SettingsIcon size={18} />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Configuración del Sistema</h2>
          </div>
          <button className="header-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* RAM Size */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tamaño de RAM
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {RAM_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setLocalRam(opt)}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid',
                  borderColor: localRam === opt ? 'var(--primary)' : 'var(--card-border)',
                  background: localRam === opt ? 'rgba(245,158,11,0.15)' : 'var(--bg-soft)',
                  color: localRam === opt ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: localRam === opt ? 700 : 400,
                  cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
                }}
              >
                {opt} KB
              </button>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: '12px', padding: '0.75rem 1rem',
          border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.78rem', color: 'var(--text-muted)',
        }}>
          <p>⚠️ En Segmentación Simple los segmentos son de <strong>tamaño variable</strong>. El algoritmo de asignación (First/Best/Worst Fit) busca un hueco apropiado en la RAM para cada segmento.</p>
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--bg-soft)', borderRadius: '12px', padding: '1rem',
          border: '1px solid var(--card-border)', fontSize: '0.82rem', color: 'var(--text-muted)',
          display: 'flex', flexDirection: 'column', gap: '0.4rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>RAM total:</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{localRam} KB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tamaño de bloques:</span>
            <span style={{ fontWeight: 600 }}>Variable (por segmento)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Fragmentación:</span>
            <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>Externa</span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--card-border)',
              background: 'var(--bg-soft)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 2, padding: '0.7rem', borderRadius: '10px', border: 'none',
              background: 'var(--primary)', color: '#000', cursor: 'pointer', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            <RotateCcw size={16} />
            Aplicar y Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
