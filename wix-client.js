/* =========================================================
   Wix Headless baglantisi
   ---------------------------------------------------------
   Site derlenmeden yayinlandigi icin (wix.config.json ->
   outputDirectory ".") burada paket yok: ziyaretci token'i
   ve form gonderimi dogrudan Wix REST API'siyle yapilir.

   Akis:
     1) clientId ile anonim ziyaretci token'i uretilir
     2) token localStorage'da saklanir, suresi dolunca
        refresh_token ile yenilenir (her acilista yeniden
        uretilmez - yeni anonim token yeni ziyaretci demektir)
     3) Randevu formu Wix Forms'a gonderilir; CONTACTS_*
        alanlari sayesinde Wix kisiyi (contact) kendisi olusturur
   ========================================================= */
(function () {
  'use strict';

  var CLIENT_ID = 'fe28747d-0b7a-4e4e-8869-5252dad3a2f4';
  var FORM_ID = '195c8931-da2f-44e0-b71f-6cce32f3871b';

  var TOKEN_URL = 'https://www.wixapis.com/oauth2/token';
  var SUBMISSIONS_URL = 'https://www.wixapis.com/form-submission-service/v4/submissions';

  var STORE_KEY = 'vilkan.wix.tokens';
  var EXPIRY_MARGIN_MS = 60 * 1000; // suresi dolmadan 1 dk once yenile

  /* ---------- token deposu (localStorage yoksa da calisir) ---------- */

  var memory = null;

  function readTokens() {
    if (memory) return memory;
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) memory = JSON.parse(raw);
    } catch (err) { /* gizli sekme / kapali depolama */ }
    return memory;
  }

  function writeTokens(tokens) {
    memory = tokens;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(tokens));
    } catch (err) { /* sorun degil, bellekte tutuyoruz */ }
  }

  function clearTokens() {
    memory = null;
    try { window.localStorage.removeItem(STORE_KEY); } catch (err) {}
  }

  function store(data) {
    var tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 0) * 1000
    };
    writeTokens(tokens);
    return tokens;
  }

  /* ---------- token uretimi ---------- */

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (err) {}
        if (!res.ok) {
          var err2 = new Error('Wix ' + res.status + ': ' + (text || res.statusText));
          err2.status = res.status;
          err2.body = parsed;
          throw err2;
        }
        return parsed;
      });
    });
  }

  function mintAnonymous() {
    return postJson(TOKEN_URL, {
      clientId: CLIENT_ID,
      grantType: 'anonymous'
    }).then(store);
  }

  function refresh(refreshToken) {
    // Wix bu cagride snake_case bekliyor: refresh_token. camelCase sessizce reddediliyor.
    return postJson(TOKEN_URL, {
      refresh_token: refreshToken,
      grantType: 'refresh_token'
    }).then(store);
  }

  function getAccessToken(forceNew) {
    var tokens = forceNew ? null : readTokens();

    if (tokens && tokens.accessToken && tokens.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
      return Promise.resolve(tokens.accessToken);
    }
    if (tokens && tokens.refreshToken) {
      return refresh(tokens.refreshToken)
        .then(function (t) { return t.accessToken; })
        .catch(function () {
          clearTokens();
          return mintAnonymous().then(function (t) { return t.accessToken; });
        });
    }
    return mintAnonymous().then(function (t) { return t.accessToken; });
  }

  /* ---------- form gonderimi ---------- */

  // "Ahmet Yilmaz Demir" -> { first: "Ahmet Yilmaz", last: "Demir" }
  function splitName(fullName) {
    var parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
  }

  // <input type="time"> "14:30" verir, Wix ise "HH:MM:SS" bekler ("14:30" FORMAT_ERROR dondurur).
  function normalizeTime(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    return /^\d{2}:\d{2}$/.test(v) ? v + ':00' : v;
  }

  // Bos alanlari gondermiyoruz: Wix bos string'i dolu deger sayabiliyor.
  function buildSubmission(values) {
    var name = splitName(values.ad);
    var fields = {
      first_name: name.first,
      last_name: name.last,
      company: values.firma,
      email: values.eposta,
      phone: values.tel,
      position: values.unvan,
      preferred_date: values.tarih,
      preferred_time: normalizeTime(values.saat),
      message: values.mesaj
    };

    var out = {};
    Object.keys(fields).forEach(function (key) {
      var v = fields[key];
      if (typeof v === 'string') v = v.trim();
      if (v) out[key] = v;
    });
    return out;
  }

  // Wix'in dogrulama hatasi: details.validationError.fieldViolations[].data.errors[]
  function readFieldErrors(parsed) {
    var out = [];
    try {
      var violations = parsed.details.validationError.fieldViolations || [];
      for (var i = 0; i < violations.length; i++) {
        var errors = (violations[i].data && violations[i].data.errors) || [];
        for (var j = 0; j < errors.length; j++) {
          out.push({ path: errors[j].errorPath, type: errors[j].errorType, message: errors[j].errorMessage });
        }
      }
    } catch (err) {}
    return out;
  }

  function postSubmission(accessToken, submissions) {
    return fetch(SUBMISSIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken
      },
      body: JSON.stringify({
        submission: {
          formId: FORM_ID,
          submissions: submissions
        }
      })
    });
  }

  /**
   * Randevu talebini Wix Forms'a gonderir.
   * @param {Object} values iletisim formundaki alanlar
   * @returns {Promise<{submissionId: string, contactId: string}>}
   */
  function submitAppointment(values) {
    var submissions = buildSubmission(values);

    return getAccessToken(false)
      .then(function (token) {
        return postSubmission(token, submissions).then(function (res) {
          // Token reddedildiyse bir kez yeni token ile tekrar dene.
          if (res.status === 401 || res.status === 403) {
            clearTokens();
            return getAccessToken(true).then(function (fresh) {
              return postSubmission(fresh, submissions);
            });
          }
          return res;
        });
      })
      .then(function (res) {
        return res.text().then(function (text) {
          var parsed = null;
          try { parsed = text ? JSON.parse(text) : null; } catch (err) {}
          if (!res.ok) {
            var err2 = new Error('Wix ' + res.status + ': ' + (text || res.statusText));
            err2.status = res.status;
            err2.body = parsed;
            // 400'de Wix hangi alanin reddedildigini soyluyor; cagirana iletiyoruz
            // ki ziyaretciye "bir sey ters gitti" yerine alan adi gosterilebilsin.
            err2.fieldErrors = readFieldErrors(parsed);
            throw err2;
          }
          var submission = (parsed && parsed.submission) || {};
          return { submissionId: submission.id, contactId: submission.contactId };
        });
      });
  }

  window.WixHeadless = {
    clientId: CLIENT_ID,
    formId: FORM_ID,
    submitAppointment: submitAppointment,
    getAccessToken: getAccessToken
  };
})();
