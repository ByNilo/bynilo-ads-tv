import './ModalOrtografia.css';

export default function ModalModeracion({
  abierto,
  resultado,
  onModificar,
  onAplicarSugerencia,
  onCerrar,
}) {
  if (!abierto || !resultado) return null;

  const esAmarillo = resultado.semaforo === 'amarillo';
  const palabras = resultado.palabrasInfractoras || [];
  const sugerencias = resultado.sugerencias || [];
  const puedeAplicarSugerencia =
    resultado.textoSugerido &&
    resultado.textoOriginal &&
    resultado.textoSugerido.trim() !== resultado.textoOriginal.trim() &&
    resultado.textoSugerido.length <= 150;

  return (
    <div className="modal-ortografia-overlay" onClick={onCerrar} role="presentation">
      <div
        className="modal-ortografia"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-moderacion-titulo"
        aria-modal="true"
      >
        <div className="modal-ortografia-header">
          <h2 id="modal-moderacion-titulo">
            {esAmarillo ? '🟡 Revisión de contenido' : '🔴 Contenido no permitido'}
          </h2>
        </div>

        <div className="modal-ortografia-body">
          <p className="modal-ortografia-resumen">
            {resultado.mensaje || resultado.razon}
          </p>

          {esAmarillo && (
            <p className="modal-ortografia-resumen">
              Tu anuncio quedará en <strong>revisión editorial</strong> hasta confirmar los cambios.
            </p>
          )}

          {resultado.textoOriginal && (
            <div className="modal-ortografia-bloque">
              <span className="modal-ortografia-etiqueta">Tu texto</span>
              <p className="modal-ortografia-texto">{resultado.textoOriginal}</p>
            </div>
          )}

          {palabras.length > 0 && (
            <div className="modal-ortografia-bloque modal-moderacion-infractor">
              <span className="modal-ortografia-etiqueta">Palabra(s) que infringen las normas</span>
              <p className="modal-moderacion-palabras">
                {palabras.map((p) => (
                  <span key={p} className="modal-moderacion-palabra">{p}</span>
                ))}
              </p>
            </div>
          )}

          {puedeAplicarSugerencia && (
            <div className="modal-ortografia-bloque modal-ortografia-sugerido">
              <span className="modal-ortografia-etiqueta">Texto sugerido</span>
              <p className="modal-ortografia-texto">{resultado.textoSugerido}</p>
            </div>
          )}

          {sugerencias.length > 0 && (
            <ul className="modal-ortografia-lista">
              {sugerencias.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          <p className="modal-ortografia-ayuda">
            Modifica el texto, aplica la sugerencia o corrige la(s) palabra(s) señalada(s) y vuelve a confirmar.
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
          <button type="button" className="modal-ortografia-btn primario" onClick={onCerrar}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
