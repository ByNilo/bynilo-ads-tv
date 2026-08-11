const PATRON_SIMBOLOS_PROHIBIDOS = /[@#$%&*|\\/<>\[\]{}+=^~`]/;
const PATRON_SIMBOLOS_PROHIBIDOS_OFERTA = /[@*|\\/<>\[\]{}+=^~`]/;

export function sanitizarTextoPublicitario(valor) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[@#$%&*|\\/<>\[\]{}+=^~`]/g, '');
}

export function sanitizarTextoOferta(valor) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[@*|\\/<>\[\]{}+=^~`]/g, '');
}

export function contieneSimbolosProhibidos(valor) {
  if (typeof valor !== 'string' || !valor) return false;
  return PATRON_SIMBOLOS_PROHIBIDOS.test(valor);
}

export function contieneSimbolosProhibidosOferta(valor) {
  if (typeof valor !== 'string' || !valor) return false;
  return PATRON_SIMBOLOS_PROHIBIDOS_OFERTA.test(valor);
}

export const MENSAJE_SIMBOLOS_PROHIBIDOS =
  'No se permiten símbolos como @, $ o | que puedan simular letras o eludir la moderación.';

export const MENSAJE_SIMBOLOS_PROHIBIDOS_OFERTA =
  'En el texto de oferta no se permiten símbolos como @ o | que puedan simular letras. Puedes usar $, %, & y #.';
