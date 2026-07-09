# Samsa POS (Samsa Asya Yemekleri)

Samsa POS, restoranlar (özellikle Asya yemekleri sunan işletmeler) için geliştirilmiş, **Tauri**, **Rust**, **TypeScript** ve **Tailwind CSS v4** teknolojilerini kullanan modern, hafif ve çevrimdışı öncelikli (offline-first) bir Satış Noktası (POS) uygulamasıdır.

Bu proje, istemci tarafında herhangi bir ağır JavaScript framework'ü (React, Vue vb.) kullanmadan, doğrudan **Vanilla TypeScript** ve güçlü bir **Rust backend** mimarisiyle yüksek performanslı ve akıcı bir kullanıcı deneyimi sunar.

---

## 🚀 Özellikler

*   **Masa Yönetimi:** Masaları dinamik olarak ekleyin, güncelleyin veya silin. Masaların durumunu (boş/dolu) ve anlık toplam sipariş tutarlarını takip edin.
*   **Kategori Yönetimi:** Ürünlerinizi organize etmek için kategoriler oluşturun ve bunları sıralama sırasına göre dizin.
*   **Ürün Yönetimi:** Ürünlerinizi fiyat, kategori ve görsel bilgileriyle yönetin. Ürün görselleri yüklenirken otomatik olarak 4:3 oranında kırpılır ve SQLite veritabanında saklanır.
*   **Gelişmiş POS Ekranı:** Masayı seçin, kategoriler arasında kolayca gezinin, ürünleri tek tıkla siparişe ekleyin, miktarlarını güncelleyin ve siparişi kapatarak ödeme alın.
*   **Fiş/Adres Yazdırma:** Kapatılan siparişler için şık tasarımlı HTML fiş çıktısı alınmasını sağlar.
*   **Sipariş Geçmişi:** Geçmişte tamamlanan tüm siparişleri ve bunların detaylarını görüntüleyin, eski fişleri yeniden yazdırın.
*   **Yerel SQLite Veritabanı:** İnternet bağlantısı gerektirmeyen veri saklama yapısı. İlk açılışta veritabanı otomatik olarak oluşturulur, tablolar migrate edilir ve örnek verilerle (seed data) doldurulur.
*   **Tam Ekran Desteği:** Tek tuşla uygulamayı tam ekran moduna alarak kiosk benzeri bir kullanım elde edin.

---

## 🛠️ Teknoloji Yığını

*   **Frontend (Arayüz):**
    *   **Vite:** Hızlı modül paketleyici ve geliştirme sunucusu.
    *   **Vanilla TypeScript:** Güvenli, ölçeklenebilir ve performanslı frontend mantığı.
    *   **Tailwind CSS v4:** Modern tasarım sistemi ve hızlı stil oluşturma.
*   **Backend (Sunucu):**
    *   **Tauri v2:** Rust ile güvenli, hafif ve yerel masaüstü uygulama geliştirme platformu.
    *   **Rust:** Yüksek güvenlik, hız ve kaynak verimliliği sağlayan sistem dili.
    *   **SQLite & Rusqlite:** Çevrimdışı veri depolama için gömülü SQL veritabanı.

---

## 📁 Proje Yapısı

Proje, Tauri standartlarına uygun olarak frontend ve backend olmak üzere iki ana bölümden oluşur:

```text
SamsaPOS/
├── src/                      # Frontend (Arayüz) Kaynak Kodları
│   ├── assets/               # Statik varlıklar ve ikonlar
│   ├── api.ts                # Tauri komutlarını çağıran API sarmalayıcısı
│   ├── main.ts               # Uygulama durum yönetimi ve olay dinleyicileri (Controller)
│   ├── render.ts             # HTML şablonları ve dinamik DOM render motoru (View)
│   ├── styles.css            # Tailwind CSS giriş ve özel stil tanımlamaları
│   ├── types.ts              # TypeScript arayüz ve tip tanımlamaları
│   └── utils.ts              # Görsel kırpma, yazdırma ve tam ekran gibi yardımcı araçlar
│
├── src-tauri/                # Backend (Rust) Kaynak Kodları
│   ├── src/
│   │   ├── commands.rs       # Frontend'den çağrılabilen Tauri komutları (API)
│   │   ├── db.rs             # SQLite veritabanı kurulumu, şema göçleri ve veri tohumlama (seeding)
│   │   ├── lib.rs            # Tauri uygulamasının başlatılması ve komut kaydı
│   │   ├── main.rs           # Rust giriş noktası (Entrypoint)
│   │   └── models.rs         # Rust veri modelleri (Structs)
│   ├── Cargo.toml            # Rust bağımlılık yöneticisi
│   └── tauri.conf.json       # Tauri yapılandırma dosyası
│
├── index.html                # Ana HTML giriş sayfası
├── package.json              # Node.js bağımlılıkları ve betikleri
└── tsconfig.json             # TypeScript yapılandırması
```

---

## 🔧 Kurulum ve Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları takip edin:

### Gereksinimler
1.  **Node.js** (v18 veya üzeri önerilir)
2.  **Rust** ve Cargo (Rust kurulumu için [rustup.rs](https://rustup.rs/) adresini ziyaret edin)
3.  **Tauri Ön Gereksinimleri:** İşletim sisteminize göre gerekli derleme araçları (Windows için C++ Build Tools). Detaylı kılavuz için [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) sayfasını inceleyebilirsiniz.

### Adım Adım Kurulum

1.  **Projeyi Klonlayın veya İndirin:**
    ```bash
    git clone https://github.com/bykemalh/SamsaPOS.git
    cd SamsaPOS
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

3.  **Geliştirme Sunucusunu Başlatın (Hot-Reloading):**
    ```bash
    npm run tauri dev
    ```
    Bu komut hem Vite geliştirme sunucusunu başlatır hem de Rust tarafını derleyerek yerel bir pencerede uygulamayı açar. Yapılan kod değişiklikleri anında arayüze yansır.

4.  **Üretim Sürümünü Derleyin (Build):**
    ```bash
    npm run tauri build
    ```
    Bu komut projenin en optimize edilmiş halini derleyerek bilgisayarınız için kurulabilir bir paket (`.exe`, `.msi` vb.) oluşturur. Derlenen dosyalar `src-tauri/target/release/bundle/` altında yer alır.

---

## 💾 Veritabanı ve Veri Depolama

Uygulama çalıştırıldığında, işletim sisteminizin standart uygulama veri klasöründe (App Data) `samsa-pos.sqlite` adında bir SQLite veritabanı oluşturulur.

*   **İlk Kurulum:** Uygulama ilk kez açıldığında `db.rs` içerisindeki şema komutları çalışarak gerekli tabloları (`tables`, `categories`, `products`, `orders`, `order_items`) otomatik oluşturur.
*   **Örnek Veriler (Seed):** Veritabanı boş ise testlerinizi kolaylaştırmak için 12 adet masa, 4 adet kategori (Çorbalar, Ana Yemekler, Tatlılar, İçecekler) ve bazı popüler Asya yemekleri içeren ürünler otomatik olarak veritabanına eklenir.
