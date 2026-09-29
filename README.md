# Vilkan Creative — Wix Headless

[vilkan.com.tr](https://www.vilkan.com.tr/) statik ön yüzü, Wix Headless projesine bağlanmış hâli.

- **Site ID:** `bee24864-4609-48d7-9da6-3075e3f07671`
- **OAuth client ID (`appId`):** `fe28747d-0b7a-4e4e-8869-5252dad3a2f4`
- **Randevu formu ID:** `195c8931-da2f-44e0-b71f-6cce32f3871b`

Site derlenmeden yayınlanıyor (`wix.config.json` → `outputDirectory: "."`), bu yüzden
tarayıcı tarafında paket/bundler yok: Wix REST API'si doğrudan `fetch` ile çağrılıyor.

## Açık olan Wix özellikleri

Sitenin koduna bakılarak yalnızca gereken özellik açıldı:

| Özellik | Durum | Neden |
|---|---|---|
| Wix Forms | **açık** | `iletisim.html` içindeki randevu formu buraya gönderiliyor |
| Contacts (CRM) | **açık** (Forms ile gelir) | `CONTACTS_*` alanları kişi kaydı oluşturuyor |
| Promote SEO | korundu | pazarlama sitesi için anlamlı |
| Wix Invoices | **kaldırıldı** | hiçbir sayfa kullanmıyordu |
| Wix Hotels | **kaldırıldı** | hiçbir sayfa kullanmıyordu |

Stores, Blog, Members, Events, Bookings, Pricing Plans **açılmadı** — sitede karşılığı yok.

`yapay-zeka.html` içindeki asistan Wix'e bağlı değil; `window.claude.use('sample')`
üzerinden çalışır ve Wix tarafında bir özellik gerektirmez.

## Randevu formu akışı

`iletisim.html` → `wix-client.js` → Wix Forms

1. `clientId` ile anonim ziyaretçi token'ı alınır, `localStorage`'da saklanır ve
   süresi dolunca `refresh_token` ile yenilenir. (Her açılışta yeni anonim token
   üretmek yeni ziyaretçi demektir; bu yüzden token saklanıyor.)
2. Form değerleri Wix alan adlarına eşlenir:

   | Form alanı | Wix `target` | Kişi alanı |
   |---|---|---|
   | `ad` | `first_name` + `last_name` | FIRST_NAME / LAST_NAME |
   | `firma` | `company` | COMPANY |
   | `tel` | `phone` | PHONE |
   | `unvan` | `position` | POSITION |
   | `tarih` | `preferred_date` | — |
   | `saat` | `preferred_time` | — |
   | `mesaj` | `message` | — |

3. Gönderim `PENDING` olarak oluşur, birkaç saniye içinde `CONFIRMED` olur ve
   Wix kişiyi (contact) kendisi oluşturur.

Talepler: Wix paneli → **Form Submissions** ve **Contacts**.

### Dikkat edilen iki nokta

- `<input type="time">` `"14:30"` üretir, Wix ise `"HH:MM:SS"` bekler — aksi hâlde
  `FORMAT_ERROR` döner. `wix-client.js` içindeki `normalizeTime()` bunu düzeltir.
- Wix'e ulaşılamazsa talep kaybolmasın diye `mailto:` yedek yolu korundu.

## Geliştirme

```bash
npm install
npx wix preview   # yerelde önizleme
npx wix release   # yayına alma
```
