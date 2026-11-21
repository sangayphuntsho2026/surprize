
/* Shared page chrome (sidebar + top bar), stepper, flash messages and gift grid/popup.
   Each page has <body data-active="home|surprises|items|order|favorites|about|"> */

const UI = (() => {

  const { esc, money } = S;

  const NAV = [
    ['home', 'index.html', '🏠', 'Home'],
    ['surprises', 'plan.html', '🎁', 'Surprises'],
    ['items', 'items.html', '🛒', 'Items'],
    ['order', 'orders.html', '🚚', 'Order'],
    ['favorites', 'favorites.html', '❤️', 'Favorites'],
    ['about', 'about.html', '👥', 'About Us']
  ];

  // Generate sidebar and top navigation
  function shell() {

    const active = document.body.dataset.active || '';
    const u = S.user();

    // Sidebar
    document.getElementById('side').innerHTML =
      `<a class="logo" href="index.html">
        <span>Surprize</span>
        <small>make every occasion special</small>
      </a>
      <nav>` +

      NAV.map(([k, h, i, l]) =>
        `<a href="${h}" class="${k === active ? 'active' : ''}">
          <span class="ico">${i}</span>${l}
        </a>`
      ).join('') +

      `</nav>`;

    // Search
    const q = S.qs('q') || '';

    // Topbar with dynamic profile photo
    document.getElementById('top').innerHTML =

      `<button class="menu-btn" id="menuBtn" aria-label="Menu">☰</button>

       <form class="search" action="items.html" method="get">
         <input type="text"
                name="q"
                value="${esc(q)}"
                placeholder="Search Surprises…">
         <button aria-label="Search">🔍</button>
       </form>

       <div class="top-actions">` +

      (u

        ? `<a class="bell"
               href="notifications.html"
               title="Notifications">
               🔔${S.unread() ? `<b>${S.unread()}</b>` : ''}
           </a>

           <a class="avatar"
              href="profile.html"
              title="${esc(u.name)}"
              aria-label="My Profile">

              ${u.photo
                ? `<img src="${esc(u.photo)}" alt="Profile photo">`
                : '👤'}

           </a>`

        : `<a class="btn btn-ghost" href="login.html">Log in</a>
           <a class="btn" href="register.html">Sign up</a>`

      ) +

      `</div>`;

    // Mobile menu
        // Hidden side menu: opens with the ☰ button
    (function () {
      const side = document.getElementById('side');
      const overlay = document.createElement('div');
      overlay.className = 'menu-overlay';
      document.body.appendChild(overlay);

      const toggle = open => {
        side.classList.toggle('open', open);
        overlay.classList.toggle('show', open);
      };

      document.getElementById('menuBtn').onclick = () => toggle(!side.classList.contains('open'));
      overlay.onclick = () => toggle(false);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
    })();

        // Footer
    if (!document.querySelector('.site-footer')) {
      const main = document.querySelector('.main');
      if (main) main.insertAdjacentHTML('beforeend',
        `<footer class="site-footer">
          <div class="footer-grid">
            <div class="footer-brand">
              <a class="f-logo" href="index.html">Surprize</a>
              <h4>Get in touch</h4>
              <div class="f-contact"><span>📍</span><span>Bhutan</span></div>
              <div class="f-contact"><span>✉️</span><a href="mailto:admin.surprize@gmail.com">admin.surprize@gmail.com</a></div>
              <div class="f-contact"><span>📞</span><a href="tel:+97577299782">+975 77299782</a></div>
            </div>
            <div>
              <h4>My Account</h4>
              <ul>
                <li><a href="profile.html">Profile</a></li>
                <li><a href="orders.html">My Orders</a></li>
                <li><a href="favorites.html">Favorites</a></li>
                <li><a href="notifications.html">Notifications</a></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a href="about.html">About Us</a></li>
                <li><a href="about.html">Contact Us</a></li>
                <li><a href="plan.html">Plan a Surprise</a></li>
                <li><a href="index.html">Home</a></li>
              </ul>
            </div>
            <div>
              <h4>Information</h4>
              <ul>
                <li><a href="items.html">All Items</a></li>
                <li><a href="items.html?q=cake">Cakes</a></li>
                <li><a href="items.html?q=bouquet">Bouquets</a></li>
                <li><a href="items.html?q=teddy">Teddies</a></li>
              </ul>
            </div>
            <div class="footer-follow">
              <h4>Follow us</h4>
              <div class="f-social">
                <a href="https://wa.me/97577299782" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a>
                <a href="#" aria-label="Instagram">IG</a>
                <a href="#" aria-label="Facebook">f</a>
                <a href="#" aria-label="TikTok">TT</a>
              </div>
              <p class="footer-note">Plan gifts, decorations and celebrations in one place. We will keep you updated about your booking.</p>
            </div>
          </div>
          <div class="footer-bottom">© ${new Date().getFullYear()} Surprize · Make every occasion special</div>
        </footer>`);
    }

    // Show message left by previous page
    const f = sessionStorage.getItem('flash');

    if (f) {
      sessionStorage.removeItem('flash');

      const [t, m] = JSON.parse(f);

      flash(m, t);
    }

    // Character counters
    document.querySelectorAll('textarea[data-counter]').forEach(t => {

      const out = document.querySelector(t.dataset.counter);

      const upd = () => {
        if (out) {
          out.textContent = t.value.length + '/' + t.maxLength;
        }
      };

      t.addEventListener('input', upd);

      upd();

    });

  }

  // Flash messages
  function flash(msg, type = 'info') {

    const d = document.createElement('div');

    d.className = 'flash ' + type;
    d.textContent = msg;

    const c = document.querySelector('.content');

    if (c) {
      c.prepend(d);
      window.scrollTo(0, 0);
    }

    setTimeout(() => d.remove(), 6000);

  }

  // Flash message for next page
  const flashNext = (msg, type = 'info') => {

    sessionStorage.setItem(
      'flash',
      JSON.stringify([type, msg])
    );

  };

  // Navigate to another page
  const go = url => {

    location.href = url;

  };

  // Order stepper
  function stepper(n) {

    const st = [
      ['Enter Information', 'Tell us what you want'],
      ['Add items', 'Choose items for surprise'],
      ['Review', 'Review and confirm'],
      ['Complete', 'Your surprise is ready']
    ];

    return '<ol class="stepper">' +

      st.map(([t, s], i) =>

        `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}">
          <i>${i + 1}</i>
          <div>
            <b>${t}</b>
            <small>${s}</small>
          </div>
        </li>`

      ).join('') +

      '</ol>';

  }

  // Order status badge
  const badge = s =>

    `<span class="badge ${
      {
        Pending: 'warn',
        Packaging: 'info',
        Dispatched: 'info',
        Delivered: 'ok',
        Cancelled: 'bad'
      }[s] || 'info'
    }">${esc(s)}</span>`;

  // Gift image or emoji
  function art(g) {

    const im = document.querySelector(
      `#gift-images img[data-id="${g.id}"]`
    );

    return im

      ? `<img src="${esc(im.getAttribute('src'))}"
              alt="${esc(im.alt || g.name)}">`

      : `<div class="emoji-art">${g.emoji}</div>`;

  }

  // Gift grid
  function giftGrid(el, list, onChange) {

    const d = S.user() ? S.draft() : null;
    const fav = S.favs();

    if (!list.length) {

      el.innerHTML =
        '<div class="empty card">😕<p>No items found.</p></div>';

      return;

    }

    el.innerHTML = '<div class="gift-grid">' +

      list.map(g => {

        const inCart = d && d.items.find(i => i.id === g.id);

        return `

          <article class="gift-card">

            <div class="gift-img">

              ${art(g)}

              <button class="heart ${fav.includes(g.id) ? 'on' : ''}"
                      data-id="${g.id}"
                      aria-label="Favourite">

                ${fav.includes(g.id) ? '♥' : '♡'}

              </button>

              ${inCart
                ? `<span class="in-cart">✓ Added × ${inCart.qty}</span>`
                : ''}

            </div>

            <div class="gift-foot">

              <div>
                <b>${esc(g.name)}</b>
                <small>${money(g.price)}</small>
              </div>

              <button class="btn btn-sm more" data-id="${g.id}">
                Order
              </button>

            </div>

          </article>

        `;

      }).join('') +

      '</div>';

    // Favorite buttons
    el.querySelectorAll('.heart').forEach(h => {

      h.onclick = () => {

        if (!S.user()) {
          return go('login.html');
        }

        const on = S.toggleFav(+h.dataset.id);

        h.classList.toggle('on', on);

        h.textContent = on ? '♥' : '♡';

        if (onChange) {
          onChange('fav');
        }

      };

    });

    // Order buttons
    el.querySelectorAll('.more').forEach(b => {

      b.onclick = () => {

        popup(S.gift(+b.dataset.id), onChange);

      };

    });

  }

  // Gift details popup
  function popup(g, onChange) {

    const d = S.user() ? S.draft() : null;

    const cur = d && d.items.find(i => i.id === g.id);

    const m = document.createElement('div');

    m.className = 'modal';

    m.innerHTML = `

      <div class="modal-box">

        <button class="modal-x" aria-label="Close">×</button>

        <div class="modal-art">${art(g)}</div>

        <h3>${esc(g.name)}</h3>

        <p class="muted">${esc(g.type)}</p>

        <p>${esc(g.desc)}</p>

        <p class="price">${money(g.price)}</p>

    ` +

      (d

        ? `

          <div class="row">

            <label class="qty">
              Qty
              <input type="number"
                     id="pq"
                     min="1"
                     max="10"
                     value="${cur ? cur.qty : 1}">
            </label>

            <button class="btn" id="padd">
              Add to surprise
            </button>

          </div>

          ${cur
            ? '<button class="btn btn-ghost btn-sm" id="prem" style="margin-top:10px">Remove from surprise</button>'
            : ''}

        `

        : S.user()

          ? '<p class="muted"><a href="plan.html">Plan a surprise</a> first to add items.</p>'

          : '<p class="muted"><a href="login.html">Log in</a> and plan a surprise to add this item.</p>'

      ) +

      '</div>';

    document.body.appendChild(m);

    const close = () => m.remove();

    m.onclick = e => {

      if (e.target === m) {
        close();
      }

    };

    m.querySelector('.modal-x').onclick = close;

    const add = m.querySelector('#padd');
    const rem = m.querySelector('#prem');

    // Add gift
    if (add) {

      add.onclick = () => {

        S.addItem(
          g.id,
          Math.max(
            1,
            Math.min(10, +m.querySelector('#pq').value || 1)
          )
        );

        close();

        if (onChange) {
          onChange('cart');
        }

        flash('Added to your surprise.', 'ok');

      };

    }

    // Remove gift
    if (rem) {

      rem.onclick = () => {

        S.removeItem(g.id);

        close();

        if (onChange) {
          onChange('cart');
        }

      };

    }

  }

  // Initialize shared layout
  document.addEventListener('DOMContentLoaded', shell);

  return {
    flash,
    flashNext,
    go,
    stepper,
    badge,
    giftGrid,
    art
  };

})();

