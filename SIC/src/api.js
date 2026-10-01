const API_BASE = import.meta.env.VITE_API_URL || '';

export async function agendarAnuncio(formData) {
  const response = await fetch(`${API_BASE}/api/agendar`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw { status: response.status, ...data };
  }

  return data;
}

export async function revisarOrtografia(textoOferta) {
  const response = await fetch(`${API_BASE}/api/revisar-ortografia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textoOferta }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw { status: response.status, ...data };
  }

  return data;
}

export async function obtenerEstadoServidor() {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}

export async function obtenerHorarios(fecha) {
  const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
  const response = await fetch(`${API_BASE}/api/horarios${query}`);
  if (!response.ok) {
    throw new Error('No se pudieron cargar los horarios disponibles.');
  }
  return response.json();
}

export async function obtenerEstadoOrden(ordenId) {
  const response = await fetch(`${API_BASE}/api/pagos/orden/${encodeURIComponent(ordenId)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar la orden.');
  }
  return data;
}
