import { useState, useEffect, useRef } from 'react';
import { agendarAnuncio, obtenerHorarios, revisarOrtografia } from '../api';
import { sanitizarTextoPublicitario, sanitizarTextoOferta } from '../utils/textoPublicitario';
import VistaPreviaAviso from './VistaPreviaAviso';
import ModalCondiciones from './ModalCondiciones';
import ModalOrtografia from './ModalOrtografia';
import ModalModeracion from './ModalModeracion';
import './FormularioAnuncio.css';

const MAX_BLOQUES = 10;

function formatearRUT(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length <= 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  const cuerpoFormateado = cuerpo
    .split('')
    .reverse()
    .reduce((acc, digit, i) => {
      return i > 0 && i % 3 === 0 ? `${digit}.${acc}` : `${digit}${acc}`;
    }, '');

  return `${cuerpoFormateado}-${dv}`;
}

function claveBloque(fecha, horario) {
  return `${fecha}|${horario}`;
}

function formatearPrecioCLP(monto) {
  return `$${Number(monto).toLocaleString('es-CL')}`;
}

function sanitizarContacto(valor) {
  return valor.replace(/\D/g, '');
}

function sanitizarRedes(valor) {
  return valor.replace(/@/g, '');
}

function esEntradaWeb(valor) {
  const v = valor.trim().toLowerCase();
  return /^(https?:\/\/|www\.)/.test(v) || /\.[a-z]{2,}(\/|$|\?)/i.test(v);
}

function formatearRedesParaEnvio(valor) {
  const limpio = valor.trim();
  if (!limpio) return '';
  if (esEntradaWeb(limpio)) {
    return limpio;
  }
  const usuario = sanitizarRedes(limpio);
  return usuario ? `@${usuario}` : '';
}

