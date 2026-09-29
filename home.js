(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isHome = true;

  /* =========================================================
     2) Arka plan: yıldızlar + parçacık küre → ağaç (ana sayfa girişi)
     ========================================================= */
  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var hint = document.getElementById('hint');
  var heroEl = document.getElementById('heroPin');
  var heroCopy = document.getElementById('heroCopy');
  var fcL = document.getElementById('fcL'), fcR = document.getElementById('fcR');
  var capA = document.getElementById('capA'), capB = document.getElementById('capB');

  var W = 0, H = 0, dpr = 1, scale = 1, cx = 0, waterY = 0, isMobile = false;
  var mouse = { x: -9999, y: -9999, nx: 0, active: false };
  var smoothNx = 0, heroP = 0, treeA = 0, morph = 0, liquidA = 1;
  var ripples = [], lastRipple = 0, lastAmbient = 0;

  var BRANCHES = 18, branchLen = [];
  for (var b = 0; b < BRANCHES; b++) branchLen.push(0.55 + Math.random() * 0.45);

  var N = 0, px, py, pz, sxp, syp, szp, stag, ox, oy, vx, vy, bucket, phase, sx, sy, sf, pk;
  var SR = 172, SH0 = 300;

  function buildTree() {
    N = W < 600 ? 5200 : 9500;
    px = new Float32Array(N); py = new Float32Array(N); pz = new Float32Array(N);
    sxp = new Float32Array(N); syp = new Float32Array(N); szp = new Float32Array(N); stag = new Float32Array(N);
    ox = new Float32Array(N); oy = new Float32Array(N);
    vx = new Float32Array(N); vy = new Float32Array(N);
    sx = new Float32Array(N); sy = new Float32Array(N); sf = new Float32Array(N);
    bucket = new Uint8Array(N); phase = new Float32Array(N); pk = new Uint8Array(N);
    for (var i = 0; i < N; i++) {
      var dust = Math.random() < 0.07;
      var s = Math.pow(Math.random(), 0.85);
      var br = Math.floor(Math.random() * BRANCHES);
      var len = branchLen[br];
      var theta = (br / BRANCHES) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      var c = Math.min(1, Math.max(0, (s - 0.3) / 0.7));
      var trunk = 9 * (1 - s) + 3.5;
      var flare = s < 0.07 ? (0.07 - s) * 420 : 0;
      var r = trunk + flare + Math.pow(c, 1.55) * 290 * len * (0.82 + Math.random() * 0.36);
      var h = s * 410 * (0.92 + 0.08 * len) - c * c * 38 * Math.random();
      if (dust) { r = Math.random() * 340; h = Math.random() * 470; theta = Math.random() * 6.2832; }
      px[i] = Math.cos(theta) * r; pz[i] = Math.sin(theta) * r; py[i] = Math.max(0, h);
      bucket[i] = dust ? 3 : (Math.random() < 0.18 ? 0 : (Math.random() < 0.5 ? 1 : 2));
      phase[i] = Math.random() * 6.2832;
      // küre hedefi
      var u = Math.random() * 2 - 1, ph = Math.random() * 6.2832, rr0 = Math.sqrt(1 - u * u);
      var rs = SR * (Math.random() < 0.9 ? 0.96 + Math.random() * 0.06 : 0.55 + Math.random() * 0.4);
      sxp[i] = Math.cos(ph) * rr0 * rs; szp[i] = Math.sin(ph) * rr0 * rs; syp[i] = SH0 + u * rs;
      stag[i] = 0.6 * Math.min(1, py[i] / 430) + 0.4 * Math.random();
    }
  }

  var stars = [];
  function buildStars() {
    stars = [];
    var count = Math.round((W * H) / 5200);
    for (var i = 0; i < count; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, p: Math.random() * 6.28 });
  }

  function resize() {
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    isMobile = W < 760;
    cx = W * 0.5;
    waterY = H * (isMobile ? 0.7 : 0.8);
    scale = isMobile ? Math.min(W * 0.0019, H * 0.0011) : Math.min(W * 0.0011, H * 0.00135);
    buildTree(); buildStars();
  }

  function addRipple(x, y, strong) {
    ripples.push({ x: x, y: y, t: performance.now(), strong: !!strong });
    if (ripples.length > 26) ripples.shift();
  }
  function drawWater(now) {
    ctx.lineCap = 'round';
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i], age = (now - rp.t) / 1000, life = rp.strong ? 5.2 : 4.2;
      if (age > life) { ripples.splice(i, 1); continue; }
      var k = age / life, r = 8 + age * (rp.strong ? 190 : 140) * scale * 1.25, a = Math.pow(1 - k, 1.6);
      for (var ring = 0; ring < 3; ring++) {
        var rr = r - ring * 22 * scale;
        if (rr <= 2) continue;
        var fade = a * (1 - ring * 0.28);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.11 * fade).toFixed(3) + ')'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rr, rr * 0.27, 0, 0, 6.2832); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,215,' + (0.85 * fade).toFixed(3) + ')'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rr, rr * 0.27, 0, 0, 6.2832); ctx.stroke();
      }
    }
  }

  var colors = ['rgba(255,232,170,0.95)', 'rgba(244,190,92,0.9)', 'rgba(246,236,220,0.88)', 'rgba(255,255,255,0.9)'];
  var t0 = performance.now();

  function bump(t0_, t1_, x) { return smooth(clamp01((x - t0_[0]) / (t0_[1] - t0_[0]))) * (1 - smooth(clamp01((x - t1_[0]) / (t1_[1] - t1_[0])))); }

  function updateScroll() {
    if (!isHome || !heroEl) { heroP = 1; treeA = 0; morph = 1; liquidA = 0; return; }
    var rc = heroEl.getBoundingClientRect();
    var stH = (heroEl.firstElementChild && heroEl.firstElementChild.clientHeight) || H;
    var total = Math.max(1, rc.height - stH);
    heroP = clamp01(-rc.top / total);
    var sphereA = smooth(clamp01((heroP - 0.16) / 0.18));
    var out = clamp01((rc.bottom - H * 0.25) / (H * 0.75));
    treeA = sphereA * out;
    morph = smooth(clamp01((heroP - 0.5) / 0.28));
    liquidA = 1 - smooth(clamp01((heroP - 0.02) / 0.26));

    var copyA = 1 - smooth(clamp01(heroP / 0.16));
    heroCopy.style.opacity = String(copyA);
    heroCopy.style.transform = 'translateY(' + (-heroP * 120).toFixed(1) + 'px)';
    heroCopy.style.pointerEvents = copyA < 0.2 ? 'none' : 'auto';
    fcL.style.opacity = fcR.style.opacity = String(copyA);
    fcL.style.pointerEvents = fcR.style.pointerEvents = copyA < 0.2 ? 'none' : 'auto';
    capA.style.opacity = String(bump([0.26, 0.34], [0.46, 0.53], heroP));
    capB.style.opacity = String(bump([0.6, 0.67], [0.9, 0.98], heroP));
    if (heroP > 0.02) hint.classList.add('gone');
  }

  function drawStage(now, t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(t * 1.4 + st.p);
      ctx.fillStyle = 'rgba(255,250,240,' + (0.5 * st.z * tw).toFixed(3) + ')';
      var ox2 = mouse.active ? -mouse.nx * 10 * st.z : 0;
      ctx.fillRect(st.x + ox2, st.y, st.z * 1.5, st.z * 1.5);
    }
    if (!isHome || treeA <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = treeA;
    if (!reduceMotion && now - lastAmbient > 2300) { lastAmbient = now; addRipple(cx, waterY + 10 * scale, false); }
    drawWater(now);

    smoothNx += ((mouse.active ? mouse.nx : 0) - smoothNx) * 0.04;
    var angle = (reduceMotion ? 0.6 : t * 0.09) + smoothNx * 0.9;
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var R = 105, R2 = R * R, mx = mouse.x, my = mouse.y;
    var mid = morph > 0.001 && morph < 0.999;

    for (var j = 0; j < N; j++) {
      var lx, ly, lz;
      if (morph <= 0.001) { lx = sxp[j]; ly = syp[j]; lz = szp[j]; }
      else if (morph >= 0.999) { lx = px[j]; ly = py[j]; lz = pz[j]; }
      else {
        var mi = smooth(clamp01(morph * 1.5 - stag[j] * 0.5));
        lx = sxp[j] + (px[j] - sxp[j]) * mi; ly = syp[j] + (py[j] - syp[j]) * mi; lz = szp[j] + (pz[j] - szp[j]) * mi;
        var swr = Math.sin(3.1416 * mi) * 1.5, cs = Math.cos(swr), sn = Math.sin(swr);
        var lx2 = lx * cs + lz * sn; lz = -lx * sn + lz * cs; lx = lx2;
      }
      var hn = ly / 470, jit = (phase[j] - 3.14) * 0.018;
      pk[j] = (hn + jit) > 0.78 ? 0 : ((hn + jit) > 0.52 ? 1 : ((hn + jit) > 0.3 ? 2 : 3));
      if (bucket[j] === 0 && hn > 0.25) pk[j] = 0;
      var breathe = reduceMotion ? 0 : Math.sin(t * 1.2 + phase[j]) * 2.2;
      var x = lx * cosA + lz * sinA;
      var z = -lx * sinA + lz * cosA;
      var f = 900 / (900 + z);
      var tx = cx + x * f * scale;
      var ty = waterY - (ly + breathe) * f * scale + z * 0.12 * scale;
      var dx = tx + ox[j] - mx, dy = ty + oy[j] - my, d2 = dx * dx + dy * dy;
      if (mouse.active && d2 < R2) {
        var d = Math.sqrt(d2) || 1, force = Math.pow(1 - d / R, 2) * 5.5;
        vx[j] += (dx / d) * force; vy[j] += (dy / d) * force;
      }
      vx[j] += -ox[j] * 0.045; vy[j] += -oy[j] * 0.045;
      vx[j] *= 0.88; vy[j] *= 0.88;
      ox[j] += vx[j]; oy[j] += vy[j];
      sx[j] = tx + ox[j]; sy[j] = ty + oy[j]; sf[j] = f;
    }
    ctx.fillStyle = 'rgba(255,236,200,0.14)';
    for (var k = 0; k < N; k += 3) {
      var ry = waterY + (waterY - sy[k]) * 0.5;
      var wob = reduceMotion ? 0 : Math.sin(ry * 0.06 + t * 2.0) * 3;
      ctx.fillRect(sx[k] + wob, ry, sf[k] * 1.1, sf[k] * 1.1);
    }
    for (var bk = 0; bk < 4; bk++) {
      ctx.fillStyle = colors[bk];
      var size = bk === 0 ? 1.9 : (bk === 3 ? 1.5 : 1.45);
      for (var m = 0; m < N; m++) {
        if (pk[m] !== bk) continue;
        var s2 = size * sf[m];
        ctx.fillRect(sx[m] - s2 / 2, sy[m] - s2 / 2, s2, s2);
      }
    }
    ctx.restore();
  }

  function treeBurst(x, y) {
    for (var i = 0; i < N; i++) {
      var dx = sx[i] - x, dy = sy[i] - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 260) { var f = (1 - d / 260) * 11; vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; }
    }
    addRipple(Math.min(W - 10, Math.max(10, x)), Math.max(waterY, Math.min(H - 8, y > waterY ? y : waterY + 6)), true);
  }


  /* =========================================================
     2b) Sıvı küre (giriş): WebGL
     ========================================================= */
  var lqCanvas = document.getElementById('liquid');
  var gl = null, lqU = {}, lqOn = 0, lqLastClear = false;
  (function () {
    try { gl = lqCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) { gl = null; }
    if (!gl) { lqCanvas.style.display = 'none'; document.body.classList.add('no-gl'); return; }
    var vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var fs = [
      'precision highp float;',
      'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uOn; uniform float uA; uniform float uSink;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
      '  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }',
      'float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }',
      'float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }',
      'float field(vec2 p){',
      '  float t = uTime * 0.35;',
      '  vec2 c = vec2(0.0, -1.32 - uSink * 1.1);',
      '  float d = length(p - c) - 0.95;',
      '  float d2 = length(p - (c + vec2(-0.62 + 0.1*sin(t*1.3), 0.30 + 0.1*cos(t*1.1)))) - 0.48;',
      '  float d3 = length(p - (c + vec2(0.66 + 0.1*cos(t*1.2), 0.18 + 0.1*sin(t*0.9)))) - 0.44;',
      '  float d4 = length(p - (c + vec2(0.12*sin(t), 0.62 + 0.1*sin(t*1.7)))) - 0.55;',
      '  d = smin(d, d2, 0.5); d = smin(d, d3, 0.5); d = smin(d, d4, 0.55);',
      '  d += (fbm(p*1.1 + vec2(t, -t*0.6)) - 0.5) * 0.12;',
      '  d -= 0.24 * exp(-length(p - uMouse) * 2.4) * uOn;',
      '  return d;',
      '}',
      'void main(){',
      '  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;',
      '  float d = field(uv);',
      '  float e = 0.004;',
      '  vec2 g = vec2(field(uv+vec2(e,0.0)) - field(uv-vec2(e,0.0)), field(uv+vec2(0.0,e)) - field(uv-vec2(0.0,e))) / (2.0*e);',
      '  float depth = clamp(-d / 0.85, 0.0, 1.0);',
      '  float edgeK = pow(1.0 - depth, 1.6);',
      '  vec3 n = normalize(vec3(g * (0.02 + 2.2 * edgeK), 1.0));',
      '  vec3 L1 = normalize(vec3(-0.6, 0.7, 0.45)); vec3 L2 = normalize(vec3(0.8, 0.35, 0.45));',
      '  float s1 = pow(max(dot(n, L1), 0.0), 4.0) * edgeK; float s2 = pow(max(dot(n, L2), 0.0), 7.0) * edgeK;',
      '  float fres = pow(1.0 - n.z, 2.2);',
      '  vec3 gold = vec3(1.0, 0.72, 0.28); vec3 amber = vec3(0.9, 0.45, 0.12); vec3 blue = vec3(0.90, 0.91, 0.97); vec3 deep = vec3(0.008, 0.010, 0.03);',
      '  float band = fbm(n.xy * 3.0 + uTime * 0.05);',
      '  float low = smoothstep(-0.55, -1.0, uv.y);',
      '  vec3 col = mix(deep, blue * 0.42, low * (0.30 + 0.70 * band));',
      '  col += gold * s1 * 1.5 + amber * s2 * 0.7;',
      '  col += mix(gold, blue, band) * fres * 0.6;',
      '  float rim = 1.0 - smoothstep(0.0, 0.03, -d);',
      '  col += vec3(1.0, 0.95, 0.88) * rim * (0.35 + 0.65 * max(dot(normalize(n.xy + 1e-4), normalize(vec2(-0.6, 0.8))), 0.0));',
      '  float cover = 1.0 - smoothstep(0.0, 0.012, d);',
      '  float glow = exp(-max(d, 0.0) * 7.0) * 0.10;',
      '  vec3 gcol = mix(amber, gold, 0.4) * glow;',
      '  float a = clamp(cover * (0.84 + 0.16 * edgeK) + glow * 0.7 * (1.0 - cover), 0.0, 1.0) * uA;',
      '  col += vec3(1.0, 0.86, 0.6) * pow(max(dot(n, normalize(vec3(-0.35, 0.8, 0.6))), 0.0), 14.0) * 0.55 * edgeK;',
      '  vec3 rgb = (col * cover * (0.84 + 0.16 * edgeK) + gcol * (1.0 - cover)) * uA;',
      '  gl_FragColor = vec4(rgb, a);',
      '}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { gl = null; lqCanvas.style.display = 'none'; document.body.classList.add('no-gl'); return; }
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr); gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uMouse', 'uOn', 'uA', 'uSink'].forEach(function (n) { lqU[n] = gl.getUniformLocation(pr, n); });
  })();
  function resizeLiquid() {
    if (!gl) return;
    var d = Math.min(window.devicePixelRatio || 1, 1.5);
    lqCanvas.width = Math.round((lqCanvas.clientWidth || window.innerWidth) * d); lqCanvas.height = Math.round((lqCanvas.clientHeight || window.innerHeight) * d);
    gl.viewport(0, 0, lqCanvas.width, lqCanvas.height);
  }
  function drawLiquid(t) {
    if (!gl) return;
    var show = isHome && liquidA > 0.01;
    if (!show) {
      if (!lqLastClear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); lqLastClear = true; }
      return;
    }
    lqLastClear = false;
    lqOn += ((mouse.active ? 1 : 0) - lqOn) * 0.06;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(lqU.uRes, lqCanvas.width, lqCanvas.height);
    gl.uniform1f(lqU.uTime, reduceMotion ? 0 : t);
    gl.uniform2f(lqU.uMouse, (mouse.x * 2 - W) / H, (H - 2 * mouse.y) / H);
    gl.uniform1f(lqU.uOn, lqOn);
    gl.uniform1f(lqU.uA, liquidA);
    gl.uniform1f(lqU.uSink, smooth(clamp01(heroP / 0.3)));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }


  /* =========================================================
     3c) Beyaz atölye: noktalardan oluşan Vilkan işareti
     ========================================================= */
  var lightBlock = document.getElementById('lightBlock'), lightStage = document.getElementById('lightStage');
  var lc = document.getElementById('lightCanvas'), lcx = lc.getContext('2d');
  var lW = 0, lH = 0, lVis = false, lLastT = 0;
  var lgx, lgy, lon, lox, loy, lvx, lvy, lN = 0, lCols = 0, lRows = 0, lCell = 0;
  var lm = { x: -9999, y: -9999, on: false }, lShock = [];

  var lMaskCache = null;
  /* Maske, sahnenin en-boy oraninda uretilir. Sabit 640x200 maskeyi
     izgaraya germek yaziyi mobilde eziyordu. */
  function buildLightMask(aspect, cols, rows) {
    var MW = 900, MH = Math.max(200, Math.round(MW / Math.max(0.5, aspect)));
    var mc = document.createElement('canvas'); mc.width = MW; mc.height = MH;
    var mg = mc.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, MW, MH);
    mg.fillStyle = '#fff'; mg.textAlign = 'left'; mg.textBaseline = 'alphabetic';

    /* Noktasiz 'I' cizip \u0130'nin noktasini kendimiz koyuyoruz.
       Fontun kendi noktasi izgaraya denk gelmeyip yarim kaliyordu. */
    var WORD = 'VILKAN', DOT_AT = 1; // noktayi alacak harfin sirasi

    var fs = 200;
    mg.font = '700 ' + fs + 'px Montserrat, system-ui, sans-serif';
    var tw = mg.measureText(WORD).width || 1;
    fs = Math.floor(fs * (MW * 0.88) / tw);
    mg.font = '700 ' + fs + 'px Montserrat, system-ui, sans-serif';

    var m = mg.measureText(WORD);
    var capH = m.actualBoundingBoxAscent || fs * 0.72;
    var cellW = MW / cols, cellH = MH / rows;
    // Govde + nokta + aralik dikeye sigmali.
    var dotH = 2 * cellH, gap = capH * 0.16, block = capH + gap + dotH;
    if (block > MH * 0.92) {
      fs = Math.floor(fs * (MH * 0.92) / block);
      mg.font = '700 ' + fs + 'px Montserrat, system-ui, sans-serif';
      m = mg.measureText(WORD);
      capH = m.actualBoundingBoxAscent || fs * 0.72;
      gap = capH * 0.16; block = capH + gap + dotH;
    }

    var wordW = mg.measureText(WORD).width;
    var x0 = (MW - wordW) / 2;
    var baseline = (MH - block) / 2 + dotH + gap + capH;
    mg.fillText(WORD, x0, baseline);

    // Noktayi tam 2x2 hucreye oturt.
    var xI = x0 + mg.measureText(WORD.slice(0, DOT_AT)).width
                + mg.measureText(WORD.charAt(DOT_AT)).width / 2;
    var yDot = baseline - capH - gap - dotH / 2;
    var c0 = Math.max(0, Math.min(cols - 2, Math.round(xI / cellW) - 1));
    var r0 = Math.max(0, Math.min(rows - 2, Math.round(yDot / cellH) - 1));
    mg.fillRect(c0 * cellW, r0 * cellH, 2 * cellW, 2 * cellH);

    return { data: mg.getImageData(0, 0, MW, MH).data, w: MW, h: MH, aspect: aspect, cols: cols, rows: rows };
  }
  function buildLightGrid() {
    var w = lW, h = lH, cell = w < 620 ? 6 : (w < 1000 ? 11 : 15);
    lCols = Math.max(16, Math.round(w / cell)); lRows = Math.max(8, Math.round(h / cell));
    lCell = w / lCols;
    var aspect = w / h;
    if (!lMaskCache || Math.abs(lMaskCache.aspect - aspect) > 0.02
        || lMaskCache.cols !== lCols || lMaskCache.rows !== lRows) lMaskCache = buildLightMask(aspect, lCols, lRows);
    var mask = lMaskCache.data, mw = lMaskCache.w, mh = lMaskCache.h;
    lN = lCols * lRows;
    lgx = new Float32Array(lN); lgy = new Float32Array(lN); lon = new Float32Array(lN);
    lox = new Float32Array(lN); loy = new Float32Array(lN); lvx = new Float32Array(lN); lvy = new Float32Array(lN);
    var k = 0;
    for (var r = 0; r < lRows; r++) for (var c = 0; c < lCols; c++, k++) {
      lgx[k] = (c + 0.5) * lCell; lgy[k] = (r + 0.5) * (h / lRows);
      // Tek piksel yerine hucrenin tamamini orneklemek ince parcalari
      // (İ'nin noktasi gibi) eksiksiz yakalar.
      var hit = 0, tot = 0;
      for (var sy = 0; sy < 3; sy++) for (var sx = 0; sx < 3; sx++) {
        var fx = (c + (sx + 0.5) / 3) / lCols, fy = (r + (sy + 0.5) / 3) / lRows;
        var mx = Math.min(mw - 1, Math.max(0, Math.floor(fx * mw)));
        var my = Math.min(mh - 1, Math.max(0, Math.floor(fy * mh)));
        if (mask[(my * mw + mx) * 4] > 128) hit++;
        tot++;
      }
      lon[k] = (hit / tot) >= 0.34 ? 1 : 0;
    }
  }
  function resizeLight() {
    var r = lightStage.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    lW = r.width; lH = r.height;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    lc.width = Math.round(lW * d); lc.height = Math.round(lH * d);
    lcx.setTransform(d, 0, 0, d, 0, 0);
    buildLightGrid();
  }
  function drawLight(now) {
    if (!lW || !lVis) return;
    var dt = Math.min(0.05, Math.max(0.001, (now - (lLastT || now)) / 1000)); lLastT = now;
    lcx.clearRect(0, 0, lW, lH);
    var R = lW < 620 ? 70 : 100, R2 = R * R;
    for (var i = 0; i < lN; i++) {
      var x = lgx[i], y = lgy[i];
      var dx = x + lox[i] - lm.x, dy = y + loy[i] - lm.y, d2 = dx * dx + dy * dy;
      if (lm.on && d2 < R2) {
        var d = Math.sqrt(d2) || 1, k2 = 1 - d / R, f = k2 * k2 * 16;
        lvx[i] += (dx / d) * f; lvy[i] += (dy / d) * f;
      }
      for (var s = 0; s < lShock.length; s++) {
        var sk = lShock[s], age = Math.max(0, (now - sk.t) / 1000);
        if (age > 1.1) continue;
        var sdx = x + lox[i] - sk.x, sdy = y + loy[i] - sk.y, sd = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
        var dist = Math.abs(sd - age * 480);
        if (dist < 30) { var fs2 = (1 - dist / 30) * 10 * (1 - age / 1.1); lvx[i] += (sdx / sd) * fs2; lvy[i] += (sdy / sd) * fs2; }
      }
      lvx[i] += -lox[i] * 0.06; lvy[i] += -loy[i] * 0.06; lvx[i] *= 0.87; lvy[i] *= 0.87;
      lox[i] += lvx[i] * dt * 60; loy[i] += lvy[i] * dt * 60;
      var disp = Math.min(1, (lox[i] * lox[i] + loy[i] * loy[i]) / 400);
      var baseR = lon[i] ? lCell * 0.36 : lCell * 0.15;
      var rr = baseR * (1 + disp * 0.9);
      var near = lm.on && d2 < R2 * 2.4;
      lcx.fillStyle = lon[i] ? (near ? '#c9992f' : '#15111a') : (near ? 'rgba(201,153,47,0.55)' : 'rgba(20,16,24,0.16)');
      lcx.beginPath(); lcx.arc(x + lox[i], y + loy[i], Math.max(0.6, rr), 0, 6.2832); lcx.fill();
    }
    for (var q = lShock.length - 1; q >= 0; q--) if (now - lShock[q].t > 1100) lShock.splice(q, 1);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { lVis = en[0].isIntersecting; }, { threshold: 0.05 }).observe(lightStage);
  } else { lVis = true; }
  function lightPointer(e) {
    var r = lc.getBoundingClientRect();
    lm.x = e.clientX - r.left; lm.y = e.clientY - r.top;
    lm.on = lm.x > -40 && lm.y > -40 && lm.x < r.width + 40 && lm.y < r.height + 40;
  }
  lc.addEventListener('pointermove', lightPointer, { passive: true });
  lc.addEventListener('pointerleave', function () { lm.on = false; });
  lc.addEventListener('pointerdown', function (e) {
    lightPointer(e);
    lShock.push({ x: lm.x, y: lm.y, t: performance.now() });
    if (lShock.length > 4) lShock.shift();
  });



  /* =========================================================
     3b) Kaydırdıkça açılan sahneler
     ========================================================= */
  function pinProgress(el) { var r = el.getBoundingClientRect(), st = el.firstElementChild, vh = (st && st.clientHeight) ? st.clientHeight : window.innerHeight; return clamp01(-r.top / Math.max(1, r.height - vh)); }
  function cam3(yaw, pitch, cx_, cy_, s, d) { return { yaw: yaw, pitch: pitch, cx: cx_, cy: cy_, s: s, d: d, cy_: Math.cos(yaw), sy_: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) }; }
  function pr3(c, x, y, z) {
    var X = x * c.cy_ + z * c.sy_, Z = -x * c.sy_ + z * c.cy_;
    var Y2 = y * c.cp - Z * c.sp, Z2 = y * c.sp + Z * c.cp;
    var f = c.d / (c.d - Z2);
    return [c.cx + X * f * c.s, c.cy - Y2 * f * c.s, f, Z2];
  }

  /* ---- Parçalanan katmanlar (1. görsel gibi) ---- */
  var exEl = document.getElementById('exPin'), exC = document.getElementById('exCanvas'), eg = exC.getContext('2d');
  var exW = 0, exH = 0, exVis = false, exSP = 0;
  var exH2 = document.getElementById('exH2'), exInfo = document.getElementById('exInfo');
  var exTitle = document.getElementById('exTitle'), exDesc = document.getElementById('exDesc'), exNum = document.getElementById('exNum');
  var exKnob = document.getElementById('exKnob'), exRing = document.getElementById('exRing');
  var EXN = ['Arayüz', 'Kod', 'Yapay zeka', 'Veri', 'Altyapı'];
  var EXD = [
    'Kullanıcının gördüğü her şey. Markana uygun, sade ve hızlı arayüzler tasarlıyoruz.',
    'Görünenin arkasındaki iskelet. Sağlam, sürdürülebilir yazılımla kuruyoruz.',
    'İşini hızlandıran katman. Sitene ve süreçlerine yapay zeka gücü katıyoruz.',
    'Kararlarının dayanağı. Stoktan randevuya her şeyi anlık ve doğru tutuyoruz.',
    'Hepsinin üzerinde durduğu zemin. Güvenli, hızlı ve 7/24 ayakta.'
  ];
  var GOLD = '236,196,110';
  function resizeEx() {
    exW = exC.clientWidth || window.innerWidth; exH = exC.clientHeight || window.innerHeight;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    exC.width = Math.round(exW * d); exC.height = Math.round(exH * d); eg.setTransform(d, 0, 0, d, 0, 0);
  }
  function slabDetail(g, i, act) {
    var ga = act ? 0.95 : 0.55;
    g.lineWidth = 2; g.lineCap = 'round';
    if (i === 0) { // arayüz
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, 300, 28);
      [16, 32, 48].forEach(function (x, k) { g.fillStyle = k === 0 ? 'rgba(' + GOLD + ',' + ga + ')' : 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x, 14, 4.5, 0, 6.2832); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(16, 46, 156, 84); g.fillRect(186, 46, 98, 38); g.fillRect(186, 92, 98, 38);
      g.fillStyle = 'rgba(' + GOLD + ',' + (ga * 0.7) + ')'; g.fillRect(24, 58, 70, 8);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(24, 74, 120, 5); g.fillRect(24, 86, 100, 5);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(16, 146, 268, 6); g.fillRect(16, 160, 200, 6); g.fillRect(16, 174, 236, 6);
    } else if (i === 1) { // kod
      for (var k = 0; k < 12; k++) {
        var ind = (k % 3) * 22, w = 60 + ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 * 150;
        g.fillStyle = (k % 4 === 0) ? 'rgba(' + GOLD + ',' + ga + ')' : 'rgba(255,255,255,0.42)';
        g.fillRect(18 + ind, 14 + k * 15.5, Math.min(w, 264 - ind), 6);
      }
    } else if (i === 2) { // yapay zeka çipi
      g.strokeStyle = 'rgba(' + GOLD + ',' + ga + ')'; g.strokeRect(80, 30, 140, 140); g.strokeRect(104, 54, 92, 92);
      for (var p = 0; p < 8; p++) {
        var o = 90 + p * 17;
        g.beginPath(); g.moveTo(o, 30); g.lineTo(o, 14); g.moveTo(o, 170); g.lineTo(o, 186); g.moveTo(80, 40 + p * 17); g.lineTo(62, 40 + p * 17); g.moveTo(220, 40 + p * 17); g.lineTo(238, 40 + p * 17); g.stroke();
      }
      var cg2 = g.createRadialGradient(150, 100, 0, 150, 100, 46); cg2.addColorStop(0, 'rgba(255,240,200,' + (act ? 1 : 0.7) + ')'); cg2.addColorStop(1, 'rgba(' + GOLD + ',0)');
      g.fillStyle = cg2; g.beginPath(); g.arc(150, 100, 46, 0, 6.2832); g.fill();
    } else if (i === 3) { // veri diskleri
      for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) {
        var x = 62 + c * 88, y = 62 + r * 82;
        g.strokeStyle = 'rgba(' + GOLD + ',' + ga + ')'; g.fillStyle = 'rgba(255,255,255,0.09)';
        g.beginPath(); g.ellipse(x, y + 14, 32, 12, 0, 0, Math.PI); g.lineTo(x - 32, y); g.lineTo(x + 32, y); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(x, y, 32, 12, 0, 0, 6.2832); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill(); g.stroke();
      }
    } else { // altyapı
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      for (var a = 0; a < 7; a++) { g.beginPath(); g.moveTo(14, 20 + a * 26); g.lineTo(286, 20 + a * 26); g.stroke(); }
      for (var b2 = 0; b2 < 10; b2++) { g.beginPath(); g.moveTo(20 + b2 * 29, 12); g.lineTo(20 + b2 * 29, 188); g.stroke(); }
      g.fillStyle = 'rgba(' + GOLD + ',' + ga + ')';
      [[49, 46], [136, 98], [223, 150], [78, 150], [194, 46]].forEach(function (q) { g.fillRect(q[0] - 6, q[1] - 6, 12, 12); });
    }
  }
  function drawEx(now) {
    if (!exVis) return;
    if (!exW) resizeEx();
    var p = pinProgress(exEl); exSP += (p - exSP) * 0.16; p = exSP;
    var e = smooth(clamp01((p - 0.10) / 0.40));
    var mob = exW < 760;
    var c = cam3(0.55 + p * 1.15, 0.86 - e * 0.28, mob ? exW * 0.5 : exW * 0.36, mob ? exH * 0.42 : exH * 0.55,
      mob ? Math.min(exW * 0.17, exH * 0.1) : Math.min(exW * 0.105, exH * 0.19), 9);
    eg.clearRect(0, 0, exW, exH);
    var aF = clamp01((p - 0.42) / 0.58) * 5, act = Math.min(4, Math.floor(aF)), frac = aF - Math.floor(aF);
    var showAct = p > 0.42;
    var gap = 0.19 + e * 0.98, hw = 1.5, hd = 1.0, hh = 0.07;

    // zemin gölgesi
    var base = pr3(c, 0, -2 * gap - 0.3, 0);
    var sg = eg.createRadialGradient(base[0], base[1], 0, base[0], base[1], c.s * 2.6);
    sg.addColorStop(0, 'rgba(' + GOLD + ',' + (0.10 + 0.08 * e) + ')'); sg.addColorStop(1, 'rgba(' + GOLD + ',0)');
    eg.fillStyle = sg; eg.fillRect(0, 0, exW, exH);

    // eksen çizgisi
    var a0 = pr3(c, 0, -2 * gap - 0.1, 0), a1 = pr3(c, 0, 2 * gap + 0.1, 0);
    eg.strokeStyle = 'rgba(' + GOLD + ',' + (0.12 + 0.25 * e) + ')'; eg.lineWidth = 1; eg.setLineDash([4, 6]);
    eg.beginPath(); eg.moveTo(a0[0], a0[1]); eg.lineTo(a1[0], a1[1]); eg.stroke(); eg.setLineDash([]);

    for (var idx = 4; idx >= 0; idx--) {
      var y = (2 - idx) * gap;
      var ang = e * (idx - 2) * -0.26;
      var ca_ = Math.cos(ang), sa_ = Math.sin(ang);
      function W3(x, yy, z) { return pr3(c, x * ca_ - z * sa_, yy, x * sa_ + z * ca_); }
      var isAct = showAct && idx === act;
      var dim = showAct && idx !== act ? 0.55 : 1;
      var T = [W3(-hw, y + hh, -hd), W3(hw, y + hh, -hd), W3(hw, y + hh, hd), W3(-hw, y + hh, hd)];
      var B = [W3(-hw, y - hh, -hd), W3(hw, y - hh, -hd), W3(hw, y - hh, hd), W3(-hw, y - hh, hd)];
      var sides = [[0, 1], [1, 2], [2, 3], [3, 0]].map(function (s) { return { s: s, z: (T[s[0]][3] + T[s[1]][3]) / 2 }; }).sort(function (a, b) { return a.z - b.z; });
      sides.forEach(function (o) {
        var a = o.s[0], b = o.s[1];
        eg.fillStyle = 'rgba(16,14,20,' + (0.9 * dim) + ')';
        eg.beginPath(); eg.moveTo(T[a][0], T[a][1]); eg.lineTo(T[b][0], T[b][1]); eg.lineTo(B[b][0], B[b][1]); eg.lineTo(B[a][0], B[a][1]); eg.closePath(); eg.fill();
      });
      var tg = eg.createLinearGradient(T[0][0], T[0][1], T[2][0], T[2][1]);
      tg.addColorStop(0, 'rgba(255,255,255,' + (0.13 * dim) + ')'); tg.addColorStop(1, 'rgba(255,255,255,' + (0.06 * dim) + ')');
      eg.fillStyle = tg; eg.beginPath(); eg.moveTo(T[0][0], T[0][1]); for (var q = 1; q < 4; q++) eg.lineTo(T[q][0], T[q][1]); eg.closePath(); eg.fill();
      if (isAct) { eg.fillStyle = 'rgba(' + GOLD + ',0.10)'; eg.fill(); }
      eg.save();
      eg.globalAlpha = dim;
      eg.transform((T[1][0] - T[0][0]) / 300, (T[1][1] - T[0][1]) / 300, (T[3][0] - T[0][0]) / 200, (T[3][1] - T[0][1]) / 200, T[0][0], T[0][1]);
      slabDetail(eg, idx, isAct);
      eg.restore();
      eg.lineJoin = 'round';
      if (isAct) { eg.strokeStyle = 'rgba(' + GOLD + ',0.28)'; eg.lineWidth = 7; strokeSlab(eg, T, B); }
      eg.strokeStyle = isAct ? 'rgba(' + GOLD + ',1)' : 'rgba(255,255,255,' + (0.6 * dim) + ')'; eg.lineWidth = isAct ? 2 : 1.3;
      strokeSlab(eg, T, B);
    }

    // başlık ve bilgi
    var blur = (1 - smooth(clamp01((p - 0.06) / 0.3))) * 9;
    exH2.style.filter = blur > 0.3 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';
    var infoA = smooth(clamp01((p - 0.34) / 0.14));
    exInfo.style.opacity = String(infoA);
    exTitle.textContent = EXN[act]; exDesc.textContent = EXD[act]; exNum.textContent = '0' + (act + 1);
    exKnob.style.left = (frac * 100).toFixed(1) + '%';
    exRing.style.strokeDashoffset = (326.7 * (1 - clamp01((p - 0.42) / 0.58))).toFixed(1);
  }
  function strokeSlab(g, T, B) {
    g.beginPath();
    g.moveTo(T[0][0], T[0][1]); for (var i = 1; i < 4; i++) g.lineTo(T[i][0], T[i][1]); g.closePath();
    for (var k = 0; k < 4; k++) { g.moveTo(T[k][0], T[k][1]); g.lineTo(B[k][0], B[k][1]); }
    g.moveTo(B[0][0], B[0][1]); for (var j = 1; j < 4; j++) g.lineTo(B[j][0], B[j][1]); g.closePath();
    g.stroke();
  }

  /* ---- Tel kafes katmanlar (2. görsel gibi) ---- */
  var wfEl = document.getElementById('wfPin'), wfC = document.getElementById('wfCanvas'), wg = wfC.getContext('2d');
  var wfW = 0, wfH = 0, wfVis = false, wfSP = 0, wfText = document.getElementById('wfText');
  function resizeWf() {
    wfW = wfC.clientWidth || window.innerWidth; wfH = wfC.clientHeight || window.innerHeight;
    var d = Math.min(window.devicePixelRatio || 1, 1.75);
    wfC.width = Math.round(wfW * d); wfC.height = Math.round(wfH * d); wg.setTransform(d, 0, 0, d, 0, 0);
  }
  function drawWf(now) {
    if (!wfVis) return;
    if (!wfW) resizeWf();
    var p = pinProgress(wfEl); wfSP += (p - wfSP) * 0.14; p = wfSP;
    var e = smooth(clamp01((p - 0.04) / 0.62));
    var mob = wfW < 760;
    var mxo = mouse.active ? mouse.nx * 0.12 : 0;
    var c = cam3(-0.5 + p * 0.85 + mxo, 0.40 - e * 0.10, wfW / 2, wfH * 0.52, mob ? wfW * 0.2 : Math.min(wfW * 0.115, wfH * 0.2), 8);
    wg.globalCompositeOperation = 'destination-out'; wg.fillStyle = 'rgba(0,0,0,0.4)'; wg.fillRect(0, 0, wfW, wfH);
    wg.globalCompositeOperation = 'lighter';
    var N = 26, sp = 0.03 + e * 0.2, hw = 2.2, hd = 1.4, GX = 14, GZ = 8;
    var fade = 1 - smooth(clamp01((p - 0.86) / 0.14));
    for (var i = 0; i < N; i++) {
      var y = (i - (N - 1) / 2) * sp;
      var jx = Math.sin(i * 1.7 + now * 0.0004) * e * 0.05;
      var mid = 1 - Math.abs(i - (N - 1) / 2) / (N / 2);
      var alpha = (0.10 + 0.32 * mid + (i === 0 || i === N - 1 ? 0.25 : 0)) * fade;
      wg.strokeStyle = 'rgba(232,236,246,' + alpha.toFixed(3) + ')'; wg.lineWidth = (i === 0 || i === N - 1) ? 1.6 : 1;
      wg.beginPath();
      var A = pr3(c, -hw + jx, y, -hd), B = pr3(c, hw + jx, y, -hd), C = pr3(c, hw + jx, y, hd), D = pr3(c, -hw + jx, y, hd);
      wg.moveTo(A[0], A[1]); wg.lineTo(B[0], B[1]); wg.lineTo(C[0], C[1]); wg.lineTo(D[0], D[1]); wg.closePath();
      for (var gx = 1; gx < GX; gx++) {
        var xx = -hw + (2 * hw * gx) / GX + jx, p1 = pr3(c, xx, y, -hd), p2 = pr3(c, xx, y, hd);
        wg.moveTo(p1[0], p1[1]); wg.lineTo(p2[0], p2[1]);
      }
      for (var gz = 1; gz < GZ; gz++) {
        var zz = -hd + (2 * hd * gz) / GZ, q1 = pr3(c, -hw + jx, y, zz), q2 = pr3(c, hw + jx, y, zz);
        wg.moveTo(q1[0], q1[1]); wg.lineTo(q2[0], q2[1]);
      }
      wg.stroke();
    }
    wg.globalCompositeOperation = 'source-over';
    var ta = smooth(clamp01(p / 0.14)) * (1 - smooth(clamp01((p - 0.78) / 0.14)));
    wfText.style.opacity = String(ta);
  }

  ['exPin', 'wfPin'].forEach(function (id, k) {
    var el = document.getElementById(id);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { var v = en[0].isIntersecting && isHome; if (k === 0) exVis = v; else wfVis = v; }, { threshold: 0 }).observe(el);
    } else { if (k === 0) exVis = true; else wfVis = true; }
  });


  /* =========================================================
     4) Sanat sahnesi: galeri → fırça darbeleri → yeni tuval
     ========================================================= */
  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function artBump(a0, a1, b0, b1, x) { return smooth(clamp01((x - a0) / (a1 - a0))) * (1 - smooth(clamp01((x - b0) / (b1 - b0)))); }
  function artRnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  var arEl = document.getElementById('artPin'), arC = document.getElementById('artCanvas'), ag = arC.getContext('2d');
  var arW = 0, arH = 0, arVis = false, arSP = 0, arTop = 0, arLeft = 0, arShock = [], arLastList = [], arFrameBox = null;
  var arIntro = document.getElementById('arIntro'), arWord = document.getElementById('arWord'), arEnd = document.getElementById('arEnd'), arBar = document.getElementById('arBar');

  /* ---- Van Gogh esintili tablolar: fırça darbesi sistemi ---- */
  function VG(W, H, pal, seed) { return { W: W, H: H, pal: pal, R: artRnd(seed), S: [], L: 0 }; }
  function vs(b, x, y, a, l, wc, c, k, cx, cy, amp) { b.S.push([x, y, a, l, wc, c, k, b.R() * 6.2832, cx || 0, cy || 0, amp == null ? 3 : amp, b.L]); }
  function vfield(b, n, inside, flow, col, l0, l1, wc, k, amp) {
    for (var i = 0; i < n; i++) {
      var x = b.R() * b.W, y = b.R() * b.H;
      if (!inside(x, y)) continue;
      vs(b, x, y, flow(x, y) + (b.R() - 0.5) * 0.35, l0 + b.R() * (l1 - l0), wc, col(x, y, b.R), k, 0, 0, typeof amp === 'function' ? amp(x, y) : amp);
    }
  }
  function vortex(cs, base) {
    return function (x, y) {
      var a0 = base(x, y), vx = Math.cos(a0), vy = Math.sin(a0);
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i], dx = x - c[0], dy = y - c[1], d = Math.sqrt(dx * dx + dy * dy) + 0.001, w = Math.exp(-(d * d) / (c[2] * c[2])) * 3.2;
        vx += (-dy / d) * w * c[3]; vy += (dx / d) * w * c[3];
      }
      return Math.atan2(vy, vx);
    };
  }
  function vstar(b, cx, cy, r, cA, cB, cC) {
    for (var j = 1; j <= 4; j++) {
      var rr = r * j / 4, n = Math.max(6, Math.round(rr * 1.1));
      for (var i = 0; i < n; i++) {
        var th = i / n * 6.2832 + b.R() * 0.3;
        vs(b, cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, th + 1.5708, 6.2832 * rr / n * 1.3, j < 3 ? 1 : 0, j === 1 ? cA : (j === 2 ? cB : cC), 2, cx, cy);
      }
    }
    for (var k = 0; k < 8; k++) vs(b, cx + (b.R() - 0.5) * r * 0.4, cy + (b.R() - 0.5) * r * 0.4, b.R() * 6.28, r * 0.25, 2, cA, 2, cx, cy);
  }
  function cypress(b, bx, by, top, wd, c1, c2) {
    for (var i = 0; i < 900; i++) {
      var y = top + b.R() * (by - top), tt = (y - top) / (by - top);
      var half = wd * (0.2 + 0.8 * Math.sin(Math.PI * Math.min(1, tt * 0.95 + 0.05))) * Math.min(1, tt * 3);
      var x = bx + 5 * Math.sin(y * 0.05) + (b.R() - 0.5) * 2 * half;
      vs(b, x, y, -1.5708 + 0.35 * Math.sin(y * 0.08 + (x - bx) * 0.2), 8 + b.R() * 7, 2, b.R() < 0.55 ? c1 : c2, 3, 0, 0, 1 + 3 * (1 - tt));
    }
  }
  function mkBase(W, H, sc, draw) {
    var c = document.createElement('canvas'); c.width = Math.round(W * sc); c.height = Math.round(H * sc);
    var g = c.getContext('2d'); g.scale(sc, sc); draw(g); return c;
  }
  function finishVG(b, base, sc) {
    var n = b.S.length, P = { W: b.W, H: b.H, n: n, sc: sc, base: base, amt: 0, clock: 0, kick: 0, dirty: false };
    ['x', 'y', 'a', 'l', 'ph', 'cx', 'cy', 'amp'].forEach(function (k) { P[k] = new Float32Array(n); });
    P.k = new Uint8Array(n); P.e = new Float32Array(n * 4); P.bl = [];
    var bk = {}, WS = [1.7, 2.7, 3.9];
    for (var i = 0; i < n; i++) {
      var s = b.S[i];
      P.x[i] = s[0]; P.y[i] = s[1]; P.a[i] = s[2]; P.l[i] = s[3]; P.k[i] = s[6]; P.ph[i] = s[7]; P.cx[i] = s[8]; P.cy[i] = s[9]; P.amp[i] = s[10];
      var key = s[11] + '_' + s[5] + '_' + s[4];
      if (!(key in bk)) { bk[key] = P.bl.length; P.bl.push({ c: b.pal[s[5]], w: WS[s[4]], idx: [] }); }
      P.bl[bk[key]].idx.push(i);
    }
    P.c = document.createElement('canvas'); P.c.width = Math.round(b.W * sc); P.c.height = Math.round(b.H * sc); P.g = P.c.getContext('2d');
    renderVG(P, null);
    return P;
  }
  function renderVG(P, mloc) {
    var g = P.g, A = P.amt + P.kick, clk = P.clock, E = P.e, MR = 56, MR2 = MR * MR;
    g.setTransform(P.sc, 0, 0, P.sc, 0, 0);
    g.drawImage(P.base, 0, 0, P.W, P.H);
    for (var i = 0; i < P.n; i++) {
      var x = P.x[i], y = P.y[i], an = P.a[i], ph = P.ph[i], k = P.k[i];
      if (A > 0.002) {
        if (k === 1) { var s1 = Math.sin(clk * 2.2 + ph) * A; x += Math.cos(an) * 4 * s1; y += Math.sin(an) * 4 * s1; an += 0.45 * Math.sin(clk * 1.6 + ph) * A; }
        else if (k === 3) { var sw = Math.sin(clk * 2.2 + y * 0.035 + x * 0.012) * A * P.amp[i]; x += sw; an += sw * 0.05; }
        else if (k === 4) { var rp = Math.sin(clk * 3 + x * 0.09 + ph * 0.3) * A; y += rp * 1.8; an += rp * 0.15; }
        else if (k === 5) { y += Math.sin(clk * 1.4 + P.cx[i]) * A * 5; x += Math.cos(clk * 0.9 + P.cx[i]) * A * 2; }
      }
      if (k === 2 && clk > 0) {
        var cx = P.cx[i], cy = P.cy[i], rot = clk * 1.1, dx = x - cx, dy = y - cy, cr = Math.cos(rot), sr = Math.sin(rot), pu = 1 + 0.1 * Math.sin(clk * 3 + ph) * A;
        x = cx + (dx * cr - dy * sr) * pu; y = cy + (dx * sr + dy * cr) * pu; an += rot;
      }
      if (mloc) {
        var mdx = x - mloc[0], mdy = y - mloc[1], md2 = mdx * mdx + mdy * mdy;
        if (md2 < MR2) { var md = Math.sqrt(md2) || 1, kk = 1 - md / MR; x += mdx / md * kk * 9; y += mdy / md * kk * 9; an += kk * 0.9; }
      }
      var hl = P.l[i] * 0.5, ca = Math.cos(an) * hl, sa = Math.sin(an) * hl, o = i * 4;
      E[o] = x - ca; E[o + 1] = y - sa; E[o + 2] = x + ca; E[o + 3] = y + sa;
    }
    g.lineCap = 'round';
    for (var b = 0; b < P.bl.length; b++) {
      var B = P.bl[b], L = B.idx; g.strokeStyle = B.c; g.lineWidth = B.w; g.beginPath();
      for (var j = 0; j < L.length; j++) { var q = L[j] * 4; g.moveTo(E[q], E[q + 1]); g.lineTo(E[q + 2], E[q + 3]); }
      g.stroke();
    }
  }

  function hillY(x) { return 200 - 16 * Math.sin(x * 0.021) - 9 * Math.sin(x * 0.053 + 1); }
  function vgBogaz(sc) {
    var W = 400, H = 300, pal = ['#16254a', '#2b4f8a', '#4d7fb5', '#9fc3dc', '#f3e6b3', '#f2d04a', '#e8a91e', '#141013', '#233327', '#3d6f7a'];
    var b = VG(W, H, pal, 11);
    var base = mkBase(W, H, sc, function (g) {
      var sk = g.createLinearGradient(0, 0, 0, 210); sk.addColorStop(0, '#1a2c55'); sk.addColorStop(1, '#2d548c'); g.fillStyle = sk; g.fillRect(0, 0, W, 210);
      g.fillStyle = '#18222a'; g.beginPath(); g.moveTo(0, H); for (var x = 0; x <= W; x += 8) g.lineTo(x, hillY(x)); g.lineTo(W, H); g.fill();
      g.fillStyle = '#1b2d4c'; g.fillRect(0, 208, W, H - 208);
    });
    var sky = vortex([[170, 92, 58, 1], [285, 72, 42, -1], [70, 62, 40, 1]], function (x, y) { return 0.18 * Math.sin(x * 0.02 + y * 0.03); });
    vfield(b, 5200, function (x, y) { return y < hillY(x) + 2; }, sky, function (x, y, R) { var r = R(); return r < 0.33 ? 1 : r < 0.58 ? 2 : r < 0.76 ? 0 : r < 0.9 ? 3 : 4; }, 7, 13, 1, 1);
    for (var i = 0; i < 420; i++) { var t = i / 420, an = t * 9.4, rr = 14 + t * 44; vs(b, 170 + Math.cos(an) * rr * 1.25, 92 + Math.sin(an) * rr * 0.75, an + 1.5708, 8 + b.R() * 5, 1, b.R() < 0.6 ? 3 : 4, 1); }
    b.L = 1;
    [[58, 38, 10], [122, 24, 7], [226, 36, 9], [328, 60, 8], [372, 118, 7], [36, 126, 7], [300, 140, 6], [150, 150, 6]].forEach(function (s) { vstar(b, s[0], s[1], s[2], 5, 6, 4); });
    vstar(b, 366, 30, 20, 6, 5, 4);
    b.L = 2;
    vfield(b, 1400, function (x, y) { return y >= hillY(x) && y < 210; }, function () { return 0.05; }, function (x, y, R) { return R() < 0.6 ? 7 : 8; }, 6, 11, 1, 0);
    for (var d = 0; d < 140; d++) { var th = Math.PI + b.R() * Math.PI, r2 = b.R() * 24; vs(b, 250 + Math.cos(th) * r2, 184 + Math.sin(th) * r2 * 0.95, th + 1.5708, 6, 1, 7, 0); }
    [[216, 128], [284, 128]].forEach(function (m) { for (var y = m[1]; y < 190; y += 3) vs(b, m[0] + (b.R() - 0.5) * 2, y, 1.5708, 5, 1, 7, 0); vs(b, m[0], m[1] - 4, 1.5708, 8, 0, 7, 0); });
    for (var w = 0; w < 14; w++) vs(b, 228 + b.R() * 46, 188 + b.R() * 12, 0, 3, 1, 5, 0);
    b.L = 3;
    vfield(b, 2600, function (x, y) { return y >= 210; }, function (x) { return 0.04 * Math.sin(x * 0.05); }, function (x, y, R) { var r = R(); return r < 0.45 ? 0 : r < 0.8 ? 1 : 9; }, 8, 14, 1, 4);
    [[366, 5, 6], [226, 5, 4], [250, 5, 4]].forEach(function (rf) { for (var i2 = 0; i2 < 40; i2++) { var yy = 214 + b.R() * 80; vs(b, rf[0] + (b.R() - 0.5) * (8 + (yy - 214) * 0.25), yy, 0, 5 + b.R() * 6, 1, b.R() < 0.6 ? rf[1] : rf[2], 4); } });
    b.L = 4;
    cypress(b, 40, 300, 60, 24, 7, 8);
    return finishVG(b, base, sc);
  }
  function vgAycicek(sc) {
    var W = 320, H = 400, pal = ['#e8c25a', '#d9a93a', '#b8862d', '#e8a91e', '#f2d04a', '#d9731f', '#6b4a1f', '#3b2a14', '#4f7a3a', '#8a9a3a', '#2f5597', '#f5e6b0'];
    var b = VG(W, H, pal, 22), VX = 160, VT = 238, VB = 336;
    function vaseHalf(y) { var t = (y - VT) / (VB - VT); return 30 + 22 * Math.sin(t * 2.6); }
    var base = mkBase(W, H, sc, function (g) {
      g.fillStyle = '#e2bb55'; g.fillRect(0, 0, W, 300); g.fillStyle = '#c8952f'; g.fillRect(0, 300, W, 100);
      g.fillStyle = '#d98a2a'; g.beginPath(); for (var y = VT; y <= VB; y += 4) g.lineTo(VX - vaseHalf(y), y); for (y = VB; y >= VT; y -= 4) g.lineTo(VX + vaseHalf(y), y); g.fill();
    });
    vfield(b, 3200, function (x, y) { return y < 300; }, function (x, y) { return ((Math.floor(x / 14) + Math.floor(y / 14)) % 2) ? 0.25 : 1.75; }, function (x, y, R) { return R() < 0.55 ? 0 : (R() < 0.7 ? 1 : 11); }, 7, 11, 1, 0);
    vfield(b, 1400, function (x, y) { return y >= 302; }, function (x) { return 0.1 * Math.sin(x * 0.04); }, function (x, y, R) { var r = R(); return r < 0.5 ? 2 : r < 0.8 ? 3 : 6; }, 8, 14, 1, 0);
    for (var x = 0; x < W; x += 4) vs(b, x, 300 + (b.R() - 0.5) * 2, 0, 7, 1, 10, 0);
    b.L = 1;
    vfield(b, 1500, function (x, y) { return y >= VT && y <= VB && Math.abs(x - VX) < vaseHalf(y); }, function (x) { return 1.5708 + (x - VX) * 0.012; }, function (x, y, R) { return Math.abs(x - VX) > vaseHalf(y) * 0.7 ? 5 : (R() < 0.5 ? 3 : 4); }, 7, 12, 1, 0);
    for (x = VX - 48; x < VX + 48; x += 3) vs(b, x, 272 + (b.R() - 0.5) * 3, 0, 5, 1, 10, 0);
    b.L = 2;
    var heads = [[108, 108, 34], [178, 84, 38], [236, 138, 30], [92, 188, 28], [162, 162, 32], [238, 214, 26], [128, 238, 22]];
    heads.forEach(function (h) {
      var sx = VX + (h[0] - VX) * 0.15, sy = VT + 4;
      for (var t = 0; t < 1; t += 0.06) vs(b, sx + (h[0] - sx) * t + Math.sin(t * 3) * 6, sy + (h[1] - sy) * t, Math.atan2(h[1] - sy, h[0] - sx), 9, 1, b.R() < 0.6 ? 8 : 9, 3, 0, 0, 1.5 + 2 * t);
    });
    b.L = 3;
    heads.forEach(function (h) {
      var n = Math.round(h[2] * 0.9);
      for (var i = 0; i < n; i++) { var th = i / n * 6.2832 + b.R() * 0.2, rr = h[2] * (0.62 + b.R() * 0.4); vs(b, h[0] + Math.cos(th) * rr, h[1] + Math.sin(th) * rr * 0.9, th, h[2] * 0.42, 2, b.R() < 0.4 ? 3 : (b.R() < 0.6 ? 4 : 5), 3, 0, 0, 3); }
      for (var j = 0; j < h[2] * 3; j++) { var a2 = b.R() * 6.2832, r3 = Math.sqrt(b.R()) * h[2] * 0.52; vs(b, h[0] + Math.cos(a2) * r3, h[1] + Math.sin(a2) * r3 * 0.9, a2 + 1.5708, 4, 1, b.R() < 0.5 ? 6 : (b.R() < 0.6 ? 7 : 5), 2, h[0], h[1]); }
    });
    return finishVG(b, base, sc);
  }
  function vgBugday(sc) {
    var W = 400, H = 300, pal = ['#e9c75a', '#d9a93a', '#b8862d', '#f2d04a', '#7fa6c9', '#a9c7dd', '#f5f1e6', '#1f3322', '#2f4d2b', '#4f7a3a', '#7f9a4a', '#cfe0ea', '#b23a2a'];
    var b = VG(W, H, pal, 33);
    function fieldY(x) { return 140 + 8 * Math.sin(x * 0.02); }
    var base = mkBase(W, H, sc, function (g) {
      g.fillStyle = '#8fb3cf'; g.fillRect(0, 0, W, 150); g.fillStyle = '#5f7f45'; g.fillRect(0, 110, W, 40);
      g.fillStyle = '#d9b24a'; g.beginPath(); g.moveTo(0, H); for (var x = 0; x <= W; x += 8) g.lineTo(x, fieldY(x)); g.lineTo(W, H); g.fill();
    });
    var sky = vortex([[120, 52, 38, 1], [270, 44, 44, -1], [360, 80, 26, 1]], function () { return 0.1; });
    vfield(b, 3600, function (x, y) { return y < 120; }, sky, function (x, y, R) { var r = R(); return r < 0.35 ? 4 : r < 0.65 ? 5 : r < 0.85 ? 11 : 6; }, 7, 12, 1, 1);
    vstar(b, 64, 38, 16, 3, 6, 0);
    b.L = 1;
    vfield(b, 900, function (x, y) { return y >= 108 && y < fieldY(x) + 2; }, function (x) { return 0.2 * Math.sin(x * 0.05); }, function (x, y, R) { return R() < 0.5 ? 9 : (R() < 0.5 ? 10 : 8); }, 6, 10, 1, 0);
    b.L = 2;
    vfield(b, 4800, function (x, y) { return y >= fieldY(x); }, function (x, y) { return -1.25 + 0.25 * Math.sin(x * 0.04 + y * 0.02); }, function (x, y, R) { var r = R(); return r < 0.38 ? 0 : r < 0.66 ? 1 : r < 0.86 ? 3 : 2; }, 9, 16, 1, 3, function (x, y) { return 2 + (y - 140) / 40; });
    for (var i = 0; i < 26; i++) vs(b, b.R() * W, 170 + b.R() * 120, b.R() * 6.28, 4, 2, 12, 3, 0, 0, 3);
    b.L = 3;
    cypress(b, 300, 262, 34, 22, 7, 8);
    return finishVG(b, base, sc);
  }
  function vgKahve(sc) {
    var W = 320, H = 400, pal = ['#16254a', '#2b4f8a', '#f2d04a', '#e8a91e', '#d9731f', '#f5e2a0', '#6b4a1f', '#3b2a14', '#4f7a3a', '#b8862d', '#9fc3dc', '#1b1410', '#f5f1e6', '#7a5a9e'];
    var b = VG(W, H, pal, 44);
    var base = mkBase(W, H, sc, function (g) {
      g.fillStyle = '#1e3561'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8b23a'; g.beginPath(); g.moveTo(0, 60); g.lineTo(170, 90); g.lineTo(170, 270); g.lineTo(0, 320); g.fill();
      g.fillStyle = '#18233a'; g.fillRect(232, 0, 88, 330);
      g.fillStyle = '#b07a3a'; g.beginPath(); g.moveTo(0, 320); g.lineTo(170, 270); g.lineTo(320, 300); g.lineTo(320, 400); g.lineTo(0, 400); g.fill();
    });
    var sky = vortex([[200, 60, 40, 1]], function () { return 0.3; });
    vfield(b, 1700, function (x, y) { return y < 250 && x > 168 && x < 234; }, sky, function (x, y, R) { return R() < 0.5 ? 1 : (R() < 0.6 ? 0 : 10); }, 6, 11, 1, 1);
    [[196, 34, 8], [214, 92, 7], [186, 140, 6], [222, 190, 6]].forEach(function (s) { vstar(b, s[0], s[1], s[2], 12, 2, 5); });
    b.L = 1;
    vfield(b, 1300, function (x, y) { return x > 232 && y < 330; }, function (x, y) { return 1.5708 + 0.1 * Math.sin(y * 0.1); }, function (x, y, R) { return R() < 0.6 ? 0 : (R() < 0.6 ? 11 : 13); }, 7, 12, 1, 0);
    for (var w = 0; w < 10; w++) { var wx = 246 + (w % 3) * 22, wy = 40 + Math.floor(w / 3) * 70; for (var k = 0; k < 7; k++) vs(b, wx + b.R() * 12, wy + b.R() * 20, 1.5708, 5, 1, b.R() < 0.6 ? 2 : 3, 0); }
    vfield(b, 1500, function (x, y) { var top = 60 + x * 30 / 170; return x < 170 && y >= top && y < top + 50; }, function () { return 0.18; }, function (x, y, R) { return R() < 0.5 ? 2 : (R() < 0.6 ? 3 : 5); }, 8, 14, 2, 1);
    vfield(b, 1400, function (x, y) { var top = 110 + x * 30 / 170, bot = 320 - x * 50 / 170; return x < 170 && y >= top && y < bot; }, function (x) { return 1.5708 + (x - 85) * 0.004; }, function (x, y, R) { var r = R(); return r < 0.4 ? 3 : r < 0.7 ? 4 : r < 0.85 ? 2 : 6; }, 7, 12, 1, 1);
    vstar(b, 150, 118, 18, 12, 5, 2);
    b.L = 2;
    vfield(b, 1600, function (x, y) { var yl = 320 - x * 50 / 170; return y > yl && y < 330 + x * 0.1 && x < 250; }, function () { return 0.1; }, function (x, y, R) { var r = R(); return r < 0.45 ? 3 : r < 0.75 ? 9 : 5; }, 6, 10, 1, 0);
    [[60, 300], [120, 288], [180, 296], [95, 322]].forEach(function (t) {
      for (var i = 0; i < 18; i++) { var a = b.R() * 6.28; vs(b, t[0] + Math.cos(a) * 12, t[1] + Math.sin(a) * 4, a + 1.57, 5, 1, 12, 0); }
      for (var j = 0; j < 4; j++) vs(b, t[0] - 16 + j * 10, t[1] + 12, 1.5708, 12, 1, 7, 3, 0, 0, 1);
    });
    b.L = 3;
    for (var c = 0; c < 900; c++) { var cx = b.R() * W, cy = 330 + b.R() * 70, pr = (cy - 320) / 80; vs(b, cx, cy, (b.R() - 0.5) * 0.6, 5 + pr * 6, 2, b.R() < 0.3 ? 9 : (b.R() < 0.5 ? 1 : (b.R() < 0.7 ? 6 : 10)), 0); }
    [[40, 250], [205, 300], [150, 250]].forEach(function (p) { for (var i = 0; i < 20; i++) vs(b, p[0] + (b.R() - 0.5) * 8, p[1] + b.R() * 30, 1.5708, 7, 2, i < 4 ? 6 : 11, 3, 0, 0, 1.2); });
    return finishVG(b, base, sc);
  }
  function vgBadem(sc) {
    var W = 400, H = 300, pal = ['#7fb3b0', '#9cc9c3', '#5f9c9a', '#b9dcd4', '#4a3a2a', '#2f261c', '#f5f1e6', '#f0d9d3', '#e7b7b0', '#9a4a3a'];
    var b = VG(W, H, pal, 55);
    var base = mkBase(W, H, sc, function (g) { g.fillStyle = '#86b9b4'; g.fillRect(0, 0, W, H); });
    vfield(b, 3400, function () { return true; }, function (x, y) { return 0.8 * Math.sin(x * 0.03) + 0.6 * Math.cos(y * 0.04); }, function (x, y, R) { var r = R(); return r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.85 ? 2 : 3; }, 8, 13, 2, 1);
    b.L = 1;
    var tips = [];
    function branch(x, y, a, len, th, depth) {
      var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, steps = Math.ceil(len / 4);
      for (var i = 0; i < steps; i++) { var t = i / steps; vs(b, x + (ex - x) * t, y + (ey - y) * t + Math.sin(t * 3) * 3, a, 7, th > 2 ? 2 : (th > 1 ? 1 : 0), b.R() < 0.6 ? 4 : 5, 3, 0, 0, 0.6 + (5 - depth) * 0.4); }
      if (depth <= 0 || len < 12) { tips.push([ex, ey]); return; }
      var n = 2 + (b.R() < 0.4 ? 1 : 0);
      for (var j = 0; j < n; j++) branch(ex, ey, a + (b.R() - 0.5) * 1.3, len * (0.62 + b.R() * 0.2), th * 0.7, depth - 1);
      if (depth < 3) tips.push([ex, ey]);
    }
    branch(-10, 280, -0.75, 95, 3.5, 5); branch(410, 230, -2.5, 80, 3.2, 5); branch(150, 310, -1.35, 70, 3, 4);
    b.L = 2;
    tips.forEach(function (t) {
      var cn = 1 + Math.floor(b.R() * 3);
      for (var c = 0; c < cn; c++) {
        var fx = t[0] + (b.R() - 0.5) * 18, fy = t[1] + (b.R() - 0.5) * 18, col = b.R() < 0.7 ? 6 : 7;
        for (var pI = 0; pI < 5; pI++) { var pa = pI / 5 * 6.2832 + b.R() * 0.3; vs(b, fx + Math.cos(pa) * 4, fy + Math.sin(pa) * 4, pa, 6, 2, b.R() < 0.2 ? 8 : col, 3, 0, 0, 2.5); }
        vs(b, fx, fy, 0, 2, 1, 9, 3, 0, 0, 2.5);
      }
    });
    return finishVG(b, base, sc);
  }
  function vgZeytin(sc) {
    var W = 400, H = 300, pal = ['#e9d36a', '#d8c44f', '#c9b85a', '#f2e6a0', '#8a9a6a', '#a8b88a', '#5f7050', '#8a6fb0', '#b58aa6', '#c98a4a', '#7a5a3a', '#f5f1e6', '#e8a91e'];
    var b = VG(W, H, pal, 66);
    var base = mkBase(W, H, sc, function (g) { g.fillStyle = '#dccb62'; g.fillRect(0, 0, W, 112); g.fillStyle = '#b08a6a'; g.fillRect(0, 112, W, H - 112); });
    var sky = vortex([[180, 50, 40, -1], [80, 40, 30, 1]], function () { return 0.1; });
    vfield(b, 2800, function (x, y) { return y < 114; }, sky, function (x, y, R) { var r = R(); return r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : 3; }, 7, 12, 1, 1);
    vstar(b, 310, 48, 24, 11, 12, 0);
    b.L = 1;
    vfield(b, 3800, function (x, y) { return y >= 112; }, function (x, y) { return 0.35 * Math.sin(x * 0.03 + y * 0.05); }, function (x, y, R) { var band = Math.sin(y * 0.09 + x * 0.015); return band > 0.4 ? (R() < 0.6 ? 7 : 8) : band > -0.3 ? (R() < 0.6 ? 9 : 2) : (R() < 0.5 ? 10 : 8); }, 8, 14, 1, 1);
    b.L = 2;
    [[70, 250, 34], [170, 238, 38], [262, 252, 32], [352, 242, 30]].forEach(function (tr) {
      var tx = tr[0], ty = tr[1], cr = tr[2];
      for (var i = 0; i < 40; i++) { var t = i / 40; vs(b, tx + Math.sin(t * 7 + tx) * 6, ty - t * 70, -1.5708 + Math.cos(t * 7 + tx) * 0.5, 7, 2, b.R() < 0.6 ? 10 : 6, 3, 0, 0, 0.5 + t); }
      for (var j = 0; j < 260; j++) { var a = b.R() * 6.2832, r = Math.sqrt(b.R()) * cr; vs(b, tx + Math.cos(a) * r * 1.3, ty - 80 + Math.sin(a) * r * 0.75, a + 1.5708 + (b.R() - 0.5), 6 + b.R() * 4, 1, b.R() < 0.35 ? 4 : (b.R() < 0.6 ? 5 : 6), 3, 0, 0, 2.5); }
    });
    return finishVG(b, base, sc);
  }
  function vgSusen(sc) {
    var W = 400, H = 300, pal = ['#4f7a3a', '#6f9a4a', '#2f5a2e', '#8fb86a', '#5a4a9e', '#7a5fbf', '#3f3a8a', '#f5f1e6', '#d9731f', '#e8a91e', '#b8862d', '#c9a36a'];
    var b = VG(W, H, pal, 77);
    function soil(x, y) { return x < 150 && y > 230 + (x / 150) * 70; }
    var base = mkBase(W, H, sc, function (g) { g.fillStyle = '#d8902a'; g.fillRect(0, 0, W, 60); g.fillStyle = '#4c7038'; g.fillRect(0, 60, W, H - 60); g.fillStyle = '#b8862d'; g.beginPath(); g.moveTo(0, 230); g.lineTo(150, 300); g.lineTo(0, 300); g.fill(); });
    vfield(b, 1500, function (x, y) { return y < 62; }, function (x, y) { return Math.sin(x * 0.2 + y * 0.3) * 1.2; }, function (x, y, R) { var r = R(); return r < 0.4 ? 8 : r < 0.75 ? 9 : 10; }, 5, 8, 2, 3, 1.5);
    b.L = 1;
    vfield(b, 4200, function (x, y) { return y >= 58 && !soil(x, y); }, function (x) { return -1.5708 + 0.5 * Math.sin(x * 0.07); }, function (x, y, R) { var r = R(); return r < 0.3 ? 0 : r < 0.55 ? 1 : r < 0.8 ? 2 : 3; }, 14, 24, 1, 3, function (x, y) { return 1 + (300 - y) / 70; });
    vfield(b, 700, function (x, y) { return soil(x, y); }, function () { return 0.2; }, function (x, y, R) { return R() < 0.5 ? 10 : 11; }, 7, 12, 1, 0);
    b.L = 2;
    for (var i = 0; i < 36; i++) {
      var cx = 10 + b.R() * 380, cy = 72 + b.R() * 160, white = i === 0;
      if (white) { cx = 318; cy = 118; }
      if (soil(cx, cy)) continue;
      for (var j = 0; j < 16; j++) { var a = b.R() * 6.2832, r = Math.sqrt(b.R()) * 9; vs(b, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, 6, 2, white ? (j < 13 ? 7 : 9) : (b.R() < 0.4 ? 4 : (b.R() < 0.6 ? 5 : 6)), 3, 0, 0, 3.5); }
    }
    return finishVG(b, base, sc);
  }
  function vgKapadokya(sc) {
    var W = 400, H = 300, pal = ['#16254a', '#2b4f8a', '#4d7fb5', '#9fc3dc', '#f3e6b3', '#f2d04a', '#e8a91e', '#d6a36a', '#b8784a', '#8a5a36', '#4a3222', '#b23a2a', '#f5f1e6'];
    var b = VG(W, H, pal, 88);
    var base = mkBase(W, H, sc, function (g) { g.fillStyle = '#23407a'; g.fillRect(0, 0, W, 190); g.fillStyle = '#a8703f'; g.fillRect(0, 170, W, 130); });
    var sky = vortex([[120, 70, 50, -1], [300, 90, 46, 1]], function (x) { return 0.15 * Math.sin(x * 0.02); });
    vfield(b, 4600, function (x, y) { return y < 190; }, sky, function (x, y, R) { var r = R(); return r < 0.3 ? 1 : r < 0.55 ? 2 : r < 0.75 ? 0 : r < 0.9 ? 3 : 4; }, 7, 13, 1, 1);
    [[40, 30, 8], [200, 26, 9], [350, 28, 7], [250, 140, 6], [30, 140, 6]].forEach(function (s) { vstar(b, s[0], s[1], s[2], 5, 4, 6); });
    vstar(b, 180, 110, 16, 6, 5, 4);
    b.L = 1;
    [[48, 300, 150, 40], [120, 300, 175, 34], [200, 300, 140, 44], [282, 300, 168, 36], [360, 300, 150, 42]].forEach(function (c) {
      var cx = c[0], by = c[1], top = c[2], hw = c[3];
      for (var i = 0; i < 700; i++) { var y = top + 10 + b.R() * (by - top - 10), t = (y - top) / (by - top), half = hw * (0.1 + 0.9 * Math.pow(t, 1.5)), x = cx + (b.R() - 0.5) * 2 * half; vs(b, x, y, -1.5708 + (x - cx) / (half + 1) * 0.35, 7 + b.R() * 5, 1, (x - cx) > half * 0.3 ? 9 : (b.R() < 0.55 ? 7 : 8), 0); }
      for (var j = 0; j < 90; j++) { var a = Math.PI + b.R() * Math.PI, r = Math.sqrt(b.R()) * hw * 0.5; vs(b, cx + Math.cos(a) * r * 1.25, top + 12 + Math.sin(a) * r * 0.85, a + 1.5708, 6, 1, b.R() < 0.6 ? 10 : 9, 0); }
      for (var j2 = 0; j2 < 14; j2++) vs(b, cx - hw * 0.62 + j2 * hw * 0.09, top + 12, 0, 6, 1, 10, 0);
      for (var d = 0; d < 3; d++) vs(b, cx + (b.R() - 0.5) * hw * 0.5, top + 60 + b.R() * 60, 1.5708, 5, 2, 10, 0);
    });
    b.L = 2;
    vfield(b, 1200, function (x, y) { return y > 280; }, function () { return 0.05; }, function (x, y, R) { return R() < 0.5 ? 8 : (R() < 0.5 ? 7 : 9); }, 7, 12, 1, 0);
    b.L = 3;
    [[96, 70, 13, 11, 6], [252, 50, 15, 5, 12], [330, 116, 10, 6, 11]].forEach(function (bl, id) {
      var cx = bl[0], cy = bl[1], r = bl[2];
      for (var i = 0; i < 90; i++) { var a = b.R() * 6.2832, rr = Math.sqrt(b.R()) * r, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 1.1, stripe = Math.floor((x - cx + r) / (r * 0.5)) % 2; vs(b, x, y, 1.5708 + (x - cx) / r * 0.4, 5, 1, stripe ? bl[3] : bl[4], 5, id * 1.9, 0); }
      for (var j = 0; j < 6; j++) vs(b, cx + (b.R() - 0.5) * 6, cy + r * 1.2 + 6 + b.R() * 3, 0, 4, 1, 10, 5, id * 1.9, 0);
      vs(b, cx - r * 0.6, cy + r, 1.1, r * 0.7, 0, 10, 5, id * 1.9, 0); vs(b, cx + r * 0.6, cy + r, 2.0, r * 0.7, 0, 10, 5, id * 1.9, 0);
    });
    return finishVG(b, base, sc);
  }
  var VGS = [
    { t: 'Yıldızlı Boğaz', d: 'Gece, Boğaz’ın üstünde döner. Yıldızlar sessizce yanar.', f: vgBogaz },
    { t: 'Ayçiçekleri', d: 'Bir vazo dolusu güneş. Her taç ışığa döner.', f: vgAycicek },
    { t: 'Buğday ve Servi', d: 'Rüzgâr tarlada dalga olur. Servi göğe uzanır.', f: vgBugday },
    { t: 'Gece Kahvesi', d: 'Lambanın altında sıcak bir köşe. Üstünde yıldızlar.', f: vgKahve },
    { t: 'Badem Çiçekleri', d: 'Yeni bir başlangıç. Dallar ilkbahara açılır.', f: vgBadem },
    { t: 'Zeytinlik', d: 'Yaşlı ağaçlar, altın bir güneş. Toprak kıvrılır.', f: vgZeytin },
    { t: 'Süsenler', d: 'Mor çiçekler rüzgârda eğilir. Aralarında tek bir beyaz.', f: vgSusen },
    { t: 'Kapadokya’da Gece', d: 'Peri bacaları, uçan balonlar. Gökyüzü akar.', f: vgKapadokya }
  ];

  var GAL = null, DUST = [], arHover = -1, arDt = 0.016, arLastT = 0, arCapIdx = -2;
  var arCap = document.getElementById('arCap'), arNo = document.getElementById('arNo'), arT = document.getElementById('arT'), arD = document.getElementById('arD');
  var arNavs = document.getElementById('arNavs'), arNavUp = document.getElementById('arNavUp'), arNavDown = document.getElementById('arNavDown');
  function scrollArtTo(k) {
    k = Math.max(0, Math.min(9, k));
    var rect = arEl.getBoundingClientRect(), stH = (arEl.firstElementChild && arEl.firstElementChild.clientHeight) || window.innerHeight;
    var total = arEl.offsetHeight - stH, target = k * 0.66 / 9;
    window.scrollTo({ top: window.scrollY + rect.top + target * total, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  arNavUp.addEventListener('click', function () { scrollArtTo(Math.round(clamp01(arSP / 0.66) * 9) - 1); });
  arNavDown.addEventListener('click', function () { scrollArtTo(Math.round(clamp01(arSP / 0.66) * 9) + 1); });
  function buildGallery() {
    var R = artRnd(42), sc = 1.8;
    var LAND = [true, false, true, false, true, true, true, true];
    GAL = VGS.map(function (v, i) {
      var side = i % 2 === 0 ? 1 : -1, land = LAND[i];
      return { P: null, f: v.f, sc: sc, t: v.t, d: v.d, n: i + 1, side: side, x: side * 1.55, y: (R() - 0.5) * 0.24, z: 4 + i * 4.6, r: (R() - 0.5) * 0.06, h: land ? 1.3 : 1.5, w: land ? 1.3 * 400 / 300 : 1.5 * 320 / 400 };
    });
    for (var d = 0; d < 300; d++) DUST.push({ x: (R() - 0.5) * 10, y: (R() - 0.5) * 6, z: R() * 44 });
  }
  function buildNextPainting() {
    if (!GAL) buildGallery();
    for (var i = 0; i < GAL.length; i++) if (!GAL[i].P) { GAL[i].P = GAL[i].f(GAL[i].sc); return true; }
    return false;
  }
  (function idleBuild() {
    var step = function () { if (buildNextPainting()) setTimeout(step, 60); };
    window.addEventListener('load', function () { setTimeout(step, 1200); });
  })();
  function navBottom() { var nb = document.querySelector('.bar'); return nb ? nb.getBoundingClientRect().bottom : 90; }
  function fitBox() {
    var mob = arW < 900 && arH >= 521;
    var top = navBottom() + 14, bot = arH - (mob ? 196 : 30), x0 = 44, x1 = arW - 44, col = 0;
    if (mob) { x0 = 14; x1 = arW - 30; }
    else {
      var capW = Math.min(360, arW * 0.30), capL = Math.max(20, Math.min(96, arW * 0.06));
      col = capL + capW + 32;
    }
    return { x0: x0, x1: x1, top: top, bot: bot, col: col };
  }
  function stopFor(fr) {
    var F = arH * 0.95, b = fitBox(), x0 = b.x0, x1 = b.x1;
    if (b.col) { if (fr.side === 1) x0 = b.col; else x1 = arW - b.col; }
    var rw = Math.max(160, x1 - x0), rh = Math.max(140, b.bot - b.top);
    var fpx = Math.min(rw / (fr.w + 0.1 * fr.h), (rh - 6) / (1.2 * fr.h));
    var hp = fr.h * fpx, totalH = 1.2 * hp;
    var cxT = (x0 + x1) / 2, cyT = b.top + (rh - totalH) / 2 + 0.55 * hp;
    return { z: fr.z - F / fpx, x: fr.x - (cxT - arW / 2) / fpx, y: fr.y - (cyT - arH / 2) / fpx };
  }

  function drawGallery(p, a1) {
    if (!GAL) buildGallery();
    var F = arH * 0.95, n = GAL.length;
    var stops = [{ z: GAL[0].z - 12, x: 0, y: 0 }].concat(GAL.map(stopFor)).concat([{ z: GAL[n - 1].z + 3, x: 0, y: 0 }]);
    var gp = clamp01(p / 0.66) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(gp)), fr = gp - k, e = smooth(clamp01((fr - 0.26) / 0.48));
    var camZ = lerp(stops[k].z, stops[k + 1].z, e), camX = lerp(stops[k].x, stops[k + 1].x, e) + (mouse.active ? mouse.nx * 0.03 : 0), camY = lerp(stops[k].y, stops[k + 1].y, e);
    var ni = Math.round(gp), dw = 1 - smooth(clamp01((Math.abs(gp - ni) - 0.2) / 0.12)), cur = (ni >= 1 && ni <= n) ? ni - 1 : -1;

    ag.save(); ag.globalAlpha = a1;
    for (var i = 0; i < DUST.length; i++) {
      var du = DUST[i], dz = ((du.z - camZ) % 44 + 44) % 44 + 0.3, f0 = F / dz, sz = Math.max(0.6, f0 * 0.01);
      ag.fillStyle = 'rgba(244,230,200,' + (0.5 * clamp01((44 - dz) / 14)).toFixed(3) + ')';
      ag.fillRect(arW / 2 + (du.x - camX) * f0, arH / 2 + (du.y - camY) * f0, sz, sz);
    }
    ag.restore();

    var list = [], built = false;
    GAL.forEach(function (g, idx) {
      var dz = g.z - camZ; if (dz <= 0.25) return;
      if (!g.P) { if (built || dz > 30) return; g.P = g.f(g.sc); built = true; }
      var f = F / dz, al = a1 * clamp01((30 - dz) / 8) * clamp01((dz - 0.25) / 0.9);
      if (cur >= 0 && idx !== cur) al *= 1 - 0.88 * dw;
      if (al <= 0.01) return;
      var cx = arW / 2 + (g.x - camX) * f, cy = arH / 2 + (g.y - camY) * f, wp = g.w * f, hp = g.h * f;
      if (cx + wp < -50 || cx - wp > arW + 50) return;
      list.push({ g: g, i: idx, dz: dz, f: f, cx: cx, cy: cy, wp: wp, hp: hp, al: al });
    });
    list.sort(function (a, b) { return a.dz - b.dz; });
    arLastList = list.map(function (o) { return { i: o.i, cx: o.cx, cy: o.cy, wp: o.wp, hp: o.hp, al: o.al }; });
    var hov = -1, hu = 0, hv = 0;
    if (mouse.active) {
      var my = mouse.y - arTop, mxl = mouse.x - arLeft;
      for (var h = 0; h < list.length; h++) {
        var o = list[h]; if (o.al < 0.5) continue;
        var dx = mxl - o.cx, dy = my - o.cy, cr = Math.cos(o.g.r), sr = Math.sin(o.g.r);
        var u = (dx * cr + dy * sr) / o.wp + 0.5, v = (-dx * sr + dy * cr) / o.hp + 0.5;
        if (u >= -0.05 && u <= 1.05 && v >= -0.05 && v <= 1.05) { hov = o.i; hu = Math.max(0, Math.min(1, u)); hv = Math.max(0, Math.min(1, v)); break; }
      }
    }
    arHover = hov;
    arC.style.cursor = hov >= 0 ? 'pointer' : 'crosshair';

    list.forEach(function (o) {
      var P = o.g.P, target = o.i === hov ? 1 : (o.i === cur && !reduceMotion ? 0.22 * dw : 0);
      P.amt += (target - P.amt) * 0.07; P.kick *= 0.94;
      var A = P.amt + P.kick;
      if (A > 0.004 || o.i === hov) { P.clock += arDt * A; renderVG(P, o.i === hov ? [hu * P.W, hv * P.H] : null); P.dirty = true; }
      else if (P.dirty) { renderVG(P, null); P.dirty = false; }
    });

    for (var d2 = list.length - 1; d2 >= 0; d2--) {
      var q = list[d2], g = q.g, wp = q.wp, hp = q.hp, fw = hp * 0.05;
      ag.save(); ag.globalAlpha = q.al; ag.translate(q.cx, q.cy); ag.rotate(g.r);
      var gl = ag.createRadialGradient(0, 0, hp * 0.2, 0, 0, hp * 1.1);
      gl.addColorStop(0, 'rgba(236,196,110,' + (q.i === hov ? 0.26 : 0.14) + ')'); gl.addColorStop(1, 'rgba(236,196,110,0)');
      ag.fillStyle = gl; ag.fillRect(-hp * 1.1 - wp * 0.2, -hp * 1.1, hp * 2.2 + wp * 0.4, hp * 2.2);
      var fg = ag.createLinearGradient(-wp / 2, -hp / 2, wp / 2, hp / 2);
      fg.addColorStop(0, '#e4c173'); fg.addColorStop(0.5, '#8d6a27'); fg.addColorStop(1, '#efcf85');
      ag.fillStyle = fg; ag.fillRect(-wp / 2 - fw, -hp / 2 - fw, wp + 2 * fw, hp + 2 * fw);
      ag.drawImage(g.P.c, -wp / 2, -hp / 2, wp, hp);
      if (hp > 110) {
        ag.font = '500 ' + Math.round(Math.min(18, hp * 0.04)) + 'px Montserrat, system-ui, sans-serif';
        ag.fillStyle = 'rgba(244,241,236,0.75)'; ag.textAlign = 'left'; ag.textBaseline = 'top';
        ag.fillText('No. ' + g.n + '  ·  ' + g.t, -wp / 2 - fw, hp / 2 + fw * 1.8);
      }
      ag.restore();
    }

    var capA = (cur >= 0 ? dw : 0) * a1;
    if (cur !== arCapIdx && cur >= 0) {
      arCapIdx = cur; var G = GAL[cur];
      arNo.textContent = 'No. ' + G.n + ' / ' + n; arT.textContent = G.t; arD.textContent = G.d;
      arCap.className = 'ar-cap ' + (G.side === 1 ? 'l' : 'r');
    }
    arCap.style.opacity = String(capA);
  }

  /* ---- Yeni tuval: gün batımında ağaç ---- */
  var compW = 480, compH = 300, PW = 4.8, PH = 3.0, HOR = 192;
  var SUN = { x: 318, y: 112, r: 40 }, TREE = { x: 118, y: 104, r: 62 };
  function makeComp() {
    var c = document.createElement('canvas'); c.width = compW; c.height = compH;
    var g = c.getContext('2d'), R = artRnd(99), i;
    var sky = g.createLinearGradient(0, 0, 0, HOR);
    sky.addColorStop(0, '#141011'); sky.addColorStop(0.5, '#3a2219'); sky.addColorStop(0.85, '#a8582a'); sky.addColorStop(1, '#e39a45');
    g.fillStyle = sky; g.fillRect(0, 0, compW, HOR);
    var sg = g.createRadialGradient(SUN.x, SUN.y, 0, SUN.x, SUN.y, SUN.r * 3);
    sg.addColorStop(0, 'rgba(255,244,214,1)'); sg.addColorStop(0.3, 'rgba(248,212,130,0.95)'); sg.addColorStop(0.55, 'rgba(232,150,70,0.45)'); sg.addColorStop(1, 'rgba(232,150,70,0)');
    g.fillStyle = sg; g.fillRect(0, 0, compW, HOR);
    g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(SUN.x, SUN.y, SUN.r, 0, 6.2832); g.fill();
    for (i = 0; i < 60; i++) { g.fillStyle = 'rgba(244,230,200,' + (0.4 + R() * 0.6) + ')'; g.fillRect(R() * compW, R() * HOR * 0.45, 2, 2); }
    var sea = g.createLinearGradient(0, HOR, 0, compH); sea.addColorStop(0, '#3b2419'); sea.addColorStop(1, '#0e0b0c');
    g.fillStyle = sea; g.fillRect(0, HOR, compW, compH - HOR);
    for (i = 0; i < 46; i++) {
      var w = (1 - i / 46) * 150 * (0.6 + R() * 0.6);
      g.fillStyle = 'rgba(248,206,120,' + (0.75 * (1 - i / 46)).toFixed(3) + ')';
      g.fillRect(SUN.x - w / 2 + (R() - 0.5) * 20, HOR + 3 + i * 2.3, w, 1.6);
    }
    g.strokeStyle = '#1a1210'; g.lineCap = 'round';
    g.lineWidth = 12; g.beginPath(); g.moveTo(TREE.x, HOR + 4); g.lineTo(TREE.x + 2, TREE.y + 30); g.stroke();
    g.lineWidth = 5;
    [[-40, 0], [38, -6], [-6, -40]].forEach(function (b) { g.beginPath(); g.moveTo(TREE.x + 1, TREE.y + 40); g.lineTo(TREE.x + b[0], TREE.y + b[1]); g.stroke(); });
    for (i = 0; i < 70; i++) {
      var a = R() * 6.2832, rr = Math.sqrt(R()) * TREE.r;
      g.fillStyle = 'rgba(28,20,17,0.92)'; g.beginPath(); g.arc(TREE.x + Math.cos(a) * rr, TREE.y + Math.sin(a) * rr * 0.8, 10 + R() * 14, 0, 6.2832); g.fill();
    }
    for (i = 0; i < 140; i++) {
      var a2 = 0.04 + (R() - 0.5) * 2.4, r2 = TREE.r * (0.72 + R() * 0.32);
      g.fillStyle = R() < 0.7 ? 'rgba(236,196,110,0.85)' : 'rgba(255,240,208,0.8)';
      g.beginPath(); g.arc(TREE.x + Math.cos(a2) * r2, TREE.y + Math.sin(a2) * r2 * 0.8, 1.5 + R() * 2.5, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 0.35; g.fillStyle = '#120d0c';
    for (i = 0; i < 22; i++) g.fillRect(TREE.x - 34 + (R() - 0.5) * 30, HOR + 4 + i * 3, 60 - i * 2, 2);
    g.globalAlpha = 1;
    return c;
  }
  function flowAngle(x, y) {
    var dx, dy, d;
    if (y > HOR) return Math.sin(x * 0.05 + y * 0.2) * 0.12;
    dx = x - TREE.x; dy = y - TREE.y; d = Math.hypot(dx, dy * 1.2);
    if (d < TREE.r * 1.05) return Math.atan2(dy, dx);
    if (Math.abs(x - TREE.x) < 12 && y > TREE.y) return -Math.PI / 2 + (x - TREE.x) * 0.02;
    dx = x - SUN.x; dy = y - SUN.y; d = Math.hypot(dx, dy);
    if (d < SUN.r * 0.9) return Math.atan2(dy, dx);
    return Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(d * 0.045) * 0.5;
  }

  var comp = null, AN = 0, aR, aA, aY, aSp, aTx, aTy, aTh, aSt, aOx, aOy, aVx, aVy, e0x, e0y, e1x, e1y, buckets = [], bucketCol = [];
  function buildArt() {
    comp = makeComp();
    var data = comp.getContext('2d').getImageData(0, 0, compW, compH).data;
    AN = window.innerWidth < 700 ? 2800 : 5200;
    aR = new Float32Array(AN); aA = new Float32Array(AN); aY = new Float32Array(AN); aSp = new Float32Array(AN);
    aTx = new Float32Array(AN); aTy = new Float32Array(AN); aTh = new Float32Array(AN); aSt = new Float32Array(AN);
    aOx = new Float32Array(AN); aOy = new Float32Array(AN); aVx = new Float32Array(AN); aVy = new Float32Array(AN);
    e0x = new Float32Array(AN); e0y = new Float32Array(AN); e1x = new Float32Array(AN); e1y = new Float32Array(AN);
    buckets = []; bucketCol = [];
    var keyMap = {}, R = artRnd(7);
    function q(v) { return Math.min(255, Math.round(v / 26) * 26); }
    for (var i = 0; i < AN; i++) {
      var x = R() * compW, y = R() * compH, o = ((y | 0) * compW + (x | 0)) * 4;
      var key = q(data[o]) + ',' + q(data[o + 1]) + ',' + q(data[o + 2]);
      if (!(key in keyMap)) { keyMap[key] = buckets.length; buckets.push([]); bucketCol.push('rgb(' + key + ')'); }
      buckets[keyMap[key]].push(i);
      aTx[i] = (x / compW - 0.5) * PW; aTy[i] = (0.5 - y / compH) * PH; aTh[i] = flowAngle(x, y) + (R() - 0.5) * 0.35;
      aR[i] = 0.3 + R() * 1.9; aA[i] = R() * 6.2832; aY[i] = (R() - 0.5) * 2.4;
      aSp[i] = (0.35 + R() * 0.5) * (1.3 / (aR[i] + 0.35)); aSt[i] = R();
    }
  }

  function drawStrokes(p, now, t) {
    var appear = smooth(clamp01((p - 0.64) / 0.07));
    if (appear <= 0.01) return;
    var sb = (p - 0.76) / 0.13, fin = smooth(clamp01(sb));
    var mob = arW < 760;
    var shortV = arH < 521, fitTop = navBottom() + 14, fitBot = arH - (shortV ? 104 : (mob ? 214 : 222)), availH = Math.max(120, fitBot - fitTop);
    var s = Math.min(arW * (mob ? 0.9 : 0.74) / (PW * 1.06), availH / (PH * 1.12));
    var cy = fitTop + availH / 2;
    var c = cam3((1 - fin) * (0.5 + (mouse.active ? mouse.nx * 0.3 : 0)), (1 - fin) * 0.32, arW / 2, cy, s, 7);
    var spin = (reduceMotion ? 0 : t * 0.35) + p * 9;
    var half = 0.045, ex = 1 + (1 - appear) * 2.6;

    var up = smooth(clamp01((p - 0.9) / 0.05));
    if (up > 0.01) {
      var u0 = pr3(c, -PW / 2, PH / 2, 0), u1 = pr3(c, PW / 2, -PH / 2, 0);
      ag.globalAlpha = up * 0.8; ag.drawImage(comp, u0[0], u0[1], u1[0] - u0[0], u1[1] - u0[1]); ag.globalAlpha = 1;
    }

    var mx = mouse.x - arLeft, my = mouse.y - arTop, RR = 95, R2 = RR * RR;
    for (var i = 0; i < AN; i++) {
      var m = smooth(clamp01(sb * 1.5 - aSt[i] * 0.5));
      var ang = aA[i] + spin * aSp[i];
      var vx0 = Math.cos(ang) * aR[i] * ex, vz0 = Math.sin(ang) * aR[i] * ex, vy0 = aY[i] * ex;
      var X = vx0 + (aTx[i] - vx0) * m, Y = vy0 + (aTy[i] - vy0) * m, Z = vz0 * (1 - m);
      var TX = -Math.sin(ang) * (1 - m) + Math.cos(aTh[i]) * m, TY = -Math.sin(aTh[i]) * m, TZ = Math.cos(ang) * (1 - m);
      var tl = Math.sqrt(TX * TX + TY * TY + TZ * TZ) || 1;
      TX = TX / tl * half; TY = TY / tl * half; TZ = TZ / tl * half;
      var P0 = pr3(c, X - TX, Y - TY, Z - TZ), P1 = pr3(c, X + TX, Y + TY, Z + TZ);
      var qx = (P0[0] + P1[0]) / 2 + aOx[i], qy = (P0[1] + P1[1]) / 2 + aOy[i];
      if (mouse.active) {
        var dx = qx - mx, dy = qy - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) { var d = Math.sqrt(d2) || 1, k = 1 - d / RR, fo = k * k * 5; aVx[i] += (dx / d) * fo + (-dy / d) * k * 1.2; aVy[i] += (dy / d) * fo + (dx / d) * k * 1.2; }
      }
      for (var sI = 0; sI < arShock.length; sI++) {
        var sk = arShock[sI], age = Math.max(0, (now - sk.t) / 1000);
        if (age > 1.3) continue;
        var sdx = qx - sk.x, sdy = qy - sk.y, sd = Math.sqrt(sdx * sdx + sdy * sdy) || 1, dist = Math.abs(sd - age * 320);
        if (dist < 34) { var fs = (1 - dist / 34) * 2.6 * (1 - age / 1.3); aVx[i] += (sdx / sd) * fs; aVy[i] += (sdy / sd) * fs; }
      }
      aVx[i] += -aOx[i] * 0.05; aVy[i] += -aOy[i] * 0.05; aVx[i] *= 0.88; aVy[i] *= 0.88;
      aOx[i] += aVx[i]; aOy[i] += aVy[i];
      e0x[i] = P0[0] + aOx[i]; e0y[i] = P0[1] + aOy[i]; e1x[i] = P1[0] + aOx[i]; e1y[i] = P1[1] + aOy[i];
    }
    for (var q2 = arShock.length - 1; q2 >= 0; q2--) if (now - arShock[q2].t > 1400) arShock.splice(q2, 1);

    ag.globalAlpha = appear; ag.lineWidth = Math.max(1.4, s * 0.012); ag.lineCap = 'round';
    for (var b = 0; b < buckets.length; b++) {
      var L = buckets[b]; ag.strokeStyle = bucketCol[b]; ag.beginPath();
      for (var k2 = 0; k2 < L.length; k2++) { var j = L[k2]; ag.moveTo(e0x[j], e0y[j]); ag.lineTo(e1x[j], e1y[j]); }
      ag.stroke();
    }
    ag.globalAlpha = 1;

    var fa = smooth(clamp01((p - 0.9) / 0.04));
    if (fa > 0.01) {
      var c0 = pr3(c, -PW / 2, PH / 2, 0), c1 = pr3(c, PW / 2, -PH / 2, 0), fw = s * 0.09;
      ag.save(); ag.globalAlpha = fa;
      ag.shadowColor = 'rgba(0,0,0,0.8)'; ag.shadowBlur = 50;
      var gg = ag.createLinearGradient(c0[0], c0[1], c1[0], c1[1]);
      gg.addColorStop(0, '#e2c072'); gg.addColorStop(0.5, '#8e6c28'); gg.addColorStop(1, '#ecca7a');
      arFrameBox = { x0: c0[0] - fw, y0: c0[1] - fw, x1: c1[0] + fw, y1: c1[1] + fw };
      ag.strokeStyle = gg; ag.lineWidth = fw; ag.strokeRect(c0[0] - fw / 2, c0[1] - fw / 2, c1[0] - c0[0] + fw, c1[1] - c0[1] + fw);
      ag.shadowBlur = 0; ag.strokeStyle = '#3a280a'; ag.lineWidth = 2; ag.strokeRect(c0[0], c0[1], c1[0] - c0[0], c1[1] - c0[1]);
      ag.restore();
    }
  }

  function resizeArt() {
    arW = arC.clientWidth || window.innerWidth; arH = arC.clientHeight || window.innerHeight;
    var d = Math.min(window.devicePixelRatio || 1, 1.75);
    arC.width = Math.round(arW * d); arC.height = Math.round(arH * d);
    ag.setTransform(d, 0, 0, d, 0, 0);
  }
  var arWordNow = '';
  function drawArt(now, forceP) {
    if (!arVis && forceP === undefined) return;
    if (!arW) resizeArt();
    var p = pinProgress(arEl);
    if (forceP !== undefined) { arSP = p = forceP; } else { arSP += (p - arSP) * 0.14; p = arSP; }
    var arRect = arC.getBoundingClientRect(); arTop = arRect.top; arLeft = arRect.left;
    arDt = Math.min(0.05, Math.max(0.001, (now - (arLastT || now)) / 1000)); arLastT = now;
    var t = (now - t0) / 1000;
    ag.setTransform(Math.min(window.devicePixelRatio || 1, 1.75), 0, 0, Math.min(window.devicePixelRatio || 1, 1.75), 0, 0);
    ag.fillStyle = '#060507'; ag.fillRect(0, 0, arW, arH);
    var a1 = 1 - smooth(clamp01((p - 0.63) / 0.05));
    if (a1 > 0.01) drawGallery(p, a1);
    drawStrokes(p, now, t);

    arIntro.style.opacity = String(1 - smooth(clamp01((p - 0.012) / 0.03)));
    var words = [['Dağıt.', artBump(0.66, 0.69, 0.74, 0.77, p)], ['Yeniden yarat.', artBump(0.79, 0.82, 0.88, 0.91, p)]];
    var best = words[0]; words.forEach(function (w) { if (w[1] > best[1]) best = w; });
    if (best[0] !== arWordNow) { arWordNow = best[0]; arWord.textContent = best[0]; }
    arWord.style.opacity = String(best[1]);
    var ea = smooth(clamp01((p - 0.93) / 0.05));
    arEnd.style.opacity = String(ea);
    arEnd.style.transform = 'translateY(' + ((1 - ea) * 20).toFixed(1) + 'px)';
    arEnd.style.pointerEvents = ea > 0.5 ? 'auto' : 'none';
    arBar.style.transform = 'scaleY(' + p.toFixed(3) + ')';
    var navA = smooth(clamp01((p - 0.02) / 0.05)) * (1 - smooth(clamp01((p - 0.60) / 0.05)));
    arNavs.style.opacity = String(navA);
    arNavs.style.pointerEvents = navA > 0.4 ? 'auto' : 'none';
    var kNow = Math.round(clamp01(p / 0.66) * 9);
    if (arNavUp.disabled !== (kNow <= 0)) arNavUp.disabled = kNow <= 0;
    if (arNavDown.disabled !== (kNow >= 9)) arNavDown.disabled = kNow >= 9;
  }
  arC.addEventListener('pointerdown', function (e) {
    if (arHover >= 0 && GAL) { GAL[arHover].P.kick = 1.6; return; }
    var r = arC.getBoundingClientRect();
    arShock.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
    if (arShock.length > 5) arShock.shift();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { arVis = en[0].isIntersecting && isHome; }, { threshold: 0 }).observe(arEl);
  } else { arVis = true; }
  buildArt();
  window.__drawArt = drawArt;
  window.__arDbg = function () { return { W: arW, H: arH, list: arLastList, frame: arFrameBox, hover: arHover }; };


  /* Ana döngü */
  function frame(now) {
    var t = (now - t0) / 1000;
    drawStage(now, t);
    drawLiquid(t);
    drawEx(now);
    drawWf(now);
    drawArt(now);
    drawLight(now);
    requestAnimationFrame(frame);
  }

  /* Fare */
  function onMove(e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = (mouse.x / W - 0.5) * 2;
    mouse.active = true;
    var now = performance.now();
    if (isHome && treeA > 0.3 && mouse.y > waterY - 30 && mouse.y < H && now - lastRipple > 140) {
      lastRipple = now;
      addRipple(mouse.x, Math.max(waterY, mouse.y), false);
    }
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointermove', function (e) { if (lm) lightPointer(e); }, { passive: true });
  window.addEventListener('pointerleave', function () { mouse.active = false; mouse.x = mouse.y = -9999; });
  window.addEventListener('pointerdown', function (e) {
    if (!isHome || treeA < 0.3) return;
    if (e.target.closest('a, button, input, textarea, .pill, .light-stage')) return;
    onMove(e); treeBurst(e.clientX, e.clientY);
  });
  window.addEventListener('resize', function () { resize(); resizeLiquid(); resizeEx(); resizeWf(); resizeArt(); resizeLight(); updateScroll(); });
  window.addEventListener('scroll', updateScroll, { passive: true });

  document.addEventListener('pointermove', function (e) {
    var g = e.target.closest && e.target.closest('.glass');
    if (!g) return;
    var r = g.getBoundingClientRect();
    g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    g.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  resize();
  resizeLiquid(); resizeEx(); resizeWf(); resizeArt(); resizeLight();
  requestAnimationFrame(frame);

})();
