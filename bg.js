(function () {
  'use strict';
  var canvas = document.getElementById('stage');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, stars = [];
  var mouse = { x: -9999, y: -9999, active: false, nx: 0 };

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var count = Math.round((W * H) / 5200);
    for (var i = 0; i < count; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, p: Math.random() * 6.28 });
  }

  var t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(t * 1.4 + st.p);
      ctx.fillStyle = 'rgba(255,250,240,' + (0.5 * st.z * tw).toFixed(3) + ')';
      var ox = mouse.active ? -mouse.nx * 10 * st.z : 0;
      ctx.fillRect(st.x + ox, st.y, st.z * 1.5, st.z * 1.5);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = (mouse.x / W - 0.5) * 2; mouse.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { mouse.active = false; });
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