function Semaforo({ semaforo, mensaje, categorias }) {
  const config = {
    rojo: { label: 'Rechazado', icon: '🔴', className: 'semaforo-rojo' },
    amarillo: { label: 'En revisión', icon: '🟡', className: 'semaforo-amarillo' },
    verde: { label: 'Aprobado', icon: '🟢', className: 'semaforo-verde' },
  };

  const { label, icon, className } = config[semaforo] || config.verde;

  return (
    <div className={`semaforo ${className}`}>
      <div className="semaforo-header">
        <span className="semaforo-icon">{icon}</span>
        <strong>{label}</strong>
      </div>
      {mensaje && <p className="semaforo-mensaje">{mensaje}</p>}
      {categorias?.length > 0 && (
        <ul className="semaforo-categorias">
          {categorias.map((cat) => (
            <li key={cat}>{cat}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FormularioAnuncio({ mercadoPagoActivo = false }) {
  const [form, setForm] = useState({
    rut: '',
    negocio: '',
    textoOferta: '',
    redesSociales: '',
    contacto: '',
    emailContacto: '',
    fechaElegida: '',
    horaElegida: '',
  });
  const [bloquesSeleccionados, setBloquesSeleccionados] = useState([]);
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [horariosData, setHorariosData] = useState(null);
  const [cargandoHorarios, setCargandoHorarios] = useState(true);
  const [solicitarFactura, setSolicitarFactura] = useState(false);
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);
  const [modalCondicionesAbierto, setModalCondicionesAbierto] = useState(false);
  const [modalOrtografiaAbierto, setModalOrtografiaAbierto] = useState(false);
  const [resultadoOrtografia, setResultadoOrtografia] = useState(null);
  const [modalModeracionAbierto, setModalModeracionAbierto] = useState(false);
  const [resultadoModeracion, setResultadoModeracion] = useState(null);
  const [ortografiaAceptadaTexto, setOrtografiaAceptadaTexto] = useState(null);
  const [mensajeCarga, setMensajeCarga] = useState('');
  const textoOfertaRef = useRef(null);
  const [facturacion, setFacturacion] = useState({
    rutFactura: '',
    razonSocial: '',
    giro: '',
    direccion: '',
    comuna: '',
    emailFactura: '',
  });

  useEffect(() => {
    cargarHorarios();
  }, []);

  async function cargarHorarios(fecha) {
    setCargandoHorarios(true);
    try {
      const data = await obtenerHorarios(fecha);
      setHorariosData(data);
      if (!fecha && data.fechaConsulta) {
        setForm((prev) => ({ ...prev, fechaElegida: data.fechaConsulta }));
      }
    } catch {
      setError('No se pudieron cargar los espacios disponibles.');
    } finally {
      setCargandoHorarios(false);
    }
  }

  const horaSeleccionada = horariosData?.horas?.find((h) => h.hora === form.horaElegida);
  const diaSeleccionado = horariosData?.dias?.find((d) => d.valor === form.fechaElegida);

  const clavesEnCarrito = new Set(
    bloquesSeleccionados.map((b) => claveBloque(b.fecha, b.horario)),
  );

  const totalCarrito = bloquesSeleccionados.reduce(
    (suma, bloque) => suma + (bloque.precio || 0),
    0,
  );

  async function seleccionarDia(fecha) {
    setForm((prev) => ({
      ...prev,
      fechaElegida: fecha,
      horaElegida: '',
    }));
    setError(null);
    setResultado(null);
    await cargarHorarios(fecha);
  }

  function seleccionarHora(hora) {
    setForm((prev) => ({ ...prev, horaElegida: hora }));
    setError(null);
    setResultado(null);
  }

  function toggleBloque(horario) {
    if (!form.fechaElegida) return;

    const fecha = form.fechaElegida;
    const clave = claveBloque(fecha, horario);
    const etiquetaDia = diaSeleccionado?.etiqueta || fecha;

    if (clavesEnCarrito.has(clave)) {
      setBloquesSeleccionados((prev) =>
        prev.filter((b) => claveBloque(b.fecha, b.horario) !== clave),
      );
    } else {
      if (bloquesSeleccionados.length >= MAX_BLOQUES) {
        setError(`Máximo ${MAX_BLOQUES} bloques por sesión.`);
        return;
      }
      const espacio = horaSeleccionada?.espacios.find((e) => e.valor === horario);
      setBloquesSeleccionados((prev) => [
        ...prev,
        {
          fecha,
          horario,
          etiquetaDia,
          bloqueTarifario: espacio?.bloqueTarifario || '',
          precio: espacio?.precio || 0,
          precioFormateado: espacio?.precioFormateado || formatearPrecioCLP(0),
        },
      ]);
    }
    setError(null);
    setResultado(null);
  }

  function quitarBloque(fecha, horario) {
    const clave = claveBloque(fecha, horario);
    setBloquesSeleccionados((prev) =>
      prev.filter((b) => claveBloque(b.fecha, b.horario) !== clave),
    );
    setError(null);
    setResultado(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    let nuevoValor = value;

    if (name === 'rut') {
      nuevoValor = formatearRUT(value);
    } else if (name === 'contacto') {
      nuevoValor = sanitizarContacto(value);
    } else if (name === 'redesSociales') {
      nuevoValor = esEntradaWeb(value) ? value.replace(/\s/g, '') : sanitizarRedes(value);
    } else if (name === 'negocio') {
      nuevoValor = sanitizarTextoPublicitario(value);
    } else if (name === 'textoOferta') {
      nuevoValor = sanitizarTextoOferta(value);
    }

    setForm((prev) => ({ ...prev, [name]: nuevoValor }));
    if (name === 'textoOferta') {
      setOrtografiaAceptadaTexto(null);
    }
    setError(null);
    setResultado(null);
  }

  function handleFacturacionChange(e) {
    const { name, value } = e.target;
    let nuevoValor = value;
    if (name === 'rutFactura') {
      nuevoValor = formatearRUT(value);
    } else if (name !== 'emailFactura') {
      nuevoValor = sanitizarTextoPublicitario(value);
    }
    setFacturacion((prev) => ({ ...prev, [name]: nuevoValor }));
    setError(null);
    setResultado(null);
  }

  function toggleFactura() {
    setSolicitarFactura((prev) => !prev);
    setError(null);
    setResultado(null);
  }

  function handleImagen(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImagen(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResultado(null);
  }

  function abrirModalModeracion(data) {
    const tieneDetalle =
      (data.palabrasInfractoras?.length > 0) ||
      (data.sugerencias?.length > 0) ||
      (data.textoSugerido && data.textoSugerido !== form.textoOferta.trim());

    setResultadoModeracion({
      ...data,
      textoOriginal: form.textoOferta.trim(),
    });

    if (tieneDetalle || data.semaforo === 'rojo' || data.semaforo === 'amarillo') {
      setModalModeracionAbierto(true);
    }
  }

  async function enviarAnuncio() {
    setMensajeCarga('Moderando contenido…');
    setCargando(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.append('rut', form.rut);
    formData.append('negocio', form.negocio);
    formData.append('textoOferta', form.textoOferta);
    const redesFormateadas = formatearRedesParaEnvio(form.redesSociales);
    if (redesFormateadas) formData.append('redesSociales', redesFormateadas);
    if (form.contacto.trim()) formData.append('contacto', form.contacto.trim());
    if (form.emailContacto.trim()) formData.append('emailContacto', form.emailContacto.trim());
    formData.append(
      'bloques',
      JSON.stringify(
        bloquesSeleccionados.map((b) => ({
          fechaPublicacion: b.fecha,
          horarioElegido: b.horario,
        })),
      ),
    );
    formData.append('solicitarFactura', solicitarFactura ? 'true' : 'false');
    formData.append('aceptaCondiciones', 'true');
    if (solicitarFactura) {
      Object.entries(facturacion).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    if (imagen) formData.append('imagen', imagen);

    try {
      const data = await agendarAnuncio(formData);

      if (data.semaforo === 'amarillo' || data.estado === 'revision') {
        setResultado(data);
        abrirModalModeracion(data);
        return;
      }

      if (data.requierePago || data.estado === 'pago_pendiente') {
        if (!data.initPoint) {
          setError('No se recibió el enlace de pago de Mercado Pago. Intenta nuevamente.');
          return;
        }
        setMensajeCarga('Redirigiendo a Mercado Pago para completar el pago…');
        setCargando(true);
        window.location.href = data.initPoint;
        return;
      }

      if (mercadoPagoActivo && totalCarrito > 0 && data.estado === 'exito') {
        setError(
          'La reserva se procesó sin pasar por Mercado Pago. No se realizó el cobro. Intenta nuevamente o contáctanos.',
        );
        return;
      }

      setResultado(data);
      setBloquesSeleccionados([]);
      setOrtografiaAceptadaTexto(null);
      await cargarHorarios(form.fechaElegida);
      setForm((prev) => ({ ...prev, horaElegida: '' }));
    } catch (err) {
      if (err.semaforo === 'rojo') {
        const resultadoRojo = {
          semaforo: 'rojo',
          mensaje: err.mensaje || err.error,
          categorias: err.categorias,
          razon: err.razon,
          palabrasInfractoras: err.palabrasInfractoras,
          textoSugerido: err.textoSugerido,
          sugerencias: err.sugerencias,
        };
        setResultado(resultadoRojo);
        abrirModalModeracion(resultadoRojo);
      } else {
        setError(
          err.detalle
            ? `${err.error || err.mensaje || 'Error al procesar el anuncio.'} (${err.detalle})`
            : err.error || err.mensaje || 'Error al procesar el anuncio.',
        );
      }
    } finally {
      setCargando(false);
      setMensajeCarga('');
    }
  }

  async function handleConfirmar(e) {
    e.preventDefault();

    if (bloquesSeleccionados.length === 0) {
      setError('Selecciona al menos un bloque de emisión en el calendario.');
      return;
    }

    if (solicitarFactura) {
      const faltantes = Object.entries(facturacion).filter(([, v]) => !v.trim());
      if (faltantes.length > 0) {
        setError('Completa todos los datos de facturación.');
        return;
      }
    }

    if (!aceptaCondiciones) {
      setError('Debes aceptar las condiciones de uso para confirmar tu anuncio.');
      return;
    }

    if (mercadoPagoActivo && totalCarrito > 0) {
      const email = form.emailContacto.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Ingresa un correo electrónico válido para el pago con Mercado Pago.');
        return;
      }
    }

    const textoActual = form.textoOferta.trim();

    if (ortografiaAceptadaTexto !== textoActual) {
      setMensajeCarga('Revisando ortografía…');
      setCargando(true);
      setError(null);

      try {
        const ortografia = await revisarOrtografia(textoActual);
        if (ortografia.tieneErrores) {
          setResultadoOrtografia(ortografia);
          setModalOrtografiaAbierto(true);
          return;
        }
      } catch (err) {
        setError(err.error || 'No se pudo revisar la ortografía. Intenta nuevamente.');
        return;
      } finally {
        setCargando(false);
        setMensajeCarga('');
      }
    }

    await enviarAnuncio();
  }

  function handleModificarOrtografia() {
    setModalOrtografiaAbierto(false);
    textoOfertaRef.current?.focus();
  }

  function handleAplicarSugerenciaOrtografia() {
    if (!resultadoOrtografia?.textoSugerido) return;

    setForm((prev) => ({
      ...prev,
      textoOferta: resultadoOrtografia.textoSugerido.slice(0, 150),
    }));
    setOrtografiaAceptadaTexto(null);
    setModalOrtografiaAbierto(false);
    setError(null);
    setResultado(null);
    textoOfertaRef.current?.focus();
  }

  async function handleContinuarSinModificarOrtografia() {
    setOrtografiaAceptadaTexto(form.textoOferta.trim());
    setModalOrtografiaAbierto(false);
    await enviarAnuncio();
  }

  function handleModificarModeracion() {
    setModalModeracionAbierto(false);
    textoOfertaRef.current?.focus();
  }

  function handleAplicarSugerenciaModeracion() {
    if (!resultadoModeracion?.textoSugerido) return;

    setForm((prev) => ({
      ...prev,
      textoOferta: resultadoModeracion.textoSugerido.slice(0, 150),
    }));
    setOrtografiaAceptadaTexto(null);
    setModalModeracionAbierto(false);
    setError(null);
    setResultado(null);
    textoOfertaRef.current?.focus();
  }

  function handleCerrarModeracion() {
    setModalModeracionAbierto(false);
  }

  const caracteresRestantes = 150 - form.textoOferta.length;
  const cuposRestantes = MAX_BLOQUES - bloquesSeleccionados.length;
  const redesEsWeb = esEntradaWeb(form.redesSociales);

  return (
    <form className="formulario" onSubmit={handleConfirmar}>
      <h2>Agendar publicidad</h2>
      <p className="formulario-desc">
        Campos obligatorios: <strong>RUT</strong>, <strong>negocio</strong>, <strong>oferta</strong>, al
        menos <strong>1 bloque horario</strong> y la <strong>aceptación de condiciones</strong>. Puedes elegir hasta {MAX_BLOQUES} bloques por sesión.
      </p>

      <div className="campo">
        <label htmlFor="rut">RUT del anunciante</label>
        <input
          id="rut"
          name="rut"
          type="text"
          placeholder="12.345.678-9"
          value={form.rut}
          onChange={handleChange}
          required
        />
      </div>

      <div className="campo">
        <label htmlFor="negocio">Nombre del negocio</label>
        <input
          id="negocio"
          name="negocio"
          type="text"
          placeholder="Ej: Panadería El Sol"
          value={form.negocio}
          onChange={handleChange}
          required
        />
        <p className="campo-ayuda">
          Solo letras, números y signos de puntuación. No uses @, $, | u otros símbolos que simulen letras.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="textoOferta">
          Texto de la oferta
          <span className={`contador ${caracteresRestantes < 20 ? 'alerta' : ''}`}>
            {caracteresRestantes} caracteres restantes
          </span>
        </label>
        <textarea
          ref={textoOfertaRef}
          id="textoOferta"
          name="textoOferta"
          placeholder="Describe tu oferta (máx. 150 caracteres)"
          value={form.textoOferta}
          onChange={handleChange}
          maxLength={150}
          rows={3}
          required
        />
        <p className="campo-ayuda">
          Puedes usar $, %, & y # (precios, descuentos). No uses @, | u otros símbolos que simulen letras. Revisaremos la ortografía al confirmar.
        </p>
      </div>

      <div className="campo campo-opcional">
        <label htmlFor="redesSociales">
          Redes sociales o sitio web
          <span className="etiqueta-opcional">Opcional — ayuda a verificar tu negocio</span>
        </label>
        <div className={`input-con-prefijo ${redesEsWeb ? 'sin-prefijo' : ''}`}>
          {!redesEsWeb && (
            <span className="input-prefijo" aria-hidden="true">@</span>
          )}
          <input
            id="redesSociales"
            name="redesSociales"
            type="text"
            placeholder={redesEsWeb ? 'Ej: www.abastible.cl' : 'Ej: abastible o www.abastible.cl'}
            value={form.redesSociales}
            onChange={handleChange}
            inputMode="text"
            autoComplete="off"
          />
        </div>
        <p className="campo-ayuda">
          Usuario de red social (sin @) o sitio web. Esta información la usa la IA para entender mejor tu negocio.
        </p>
      </div>

      <div className="campo campo-opcional">
        <label htmlFor="contacto">
          Número de contacto
          <span className="etiqueta-opcional">Opcional</span>
        </label>
        <input
          id="contacto"
          name="contacto"
          type="text"
          placeholder="Ej: 56912345678"
          value={form.contacto}
          onChange={handleChange}
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </div>

      {mercadoPagoActivo && (
        <div className="campo">
          <label htmlFor="emailContacto">
            Correo electrónico
            <span className="etiqueta-opcional">Requerido para pago</span>
          </label>
          <input
            id="emailContacto"
            name="emailContacto"
            type="email"
            placeholder="tu@correo.com"
            value={form.emailContacto}
            onChange={handleChange}
            autoComplete="email"
            required={mercadoPagoActivo}
          />
          <p className="campo-ayuda">
            Mercado Pago usa este correo para el comprobante de pago.
          </p>
        </div>
      )}

      <div className="campo">
        <label>
          Espacio de emisión
          <span className="contador">
            {bloquesSeleccionados.length}/{MAX_BLOQUES} bloques
          </span>
        </label>

        {horariosData?.bloquesTarifarios?.length > 0 && (
          <div className="tarifas-leyenda">
            <p className="tarifas-leyenda-titulo">Valores por bloque horario (cada espacio = 15 seg en vivo)</p>
            <ul className="tarifas-leyenda-lista">
              {horariosData.bloquesTarifarios.map((bloque) => (
                <li key={bloque.id}>
                  <strong>{bloque.nombre}</strong>
                  <span>{bloque.horaInicio} a {bloque.horaFin} hrs.</span>
                  <span className="tarifa-precio">{bloque.precioFormateado}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cargandoHorarios ? (
          <p className="horarios-cargando">Cargando calendario…</p>
        ) : (
          <div className="calendario-emision">
            <div className="calendario-columna calendario-dias">
              <div className="calendario-header">Día</div>
              <div className="calendario-lista">
                {horariosData?.dias?.map((dia) => (
                  <button
                    key={dia.valor}
                    type="button"
                    className={`calendario-item ${form.fechaElegida === dia.valor ? 'activo' : ''}`}
                    onClick={() => seleccionarDia(dia.valor)}
                  >
                    <span className="calendario-dia">{dia.etiqueta}</span>
                    {dia.esHoy && <span className="calendario-badge">Hoy</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="calendario-columna calendario-horas">
              <div className="calendario-header">Hora</div>
              <div className="calendario-lista">
                {!form.fechaElegida && (
                  <p className="calendario-vacio">Elige un día</p>
                )}
                {form.fechaElegida && horariosData?.horas?.map((hora) => (
                  <button
                    key={hora.hora}
                    type="button"
                    className={`calendario-item ${form.horaElegida === hora.hora ? 'activo' : ''}`}
                    onClick={() => seleccionarHora(hora.hora)}
                  >
                    <span className="calendario-hora">{hora.etiqueta}</span>
                    <span className="calendario-badge">({hora.totalEspacios} espacios)</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="calendario-columna calendario-bloques">
              <div className="calendario-header">
                {form.horaElegida
                  ? `Inicio — ${form.horaElegida} hrs`
                  : 'Bloque de 15 seg'}
              </div>
              <div className="calendario-lista">
                {!form.horaElegida && (
                  <p className="calendario-vacio">Elige una hora</p>
                )}
                {horaSeleccionada?.espacios.map((espacio) => {
                  const enCarrito = clavesEnCarrito.has(
                    claveBloque(form.fechaElegida, espacio.valor),
                  );
                  const deshabilitado =
                    !espacio.disponible ||
                    (!enCarrito && bloquesSeleccionados.length >= MAX_BLOQUES);

                  return (
                    <button
                      key={espacio.valor}
                      type="button"
                      disabled={deshabilitado}
                      className={`calendario-item calendario-bloque ${
                        enCarrito ? 'en-carrito' : ''
                      } ${!espacio.disponible ? 'ocupado' : ''}`}
                      onClick={() => toggleBloque(espacio.valor)}
                      title={
                        enCarrito
                          ? 'Click para quitar'
                          : espacio.reservado
                            ? 'Espacio reservado'
                            : !espacio.disponible
                              ? 'Horario no disponible'
                              : `Click para agregar — 15 seg en vivo — ${espacio.precioFormateado || ''}`
                      }
                    >
                      <span className="calendario-bloque-hora">{espacio.etiqueta}</span>
                      {espacio.precioFormateado && espacio.disponible && (
                        <span className="calendario-bloque-precio">{espacio.precioFormateado}</span>
                      )}
                      {enCarrito && <span className="calendario-estado">✓ Elegido</span>}
                      {!enCarrito && espacio.reservado && (
                        <span className="calendario-estado">Reservado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {bloquesSeleccionados.length > 0 && (
          <div className="bloques-carrito">
            <div className="bloques-carrito-header">
              <strong>Bloques seleccionados ({bloquesSeleccionados.length})</strong>
              {cuposRestantes > 0 && (
                <span className="bloques-carrito-cupos">
                  Puedes agregar {cuposRestantes} más
                </span>
              )}
            </div>
            <ul className="bloques-carrito-lista">
              {bloquesSeleccionados.map((bloque) => (
                <li key={claveBloque(bloque.fecha, bloque.horario)} className="bloque-item">
                  <span>
                    <strong>{bloque.etiquetaDia}</strong> — {bloque.horario}
                    {bloque.bloqueTarifario && (
                      <span className="bloque-item-tarifa"> · {bloque.bloqueTarifario}</span>
                    )}
                    {bloque.precioFormateado && (
                      <span className="bloque-item-precio"> — {bloque.precioFormateado}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="bloque-quitar"
                    onClick={() => quitarBloque(bloque.fecha, bloque.horario)}
                    aria-label="Quitar bloque"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="bloques-carrito-total">
              <span>Total estimado</span>
              <strong>{formatearPrecioCLP(totalCarrito)}</strong>
            </div>
            <div className={`medio-pago-box ${mercadoPagoActivo ? 'activo' : 'inactivo'}`}>
              <div className="medio-pago-header">
                <span className="medio-pago-logo" aria-hidden="true">💳</span>
                <div>
                  <strong>Medio de pago</strong>
                  <p className="medio-pago-nombre">Mercado Pago</p>
                </div>
              </div>
              {mercadoPagoActivo ? (
                <p className="medio-pago-detalle">
                  Al confirmar tu anuncio serás redirigido a Mercado Pago para pagar{' '}
                  <strong>{formatearPrecioCLP(totalCarrito)}</strong> de forma segura.
                  Acepta tarjetas, débito y otros medios disponibles en Mercado Pago.
                </p>
              ) : (
                <p className="medio-pago-detalle medio-pago-alerta">
                  El pago en línea aún no está disponible en el servidor.
                  Contacta a BYNILO ADS TV para completar tu reserva.
                </p>
              )}
            </div>
          </div>
        )}

        {horariosData && form.fechaElegida && (
          <p className="horarios-info">
            {horariosData.totalDisponibles} espacios disponibles el{' '}
            {diaSeleccionado?.etiqueta || form.fechaElegida} (07:00–00:00 hrs)
          </p>
        )}
      </div>

      <div className="campo campo-opcional">
        <label htmlFor="imagen">
          Logo de su empresa
          <span className="etiqueta-opcional">Opcional</span>
        </label>
        <input
          id="imagen"
          name="imagen"
          type="file"
          accept="image/*"
          onChange={handleImagen}
        />
        <p className="campo-ayuda">
          Si subes un logo, también será revisado por la IA junto con el texto de tu aviso.
        </p>
      </div>

      <div className="campo factura-seccion">
        <button
          type="button"
          className={`factura-toggle ${solicitarFactura ? 'activo' : ''}`}
          onClick={toggleFactura}
          aria-expanded={solicitarFactura}
        >
          <span className="factura-toggle-icon">{solicitarFactura ? '▼' : '▶'}</span>
          <span>Solicitar factura</span>
          <span className="factura-toggle-hint">
            {solicitarFactura ? 'Ocultar datos' : 'Click para ingresar datos de facturación'}
          </span>
        </button>

        {solicitarFactura && (
          <div className="factura-panel">
            <p className="factura-panel-desc">
              Ingresa los datos para emitir tu factura. Todos los campos son obligatorios.
            </p>

            <div className="factura-grid">
              <div className="campo">
                <label htmlFor="rutFactura">RUT facturación</label>
                <input
                  id="rutFactura"
                  name="rutFactura"
                  type="text"
                  placeholder="12.345.678-9"
                  value={facturacion.rutFactura}
                  onChange={handleFacturacionChange}
                  required={solicitarFactura}
                />
              </div>

              <div className="campo">
                <label htmlFor="razonSocial">Razón social</label>
                <input
                  id="razonSocial"
                  name="razonSocial"
                  type="text"
                  placeholder="Nombre o empresa"
                  value={facturacion.razonSocial}
                  onChange={handleFacturacionChange}
                  required={solicitarFactura}
                />
              </div>

              <div className="campo">
                <label htmlFor="giro">Giro comercial</label>
                <input
                  id="giro"
                  name="giro"
                  type="text"
                  placeholder="Ej: Comercio al por menor"
                  value={facturacion.giro}
                  onChange={handleFacturacionChange}
                  required={solicitarFactura}
                />
              </div>

              <div className="campo">
                <label htmlFor="direccion">Dirección</label>
                <input
                  id="direccion"
                  name="direccion"
                  type="text"
                  placeholder="Calle y número"
                  value={facturacion.direccion}
                  onChange={handleFacturacionChange}
                  required={solicitarFactura}
                />
              </div>

              <div className="campo">
                <label htmlFor="comuna">Comuna</label>
                <input
                  id="comuna"
                  name="comuna"
                  type="text"
                  placeholder="Ej: Viña del Mar"
                  value={facturacion.comuna}
                  onChange={handleFacturacionChange}
                  required={solicitarFactura}
                />
              </div>

              <div className="campo">
                <label htmlFor="emailFactura">Email para factura</label>
                <input
                  id="emailFactura"
                  name="emailFactura"
                  type="email"
                  placeholder="correo@empresa.cl"
                  value={facturacion.emailFactura}
                  onChange={handleFacturacionChange}
                  required={solicitarFactura}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="campo vista-previa-seccion">
        <VistaPreviaAviso
          negocio={form.negocio}
          textoOferta={form.textoOferta}
          logoUrl={preview}
          contacto={form.contacto}
          redesSociales={formatearRedesParaEnvio(form.redesSociales)}
        />
      </div>

      {error && <div className="alerta-error">{error}</div>}

      {resultado && (
        <>
          <Semaforo
            semaforo={resultado.semaforo || (resultado.estado === 'revision' ? 'amarillo' : 'verde')}
            mensaje={resultado.mensaje}
            categorias={resultado.categorias}
          />
          {resultado.tarifas?.totalFormateado && (
            <p className="horarios-seleccion">
              Total reserva: <strong>{resultado.tarifas.totalFormateado}</strong>
            </p>
          )}
        </>
      )}

      <div className="aviso-legal" role="note">
        <p>
          <strong>Aviso:</strong> El texto de tu oferta y el logo (si lo subes) son revisados por inteligencia artificial.
          En caso de infringir las normas de uso del servicio, se pueden iniciar las denuncias legales respectivas.
        </p>
      </div>

      <div className="campo condiciones-campo">
        <label className="condiciones-label">
          <input
            type="checkbox"
            name="aceptaCondiciones"
            checked={aceptaCondiciones}
            required
            aria-required="true"
            onChange={(e) => {
              setAceptaCondiciones(e.target.checked);
              setError(null);
              setResultado(null);
            }}
          />
          <span>
            <strong>Acepto las condiciones de uso del servicio</strong> <span className="obligatorio">*</span>.{' '}
            <button
              type="button"
              className="link-condiciones"
              onClick={() => setModalCondicionesAbierto(true)}
            >
              Leer las condiciones
            </button>
          </span>
        </label>
      </div>

      <ModalCondiciones
        abierto={modalCondicionesAbierto}
        onCerrar={() => setModalCondicionesAbierto(false)}
      />

      <ModalOrtografia
        abierto={modalOrtografiaAbierto}
        resultado={resultadoOrtografia}
        onModificar={handleModificarOrtografia}
        onAplicarSugerencia={handleAplicarSugerenciaOrtografia}
        onContinuarSinModificar={handleContinuarSinModificarOrtografia}
      />

      <ModalModeracion
        abierto={modalModeracionAbierto}
        resultado={resultadoModeracion}
        onModificar={handleModificarModeracion}
        onAplicarSugerencia={handleAplicarSugerenciaModeracion}
        onCerrar={handleCerrarModeracion}
      />

      <button
        type="submit"
        className="btn-confirmar"
        disabled={
          cargando ||
          cargandoHorarios ||
          bloquesSeleccionados.length === 0 ||
          !aceptaCondiciones
        }
      >
        {cargando
          ? (mensajeCarga || 'Procesando…')
          : bloquesSeleccionados.length === 0
            ? 'Confirmar'
            : `Confirmar ${bloquesSeleccionados.length} bloque${bloquesSeleccionados.length !== 1 ? 's' : ''}`}
      </button>

      <div className="leyenda-semaforo">
        <p><strong>Semáforo de moderación:</strong></p>
        <ul>
          <li>🔴 <strong>Rojo:</strong> política, alcohol (promoción directa), religión, sexual, casinos, funas, discriminación</li>
          <li>🟡 <strong>Amarillo:</strong> dudas o revisión editorial — se indican palabras problemáticas y sugerencias</li>
          <li>🟢 <strong>Verde:</strong> contenido aprobado — bares pueden publicitar ambiente sin mencionar alcohol</li>
        </ul>
        <p className="leyenda-semaforo-cierre">
          Este sitio fue creado con fines publicitarios; le invitamos a utilizarlo de buena manera.
          <strong> BYNILO ADS TV</strong>, acercando la publicidad a las Pymes.
        </p>
      </div>
    </form>
  );
}
