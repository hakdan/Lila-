(function () {
  'use strict';
  /* =========================================================
     5) Yapay zeka asistanı
     ========================================================= */
  var log = document.getElementById('log');
  var input = document.getElementById('q');
  var sendBtn = document.getElementById('send');
  var stopBtn = document.getElementById('stop');
  var aiState = document.getElementById('aiState');
  var chips = document.getElementById('chips');

  var KNOWLEDGE = [
    'VİLKAN (Vilkan Creative), Beşiktaş/İstanbul merkezli bir teknoloji şirketi. Yapay zekayı işin merkezine koyuyor. Türkiye ve Estonia\'da çalışıyor. İletişim: telefon +90 538 441 19 19, e-posta info@vilkan.com.tr, web www.vilkan.com.tr, Instagram @vilkan.com.tr. Diğer içerikler sosyal medya hesaplarında.',
    'Ajans: web sitesi tasarımı ve yönetimi, sosyal medya içerik yönetimi, kurumsal kimlik, dijital itibar yönetimi, dijital analiz, SEO, tanıtım filmi, ürün ve menü çekimi, havadan çekim, 360 ve VR çekim, kurumsal video ve fotoğraf, ofset ve dijital reklam, basılı ve dijital medya desteği. Dünyanın her yerine 7/24 hizmet. Tasarımdan teslimata tek çatı.',
    'Yazılım: firmaya özel yazılım, e-ticaret entegrasyonu, akıllı santral, iş yazılımı, ticari yazılım, İK, mağaza yönetimi, market yönetimi, Jet POS, kuyumcu yönetimi (RF-ID), restoran yönetimi, mobil çözümler. Süreç: mevcut durum analizi, özel yazılım, danışmanlık, özel raporlar, uygulamalı eğitim.',
    'Yapay zeka destekli çalışma modeli: 1) Veri toplama: marka, kitle ve pazar verileri tek noktada toplanır. 2) Yapay zeka ile analiz: veriler yapay zeka destekli araçlarla analiz edilir. 3) Yaratıcı üretim: içerik ve kampanya fikirleri bu analizle şekillenir. 4) Sürekli optimizasyon: performans verileri ışığında kampanyalar sürekli iyileştirilir. Yapay zeka; içerik üretimi, hedef kitle analizi, kampanya optimizasyonu, veri analitiği ve yaratıcı süreçte yer alıyor.',
    'Fiyat bilgisi sitede yok. Fiyat için randevu formu veya e-posta öner.'
  ].join('\n');

  var RULES = 'Sen VİLKAN şirketinin sitesindeki asistansın. Türkçe yaz. En fazla 3 kısa cümle kullan. ' +
    'Sadece aşağıdaki bilgiyi kullan. Fiyat, tarih veya bilgide olmayan şeyleri uydurma. Bilmiyorsan dürüstçe söyle ve info@vilkan.com.tr adresini öner. ' +
    'Ziyaretçi bir sayfayı görmek isterse goToPage aracını çağır. Randevu isterse prefillAppointment aracını çağır ve formu doldur, kullanıcının verdiği bilgileri yaz, uydurma. ' +
    'Araç çağırdıktan sonra ne yaptığını tek cümleyle söyle.\n\nBİLGİ:\n' + KNOWLEDGE;

  var turns = [], ctl = null, sample = null, sampleResolved = false;

  function resolveSample() {
    if (sampleResolved) return Promise.resolve(sample);
    sampleResolved = true;
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        return window.claude.use('sample').then(function (s) { sample = s || null; return sample; }).catch(function () { return null; });
      }
    } catch (err) {}
    return Promise.resolve(null);
  }
  resolveSample().then(function (s) { aiState.textContent = s ? 'canlı yapay zeka' : 'hazır yanıtlar'; });

  function addMsg(text, cls) {
    var el = document.createElement('div');
    el.className = 'msg ' + cls;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  var FAQ = [
    { k: ['randevu', 'görüş', 'gorus', 'teklif'], a: 'Randevu formunu açtım. Adını ve istediğin tarihi yazman yeterli.', go: 'iletisim', fill: 'Randevu almak istiyorum.' },
    { k: ['fiyat'], a: 'Fiyatları sitede paylaşmıyoruz. Randevu formuyla ya da info@vilkan.com.tr adresinden fiyat isteyebilirsin.', go: 'iletisim', fill: 'Fiyat listesi almak istiyorum.' },
    { k: ['yapay zeka', 'yapay zekâ', 'çalışma modeli', 'nasıl çalış', 'nasil calis'], a: 'Önce marka, kitle ve pazar verilerini tek noktada topluyoruz. Sonra yapay zeka destekli araçlarla analiz ediyoruz. Fikirleri bu analizle şekillendirip kampanyaları performansa göre sürekli iyileştiriyoruz.', go: 'yapay-zeka' },
    { k: ['yazılım', 'yazilim', 'pos', 'e-ticaret', 'santral'], a: 'Firmana özel yazılım geliştiriyoruz. E-ticaret, akıllı santral, ticari, İK, mağaza, market, kuyumcu ve restoran yazılımları var.', go: 'yazilim' },
    { k: ['ajans', 'reklam', 'seo', 'sosyal', 'tasarım', 'tasarim', 'web', 'film', 'çekim', 'cekim'], a: 'Web sitesi, sosyal medya, kurumsal kimlik, SEO, tanıtım filmi ve çekim hizmetleri veriyoruz. Hepsi tek çatı altında.', go: 'ajans' },
    { k: ['iletişim', 'iletisim', 'mail', 'adres', 'nerede', 'telefon', 'numara', 'instagram', 'sosyal medya', 'estonya', 'estonia'], a: 'Türkiye ve Estonia\'dayız. +90 538 441 19 19 numarasından ya da info@vilkan.com.tr adresinden bize ulaşabilirsin.', go: 'iletisim' }
  ];
  function localAnswer(q, noNav) {
    var s = q.toLocaleLowerCase('tr');
    if (typeof DETAILS === 'object') {
      var keys = Object.keys(DETAILS);
      for (var di = 0; di < keys.length; di++) {
        if (s.indexOf(keys[di].toLocaleLowerCase('tr')) !== -1) {
          var dd = DETAILS[keys[di]];
          return keys[di] + ': ' + dd.i + ' Kapsamı: ' + dd.l.slice(0, 3).join(', ') + '.';
        }
      }
    }
    for (var i = 0; i < FAQ.length; i++) {
      for (var j = 0; j < FAQ[i].k.length; j++) {
        if (s.indexOf(FAQ[i].k[j]) !== -1) {
          if (!noNav) {
            var __go = FAQ[i].go, __fill = FAQ[i].fill;
            setTimeout(function () { if (__fill) { goToIletisim({ mesaj: __fill }); } else { goToPage(__go); } }, 600);
          }
          return FAQ[i].a;
        }
      }
    }
    return 'Bunu tam anlayamadım. Ajans ya da yazılım hakkında sorabilirsin. Ayrıca info@vilkan.com.tr adresine yazabilirsin.';
  }

  function setBusy(b) {
    sendBtn.hidden = b; stopBtn.hidden = !b; input.disabled = b;
    if (!b) input.focus();
  }

  async function ask(text, noNav) {
    text = (text || '').trim();
    if (!text) return;
    chips.hidden = true;
    addMsg(text, 'me');
    input.value = '';
    var bubble = addMsg('', 'bot');
    var s = await resolveSample();
    if (!s) { bubble.textContent = localAnswer(text, noNav); return; }

    turns.push({ role: 'user', content: text });
    ctl = new AbortController();
    setBusy(true);
    bubble.innerHTML = '<span class="dots">Düşünüyor</span>';
    try {
      var res = await s([{ role: 'user', content: RULES + '\n\nHİZMET AYRINTILARI:\n' + detailsText() }].concat(turns.slice(-10)), {
        cache: false, modelTier: 'quick', signal: ctl.signal,
        onText: function (o) { bubble.textContent = o.text; log.scrollTop = log.scrollHeight; },
        tools: [
          {
            name: 'goToPage',
            description: 'Ziyaretçiyi istenen sayfaya götürür.',
            inputSchema: { type: 'object', properties: { page: { type: 'string', enum: ['ana-sayfa', 'yapay-zeka', 'ajans', 'yazilim', 'iletisim'] } }, required: ['page'] },
            execute: function (i) { goToPage(i.page); return 'Sayfa açıldı: ' + i.page; }
          },
          {
            name: 'prefillAppointment',
            description: 'Randevu formunu ziyaretçinin verdiği bilgilerle doldurur ve İletişim sayfasını açar. Bilgi uydurma, sadece verileni yaz.',
            inputSchema: { type: 'object', properties: { ad: { type: 'string' }, firma: { type: 'string' }, eposta: { type: 'string' }, tel: { type: 'string' }, unvan: { type: 'string' }, tarih: { type: 'string', description: 'YYYY-MM-DD' }, saat: { type: 'string', description: 'HH:MM' }, mesaj: { type: 'string' } } },
            execute: function (i) { goToIletisim(i || {}); return 'Form dolduruldu. Ziyaretçi son kontrolü yapıp gönderecek.'; }
          }
        ]
      });
      bubble.textContent = res.text || 'Tamam.';
      turns.push({ role: 'assistant', content: res.text || 'Tamam.' });
    } catch (e) {
      if (e && e.code === 'cancelled') {
        bubble.textContent = (e.text || '') || 'Durduruldu.';
        if (e.text) turns.push({ role: 'assistant', content: e.text });
      } else if (e && (e.code === 'not_granted' || e.code === 'unavailable')) {
        sample = null; aiState.textContent = 'hazır yanıtlar'; turns.pop();
        bubble.textContent = localAnswer(text, noNav);
        addMsg('Canlı yapay zeka izni verilmedi. Hazır yanıtlar gösteriliyor.', 'note');
      } else if (e && e.code === 'rate_limited') {
        turns.pop(); bubble.textContent = 'Çok hızlı soru gönderildi. Biraz bekleyip tekrar dene.';
      } else {
        turns.pop(); bubble.textContent = localAnswer(text, noNav);
        addMsg('Canlı yapay zekaya ulaşılamadı. Hazır yanıt gösterildi.', 'note');
      }
    } finally { ctl = null; setBusy(false); }
  }

  addMsg('Merhaba, ben Vilkan asistanı. Hizmetleri sorabilir, randevu talebini birlikte hazırlayabilirsin.', 'bot');
  sendBtn.addEventListener('click', function () { ask(input.value); });
  stopBtn.addEventListener('click', function () { if (ctl) ctl.abort(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ask(input.value); } });
  Array.prototype.forEach.call(chips.querySelectorAll('.chip'), function (c) {
    c.addEventListener('click', function () { ask(c.textContent); });
  });

  (function () {
    var qp = new URLSearchParams(location.search), askText = qp.get('ask');
    if (askText) {
      if (window.history && history.replaceState) history.replaceState(null, '', 'yapay-zeka.html');
      setTimeout(function () { ask(askText, true); }, 300);
    }
  })();
})();
