import React from 'react';
import { Blocks, TrendingUp, Users, Scissors } from 'lucide-react';
import { ACADEMIC_SCENARIOS } from '../logic/scenarios.js';

const Scenarios = ({ onLoadScenario, activeScenarioId }) => {
  const getIcon = (id) => {
    switch (id) {
      case 'frag-ext': return <Blocks size={15} color="var(--primary)" />;
      case 'dynamic-growth': return <TrendingUp size={15} color="var(--secondary)" />;
      case 'shared-code': return <Users size={15} color="#f97316" />;
      case 'internal-frag': return <Scissors size={15} color="#10b981" />;
      default: return <Blocks size={15} />;
    }
  };

  const getAccentColor = (id) => {
    switch (id) {
      case 'frag-ext': return 'var(--primary)';
      case 'dynamic-growth': return 'var(--secondary)';
      case 'shared-code': return '#f97316';
      case 'internal-frag': return '#10b981';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="glass-card scenario-panel" style={{ padding: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Blocks size={20} style={{ color: 'var(--primary)' }} />
        <h4 className="display-font" style={{ fontSize: '0.85rem', margin: 0, fontWeight: 700, letterSpacing: '0.03em' }}>
          ESCENARIOS ACADÉMICOS <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>· Segmentación Paginada</span>
        </h4>
      </div>

      <div className="scenario-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
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
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                {getIcon(sc.id)}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? accentColor : 'var(--text-main)', lineHeight: 1.1 }}>
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
