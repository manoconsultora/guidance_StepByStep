import { SpotlightTour } from './spotlight-tour.js';

// All content is fictitious. Demo mutations live in memory and reset on reload.
const claims = [
  { id: 128, title: 'Filtración en el techo', building: 'Cabildo 2450', unit: '3.º B', person: 'Lucía Fernández', status: 'Pendiente', time: 'Hace 35 min', description: 'Hay una filtración en el techo del baño. Se solicita una revisión de la pérdida y coordinación con mantenimiento.' },
  { id: 127, title: 'Ascensor fuera de servicio', building: 'Juramento 2105', unit: 'PB', person: 'Nicolás Rivas', status: 'En curso', time: 'Hace 1 h', description: 'El ascensor principal se encuentra detenido. El equipo de mantenimiento ya recibió el pedido para revisarlo.' },
  { id: 126, title: 'Luminaria del pasillo', building: 'Olazábal 1830', unit: '2.º A', person: 'Mariana Acosta', status: 'Resuelto', time: 'Hace 2 h', description: 'Se reemplazó la luminaria del segundo piso. El vecino confirmó que funciona correctamente.' },
  { id: 125, title: 'Limpieza de espacios comunes', building: 'Cabildo 2450', unit: '1.º C', person: 'Diego Méndez', status: 'En curso', time: 'Hace 3 h', description: 'Pedido de refuerzo de limpieza en el hall y los espacios comunes. El proveedor ya está al tanto.' },
  { id: 124, title: 'Portero eléctrico', building: 'Olazábal 1830', unit: '4.º B', person: 'Ana Suárez', status: 'Pendiente', time: 'Ayer', description: 'El timbre de la unidad no recibe llamadas. Pendiente de asignar técnico.' },
  { id: 123, title: 'Revisión del tanque de agua', building: 'Juramento 2105', unit: 'Consorcio', person: 'Nicolás Rivas', status: 'En curso', time: 'Ayer', description: 'Revisión preventiva solicitada por la administración. Coordinación de fecha en curso.' },
];
let filter = 'all';
let building = 'all';
let currentView = 'inicio';
let showAll = false;
let toastTimer;
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const statusClass = value => ({ Pendiente: 'pending', 'En curso': 'progress', Resuelto: 'resolved' })[value];

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}

// The four-step configuration is the only ELI-specific part of the tour.
const deskSteps = [
  { target: '[data-tour="buildings"]', placement: 'right', title: 'Cada edificio, en su lugar.', description: 'Pasá de una vista general a un consorcio en particular. Los indicadores y reclamos se adaptan al edificio que elijas.' },
  { target: '[data-tour="metrics"]', placement: 'bottom', title: 'Lo importante, de un vistazo.', description: 'Mirá cuántos reclamos están abiertos, cuáles están en curso y cómo viene respondiendo tu administración.' },
  { target: '[data-tour="claims"]', placement: 'right', title: 'Cada pedido tiene su historia.', description: 'Buscá, filtrá y abrí un reclamo para ver qué pasó y en qué estado está. Todo el seguimiento queda en el mismo lugar.' },
  { target: '[data-tour="create"]', placement: 'top', title: 'Un pedido. Un próximo paso.', description: 'Cargá un reclamo para tu edificio y dejalo listo para gestionar. Después del recorrido, probá crear uno: es una demo.' },
];
const tour = new SpotlightTour({
  steps: deskSteps,
  appRoot: '#app',
  storageKey: 'eli-guidance-demo:v1',
  onClose({ reason }) {
    $('#banner-tour').innerHTML = 'Reiniciar recorrido <svg class="icon small"><use href="#i-arrow"/></svg>';
    $('#tour-invitation').textContent = reason === 'completed' ? 'Ya conocés el escritorio. Volvé a recorrerlo cuando quieras.' : 'A tu ritmo. Podés volver a recorrerlo cuando quieras.';
    toast(reason === 'completed' ? '¡Recorrido completo! Probá filtrar o crear un reclamo.' : 'Recorrido cerrado. Podés reiniciarlo cuando quieras.');
  },
});
function startTour() {
  closePopovers();
  if ($('#app-dialog').open) $('#app-dialog').close();
  setView('inicio');
  clearTimeout(toastTimer);
  $('#toast').hidden = true;
  tour.start();
}
$('#top-tour').onclick = startTour;
$('#banner-tour').onclick = startTour;
$('#help-tour').onclick = startTour;

