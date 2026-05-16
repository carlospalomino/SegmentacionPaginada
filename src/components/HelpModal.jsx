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
            <h3><Info size={18} /> ¿Qué es la Segmentación Simple?</h3>
            <p>
              Es un esquema de gestión de memoria donde el espacio de direcciones de un proceso se divide en
              <strong> segmentos de tamaño variable</strong> con significado lógico: Código, Datos, Heap y Pila.
              Cada segmento se ubica en un bloque <strong>contiguo</strong> en la RAM física, pero los segmentos
              entre sí pueden estar <strong>separados</strong>. Esto provoca <strong>Fragmentación Externa</strong>
              (huecos entre segmentos).
            </p>
          </div>

          <div className="help-grid">
            <div className="help-card">
              <h4><Cpu size={14} style={{ color: 'var(--primary)' }} /> CPU</h4>
              <p style={{ fontSize: '0.75rem' }}>Configura el tamaño de cada segmento (Código, Datos, Heap, Pila) y genera direcciones lógicas &lt;Segmento, Offset&gt;. Haz clic en el ▶ de la tabla de segmentos para simular un acceso.</p>
            </div>
            <div className="help-card">
              <h4><Binary size={14} style={{ color: 'var(--secondary)' }} /> MMU y Tabla de Segmentos</h4>
              <p style={{ fontSize: '0.75rem' }}>Traduce la dirección lógica a física: Dir. Física = Base[Seg] + Offset. Valida que Offset &lt; Límite. Si no, lanza un <strong>Segmentation Fault (Trap)</strong>.</p>
            </div>
            <div className="help-card">
              <h4><Zap size={14} style={{ color: 'var(--accent-cyan)' }} /> TLB (Caché)</h4>
              <p style={{ fontSize: '0.75rem' }}>Guarda las traducciones de segmento recientes (Base + Límite) para evitar consultar la Tabla de Segmentos en RAM en cada acceso.</p>
            </div>
            <div className="help-card">
              <h4><Layers size={14} style={{ color: 'var(--tertiary)' }} /> First / Best / Worst Fit</h4>
              <p style={{ fontSize: '0.75rem' }}>Al cargar un segmento en la RAM, el SO busca un hueco libre usando el algoritmo seleccionado. Si no hay espacio, usa la <strong>Compactación</strong> para consolidar los huecos.</p>
            </div>
          </div>

          <div className="help-section" style={{ marginTop: '1.5rem' }}>
            <h3>¿Cómo usar el simulador?</h3>
            <ol style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>Configura el tamaño de cada segmento en la CPU y haz clic en <strong>Crear Proceso</strong>. El SO buscará huecos en la RAM para cada segmento.</li>
              <li style={{ marginBottom: '0.5rem' }}>Selecciona el algoritmo de asignación (<strong>FIRST</strong>, <strong>BEST</strong> o <strong>WORST</strong> Fit) en el header.</li>
              <li style={{ marginBottom: '0.5rem' }}>Activa <strong>TLB</strong> y <strong>PASO A PASO</strong> para ver en detalle cada ciclo de traducción de dirección.</li>
              <li style={{ marginBottom: '0.5rem' }}>Haz clic en el ▶ de cualquier segmento de la Tabla de Segmentos para simular un acceso y ver si es HIT, MISS o <strong>SEG FAULT</strong>.</li>
              <li style={{ marginBottom: '0.5rem' }}>Cuando la RAM esté fragmentada, usa el botón <strong>⚡ Compactar RAM</strong> para consolidar todos los huecos libres.</li>
              <li>Activa <strong>HUECOS LIBRES</strong> para ver la lista que el SO mantiene de los espacios disponibles.</li>
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
