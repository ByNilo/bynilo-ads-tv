import './ModalOrtografia.css';

export default function ModalOrtografia({
  abierto,
  resultado,
  onModificar,
  onAplicarSugerencia,
  onContinuarSinModificar,
}) {
  if (!abierto || !resultado) return null;

  const puedeAplicarSugerencia =
    resultado.textoSugerido &&
    resultado.textoSugerido.trim() !== resultado.textoOriginal.trim() &&
    resultado.textoSugerido.length <= 150;

  return (
    <div className="modal-ortografia-overlay" onClick={onModificar} role="presentation">
      <div
        className="modal-ortografia"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-ortografia-titulo"
        aria-modal="true"
      >
        <div className="modal-ortografia-header">
          <h2 id="modal-ortografia-titulo">Revisión ortográfica</h2>
        </div>

        <div className="modal-ortografia-body">
          <p className="modal-ortografia-resumen">{resultado.resumen}</p>

          <div className="modal-ortografia-bloque">
            <span className="modal-ortografia-etiqueta">Tu texto</span>
            <p className="modal-ortografia-texto">{resultado.textoOriginal}</p>
          </div>

          {puedeAplicarSugerencia && (
            <div className="modal-ortografia-bloque modal-ortografia-sugerido">
              <span className="modal-ortografia-etiqueta">Sugerencia</span>
              <p className="modal-ortografia-texto">{resultado.textoSugerido}</p>
            </div>
          )}

          {resultado.observaciones?.length > 0 && (
            <ul className="modal-ortografia-lista">
              {resultado.observaciones.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          <p className="modal-ortografia-ayuda">
            Puedes modificar el texto, aplicar la sugerencia o continuar sin cambios.
          </p>
        </div>

        <div className="modal-ortografia-footer">
          <button type="button" className="modal-ortografia-btn secundario" onClick={onModificar}>
            Modificar texto
          </button>
          {puedeAplicarSugerencia && (
            <button type="button" className="modal-ortografia-btn sugerencia" onClick={onAplicarSugerencia}>
              Usar texto sugerido
            </button>
          )}
          <button type="button" className="modal-ortografia-btn primario" onClick={onContinuarSinModificar}>
            Continuar sin modificar
          </button>
        </div>
      </div>
    </div>
  );
}