// Ticket filters, search, and drilldown are real browser-local interactions.
function renderClaims() {
  const term = $('#claim-search').value.trim().toLocaleLowerCase('es');
  const filtered = claims.filter(claim => (building === 'all' || claim.building === building) && (filter === 'all' || claim.status === filter) && `${claim.title} ${claim.id} ${claim.building} ${claim.person}`.toLocaleLowerCase('es').includes(term));
  const visible = showAll ? filtered : filtered.slice(0, 4);
  $('#claims-body').innerHTML = visible.length ? visible.map(claim => `<tr>
    <td><button class="claim-link" data-claim="${claim.id}"><span class="claim-id">#${claim.id}</span><span class="claim-name"><strong>${escapeHtml(claim.title)}</strong><small>${escapeHtml(claim.person)} · ${escapeHtml(claim.time)}</small></span></button></td>
    <td>${escapeHtml(claim.building)}</td><td><span class="badge ${statusClass(claim.status)}">${claim.status}</span></td>
    <td><button class="row-open" data-claim="${claim.id}" aria-label="Ver reclamo ${claim.id}"><svg class="icon"><use href="#i-chevron"/></svg></button></td></tr>`).join('') : '<tr><td colspan="4" class="empty-state">No hay reclamos con esos filtros.</td></tr>';
  const total = building === 'all' && filter === 'all' && !term ? 24 + Math.max(0, claims.length - 6) : filtered.length;
  $('#claims-count').textContent = `Mostrando ${visible.length} de ${total} reclamos`;
  $('#view-all').hidden = showAll || filtered.length <= 4;
  $('#claims-body').querySelectorAll('[data-claim]').forEach(button => { button.onclick = () => openClaim(Number(button.dataset.claim)); });
}
document.querySelectorAll('[data-filter]').forEach(button => {
  button.onclick = () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(tab => { tab.classList.toggle('active', tab === button); tab.setAttribute('aria-pressed', String(tab === button)); });
    renderClaims();
  };
});
$('#claim-search').addEventListener('input', renderClaims);
$('#view-all').onclick = () => setView('reclamos');

function closePopovers() {
  $('#building-menu').hidden = true;
  $('#building-picker').setAttribute('aria-expanded', 'false');
  $('#notification-panel').hidden = true;
  $('#notifications').setAttribute('aria-expanded', 'false');
}
$('#building-picker').onclick = event => {
  event.stopPropagation();
  const open = $('#building-menu').hidden;
  closePopovers();
  $('#building-menu').hidden = !open;
  $('#building-picker').setAttribute('aria-expanded', String(open));
};
function selectBuilding(value) {
  building = value;
  $('#selected-building').textContent = value === 'all' ? 'Todos los edificios' : value;
  $('#building-count').textContent = value === 'all' ? '8 consorcios' : 'Vista del consorcio';
  $('#metric-open').textContent = value === 'all' ? 24 + Math.max(0, claims.length - 6) : claims.filter(claim => claim.building === value && claim.status !== 'Resuelto').length;
  $('#metric-progress').textContent = value === 'all' ? '12' : claims.filter(claim => claim.building === value && claim.status === 'En curso').length;
  $('#metric-resolved').textContent = value === 'all' ? '86' : ({ 'Cabildo 2450': 18, 'Olazábal 1830': 12, 'Juramento 2105': 15 })[value];
  $('#metric-time').innerHTML = value === 'all' ? '2,4 <small>h</small>' : '1,8 <small>h</small>';
  closePopovers();
  renderClaims();
}
document.querySelectorAll('[data-building]').forEach(button => { button.onclick = () => selectBuilding(button.dataset.building); });
$('#notifications').onclick = event => {
  event.stopPropagation();
  const open = $('#notification-panel').hidden;
  closePopovers();
  $('#notification-panel').hidden = !open;
  $('#notifications').setAttribute('aria-expanded', String(open));
};
document.addEventListener('click', event => { if (!event.target.closest('.building-picker-wrap, .notification-wrap')) closePopovers(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !tour.active) closePopovers(); });

// Small secondary views make navigation testable without adding backend scope.
function setView(view) {
  currentView = view;
  showAll = view === 'reclamos';
  const labels = { inicio: 'Vista general', reclamos: 'Reclamos', edificios: 'Edificios', vecinos: 'Vecinos' };
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('#breadcrumb-current').textContent = labels[view];
  $('#page-title').innerHTML = view === 'inicio' ? 'Todo en orden<span>.</span>' : `${labels[view]}<span>.</span>`;
  $('#page-subtitle').textContent = ({ inicio: 'Un solo lugar para estar al tanto de tus edificios.', reclamos: 'Cada pedido, con su estado y su próximo paso.', edificios: 'Un espacio para cada consorcio que administrás.', vecinos: 'Las personas detrás de cada pedido.' })[view];
  $('#page-eyebrow').textContent = view === 'inicio' ? 'TU DÍA, MÁS SIMPLE' : 'TU ESPACIO DE TRABAJO';
  $('#welcome-banner').hidden = view !== 'inicio';
  $('.metrics').hidden = view !== 'inicio';
  $('#overview-grid').hidden = !['inicio', 'reclamos'].includes(view);
  $('#right-column').hidden = view !== 'inicio';
  $('#overview-grid').style.gridTemplateColumns = view === 'reclamos' ? 'minmax(0, 1fr)' : '';
  $('#claims-title').textContent = view === 'reclamos' ? 'Todos los reclamos' : 'Los últimos reclamos';
  $('#alternate-view').hidden = ['inicio', 'reclamos'].includes(view);
  if (view === 'edificios') {
    $('#alternate-view').innerHTML = '<h2>Tus edificios</h2><p>Una muestra de los consorcios de esta administración.</p><div class="building-cards">' + ['Cabildo 2450', 'Olazábal 1830', 'Juramento 2105'].map((name, i) => `<article class="building-card"><svg class="icon"><use href="#i-building"/></svg><h3>${name}</h3><p>${[32, 24, 40][i]} unidades funcionales<br>Belgrano, CABA</p><button data-open-building="${name}">Ver reclamos →</button></article>`).join('') + '</div>';
    document.querySelectorAll('[data-open-building]').forEach(button => { button.onclick = () => { selectBuilding(button.dataset.openBuilding); setView('reclamos'); }; });
  }
  if (view === 'vecinos') $('#alternate-view').innerHTML = '<h2>Tu comunidad</h2><p>Datos ficticios para explorar la experiencia.</p><table class="neighbor-table"><thead><tr><th>VECINO</th><th>EDIFICIO</th><th>UNIDAD</th></tr></thead><tbody>' + claims.slice(0, 4).map(claim => `<tr><td>${escapeHtml(claim.person)}</td><td>${claim.building}</td><td>${claim.unit}</td></tr>`).join('') + '</tbody></table>';
  renderClaims();
}
document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => setView(button.dataset.view); });
$('.brand').onclick = event => { event.preventDefault(); setView('inicio'); };

