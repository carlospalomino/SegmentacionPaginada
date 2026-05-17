import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Cpu, Binary, Layers, Zap, Info } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="modal-overlay" onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
          className="help-content" onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="display-font" style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <HelpCircle /> Guía del Simulador
            </h2>
            <button className="help-btn" onClick={onClose}>&times;</button>
          </div>

          <div className="help-section">
            <h3><Info size={18} /> ¿Qué es la Segmentación Paginada?</h3>
            <p>
              Combina lo mejor de ambos mundos: el proceso se divide en <strong>segmentos lógicos</strong>
              (Código, Datos, Heap, Pila) y cada segmento se subdivide en <strong>páginas de tamaño fijo</strong>.
              Las páginas se ubican en <strong>marcos no contiguos</strong> de RAM. Usa
              <strong> paginación por demanda</strong>: al crear un proceso, todas sus páginas inician en DISCO
              y solo se cargan en RAM cuando se acceden (PAGE FAULT).
            </p>
          </div>

          <div className="help-grid">
            <div className="help-card">
              <h4><Cpu size={14} style={{ color: 'var(--primary)' }} /> CPU</h4>
              <p style={{ fontSize: '0.75rem' }}>Configura el tamaño de cada segmento y genera direcciones lógicas &lt;Seg, Offset&gt;. El Offset se descompone automáticamente en PágNum + OffsetDentroDelMarco.</p>
            </div>
            <div className="help-card">
              <h4><Binary size={14} style={{ color: 'var(--secondary)' }} /> MMU (2 niveles)</h4>
              <p style={{ fontSize: '0.75rem' }}>Traduce en 2 pasos: 1º consulta la <strong>Tabla de Segmentos</strong> (según segNum), 2º consulta la <strong>Tabla de Páginas</strong> del segmento (según págNum). Dir. Física = Marco × TamPág + Offset.</p>
            </div>
            <div className="help-card">
              <h4><Zap size={14} style={{ color: 'var(--accent-cyan)' }} /> TLB (Caché)</h4>
              <p style={{ fontSize: '0.75rem' }}>Guarda la traducción (PID, SegNum, PágNum) → Marco para evitar consultar ambas tablas en RAM. Solo almacena páginas que están en RAM (bit V=1).</p>
            </div>
            <div className="help-card">
              <h4><Layers size={14} style={{ color: 'var(--tertiary)' }} /> PAGE FAULT</h4>
              <p style={{ fontSize: '0.75rem' }}>Cuando bit V=0 (página en disco), el SO toma el control, carga la página al primer marco libre. Si la RAM está llena, usa <strong>FIFO o LRU</strong> para expulsar una página víctima al disco.</p>
            </div>
          </div>

          <div className="help-section" style={{ marginTop: '1.5rem' }}>
            <h3>¿Cómo usar el simulador?</h3>
            <ol style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Configura el tamaño de cada segmento en la CPU y haz clic en <strong>Crear Proceso</strong>. Todas las páginas inician en <strong>DISCO</strong>.</li>
              <li style={{ marginBottom: '0.5rem' }}>Haz clic en el ▶ de cualquier segmento para simular un acceso. Si la página no está en RAM, verás un <strong>PAGE FAULT</strong> animado.</li>
              <li style={{ marginBottom: '0.5rem' }}>Activa <strong>TLB</strong> para ver TLB HITs y MISSes. Activa <strong>PASO A PASO</strong> para ver cada etapa del proceso de traducción.</li>
              <li style={{ marginBottom: '0.5rem' }}>Ajusta el <strong>Offset</strong> en la CPU para acceder a diferentes páginas del mismo segmento.</li>
              <li>Cuando la RAM esté llena, el algoritmo <strong>FIFO o LRU</strong> seleccionará una página víctima para expulsar al disco y hacer espacio.</li>
            </ol>
          </div>

          <button className="btn-primary" onClick={onClose} style={{ width: '100%', marginTop: '1rem', padding: '1rem', borderRadius: '12px' }}>
            Entendido ✓
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HelpModal;
