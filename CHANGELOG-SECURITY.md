# سجل تحديثات الأمان — Shield Messenger (Secure Legion)

**المستودع:** https://github.com/abokenan444/shield-messenger  
**فرع التحديثات:** `security-updates`

لدمج هذه التحديثات في `main`: افتح Pull Request من الفرع `security-updates` إلى `main` على GitHub:  
https://github.com/abokenan444/shield-messenger/compare/main...security-updates

---

## إصدار التحديثات الأمنية (2025)

هذا السجل يوثق التحسينات الأمنية والخصوصية المضافة وفق خريطة الطريق والخبراء.

---

### 1. مقاومة تحليل حركة المرور (Traffic Analysis Resistance)

- **حجم حزم ثابت:** جميع رسائل البروتوكول (PING, PONG, ACK، إلخ) تُرسل بحجم ثابت **4096 بايت** مع padding عشوائي.
- **وحدة `network/padding.rs`:**
  - `pad_to_fixed_size()` — يضيف حقل الطول (2 بايت) ثم padding عشوائي حتى 4096 بايت.
  - `strip_padding()` — يسترجع المحتوى الفعلي عند الاستقبال.
  - `FIXED_PACKET_SIZE` و `MAX_PADDED_PAYLOAD` للاستخدام في البروتوكول.
- **تأخير عشوائي:** تأخير 200–800 ms قبل إرسال PONG و ACK لتقليل الارتباط الزمني.
- **التكامل في `network/tor.rs`:** مسار الإرسال والاستقبال يستخدم Padding تلقائياً؛ رسائل التحكم (PONG, ACK) تُرفض إذا فشل الـ padding (التزام البروتوكول).

---

### 2. مقارنات ثابتة الزمن (Constant-Time)

- **وحدة `crypto/constant_time.rs`:** دوال `eq_32`, `eq_64`, `eq_slices` باستخدام `subtle::ConstantTimeEq`.
- استخدام `eq_32` في `network/pingpong.rs` عند التحقق من `recipient_pubkey` في Ping لتجنب تسريب التوقيت.

---

### 3. Post-Quantum Double Ratchet (ML-KEM-1024)

- **وحدة `crypto/pq_ratchet.rs`:**
  - `PQRatchetState` — حالة الجلسة (جذر + سلاسل إرسال/استقبال + تسلسلات).
  - `from_hybrid_secret()` — تهيئة من السر المشترك الهجين (64 بايت) X25519+ML-KEM.
  - `encrypt()` / `decrypt()` — تشفير/فك مع تطور السلسلة (نفس المنطق الحالي).
  - `kem_ratchet_send()` / `kem_ratchet_receive()` — خطوات KEM لإعادة المفتاح (Post-Compromise Security).
- التكامل مع `crypto/pqc/hybrid_kem.rs` (X25519 + Kyber-1024) الموجود مسبقاً.

---

### 4. تصلّب الذاكرة (Memory Hardening)

- **`crypto/encryption.rs`:** مفتاح الرسالة `message_key` يُصفّر فوراً بعد الاستخدام في `encrypt_message_with_evolution` و `decrypt_message_with_evolution`.
- **Duress PIN:** استدعاء `clear_all_pending_ratchets_for_duress()` يفرغ خريطة الـ pending ratchets ويُصفّر مفاتيح السلسلة قبل الحذف.

---

### 5. إنكار معقول و Duress PIN (Plausible Deniability)

- **وحدة `storage/mod.rs`:**
  - واجهة/عقد للتخزين القابل للإنكار (التطبيق يطبّق قاعدة البيانات).
  - `DuressPinSpec` — مواصفة سلوك Duress PIN (عرض DB وهمية، مسار وهمي اختياري).
  - **`on_duress_pin_entered()`** — تُستدعى عند إدخال رقم الاضطرار؛ الـ core يمسح حالة الذاكرة الحساسة (مثل pending ratchets).
- **Android JNI:** `RustBridge.onDuressPinEntered()` — تستدعي `on_duress_pin_entered()` وترجع نجاح/فشل.
- التطبيق مسؤول عن: مسح قاعدة البيانات الحقيقية، تصفير المفتاح، وعرض DB وهمية إن لزم.

---

### 6. التزامات البروتوكول (Invariants)

- **عدم إرسال رسالة بدون padding:** PONG و ACK يُرفضان إذا فشل `pad_to_fixed_size`؛ لا fallback غير مصفوف.
- `debug_assert_eq!(to_send.len(), FIXED_PACKET_SIZE)` في مسار الإرسال.
- توثيق الالتزامات في `docs/protocol.md` (القسم 9 و 10).

---

### 7. بناء قابل للتكرار والتحقق (Reproducible / Verifiable Builds)

- **`Dockerfile.core`** — بناء متعدد المراحل لـ secure-legion-core مع إصدار Rust ثابت.
- **`.github/workflows/ci.yml`:**
  - بناء واختبارات.
  - `cargo-audit` للثغرات.
  - `cargo-deny` (مع `deny.toml`) للتراخيص والتبعيات.
  - على الـ push لـ main: حساب وعرض SHA256 للمخرجات.
- **`secure-legion-core/deny.toml`** — إعدادات cargo-deny.

---

### 8. Arti (مسار الهجرة إلى Tor بلغة Rust)

- **`docs/arti-migration.md`** — وصف الانتقال من C Tor إلى Arti: دوائر معزولة، خدمات مخفية مؤقتة، حركة تغطية.
- في **`Cargo.toml`** تعليق لـ feature اختياري `arti` مع إحالة إلى الوثيقة.
- إحالة في `docs/protocol.md` إلى مسار الهجرة.

---

### 9. التوثيق

- **`docs/protocol.md`** — مواصفة البروتوكول: Onion، Key Agreement، Ratchet، مقاومة تحليل الحركة، أنواع الرسائل، Ping-Pong، إنكار معقول، Duress PIN، التزامات الكود، مراجع.
- **`docs/arti-migration.md`** — خطة الانتقال إلى Arti.

---

### الملفات المضافة/المعدّلة (ملخص)

| المسار | الوصف |
|--------|--------|
| `secure-legion-core/src/network/padding.rs` | جديد — Padding وحجم ثابت وتأخير عشوائي |
| `secure-legion-core/src/crypto/constant_time.rs` | جديد — مقارنات ثابتة الزمن |
| `secure-legion-core/src/crypto/pq_ratchet.rs` | جديد — Post-Quantum Double Ratchet |
| `secure-legion-core/src/storage/mod.rs` | جديد — إنكار معقول و Duress PIN |
| `secure-legion-core/src/crypto/encryption.rs` | معدّل — zeroize لمفتاح الرسالة، clear_all_pending_ratchets_for_duress |
| `secure-legion-core/src/network/tor.rs` | معدّل — تكامل Padding وتأخير والتزامات |
| `secure-legion-core/src/network/pingpong.rs` | معدّل — مقارنة ثابتة الزمن لـ recipient_pubkey |
| `secure-legion-core/src/ffi/android.rs` | معدّل — onDuressPinEntered JNI |
| `docs/protocol.md` | جديد — مواصفة البروتوكول |
| `docs/arti-migration.md` | جديد — مسار Arti |
| `.github/workflows/ci.yml` | جديد — CI و audit و checksums |
| `Dockerfile.core` | جديد — بناء قابل للتكرار |
| `secure-legion-core/deny.toml` | جديد — إعدادات cargo-deny |
