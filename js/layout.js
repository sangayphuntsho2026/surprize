/* Shared page chrome (sidebar + top bar), stepper, flash messages and the gift grid/popup.
   Each page has <body data-active="home|surprises|items|order|favorites|about|"> */
const UI = (() => {
  const { esc, money } = S;
  const NAV = [['home', 'index.html', '🏠', 'Home'], ['surprises', 'plan.html', '🎁', 'Surprises'], ['items', 'items.html', '🛒', 'Items'],
               ['order', 'orders.html', '🚚', 'Order'], ['favorites', 'favorites.html', '❤️', 'Favorites'], ['about', 'about.html', '👥', 'About Us']];

  function shell() {
    const active = document.body.dataset.active || '', u = S.user();
    document.getElementById('side').innerHTML =
      `<a class="logo" href="index.html"><span>Surprize</span><small>make every occasion special</small></a><nav>` +
      NAV.map(([k, h, i, l]) => `<a href="${h}" class="${k === active ? 'active' : ''}"><span class="ico">${i}</span>${l}</a>`).join('') + `</nav>`;
    const q = S.qs('q') || '';
    document.getElementById('top').innerHTML =
      `<button class="menu-btn" id="menuBtn" aria-label="Menu">☰</button>
       <form class="search" action="items.html" method="get"><input type="text" name="q" value="${esc(q)}" placeholder="Search Surprises…"><button aria-label="Search">🔍</button></form>
       <div class="top-actions">` + (u
        ? `<a class="bell" href="notifications.html" title="Notifications">🔔${S.unread() ? `<b>${S.unread()}</b>` : ''}</a><a class="avatar" href="profile.html" title="${esc(u.name)}">👤</a>`
        : `<a class="btn btn-ghost" href="login.html">Log in</a><a class="btn" href="register.html">Sign up</a>`) + `</div>`;
    document.getElementById('menuBtn').onclick = () => document.getElementById('side').classList.toggle('open');
    // show a message left by the previous page
    const f = sessionStorage.getItem('flash');
    if (f) { sessionStorage.removeItem('flash'); const [t, m] = JSON.parse(f); flash(m, t); }
    // character counters
    document.querySelectorAll('textarea[data-counter]').forEach(t => {
      const out = document.querySelector(t.dataset.counter), upd = () => out.textContent = t.value.length + '/' + t.maxLength;
      t.addEventListener('input', upd); upd();
    });
  }

  function flash(msg, type = 'info') {
    const d = document.createElement('div'); d.className = 'flash ' + type; d.textContent = msg;
    const c = document.querySelector('.content'); c.prepend(d); window.scrollTo(0, 0);
    setTimeout(() => d.remove(), 6000);
  }
  const flashNext = (msg, type = 'info') => sessionStorage.setItem('flash', JSON.stringify([type, msg]));
  const go = url => { location.href = url; };

  function stepper(n) {
    const st = [['Enter Information', 'Tell us what you want'], ['Add items', 'Choose items for surprise'], ['Review', 'Review and confirm'], ['Complete', 'Your surprise is ready']];
    return '<ol class="stepper">' + st.map(([t, s], i) =>
      `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}"><i>${i + 1}</i><div><b>${t}</b><small>${s}</small></div></li>`).join('') + '</ol>';
  }

  const badge = s => `<span class="badge ${{ Pending: 'warn', Packaging: 'info', Dispatched: 'info', Delivered: 'ok', Cancelled: 'bad' }[s] || 'info'}">${esc(s)}</span>`;

  /* ---- gift grid + details popup ---- */
  function giftGrid(el, list, onChange) {
    const d = S.user() ? S.draft() : null, fav = S.favs();
    if (!list.length) { el.innerHTML = '<div class="empty card">😕<p>No items found.</p></div>'; return; }
    el.innerHTML = '<div class="gift-grid">' + list.map(g => {
      const inCart = d && d.items.find(i => i.id === g.id);
      return `<article class="gift-card"><div class="gift-img"><div class="emoji-art">${g.emoji}</div>
        <button class="heart ${fav.includes(g.id) ? 'on' : ''}" data-id="${g.id}" aria-label="Favourite">${fav.includes(g.id) ? '♥' : '♡'}</button>
        ${inCart ? `<span class="in-cart">✓ Added × ${inCart.qty}</span>` : ''}</div>
        <div class="gift-foot"><div><b>${esc(g.name)}</b><small>${money(g.price)}</small></div><button class="btn btn-sm more" data-id="${g.id}">More</button></div></article>`;
    }).join('') + '</div>';

    el.querySelectorAll('.heart').forEach(h => h.onclick = () => {
      if (!S.user()) return go('login.html');
      const on = S.toggleFav(+h.dataset.id); h.classList.toggle('on', on); h.textContent = on ? '♥' : '♡';
      if (onChange) onChange('fav');
    });
    el.querySelectorAll('.more').forEach(b => b.onclick = () => popup(S.gift(+b.dataset.id), onChange));
  }

  function popup(g, onChange) {
    const d = S.user() ? S.draft() : null, cur = d && d.items.find(i => i.id === g.id);
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-box"><button class="modal-x" aria-label="Close">×</button>
      <div class="modal-art"><div class="emoji-art">${g.emoji}</div></div><h3>${esc(g.name)}</h3><p class="muted">${esc(g.type)}</p>
      <p>${esc(g.desc)}</p><p class="price">${money(g.price)}</p>` + (d
        ? `<div class="row"><label class="qty">Qty <input type="number" id="pq" min="1" max="10" value="${cur ? cur.qty : 1}"></label><button class="btn" id="padd">Add to surprise</button></div>
           ${cur ? '<button class="btn btn-ghost btn-sm" id="prem" style="margin-top:10px">Remove from surprise</button>' : ''}`
        : S.user() ? '<p class="muted"><a href="plan.html">Plan a surprise</a> first to add items.</p>'
                   : '<p class="muted"><a href="login.html">Log in</a> and plan a surprise to add this item.</p>') + '</div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    m.onclick = e => { if (e.target === m) close(); };
    m.querySelector('.modal-x').onclick = close;
    const add = m.querySelector('#padd'), rem = m.querySelector('#prem');
    if (add) add.onclick = () => { S.addItem(g.id, Math.max(1, Math.min(10, +m.querySelector('#pq').value || 1))); close(); onChange && onChange('cart'); flash('Added to your surprise.', 'ok'); };
    if (rem) rem.onclick = () => { S.removeItem(g.id); close(); onChange && onChange('cart'); };
  }

  document.addEventListener('DOMContentLoaded', shell);
  return { flash, flashNext, go, stepper, badge, giftGrid };
})();
