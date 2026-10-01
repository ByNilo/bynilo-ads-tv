import './ModalCondiciones.css';

const CONDICIONES = [
  {
    titulo: '1. Servicio publicitario',
    texto:
      'BYNILO ADS TV ofrece espacios publicitarios en vivo de 15 segundos, emitidos a través de Just Broadcast en los horarios seleccionados por el anunciante.',
  },
  {
    titulo: '2. Moderación con inteligencia artificial',
    texto:
      'Todo aviso será moderado automáticamente con IA y un listado de medios de comunicación nacionales: el texto de la oferta, los datos ingresados y el logo o imagen adjunta (si se sube). Se rechazará contenido relacionado con política, alcohol, religión, contenido sexual, casinos, funas, discriminación y otros categorizados en semáforo rojo. Los medios de comunicación, portales de noticias y radios quedan en revisión editorial (semáforo amarillo), incluyendo negocios cuyo nombre contenga términos como noticias, radio, canal o diario.',
  },
  {
    titulo: '3. Responsabilidad del anunciante',
    texto:
      'El anunciante declara que la información ingresada (RUT, nombre del negocio, texto de la oferta y material gráfico) es verídica y que tiene derecho a usar el logo y contenidos enviados.',
  },
  {
    titulo: '4. Texto del aviso',
    texto:
      'El texto de la oferta tiene un máximo de 150 caracteres. El anunciante es responsable de la claridad y legalidad del mensaje publicado.',
  },
  {
    titulo: '5. Reserva de bloques',
    texto:
      'Cada sesión permite reservar hasta 10 bloques horarios. Una vez confirmada la reserva, el espacio queda asignado en la grilla de emisión (minutos 5–25 y 35–50 de cada hora, entre 07:00 y 00:00 hrs).',
  },
  {
    titulo: '6. Facturación',
    texto:
      'Si el anunciante solicita factura, deberá proporcionar datos completos y verídicos. La emisión del documento tributario se realizará según los procedimientos de BYNILO ADS TV.',
  },
  {
    titulo: '7. Acciones legales',
    texto:
      'En caso de infringir las normas de uso del servicio, BYNILO ADS TV se reserva el derecho de iniciar las denuncias legales respectivas ante las autoridades competentes, incluyendo contenido no apropiado para televisión u otros medios de comunicación, material que infrinja la ley, vulnere derechos de terceros o incumpla estas condiciones.',
  },
  {
    titulo: '8. Limitación de responsabilidad',
    texto:
      'BYNILO ADS TV es una plataforma de publicidad en vivo que pone a disposición espacios y herramientas para la difusión de avisos. No se hace responsable por el mal uso que el cliente pueda dar al servicio, ni por el contenido, veracidad o legalidad de los mensajes, imágenes o datos ingresados por el anunciante.',
  },
  {
    titulo: '9. Aceptación',
    texto:
      'Al marcar la casilla de aceptación, el anunciante declara haber leído y aceptado estas condiciones de uso del servicio.',
  },
];

export default function ModalCondiciones({ abierto, onCerrar }) {
  if (!abierto) return null;

  return (
    <div className="modal-condiciones-overlay" onClick={onCerrar} role="presentation">
      <div
        className="modal-condiciones"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-condiciones-titulo"
        aria-modal="true"
      >
        <div className="modal-condiciones-header">
          <h2 id="modal-condiciones-titulo">Condiciones de uso — BYNILO ADS TV</h2>
          <button type="button" className="modal-condiciones-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-condiciones-body">
          {CONDICIONES.map((item) => (
            <section key={item.titulo}>
              <h3>{item.titulo}</h3>
              <p>{item.texto}</p>
            </section>
          ))}
        </div>

        <div className="modal-condiciones-footer">
          <button type="button" className="modal-condiciones-btn" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
