import { useState, useEffect } from 'react';
import FormularioAnuncio from './components/FormularioAnuncio';
import { obtenerEstadoServidor, obtenerEstadoOrden } from './api';
import './App.css';

function App() {
  const [estadoServidor, setEstadoServidor] = useState(null);
  const [avisoPago, setAvisoPago] = useState(null);

  useEffect(() => {
    obtenerEstadoServidor()
      .then(setEstadoServidor)
      .catch(() => setEstadoServidor(null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultadoPago = params.get('pago');
    const ordenId = params.get('orden');

    if (!resultadoPago) return;

    if (resultadoPago === 'exitoso' && ordenId) {
      obtenerEstadoOrden(ordenId)
        .then((orden) => {
          if (orden.estado === 'pagado') {
            setAvisoPago({
              tipo: 'exito',
              mensaje: `Pago confirmado. Tu reserva quedó registrada por ${orden.tarifas?.totalFormateado || 'el monto indicado'}.`,
            });
          } else {
            setAvisoPago({
              tipo: 'pendiente',
              mensaje: 'Pago recibido. Estamos confirmando tu reserva, esto puede tardar unos segundos.',
            });
          }
        })
        .catch(() => {
          setAvisoPago({
            tipo: 'pendiente',
            mensaje: 'Pago en proceso. Si no ves tu reserva confirmada, contáctanos con tu comprobante.',
          });
        });
    } else if (resultadoPago === 'fallido') {
      setAvisoPago({
        tipo: 'error',
        mensaje: 'El pago no se completó. Puedes intentar nuevamente seleccionando tus espacios.',
      });
    } else if (resultadoPago === 'pendiente') {
      setAvisoPago({
        tipo: 'pendiente',
        mensaje: 'Tu pago está pendiente de confirmación por Mercado Pago.',
      });
    }

    window.history.replaceState({}, '', window.location.pathname);
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

      {avisoPago && (
        <div className={`aviso-pago aviso-pago-${avisoPago.tipo}`}>
          <p>{avisoPago.mensaje}</p>
        </div>
      )}

      {estadoServidor?.emisionTvActiva === false && (
        <div className="aviso-modo-web">
          <p>
            <strong>Sitio en línea.</strong> Puedes agendar y moderar avisos con IA.
            La emisión en TV se activará cuando el estudio de transmisión esté conectado.
          </p>
        </div>
      )}

      <main>
        <FormularioAnuncio mercadoPagoActivo={estadoServidor?.mercadoPagoActivo === true} />
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
