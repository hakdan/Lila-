  'use strict';

  var PAGE_MAP = { 'ana-sayfa': 'index.html', 'yapay-zeka': 'yapay-zeka.html', 'ajans': 'ajans.html', 'yazilim': 'yazilim.html', 'iletisim': 'iletisim.html' };
  function goToPage(key) { if (PAGE_MAP[key]) location.href = PAGE_MAP[key]; }
  function goToIletisim(fields) {
    var qs = Object.keys(fields || {}).filter(function (k) { return fields[k]; })
      .map(function (k) { return k + '=' + encodeURIComponent(fields[k]); }).join('&');
    location.href = 'iletisim.html' + (qs ? '?' + qs : '');
  }
  function goToAsk(text) { location.href = 'yapay-zeka.html?ask=' + encodeURIComponent(text); }

  /* =========================================================
     6) Ajans ve Yazılım: ayrıntı penceresi
     ========================================================= */
  var DETAILS = {
    'Web sitesi tasarımı ve yönetimi': { i: 'Markanın dijitaldeki vitrini. Kurumsal ve e-ticaret siteleri tasarlıyor, yayına aldıktan sonra da yönetiyoruz.', l: ['Markana özel tasarım ve mobil uyumlu yapı', 'Kurumsal site ve e-ticaret sitesi seçenekleri', 'İçerik güncelleme ve düzenli bakım', 'Yayın sonrası takip ve iyileştirme'], f: 'Siteyi yenilemek ya da sıfırdan kurmak isteyen firmalar için.' },
    'Sosyal medya içerik yönetimi': { i: 'Sosyal medya hesaplarını planlı ve tutarlı yönetiyoruz. Ne zaman ne paylaşılacağını birlikte kurarız.', l: ['İçerik takvimi ve paylaşım planı', 'Görsel ve metin üretimi', 'Marka diline uygun paylaşımlar', 'Paylaşımların sonuçlarını takip'], f: 'Hesaplarını düzenli yönetemeyen ya da profesyonel destek isteyen markalar için.' },
    'Kurumsal kimlik': { i: 'Markanın görünüşünü ve dilini tek bir düzene bağlıyoruz. Her yerde aynı marka olarak tanınırsın.', l: ['Logo ve renk sistemi', 'Yazı tipi ve görsel kurallar', 'Kartvizit, antetli kağıt, sunum gibi uygulamalar', 'Marka kullanım rehberi'], f: 'Yeni kurulan ya da görünümünü yenilemek isteyen firmalar için.' },
    'Dijital itibar yönetimi': { i: 'İnternette markan hakkında ne söylendiğini izliyor, düzenli ve kontrollü bir görünüm oluşturuyoruz.', l: ['Marka adının internette izlenmesi', 'Yorum ve geri bildirimlerin takibi', 'Olumlu içeriklerin öne çıkarılması', 'Sorun çıktığında yanıt planı'], f: 'Müşteri yorumları ve internetteki görünümü önemli olan işletmeler için.' },
    'Dijital ortamlarda genel analiz': { i: 'Markanın dijitaldeki mevcut durumunu çıkarıyoruz. Nerede güçlü, nerede geride olduğunu gösteriyoruz.', l: ['Web sitesi ve sosyal medya incelemesi', 'Rakiplerin dijitaldeki durumu', 'Öne çıkan fırsatlar ve eksikler', 'Yapılacak işlerin öncelik sırası'], f: 'Dijital yatırıma nereden başlayacağını bilmek isteyenler için.' },
    'Arama motoru optimizasyonu': { i: 'Sitenin arama motorlarında bulunmasını kolaylaştırıyoruz. Doğru kişiler seni aradığında karşısına çıkarsın. Sonuçlar zaman içinde oluşur.', l: ['Anahtar kelime araştırması', 'Sayfa yapısı ve içerik düzeni', 'Hız ve teknik iyileştirmeler', 'Düzenli takip ve raporlama'], f: 'Sitesine internetten daha fazla ziyaretçi çekmek isteyen firmalar için.' },
    'Tanıtım filmi': { i: 'Markanı ya da ürününü kısa bir filmle anlatıyoruz. Fikirden montaja kadar süreci biz yürütüyoruz.', l: ['Fikir ve senaryo', 'Çekim ve yönetmenlik', 'Montaj, renk ve ses düzeni', 'Web sitesi ve sosyal medya için farklı boyutlar'], f: 'Firmasını ya da yeni ürününü etkili anlatmak isteyenler için.' },
    'Ürün ve menü çekimi': { i: 'Ürünlerin ve menülerin net, iştah açan fotoğraf ve videolarını çekiyoruz.', l: ['Stüdyoda ya da mekanda çekim', 'Işık ve kompozisyon düzeni', 'Fotoğraf rötuşu', 'Web, sosyal medya ve basılı menü için hazır dosyalar'], f: 'E-ticaret sitesi, restoran ve kafe gibi ürününü göstermesi gereken işletmeler için.' },
    'Havadan kayıt ve çekim': { i: 'Yüksekten çekimle mekanı ve projeyi farklı bir açıdan gösteriyoruz. Uçuşlar için gereken izinler proje planında ele alınır.', l: ['Havadan fotoğraf ve video', 'Tesis, arazi, inşaat ve etkinlik çekimleri', 'Tanıtım filmine eklenecek görüntüler'], f: 'Geniş alanlarını ya da projelerini etkileyici göstermek isteyenler için.' },
    '360 ve VR çekim': { i: 'Mekanı ya da ürünü her yönden gezilebilir hâle getiriyoruz.', l: ['360 derece fotoğraf ve video', 'Sanal tur için çekim', 'VR gözlüğüyle izlenebilen içerik', 'Web sitesine yerleştirme'], f: 'Ziyaretçisine mekanı uzaktan gezdirmek isteyen işletmeler için.' },
    'Kurumsal video ve fotoğraf': { i: 'Firmanın tanıtım, ekip ve üretim görüntülerini profesyonelce çekiyoruz.', l: ['Kurumsal tanıtım videosu', 'Ekip ve ofis portreleri', 'Üretim ve tesis fotoğrafları', 'Etkinlik çekimleri'], f: 'Web sitesi, sunum ve katalog için güncel görsele ihtiyacı olan firmalar için.' },
    'Ofset ve dijital reklam': { i: 'Basılı ve dijital reklamı tek elden yürütüyoruz. Mesajın her mecrada aynı dilde kalır.', l: ['Afiş, broşür ve katalog gibi ofset baskı işleri', 'Dijital reklam tasarımı ve yerleşimi', 'Kampanya fikri ve metin yazımı', 'Baskı ve yayın süreçlerinin takibi'], f: 'Hem basılı hem dijital ortamda görünmek isteyen markalar için.' },
    'Basılı ve dijital medya desteği': { i: 'Firmalara özel basılı ve dijital medya ihtiyaçlarında yanında oluyoruz.', l: ['Tasarım ve dosya hazırlığı', 'Basılı malzeme üretimi', 'Dijital yayın için uyarlama', 'Ölçü ve format uyumu'], f: 'Sürekli medya içeriğine ihtiyaç duyan firmalar için.' },

    'E-ticaret entegrasyonu': { i: 'Mağazanı ve internet mağazanı aynı stok sistemine bağlıyoruz. Ürünü bir kez girersin.', l: ['Ürün kartı ve stok tek yerden girilir', 'Mağazada ve internet sitesinde stok anlık takip edilir', 'Biten ürünün satışı engellenir', 'Veri girişi hataları ve yanlış sevkiyat azalır'], f: 'Hem mağazası hem internet sitesi olan işletmeler için.' },
    'Akıllı santral': { i: 'IP telefonla gelen aramalarda müşteri kartı kendiliğinden açılır.', l: ['Arama gelince müşteri kartı ekrana gelir', 'Aramalar müşteri kartına kaydedilir', 'Telefon ve müşteri kayıtları birlikte çalışır'], f: 'Müşteri aramalarını düzenli takip etmek isteyen firmalar için.' },
    'İş yazılımı': { i: 'İşletmenin tüm süreç maliyetlerini tek yerden kontrol etmeni sağlar. Raporlara her an ulaşırsın.', l: ['Süreç maliyetlerinin takibi', 'İstediğin anda rapor alma', 'Daha doğru ve hızlı karar verme', 'Mevcut durum analiziyle başlayan proje süreci'], f: 'Yönetim kararlarını veriyle almak isteyen işletmeler için.' },
    'Ticari yazılım': { i: 'Muhasebe ve ön muhasebe işlemlerini kolay, hızlı ve ayrıntılı yapar. Üretim ve ticaret firmalarının ihtiyaç duyduğu modülleri içerir.', l: ['Teklif, sipariş, fatura ve irsaliye', 'Stok, müşteri ve personel', 'İnsan kaynakları ve üretim', 'Banka, kasa, çek/senet ve taksitli satış', 'Muhasebe'], f: 'Üretim ve ticaret yapan firmalar için.' },
    'İK yazılımı': { i: 'Çalışan ve aday bilgilerini saklar. Doğru kişiyi hızlı bulmanı sağlar.', l: ['Çalışan ve aday bilgileri', 'Maaş, hak ediş ve devam takibi', 'Personel devam kontrol cihazlarıyla entegrasyon', 'İşe alım sürecini hızlandırma'], f: 'Personel süreçlerini tek yerden yönetmek isteyen firmalar için.' },
    'Mağaza yönetimi': { i: 'Mağazanı en etkili ve doğru şekilde yönetmen için gereken işlemleri ve raporları sunar.', l: ['Taksitli satış', 'Müşteri sadakat (puan) kartı', 'Renk, beden, seri no ve barkoda göre satış', 'CRM işlemleri', 'İstediğin anda rapor'], f: 'Perakende mağazaları için.' },
    'Market yönetimi': { i: 'Muhasebeden alıma kadar market işlerinin tamamını tek yazılımda toplar.', l: ['Muhasebe ve satın alma', 'Puan kartı uygulamaları', 'Şubelere göre farklı fiyatlandırma', 'Modern POS, barkodlu dijital tartı ve el terminali ile tam entegrasyon'], f: 'Tek ya da çok şubeli marketler için.' },
    'Jet POS': { i: 'Barkodlu hızlı satış yazılımı. Kolay öğrenilir ve kolay kullanılır.', l: ['Farklı para birimlerinde tahsilat', 'Yemek kartı ve puanla ödeme', 'Barkodlu dijital tartı ve modern POS ile entegrasyon'], f: 'Kasada hızlı satış yapması gereken işletmeler için.' },
    'Kuyumcu yönetimi': { i: 'Kuyumcu tezgâh işlemlerinin hepsini tek ekranda yaparsın.', l: ['Yapılacak işleme göre kullanıcı yetkilendirme', 'E-ticaret yazılımıyla entegrasyon', 'RF-ID teknolojisiyle ürün kontrolü', 'Karşılaştırmalı bilanço, günlük hareket ve gelir tablosu raporları'], f: 'Kuyumcular için.' },
    'Restoran yönetimi': { i: 'Tüm masaları tek ekrandan izlersin: açılış süresi, oturan kişi sayısı ve masa hesabı.', l: ['Paket servis modülü: telefon siparişi alma, arama gelince müşteri kartını açma', 'Hızlı fatura modülü: kasada dokunmatik ekranla satış', 'Tüm masaların durumu tek ekranda'], f: 'Restoran ve kafeler için.' },
    'Mobil çözümler': { i: 'Sipariş ve raporlara mobil cihazlardan ulaşmanı sağlar.', l: ['Web sipariş: işletim sistemi fark etmeksizin tüm mobil cihazlardan sipariş', 'Web rapor: özel raporlara telefon, tablet ve el terminalinden erişim', 'Mobil satış siparişi: Windows CE işletim sistemli el terminallerinde satış ve sipariş'], f: 'Sahada ya da hareket hâlinde çalışan ekipler için.' }
  };
  function detailsText() {
    return Object.keys(DETAILS).map(function (k) { var d = DETAILS[k]; return k + ': ' + d.i + ' ' + d.l.join('; ') + '. ' + d.f; }).join('\n');
  }

  var dlg = document.getElementById('dlg');
  if (dlg) {
  var dlgT = document.getElementById('dlgT'), dlgI = document.getElementById('dlgI'), dlgL = document.getElementById('dlgL'), dlgF = document.getElementById('dlgF'), dlgTag = document.getElementById('dlgTag');
  var dlgTitle = '';
  function openInfo(title, tag) {
    var d = DETAILS[title];
    if (!d) return;
    dlgTitle = title;
    dlgTag.textContent = tag; dlgT.textContent = title; dlgI.textContent = d.i; dlgF.textContent = d.f;
    dlgL.innerHTML = '';
    d.l.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; dlgL.appendChild(li); });
    document.documentElement.style.overflow = 'hidden';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('.dlg-in').scrollTop = 0;
  }
  function closeInfo() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  dlg.addEventListener('close', function () { document.documentElement.style.overflow = ''; });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeInfo(); });
  document.getElementById('dlgX').addEventListener('click', closeInfo);
  document.getElementById('dlgGo').addEventListener('click', function () {
    var t = dlgTitle; closeInfo();
    goToIletisim({ mesaj: t + ' hakkında bilgi almak istiyorum.' });
  });
  document.getElementById('dlgAsk').addEventListener('click', function () {
    var t = dlgTitle; closeInfo();
    goToAsk(t + ' hakkında bilgi verir misin?');
  });
  Array.prototype.forEach.call(document.querySelectorAll('.item'), function (b) {
    b.addEventListener('click', function () {
      openInfo(b.querySelector('h3').textContent.trim(), document.body.getAttribute('data-tag') || '');
    });
  });
  }

  /* =========================================================
     4) Randevu formu
     ========================================================= */
  var form = document.getElementById('appt');
  // NOT: 'status' adini kullanmayin - genel kapsamda window.status ile cakisir
  // ve atanan element string'e cevrilir ('[object HTMLDivElement]').
  var statusEl = document.getElementById('status');
  if (form) {
  (function () {
    var d = new Date(), m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    form.elements['tarih'].min = d.getFullYear() + '-' + m + '-' + day;
  })();
  function prefill(vals) {
    ['ad', 'firma', 'tel', 'unvan', 'tarih', 'saat', 'mesaj'].forEach(function (k) {
      if (vals && typeof vals[k] === 'string' && vals[k]) form.elements[k].value = vals[k];
    });
  }
  (function () {
    var qp = new URLSearchParams(location.search), vals = {};
    ['ad', 'firma', 'tel', 'unvan', 'tarih', 'saat', 'mesaj'].forEach(function (k) { var v = qp.get(k); if (v) vals[k] = v; });
    prefill(vals);
  })();
  function values() {
    var f = form.elements;
    return {
      ad: f['ad'].value, firma: f['firma'].value, tel: f['tel'].value, unvan: f['unvan'].value,
      tarih: f['tarih'].value, saat: f['saat'].value, mesaj: f['mesaj'].value
    };
  }
  // Wix'e ulaşılamazsa talep kaybolmasın: e-posta taslağı yedek yol.
  function mailtoFallback(v) {
    var body = [
      'Ad soyad: ' + v.ad, 'Firma: ' + v.firma, 'Telefon: ' + v.tel,
      'Ünvan: ' + v.unvan, 'Tarih: ' + v.tarih, 'Saat: ' + v.saat, '', v.mesaj
    ].join('\n');
    window.location.href = 'mailto:info@vilkan.com.tr?subject=' + encodeURIComponent('Randevu talebi') + '&body=' + encodeURIComponent(body);
  }
  // Wix alan anahtari -> formdaki Turkce etiket ve input adi
  var FIELD_LABELS = {
    first_name: { label: 'Ad soyad', input: 'ad' },
    last_name: { label: 'Ad soyad', input: 'ad' },
    company: { label: 'Firma adı', input: 'firma' },
    phone: { label: 'Telefon', input: 'tel' },
    position: { label: 'Ünvan', input: 'unvan' },
    preferred_date: { label: 'Tarih', input: 'tarih' },
    preferred_time: { label: 'Saat', input: 'saat' },
    message: { label: 'Mesajın', input: 'mesaj' }
  };
  // Wix telefonu "phone" formatinda dogruluyor; bos birakilabilir ama
  // doldurulduysa numara gibi gorunmeli, yoksa istek 400 ile geri doner.
  function phoneLooksValid(value) {
    var v = String(value || '').trim();
    if (!v) return true;
    if (!/^[+()\-.\s0-9]+$/.test(v)) return false;
    return (v.replace(/\D/g, '').length >= 7);
  }
  function focusField(name) {
    var el = form.elements[name];
    if (el && typeof el.focus === 'function') el.focus();
  }

  var submitBtn = form.querySelector('button[type="submit"]');
  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    var f = form.elements;
    if (!f['ad'].value.trim() || !f['tarih'].value) {
      statusEl.textContent = 'Ad soyad ve tarih alanlarını doldur.';
      (f['ad'].value.trim() ? f['tarih'] : f['ad']).focus();
      return;
    }
    if (!phoneLooksValid(f['tel'].value)) {
      statusEl.textContent = 'Telefon numarası geçerli görünmüyor. Örnek: +90 538 441 19 19';
      focusField('tel');
      return;
    }
    var v = values();

    if (!window.WixHeadless) {
      mailtoFallback(v);
      statusEl.textContent = 'Bağlantı dosyası yüklenemedi, e-posta uygulaman açılıyor. Gönder\'e basarak talebi tamamla.';
      return;
    }

    sending = true;
    if (submitBtn) submitBtn.disabled = true;
    statusEl.textContent = 'Talebin gönderiliyor...';

    window.WixHeadless.submitAppointment(v).then(function () {
      form.reset();
      statusEl.textContent = 'Randevu talebin bize ulaştı. En kısa sürede döneceğiz.';
    }).catch(function (err) {
      if (window.console && console.warn) console.warn('Wix form gönderimi başarısız:', err);

      // Alan dogrulama hatasi: ziyaretcinin duzeltebilecegi bir sey.
      // Bunu iletim hatasi gibi gosterip e-posta acmak yanlis olur.
      var fieldErrors = (err && err.fieldErrors) || [];
      if (fieldErrors.length) {
        var first = fieldErrors[0];
        var known = FIELD_LABELS[first.path];
        statusEl.textContent = known
          ? (known.label + ' alanı geçerli değil. Kontrol edip tekrar gönder.')
          : 'Girdiğin bilgilerden biri geçerli değil. Kontrol edip tekrar gönder.';
        if (known) focusField(known.input);
        return;
      }

      // Gercek iletim hatasi: talep kaybolmasin diye e-posta yedegi.
      var why = err && err.status ? ('HTTP ' + err.status) : 'baglanti hatasi';
      statusEl.textContent = 'Talep gönderilemedi (' + why + '), e-posta uygulaman açılıyor. Gönder\'e basarak talebi tamamla.';
      mailtoFallback(v);
    }).then(function () {
      sending = false;
      if (submitBtn) submitBtn.disabled = false;
    });
  });
  }

