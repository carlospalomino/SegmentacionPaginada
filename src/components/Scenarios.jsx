import React from 'react';
import { GraduationCap, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { ACADEMIC_SCENARIOS } from '../logic/scenarios.js';

const Scenarios = ({ onLoadScenario, activeScenarioId }) => {
  const getIcon = (id) => {
    switch (id) {
      case 'frag-ext': return <AlertTriangle size={15} color="var(--primary)" />;
      case 'growth-reloc': return <TrendingUp size={15} color="var(--secondary)" />;
      case 'rescue-swap': return <RefreshCw size={15} color="#f97316" />;
      default: return <GraduationCap size={15} />;
    }
  };

  const getAccentColor = (id) => {
    switch (id) {
      case 'frag-ext': return 'var(--primary)';
      case 'growth-reloc': return 'var(--secondary)';
      case 'rescue-swap': return '#f97316';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="glass-card scenario-panel" style={{ padding: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <GraduationCap size={20} style={{ color: 'var(--primary)' }} />
        <h4 className="display-font" style={{ fontSize: '0.85rem', margin: 0, fontWeight: 700, letterSpacing: '0.03em' }}>
          ESCENARIOS ACADÉMICOS <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>· Demostración UTP</span>
        </h4>
      </div>

      <div className="scenario-grid">
        {ACADEMIC_SCENARIOS.map((sc) => {
          const isActive = activeScenarioId === sc.id;
          const accentColor = getAccentColor(sc.id);
          return (
            <div
              key={sc.id}
              onClick={() => onLoadScenario(sc)}
              className={`scenario-card ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? accentColor : 'var(--border-color)',
                background: isActive ? `${accentColor}0e` : 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                {getIcon(sc.id)}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? accentColor : 'var(--text-main)' }}>
                  {sc.title}
                </span>
              </div>
              <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {sc.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scenarios;