function openDialog(content) {
  $('#dialog-content').innerHTML = content;
  $('#app-dialog').showModal();
  $('#dialog-content').querySelectorAll('[data-close-dialog]').forEach(button => { button.onclick = () => $('#app-dialog').close(); });
}
function openClaim(id) {
  const claim = claims.find(item => item.id === id);
  openDialog(`<div class="dialog-top"><h2>Reclamo #${claim.id}</h2><button class="icon-button" data-close-dialog aria-label="Cerrar detalle"><svg class="icon"><use href="#i-close"/></svg></button></div><p class="detail-building">${escapeHtml(claim.building)} · ${escapeHtml(claim.unit)} · ${escapeHtml(claim.person)}</p><span class="badge ${statusClass(claim.status)}">${claim.status}</span><h3>${escapeHtml(claim.title)}</h3><p class="detail-copy">${escapeHtml(claim.description)}</p><div class="detail-timeline"><strong>Solicitud recibida</strong>ELI registró el pedido y lo dejó disponible para la administración.<small>${escapeHtml(claim.time)}</small></div><p class="demo-note">Ejemplo de seguimiento · Datos de demostración</p><div class="dialog-actions"><button class="button button-primary" data-close-dialog>Entendido</button></div>`);
}
$('#new-claim').onclick = () => {
  openDialog(`<div class="dialog-top"><h2>Nuevo reclamo</h2><button class="icon-button" data-close-dialog aria-label="Cerrar formulario"><svg class="icon"><use href="#i-close"/></svg></button></div><p class="dialog-intro">Un pedido claro es el primer paso para resolverlo.</p><form id="claim-form"><label class="form-field">Edificio<select name="building" required><option>Cabildo 2450</option><option>Olazábal 1830</option><option>Juramento 2105</option></select></label><label class="form-field">¿Qué pasó?<input name="title" placeholder="Ej.: Filtración en el hall" required maxlength="90" autocomplete="off"></label><label class="form-field">Contanos un poco más<textarea name="description" placeholder="Sumá los detalles que puedan ayudar." maxlength="500"></textarea></label><p class="demo-note">Se guarda solo durante esta sesión de demostración.</p><div class="dialog-actions"><button type="button" class="button button-white" data-close-dialog>Cancelar</button><button class="button button-primary" type="submit">Crear reclamo →</button></div></form>`);
  if (building !== 'all') $('#claim-form select').value = building;
  $('#claim-form input[name="title"]').oninput = event => event.target.setCustomValidity('');
  $('#claim-form').onsubmit = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = data.get('title').trim();
    if (!title) { event.currentTarget.elements.title.setCustomValidity('Escribí un título para el reclamo.'); event.currentTarget.elements.title.reportValidity(); return; }
    const created = { id: Math.max(...claims.map(claim => claim.id)) + 1, title, building: data.get('building'), unit: 'Administración', person: 'Sofía Medina', status: 'Pendiente', time: 'Ahora', description: data.get('description').trim() || 'Reclamo creado por la administración en esta demostración.' };
    claims.unshift(created);
    $('#claim-search').value = '';
    filter = 'all';
    document.querySelectorAll('[data-filter]').forEach(button => { const selected = button.dataset.filter === 'all'; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
    selectBuilding(building !== 'all' ? created.building : 'all');
    $('#nav-count').textContent = 24 + claims.length - 6;
    $('#app-dialog').close();
    renderClaims();
    toast(`Reclamo #${created.id} creado. Ya aparece en tu escritorio.`);
  };
};
$('#app-dialog').addEventListener('click', event => {
  if (event.target !== $('#app-dialog')) return;
  const rect = $('#app-dialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#app-dialog').close();
});
renderClaims();
