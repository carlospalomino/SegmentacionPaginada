import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const MetricCard = ({ label, value, percent, color, subValue }) => (
  <div className="glass-panel" style={{ padding: '0.8rem', borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.7rem' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: color, fontWeight: 'bold' }}>{value}</span>
    </div>
    <div style={{ width: '100%', height: '4px', background: 'var(--bg-soft)', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.4rem' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percent, 100)}%` }}
        style={{ height: '100%', background: color, borderRadius: '10px' }}
        transition={{ duration: 0.5 }}
      />
    </div>
    {subValue && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{subValue}</div>}
  </div>
);

const Dashboard = ({ metrics, logs }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginTop: '1.5rem', alignItems: 'stretch' }}>

    {/* Left: Metrics */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        <MetricCard
          label="USO RAM"
          value={`${metrics.ramUsagePct}%`}
          percent={metrics.ramUsagePct}
          color="var(--tertiary)"
          subValue={`${metrics.ramUsedKB} KB / ${metrics.ramTotalKB} KB`}
        />
        <MetricCard
          label="FRAGMENTACIÓN EXT."
          value={`${metrics.fragPct}%`}
          percent={metrics.fragPct}
          color={metrics.fragPct > 30 ? '#ef4444' : 'var(--accent-orange)'}
          subValue={`${metrics.freeHoles} huecos libres · ${metrics.fragKB} KB`}
        />
        <MetricCard
          label="SEG FAULTS"
          value={`${metrics.segFaults}`}
          percent={metrics.totalAccesses > 0 ? Math.round((metrics.segFaults / metrics.totalAccesses) * 100) : 0}
          color="#ef4444"
          subValue={`${metrics.totalAccesses} accesos totales`}
        />
        <MetricCard
          label="TLB HIT RATE"
          value={metrics.tlbAccesses > 0 ? `${Math.round((metrics.tlbHits / metrics.tlbAccesses) * 100)}%` : 'N/A'}
          percent={metrics.tlbAccesses > 0 ? Math.round((metrics.tlbHits / metrics.tlbAccesses) * 100) : 0}
          color="var(--accent-cyan)"
          subValue={`Hits: ${metrics.tlbHits} / ${metrics.tlbAccesses}`}
        />
      </div>
    </div>

    {/* Right: Trace Logs */}
    <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '220px' }}>
      <h4 className="display-font" style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle size={14} /> TRACE DEL SISTEMA
      </h4>
      <div className="log-container">
        <AnimatePresence initial={false}>
          {logs.map(log => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="log-item"
              style={{
                borderLeftColor:
                  log.type === 'error' ? '#ef4444'
                  : log.type === 'warning' ? 'var(--accent-orange)'
                  : log.type === 'success' ? 'var(--tertiary)'
                  : 'var(--primary)',
              }}
            >
              <span className="log-time">{log.time}</span>
              <span className="log-msg">{log.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {logs.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', fontStyle: 'italic' }}>
            Esperando eventos...
          </div>
        )}
      </div>
    </section>
  </div>
);

export default Dashboard;
