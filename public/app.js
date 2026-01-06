function qs(sel, root=document){return root.querySelector(sel)}
function qsa(sel, root=document){return Array.from(root.querySelectorAll(sel))}

function buildQuery(params){
  const esc = encodeURIComponent;
  return Object.keys(params).filter(k => params[k] !== undefined && params[k] !== '' && params[k] !== null)
    .map(k => esc(k) + '=' + esc(params[k])).join('&');
}

async function fetchRides(params){
  const q = buildQuery(params);
  const res = await fetch('/api/rides' + (q? ('?' + q) : ''));
  if (!res.ok) throw new Error('Erreur API');
  return res.json();
}

function rideItemTemplate(r){
  return `<li class="card result">
    <div class="header">
      <span class="driver-photo"></span>
      <div>
        <div><strong>${r.driver.pseudo}</strong> • ⭐ ${r.driver.rating.toFixed(1)}</div>
        <div>${r.from} → ${r.to} • ${r.date}</div>
      </div>
      ${r.eco? '<span class="badge" title="Trajet écologique">Écologique</span>': ''}
    </div>
    <div class="meta"><span>${r.departureTime} → ${r.arrivalTime} (${r.durationMin} min)</span><span>${r.seats} place(s)</span><span><strong>${r.price}€</strong></span></div>
    <button data-id="${r.id}" class="btn-detail">Détail</button>
  </li>`;
}

async function onHome(){
  const form = qs('#search-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const params = new URLSearchParams(fd);
    location.href = '/results.html?' + params.toString();
  });
}

async function onResults(){
  const form = qs('#search-form');
  const url = new URL(location.href);
  // prefill form from URL
  ['from','to','date'].forEach(k => { const v = url.searchParams.get(k); if (v) qs(`[name=${k}]`).value = v; });

  async function search(params){
    const {items, suggestedDate} = await fetchRides(params);
    const ul = qs('#results');
    ul.innerHTML = items.map(rideItemTemplate).join('');
    qsa('.btn-detail').forEach(b => b.addEventListener('click', () => {
      const u = new URL('/detail.html', location.origin);
      u.searchParams.set('id', b.dataset.id);
      location.href = u.toString();
    }));
    const sug = qs('#suggestion');
    if (items.length === 0 && suggestedDate){
      sug.hidden = false;
      sug.textContent = `Aucun trajet trouvé. Essayez la date la plus proche: ${suggestedDate}.`;
    } else {sug.hidden = true;}
  }

  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const p = Object.fromEntries(fd.entries());
    search(p);
  });

  qs('#apply-filters')?.addEventListener('click', ()=>{
    const p = {
      from: qs('[name=from]').value,
      to: qs('[name=to]').value,
      date: qs('[name=date]').value,
      eco: qs('#filter-eco').checked ? 'true' : undefined,
      maxPrice: qs('#filter-price').value,
      maxDuration: qs('#filter-duration').value,
      minRating: qs('#filter-rating').value
    };
    search(p);
  });

  // initial search from URL if available
  const initial = { from: url.searchParams.get('from')||'', to: url.searchParams.get('to')||'', date: url.searchParams.get('date')||'' };
  if (initial.from && initial.to) search(initial);
}

async function onDetail(){
  const url = new URL(location.href);
  const id = url.searchParams.get('id');
  if (!id) return;
  const res = await fetch('/api/rides/' + id);
  if (!res.ok) return;
  const r = await res.json();
  qs('#ride-detail').innerHTML = `
    <h2>${r.from} → ${r.to} • ${r.date}</h2>
    <p><strong>Départ:</strong> ${r.departureTime} • <strong>Arrivée:</strong> ${r.arrivalTime} • <strong>Durée:</strong> ${((new Date('1970-01-01T'+r.arrivalTime+':00Z') - new Date('1970-01-01T'+r.departureTime+':00Z'))/60000)} min</p>
    <p><strong>Conducteur:</strong> ${r.driver.pseudo} • ⭐ ${r.driver.rating}</p>
    <p><strong>Véhicule:</strong> ${r.vehicle.brand} ${r.vehicle.model} — ${r.vehicle.energy}</p>
    <p><strong>Prix:</strong> ${r.price}€ • <strong>Places restantes:</strong> ${r.seats} • ${r.eco? '<span class="badge">Écologique</span>' : ''}</p>
    <p><strong>Préférences du conducteur:</strong> ${r.preferences.fumeur? 'Fumeur' : 'Non-fumeur'} • ${r.preferences.animaux? 'Animaux OK' : 'Sans animaux'}</p>
  `;
  qs('#reviews').innerHTML = (r.reviews||[]).map(v => `<li>⭐ ${v.note} — ${v.comment}</li>`).join('');
}

const page = document.body.dataset.page;
if (page === 'home') onHome();
if (page === 'results') onResults();
if (page === 'detail') onDetail();
