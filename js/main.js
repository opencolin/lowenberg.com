/* lowenberg.com — interaction layer
   Theme toggle, San Francisco clock, nav state, scroll reveal,
   ledger count-up, project filters, magnetic buttons, and the
   living-network hero canvas. No dependencies. */

(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Theme ---------- */

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return prefersLight.matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) { /* storage unavailable */ }
    syncToggle();
    doc.dispatchEvent(new CustomEvent('themechange'));
  }

  var toggle = $('#theme-toggle');

  function syncToggle() {
    if (!toggle) return;
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' theme');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
    syncToggle();
  }

  if (prefersLight.addEventListener) {
    prefersLight.addEventListener('change', function () {
      syncToggle();
      doc.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  /* ---------- San Francisco clock ---------- */

  (function clock() {
    var targets = $$('#clock-time, #clock-time-mobile');
    if (!targets.length || !window.Intl || !Intl.DateTimeFormat) return;
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short'
      });
    } catch (e) { return; }
    function tick() {
      var s = fmt.format(new Date()).replace(/^24:/, '00:');
      targets.forEach(function (el) { el.textContent = s; });
    }
    tick();
    setInterval(tick, 15000);
  })();

  /* ---------- Navigation ---------- */

  var nav = $('#nav');
  var navLinks = $$('#nav-links a');

  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window && navLinks.length) {
    var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    var active = null;
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        if (id === active) return;
        active = id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { sectionIO.observe(s); });
  }

  var menuBtn = $('#menu-toggle');
  var mobileNav = $('#mobile-nav');

  function closeMenu() {
    if (!mobileNav || !menuBtn) return;
    mobileNav.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
    doc.body.style.overflow = '';
  }

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = mobileNav.hidden;
      mobileNav.hidden = !open;
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.textContent = open ? 'Close' : 'Menu';
      doc.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', mobileNav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- Scroll reveal ---------- */

  (function reveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
    // Safety net: anything still hidden after a while shows itself.
    setTimeout(function () { items.forEach(function (el) { el.classList.add('in'); }); }, 6000);
  })();

  /* ---------- Ledger count-up ---------- */

  (function countUp() {
    var nums = $$('[data-count]');
    if (!nums.length) return;
    var fmt = new Intl.NumberFormat('en-US');
    function render(el, value) {
      el.textContent = fmt.format(Math.round(value)) + (el.getAttribute('data-suffix') || '');
    }
    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var duration = 1500;
      var start = null;
      function frame(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / duration);
        var eased = 1 - Math.pow(2, -10 * p);
        render(el, target * (p === 1 ? 1 : eased));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    if (!('IntersectionObserver' in window) || reduceMotion.matches) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Project filters ---------- */

  (function filters() {
    var chips = $$('.chip[data-filter]');
    var items = $$('#projects-grid .project');
    if (!chips.length || !items.length) return;
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        items.forEach(function (item) {
          var tags = (item.getAttribute('data-tags') || '').split(/\s+/);
          item.hidden = !(key === 'all' || tags.indexOf(key) !== -1);
        });
      });
    });
  })();

  /* ---------- Magnetic buttons ---------- */

  (function magnetic() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('[data-magnetic]').forEach(function (btn) {
      var strength = 0.22;
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.transform = '';
      });
    });
  })();

  /* ---------- Living network (hero canvas) ---------- */

  (function network() {
    var canvas = $('#network');
    var hero = $('#hero');
    if (!canvas || !hero || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var w = 0, h = 0, dpr = 1;
    var nodes = [], packets = [];
    var LINK = 132;
    var MOUSE_R = 200;
    var mouse = { x: -9999, y: -9999, on: false };
    var color = { fg: '237,232,223', ac: '201,166,107' };
    var raf = 0, running = false, visible = true, last = 0;

    function hexToRgb(hex) {
      hex = hex.replace('#', '').trim();
      if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(hex, 16);
      if (isNaN(n)) return null;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
    }

    function readColors() {
      var cs = getComputedStyle(root);
      var fg = hexToRgb(cs.getPropertyValue('--fg'));
      var ac = hexToRgb(cs.getPropertyValue('--accent'));
      if (fg) color.fg = fg;
      if (ac) color.ac = ac;
    }

    function seed() {
      var count = Math.max(30, Math.min(120, Math.round((w * h) / 15000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: 0.9 + Math.random() * 1.3,
          ph: Math.random() * Math.PI * 2
        });
      }
      packets = [];
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduceMotion.matches) draw(0, 0);
    }

    function draw(t, dt) {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, d2, d, alpha;
      var step = dt / 16.67;

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx * step;
        a.y += a.vy * step;
        if (a.x < -24) a.x = w + 24; else if (a.x > w + 24) a.x = -24;
        if (a.y < -24) a.y = h + 24; else if (a.y > h + 24) a.y = -24;
        if (mouse.on) {
          dx = mouse.x - a.x; dy = mouse.y - a.y; d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R && d2 > 1) {
            d = Math.sqrt(d2);
            var pull = (1 - d / MOUSE_R) * 0.09 * step;
            a.x += (dx / d) * pull;
            a.y += (dy / d) * pull;
          }
        }
      }

      // Links between nearby nodes
      ctx.lineWidth = 1;
      var pairs = [];
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            alpha = (1 - Math.sqrt(d2) / LINK) * 0.3;
            ctx.strokeStyle = 'rgba(' + color.fg + ',' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            pairs.push(i, j);
          }
        }
      }

      // The cursor joins the network
      if (mouse.on) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          dx = a.x - mouse.x; dy = a.y - mouse.y; d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R) {
            alpha = (1 - Math.sqrt(d2) / MOUSE_R) * 0.55;
            ctx.strokeStyle = 'rgba(' + color.ac + ',' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(a.x, a.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(' + color.ac + ',0.9)';
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        var tw = 0.5 + 0.5 * Math.sin(t * 0.0011 + a.ph);
        ctx.fillStyle = 'rgba(' + color.fg + ',' + (0.3 + 0.4 * tw).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Packets travel along links
      if (pairs.length && packets.length < 8 && Math.random() < 0.06 * step) {
        var k = Math.floor(Math.random() * (pairs.length / 2)) * 2;
        packets.push({ a: nodes[pairs[k]], b: nodes[pairs[k + 1]], t: 0, s: 0.009 + Math.random() * 0.008 });
      }
      for (i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.t += p.s * step;
        if (p.t >= 1) { packets.splice(i, 1); continue; }
        var px = p.a.x + (p.b.x - p.a.x) * p.t;
        var py = p.a.y + (p.b.y - p.a.y) * p.t;
        var fade = Math.sin(p.t * Math.PI);
        ctx.fillStyle = 'rgba(' + color.ac + ',' + (0.16 * fade).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(' + color.ac + ',' + (0.95 * fade).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, 1.9, 0, Math.PI * 2); ctx.fill();
      }
    }

    function loop(t) {
      if (!running) return;
      var dt = last ? Math.min(50, t - last) : 16.67;
      last = t;
      draw(t, dt);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion.matches || !visible || doc.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.on = true;
    });
    hero.addEventListener('pointerleave', function () { mouse.on = false; });

    doc.addEventListener('themechange', function () {
      readColors();
      if (reduceMotion.matches) draw(0, 0);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) stop(); else start();
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    });

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', function () {
        if (reduceMotion.matches) { stop(); draw(0, 0); } else { start(); }
      });
    }

    readColors();
    resize();
    start();
  })();
})();
