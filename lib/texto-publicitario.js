const PATRON_SIMBOLOS_PROHIBIDOS = /[@#$%&*|\\/<>\[\]{}+=^~`]/;
const PATRON_SIMBOLOS_PROHIBIDOS_OFERTA = /[@*|\\/<>\[\]{}+=^~`]/;

function sanitizarTextoPublicitario(valor) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[@#$%&*|\\/<>\[\]{}+=^~`]/g, '');
}

function sanitizarTextoOferta(valor) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[@*|\\/<>\[\]{}+=^~`]/g, '');
}

function contieneSimbolosProhibidos(valor) {
  if (typeof valor !== 'string' || !valor) return false;
  return PATRON_SIMBOLOS_PROHIBIDOS.test(valor);
}

function contieneSimbolosProhibidosOferta(valor) {
  if (typeof valor !== 'string' || !valor) return false;
  return PATRON_SIMBOLOS_PROHIBIDOS_OFERTA.test(valor);
}

const MENSAJE_SIMBOLOS_PROHIBIDOS =
  'No se permiten símbolos como @, $ o | que puedan simular letras o eludir la moderación.';

const MENSAJE_SIMBOLOS_PROHIBIDOS_OFERTA =
  'En el texto de oferta no se permiten símbolos como @ o | que puedan simular letras. Puedes usar $, %, & y #.';

module.exports = {
  sanitizarTextoPublicitario,
  sanitizarTextoOferta,
  contieneSimbolosProhibidos,
  contieneSimbolosProhibidosOferta,
  MENSAJE_SIMBOLOS_PROHIBIDOS,
  MENSAJE_SIMBOLOS_PROHIBIDOS_OFERTA,
};
