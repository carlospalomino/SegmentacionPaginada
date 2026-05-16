import React from 'react';
import { motion } from 'framer-motion';

const Connector = ({ active, color, glow }) => (
  <div className="connector-group">
    <div className="connector-line">
      {active && (
        <motion.div
          className="particle"
          animate={{ x: [0, 50], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={color ? { background: color, boxShadow: `0 0 10px ${glow}` } : {}}
        />
      )}
    </div>
  </div>
);

const Footer = ({ visitCount = 0, globalSims = 0, sessionSims = 0 }) => (
  <footer className="glass-card sim-footer">
    {/* Legend */}
    <div className="footer-legend">
      <div className="legend-item">
        <div className="legend-dot" style={{ background: 'var(--seg-code)' }} />
        <span>Código</span>
      </div>
      <div className="legend-item">
        <div className="legend-dot" style={{ background: 'var(--seg-data)' }} />
        <span>Datos</span>
      </div>
      <div className="legend-item">
        <div className="legend-dot" style={{ background: 'var(--seg-heap)' }} />
        <span>Heap</span>
      </div>
      <div className="legend-item">
        <div className="legend-dot" style={{ background: 'var(--seg-stack)' }} />
        <span>Pila</span>
      </div>
      <div className="legend-item">
        <div className="legend-dot" style={{ background: 'rgba(255,255,255,0.12)', border: '1px dashed rgba(255,255,255,0.2)' }} />
        <span>Hueco Libre</span>
      </div>
    </div>

    <div className="footer-divider" />

    {/* Counters */}
    <div className="footer-counters">
      <div className="footer-counter-item">
        <span className="footer-counter-label">VISITAS (TOTAL)</span>
        <motion.span
          className="footer-counter-value"
          key={visitCount}
          initial={{ scale: 1.3, color: 'var(--primary)' }}
          animate={{ scale: 1, color: 'var(--primary)' }}
          transition={{ duration: 0.3 }}
        >
          {visitCount}
        </motion.span>
      </div>
      <div className="footer-counter-sep" />
      <div className="footer-counter-item">
        <span className="footer-counter-label">SIMULACIONES (TOTAL)</span>
        <motion.span
          className="footer-counter-value"
          key={globalSims}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {globalSims}
        </motion.span>
      </div>
      <div className="footer-counter-sep" />
      <div className="footer-counter-item">
        <span className="footer-counter-label">SIMULACIONES (SESIÓN)</span>
        <motion.span
          className="footer-counter-value footer-counter-session"
          key={sessionSims}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {sessionSims}
        </motion.span>
      </div>
    </div>

    <div className="footer-divider" />
    <p className="footer-credits">
      © 2026{' '}
      <a href="https://carlospalomino.me" target="_blank" rel="noopener noreferrer" className="footer-author-link">
        Dr. Ing. Carlos Palomino Vidal
      </a>
    </p>
  </footer>
);

export { Connector, Footer };
