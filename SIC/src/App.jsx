import { useState, useEffect } from 'react';
import FormularioAnuncio from './components/FormularioAnuncio';
import { obtenerEstadoServidor } from './api';
import './App.css';

function App() {
  const [estadoServidor, setEstadoServidor] = useState(null);

  useEffect(() => {
    obtenerEstadoServidor()
      .then(setEstadoServidor)
      .catch(() => setEstadoServidor(null));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">📺</span>
          <div>
            <h1>BYNILO ADS TV</h1>
            <p>Plataforma de Publicidad en Vivo</p>
          </div>
        </div>
        {estadoServidor && (
          <div className="estado-servidor">
            {estadoServidor.emisionTvActiva === false ? (
              <>
                <span className="punto amarillo" />
                Modo reservas — emisión TV pendiente
              </>
            ) : (
              <>
                <span className={`punto ${estadoServidor.puedeEmitir ? 'verde' : 'amarillo'}`} />
                {estadoServidor.puedeEmitir
                  ? 'Listo para emitir'
                  : `Próxima emisión en ${estadoServidor.segundosRestantes}s`}
              </>
            )}
          </div>
        )}
      </header>

      {estadoServidor?.emisionTvActiva === false && (
        <div className="aviso-modo-web">
          <p>
            <strong>Sitio en línea.</strong> Puedes agendar y moderar avisos con IA.
            La emisión en TV se activará cuando el estudio de transmisión esté conectado.
          </p>
        </div>
      )}

      <main>
        <FormularioAnuncio />
      </main>

      <footer className="app-footer">
        <p>
          {estadoServidor?.emisionTvActiva === false
            ? 'BYNILO ADS TV · Acercando la publicidad a las Pymes · Reservas en línea'
            : 'Sistema integrado con Just Broadcast · Intervalo mínimo: 45 segundos'}
        </p>
      </footer>
    </div>
  );
}

export default App;
