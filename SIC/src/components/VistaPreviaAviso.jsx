import './VistaPreviaAviso.css';

export default function VistaPreviaAviso({
  negocio,
  textoOferta,
  logoUrl,
  contacto,
  redesSociales,
}) {
  const mostrarPreview = negocio.trim() && textoOferta.trim();

  if (!mostrarPreview) {
    return (
      <div className="vista-previa-vacia">
        <p>Completa el nombre del negocio y el texto de la oferta para ver la vista previa del aviso.</p>
      </div>
    );
  }

  return (
    <div className="vista-previa-aviso">
      <div className="vista-previa-header">
        <h3>Vista previa del aviso</h3>
        <span className="vista-previa-badge">15 seg en vivo · Just Broadcast</span>
      </div>

      <div className="vista-previa-pantalla">
        <div className="vista-previa-tv-bg">
          <span className="vista-previa-canal">BYNILO ADS TV</span>
        </div>

        <div className="vista-previa-banner">
          <div className="vista-previa-banner-contenido">
            {logoUrl ? (
              <div className="vista-previa-logo">
                <img src={logoUrl} alt={`Logo de ${negocio}`} />
              </div>
            ) : (
              <div className="vista-previa-logo vista-previa-logo-placeholder">
                <span>Sin logo</span>
              </div>
            )}

            <div className="vista-previa-textos">
              <p className="vista-previa-negocio">{negocio}</p>
              <p className="vista-previa-oferta">{textoOferta}</p>

              {(contacto.trim() || redesSociales.trim()) && (
                <div className="vista-previa-extra">
                  {contacto.trim() && (
                    <span className="vista-previa-contacto">📞 {contacto}</span>
                  )}
                  {redesSociales.trim() && (
                    <span className="vista-previa-redes">🌐 {redesSociales}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="vista-previa-nota">
        Así se verá tu aviso en pantalla durante la emisión (negocio, oferta
        {logoUrl ? ', logo' : ''}
        {contacto.trim() ? ', contacto' : ''}
        {redesSociales.trim() ? ', redes sociales' : ''}).
      </p>
    </div>
  );
}
