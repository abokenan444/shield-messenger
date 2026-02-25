/* ─── Landing page translations (16 languages) ─── */

export interface LandingT {
  // Nav
  nav_home: string;
  nav_features: string;
  nav_pricing: string;
  nav_faq: string;
  nav_blog: string;
  nav_download: string;
  nav_login: string;
  nav_privacy: string;
  nav_terms: string;
  nav_transparency: string;
  nav_source: string;
  nav_contact: string;

  // Hero
  hero_title: string;
  hero_subtitle: string;
  hero_cta_download: string;
  hero_cta_features: string;

  // Problem & Solution
  ps_title: string;
  ps_problem: string;
  ps_problem_desc: string;
  ps_solution: string;
  ps_e2ee: string;
  ps_e2ee_desc: string;
  ps_tor: string;
  ps_tor_desc: string;
  ps_p2p: string;
  ps_p2p_desc: string;
  ps_wallet: string;
  ps_wallet_desc: string;

  // Features
  feat_title: string;
  feat_messaging: string;
  feat_messaging_desc: string;
  feat_privacy: string;
  feat_privacy_desc: string;
  feat_decentralized: string;
  feat_decentralized_desc: string;
  feat_identifiers: string;
  feat_identifiers_desc: string;
  feat_wallet: string;
  feat_wallet_desc: string;
  feat_pwa: string;
  feat_pwa_desc: string;
  feat_qr_verify: string;
  feat_qr_verify_desc: string;
  feat_trust_levels: string;
  feat_trust_levels_desc: string;
  feat_file_restriction: string;
  feat_file_restriction_desc: string;

  // Privacy guarantee
  priv_title: string;
  priv_no_data: string;
  priv_no_decrypt: string;
  priv_no_servers: string;
  priv_open_source: string;
  priv_bold_statement: string;

  // Pricing
  price_title: string;
  price_free: string;
  price_free_price: string;
  price_free_desc: string;
  price_free_f1: string;
  price_free_f2: string;
  price_free_f3: string;
  price_free_f4: string;
  price_free_f5: string;
  price_supporter: string;
  price_supporter_price: string;
  price_supporter_desc: string;
  price_supporter_f1: string;
  price_supporter_f2: string;
  price_supporter_f3: string;
  price_supporter_f4: string;
  price_supporter_f5: string;
  price_supporter_f6: string;
  price_enterprise: string;
  price_enterprise_price: string;
  price_enterprise_desc: string;
  price_enterprise_f1: string;
  price_enterprise_f2: string;
  price_enterprise_f3: string;
  price_enterprise_f4: string;
  price_reminder: string;
  price_cta: string;

  // FAQ
  faq_title: string;
  faq_q1: string;
  faq_a1: string;
  faq_q2: string;
  faq_a2: string;
  faq_q3: string;
  faq_a3: string;
  faq_q4: string;
  faq_a4: string;
  faq_q5: string;
  faq_a5: string;
  faq_q6: string;
  faq_a6: string;

  // CTA (download)
  cta_title: string;
  cta_subtitle: string;
  cta_android: string;
  cta_pwa: string;
  cta_ios: string;
  cta_install_pwa: string;

  // Footer
  footer_open_source: string;
  footer_community: string;
  footer_no_data: string;
  footer_rights: string;

  // Blog
  blog_title: string;
  blog_read_more: string;
  blog_no_posts: string;
  blog_loading: string;

  // Privacy Policy page
  pp_title: string;
  pp_intro: string;
  pp_section1_title: string;
  pp_section1_body: string;
  pp_section2_title: string;
  pp_section2_body: string;
  pp_section3_title: string;
  pp_section3_body: string;
  pp_section4_title: string;
  pp_section4_body: string;
  pp_section5_title: string;
  pp_section5_body: string;
  pp_closing: string;

  // Terms page
  tos_title: string;
  tos_intro: string;
  tos_section1_title: string;
  tos_section1_body: string;
  tos_section2_title: string;
  tos_section2_body: string;
  tos_section3_title: string;
  tos_section3_body: string;
  tos_section4_title: string;
  tos_section4_body: string;
  tos_section5_title: string;
  tos_section5_body: string;

  // Transparency page
  tr_title: string;
  tr_intro: string;
  tr_section1_title: string;
  tr_section1_body: string;
  tr_section2_title: string;
  tr_section2_body: string;
  tr_section3_title: string;
  tr_section3_body: string;
  tr_report_title: string;
  tr_report_body: string;
}

/* ═══ Arabic ═══ */
const ar: LandingT = {
  nav_home: 'الرئيسية',
  nav_features: 'الميزات',
  nav_pricing: 'الأسعار',
  nav_faq: 'الأسئلة الشائعة',
  nav_blog: 'المدونة',
  nav_download: 'تحميل',
  nav_login: 'تسجيل الدخول',
  nav_privacy: 'سياسة الخصوصية',
  nav_terms: 'شروط الاستخدام',
  nav_transparency: 'الشفافية',
  nav_source: 'المصدر المفتوح',
  nav_contact: 'تواصل معنا',

  hero_title: 'تواصل بلا حدود.. بلا رقابة.. بلا خوف',
  hero_subtitle: 'منصة مراسلات لا مركزية مشفرة بالكامل، تحمي هويتك وخصوصيتك من الجميع، حتى منا.',
  hero_cta_download: 'حمّل التطبيق الآن',
  hero_cta_features: 'اكتشف الميزات',

  ps_title: 'المشكلة والحل',
  ps_problem: 'المشكلة',
  ps_problem_desc: 'تطبيقات المراسلة التقليدية تجمع بياناتك، تراقب محادثاتك، وتبيع معلوماتك لشركات الإعلانات. حتى التطبيقات التي تدّعي التشفير تحتفظ ببيانات وصفية تكشف من تتحدث معه ومتى.',
  ps_solution: 'الحل',
  ps_e2ee: 'تشفير تام بين الطرفين (E2EE)',
  ps_e2ee_desc: 'تشفير هجين يجمع X25519 و ML-KEM-1024 — مقاوم حتى للحوسبة الكمومية.',
  ps_tor: 'شبكة Tor مدمجة',
  ps_tor_desc: 'لا يمكن تتبع موقعك أو هويتك. اتصالك يمر عبر طبقات من التشفير.',
  ps_p2p: 'لا خوادم مركزية (P2P)',
  ps_p2p_desc: 'اتصال مباشر بين الأجهزة. لا يوجد خادم وسيط يمكن اختراقه أو إيقافه.',
  ps_wallet: 'محفظة مشفرة للمدفوعات',
  ps_wallet_desc: 'أرسل واستقبل العملات المشفرة (Zcash + Solana) مباشرة داخل المحادثات.',

  feat_title: 'الميزات بالتفصيل',
  feat_messaging: 'الرسائل والمكالمات الآمنة',
  feat_messaging_desc: 'رسائل نصية وصوتية وصور وفيديو مشفرة E2EE، ومكالمات صوتية ومرئية عبر Tor بتشفير هجين (X25519 + ML-KEM-1024).',
  feat_privacy: 'الخصوصية القصوى',
  feat_privacy_desc: 'إخفاء "آخر ظهور" وعلامات القراءة. الرفض الصامت لطلبات الصداقة — لا إشعار للمرسل. مصادقة متعددة العوامل (2FA) عبر WebAuthn.',
  feat_decentralized: 'اللامركزية الكاملة',
  feat_decentralized_desc: 'لا خوادم مركزية للرسائل. اتصال مباشر بين الأجهزة عبر Tor Hidden Services. ثلاث خدمات مخفية: للاكتشاف، طلبات الصداقة، والمراسلة.',
  feat_identifiers: 'المعرفات الذكية',
  feat_identifiers_desc: 'نظام معرفات فريد مثل ahmed.s9442@securechat مع جزء عشوائي لمنع التخمين. البحث عبر DHT بدون خادم مركزي.',
  feat_wallet: 'المحفظة الرقمية',
  feat_wallet_desc: 'محفظة مدمجة لإرسال واستقبال Zcash (معاملات محمية) و Solana مباشرة داخل المحادثات بأمان تام.',
  feat_pwa: 'PWA كخيار احتياطي',
  feat_pwa_desc: 'تطبيق ويب تقدمي يعمل على جميع المتصفحات مع دعم Tor عبر WebAssembly. رابط مباشر لضمان الاستمرارية إذا حُظر التطبيق من المتاجر.',
  feat_qr_verify: 'التحقق عبر QR',
  feat_qr_verify_desc: 'تحقق من هوية جهات الاتصال عبر مسح رمز QR الذي يحتوي على بصمة المفتاح العام. بروتوكول SM-VERIFY:1 يضمن أنك تتحدث مع الشخص الصحيح.',
  feat_trust_levels: 'مستويات الثقة',
  feat_trust_levels_desc: 'ثلاث مستويات ثقة (L0 غير موثوق، L1 مشفر، L2 موثّق) تُخزن محلياً عبر SQLCipher. كل مستوى يحدد صلاحيات مختلفة للتفاعل.',
  feat_file_restriction: 'حماية الملفات الذكية',
  feat_file_restriction_desc: 'لا يمكن إرسال أو استقبال الملفات إلا مع جهات الاتصال الموثّقة (المستوى L2). تحذير تلقائي عند محاولة مشاركة ملفات مع جهات غير موثّقة.',

  priv_title: 'كيف نضمن الخصوصية؟',
  priv_no_data: 'لا نجمع أي بيانات شخصية — لا اسم، لا بريد إلكتروني، لا رقم هاتف، لا موقع جغرافي.',
  priv_no_decrypt: 'لا نستطيع فك تشفير رسائلك — المفاتيح فقط على جهازك.',
  priv_no_servers: 'لا توجد خوادم مركزية للرسائل — اتصال مباشر بين الأجهزة.',
  priv_open_source: 'الكود مفتوح المصدر بالكامل — يمكن لأي شخص تدقيقه والتحقق منه.',
  priv_bold_statement: 'لو طلبت منا حكومة ما بيانات مستخدمينا، لن نستطيع تلبية الطلب لأن البيانات ببساطة غير موجودة.',

  price_title: 'نماذج الأسعار',
  price_free: 'مجاني',
  price_free_price: '$0',
  price_free_desc: 'كل الميزات الأساسية — للجميع',
  price_free_f1: 'رسائل ومكالمات مشفرة E2EE',
  price_free_f2: 'مكالمات صوتية عبر Tor',
  price_free_f3: 'مجموعات حتى 100 عضو',
  price_free_f4: 'محفظة Zcash + Solana',
  price_free_f5: 'إخفاء آخر ظهور وعلامات القراءة',
  price_supporter: 'داعم',
  price_supporter_price: '$4.99/شهر',
  price_supporter_desc: 'للذين يريدون المزيد ودعم المشروع',
  price_supporter_f1: 'معرف سهل بدون الجزء العشوائي',
  price_supporter_f2: 'مساحة تخزين إضافية مشفرة',
  price_supporter_f3: 'دعم فني ذهبي وأولوية',
  price_supporter_f4: 'إضافات وسمات معتمدة',
  price_supporter_f5: 'ميزات إدارة متقدمة للمجموعات',
  price_supporter_f6: 'جميع ميزات المجاني',
  price_enterprise: 'مؤسسات',
  price_enterprise_price: 'تواصل معنا',
  price_enterprise_desc: 'للشركات والمنظمات',
  price_enterprise_f1: 'خادم خاص مُدار (managed homeserver)',
  price_enterprise_f2: 'نطاق فرعي مخصص (company.securechat)',
  price_enterprise_f3: 'لوحة تحكم وسجلات تدقيق مشفرة',
  price_enterprise_f4: 'دعم فني مخصص على مدار الساعة',
  price_reminder: 'اشتراكك يساعد في استمرار المشروع ولا يؤثر على خصوصيتك.',
  price_cta: 'ابدأ الآن',

  faq_title: 'الأسئلة الشائعة',
  faq_q1: 'هل يمكنكم قراءة رسائلي؟',
  faq_a1: 'لا. رسائلك مشفرة على جهازك بمفاتيح لا نملكها. حتى لو أردنا، لا نستطيع تقنياً فك تشفير أي رسالة.',
  faq_q2: 'ماذا يحدث إذا طلبت الحكومة بياناتي؟',
  faq_a2: 'سيكون ردنا: "نحن آسفون، لا نملك ما تطلبون." ببساطة لا نخزن أي بيانات مستخدمين. إذا طُلب منا كسر التشفير، سننسحب من السوق المعنية.',
  faq_q3: 'كيف أتأكد من أن التطبيق آمن؟',
  faq_a3: 'الكود مفتوح المصدر بالكامل على GitHub. يمكن لأي خبير أمني تدقيقه. نستخدم تشفير X25519 + ML-KEM-1024 المقاوم للحوسبة الكمومية.',
  faq_q4: 'ماذا لو اختفى التطبيق من المتاجر؟',
  faq_a4: 'لدينا PWA (تطبيق ويب تقدمي) كخيار احتياطي يعمل على أي متصفح حديث. كما نوفر تحميل APK مباشر من الموقع.',
  faq_q5: 'هل أحتاج رقم هاتف أو بريد إلكتروني للتسجيل؟',
  faq_a5: 'لا. نستخدم نظام معرفات فريد لا يتطلب أي بيانات شخصية. هويتك داخل التطبيق منفصلة تماماً عن هويتك الحقيقية.',
  faq_q6: 'كيف تموّلون المشروع بدون بيع البيانات؟',
  faq_a6: 'عبر الاشتراكات المدفوعة الاختيارية التي تضيف ميزات إضافية. الخدمة الأساسية مجانية بالكامل وبدون أي حدود على الخصوصية.',

  cta_title: 'ابدأ بالتواصل الآمن الآن',
  cta_subtitle: 'حمّل التطبيق على جهازك المفضل وانضم إلى مجتمع يحترم خصوصيتك.',
  cta_android: 'Android APK',
  cta_pwa: 'تطبيق الويب (PWA)',
  cta_ios: 'iOS TestFlight',
  cta_install_pwa: 'لتثبيت PWA: افتح الرابط في المتصفح ← اضغط على "إضافة إلى الشاشة الرئيسية" أو رمز التثبيت في شريط العنوان.',

  footer_open_source: 'مفتوح المصدر',
  footer_community: 'مدعوم من المجتمع',
  footer_no_data: 'لا نبيع بياناتك',
  footer_rights: '© 2026 Shield Messenger — جميع الحقوق محفوظة. الكود مفتوح المصدر بموجب ترخيص MIT.',

  blog_title: 'المدونة',
  blog_read_more: 'اقرأ المزيد',
  blog_no_posts: 'لا توجد مقالات بعد.',
  blog_loading: 'جاري التحميل...',

  pp_title: 'سياسة الخصوصية',
  pp_intro: 'خصوصيتك ليست مجرد سياسة لنا، بل هي أساس وجودنا. هذه الوثيقة تشرح بوضوح كيف نتعامل مع بياناتك — أو بالأحرى، كيف لا نتعامل معها.',
  pp_section1_title: 'ما البيانات التي نجمعها؟',
  pp_section1_body: 'نحن لا نجمع أي من بياناتك الشخصية. لا اسمك، لا بريدك الإلكتروني، لا رقم هاتفك، لا موقعك الجغرافي. لا نعرف من أنت ولا نريد أن نعرف.',
  pp_section2_title: 'الرسائل والمحتوى',
  pp_section2_body: 'رسائلك ومكالماتك مشفرة من جهازك إلى جهاز من تتواصل معه. حتى نحن كمطورين لا نملك المفاتيح لفك التشفير. لا توجد خوادم مركزية تخزن رسائلك — كل شيء على جهازك فقط.',
  pp_section3_title: 'التحليلات والإعلانات',
  pp_section3_body: 'نحن لا نستخدم أدوات تحليل (Analytics) من أي نوع. لا Google Analytics، لا Facebook Pixel، لا أي أداة تتبع. لا توجد إعلانات في التطبيق ولن تكون أبداً.',
  pp_section4_title: 'بيانات الاشتراك المدفوع',
  pp_section4_body: 'إذا اخترت الاشتراك في الخدمات المدفوعة، قد نطلب بريداً إلكترونياً للتواصل معك بخصوص الفواتير. هذا البريد يُخزن بشكل مشفر (AES-256-GCM) ولا يُربط أبداً بنشاطك داخل التطبيق. هويتك في الاشتراك منفصلة تماماً عن هويتك داخل التطبيق.',
  pp_section5_title: 'الطلبات الحكومية',
  pp_section5_body: 'إذا طلبت منا جهة حكومية بيانات مستخدم، فلن نستطيع تلبية الطلب، لأننا ببساطة لا نملك البيانات. البيانات الوحيدة التي قد نملكها هي بريد إلكتروني مشفر للمشتركين المدفوعين.',
  pp_closing: 'في Shield Messenger، لا نستطيع قراءة رسائلك. لا نستطيع معرفة من تتحدث معه. لا نستطيع تتبع موقعك. هذا ليس وعداً فقط، بل هو حقيقة تقنية. نحن لا نريد بياناتك، ولا نستطيع أخذها حتى لو أردنا.',

  tos_title: 'شروط الاستخدام',
  tos_intro: 'باستخدامك لمنصة Shield Messenger، فإنك توافق على الشروط التالية. نرجو قراءتها بعناية.',
  tos_section1_title: 'المسؤولية',
  tos_section1_body: 'أنت وحدك المسؤول عن استخدامك للتطبيق. نحن لا نتحمل مسؤولية أي محتوى يتبادله المستخدمون، ولا نستطيع مراقبته بسبب التشفير التام بين الطرفين.',
  tos_section2_title: 'الاستخدام المقبول',
  tos_section2_body: 'يُمنع استخدام المنصة في أنشطة غير قانونية. نحن لا نستطيع مراقبة ذلك بسبب طبيعة التشفير، لكننا نتوقع من مستخدمينا الالتزام بالقوانين المحلية.',
  tos_section3_title: 'الامتثال القانوني',
  tos_section3_body: 'إذا تلقينا أمراً قضائياً صحيحاً وسارياً في نطاقنا القضائي، قد نضطر للامتثال ضمن أضيق الحدود. لن نقدم أي شيء يتجاوز البيانات المحدودة جداً التي لدينا (مثل البريد الإلكتروني المشفر للمشتركين المدفوعين فقط).',
  tos_section4_title: 'حقوق الملكية',
  tos_section4_body: 'الكود مفتوح المصدر بموجب ترخيص MIT. الاسم "Shield Messenger" والعلامة التجارية والشعار هي حقوق محفوظة.',
  tos_section5_title: 'التعديلات',
  tos_section5_body: 'نحتفظ بالحق في تعديل هذه الشروط. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر التطبيق أو الموقع.',

  tr_title: 'سياسة الشفافية — الطلبات الحكومية',
  tr_intro: 'نؤمن بالشفافية الكاملة مع مستخدمينا. هذه الصفحة توضح كيف نتعامل مع أي طلبات حكومية أو قضائية.',
  tr_section1_title: 'وعدنا',
  tr_section1_body: 'سننشر تقرير شفافية نصف سنوي يوضح عدد الطلبات الحكومية التي تلقيناها (إن وجدت) وكيف تعاملنا معها.',
  tr_section2_title: 'مبدأنا',
  tr_section2_body: 'نحن لا نقدم أي تنازلات في التشفير أو الخصوصية. إذا طُلب منا كسر التشفير أو إضافة أبواب خلفية، سننسحب من السوق المعنية بدلاً من الامتثال — تماماً كما فعلت Signal.',
  tr_section3_title: 'الإجراء',
  tr_section3_body: 'أي طلب حكومي يجب أن يأتي عبر قنوات قانونية سليمة. سنقاوم الطلبات الواسعة أو غير القانونية بكل الوسائل القانونية المتاحة.',
  tr_report_title: 'تقارير الشفافية',
  tr_report_body: 'حتى الآن: 0 طلبات حكومية — 0 بيانات مُسلّمة. سنحدّث هذا القسم كل ستة أشهر.',
};

/* ═══ English ═══ */
const en: LandingT = {
  nav_home: 'Home',
  nav_features: 'Features',
  nav_pricing: 'Pricing',
  nav_faq: 'FAQ',
  nav_blog: 'Blog',
  nav_download: 'Download',
  nav_login: 'Log in',
  nav_privacy: 'Privacy Policy',
  nav_terms: 'Terms of Service',
  nav_transparency: 'Transparency',
  nav_source: 'Open Source',
  nav_contact: 'Contact',

  hero_title: 'Communicate without limits. Without surveillance. Without fear.',
  hero_subtitle: 'A fully encrypted, decentralized messaging platform that protects your identity and privacy from everyone — even us.',
  hero_cta_download: 'Download Now',
  hero_cta_features: 'Discover Features',

  ps_title: 'The Problem & The Solution',
  ps_problem: 'The Problem',
  ps_problem_desc: 'Traditional messaging apps collect your data, monitor your conversations, and sell your information to advertisers. Even apps that claim encryption retain metadata revealing who you talk to and when.',
  ps_solution: 'The Solution',
  ps_e2ee: 'End-to-End Encryption (E2EE)',
  ps_e2ee_desc: 'Hybrid encryption combining X25519 and ML-KEM-1024 — resistant even to quantum computing.',
  ps_tor: 'Built-in Tor Network',
  ps_tor_desc: 'Your location and identity cannot be traced. Your connection passes through layers of encryption.',
  ps_p2p: 'No Central Servers (P2P)',
  ps_p2p_desc: 'Direct device-to-device connection. No intermediary server that can be hacked or shut down.',
  ps_wallet: 'Encrypted Payment Wallet',
  ps_wallet_desc: 'Send and receive crypto (Zcash + Solana) directly within conversations.',

  feat_title: 'Features in Detail',
  feat_messaging: 'Secure Messages & Calls',
  feat_messaging_desc: 'E2EE text, voice, photo, and video messages. Encrypted voice and video calls via Tor with hybrid encryption (X25519 + ML-KEM-1024).',
  feat_privacy: 'Maximum Privacy',
  feat_privacy_desc: 'Hide "last seen" and read receipts. Silent rejection of friend requests — no notification to the sender. Multi-factor authentication (2FA) via WebAuthn.',
  feat_decentralized: 'Full Decentralization',
  feat_decentralized_desc: 'No central message servers. Direct device-to-device connection via Tor Hidden Services. Three hidden services: discovery, friend requests, messaging.',
  feat_identifiers: 'Smart Identifiers',
  feat_identifiers_desc: 'Unique identifier system like ahmed.s9442@securechat with a random component to prevent guessing. Search via DHT without any central server.',
  feat_wallet: 'Digital Wallet',
  feat_wallet_desc: 'Built-in wallet for sending and receiving Zcash (shielded transactions) and Solana directly within conversations with full security.',
  feat_pwa: 'PWA as Backup',
  feat_pwa_desc: 'A progressive web app that works on all modern browsers with Tor support via WebAssembly. A direct link to ensure continuity if the app is banned from stores.',
  feat_qr_verify: 'QR Fingerprint Verification',
  feat_qr_verify_desc: 'Verify contact identities by scanning a QR code containing their public key fingerprint. The SM-VERIFY:1 protocol ensures you are talking to the right person.',
  feat_trust_levels: 'Trust Levels',
  feat_trust_levels_desc: 'Three trust levels (L0 Untrusted, L1 Encrypted, L2 Verified) stored locally via SQLCipher. Each level defines different interaction permissions.',
  feat_file_restriction: 'Smart File Protection',
  feat_file_restriction_desc: 'Files can only be sent or received with verified contacts (Level L2). Automatic warning when attempting to share files with unverified contacts.',

  priv_title: 'How Do We Guarantee Privacy?',
  priv_no_data: 'We collect zero personal data — no name, no email, no phone number, no location.',
  priv_no_decrypt: 'We cannot decrypt your messages — the keys exist only on your device.',
  priv_no_servers: 'No central message servers — direct device-to-device connection.',
  priv_open_source: 'The code is fully open source — anyone can audit and verify it.',
  priv_bold_statement: 'If a government asked us for user data, we simply cannot comply because the data does not exist.',

  price_title: 'Pricing',
  price_free: 'Free',
  price_free_price: '$0',
  price_free_desc: 'All core features — for everyone',
  price_free_f1: 'E2EE encrypted messages & calls',
  price_free_f2: 'Voice calls over Tor',
  price_free_f3: 'Groups up to 100 members',
  price_free_f4: 'Zcash + Solana wallet',
  price_free_f5: 'Hide last seen & read receipts',
  price_supporter: 'Supporter',
  price_supporter_price: '$4.99/mo',
  price_supporter_desc: 'For those who want more and support the project',
  price_supporter_f1: 'Easy ID without random suffix',
  price_supporter_f2: 'Extra encrypted storage',
  price_supporter_f3: 'Gold support & priority',
  price_supporter_f4: 'Verified add-ons & themes',
  price_supporter_f5: 'Advanced group management',
  price_supporter_f6: 'All free features included',
  price_enterprise: 'Enterprise',
  price_enterprise_price: 'Contact Us',
  price_enterprise_desc: 'For companies and organizations',
  price_enterprise_f1: 'Managed private homeserver',
  price_enterprise_f2: 'Custom subdomain (company.securechat)',
  price_enterprise_f3: 'Admin dashboard & encrypted audit logs',
  price_enterprise_f4: 'Dedicated 24/7 support',
  price_reminder: 'Your subscription helps sustain the project and does not affect your privacy.',
  price_cta: 'Get Started',

  faq_title: 'Frequently Asked Questions',
  faq_q1: 'Can you read my messages?',
  faq_a1: 'No. Your messages are encrypted on your device with keys we do not possess. Even if we wanted to, we technically cannot decrypt any message.',
  faq_q2: 'What happens if a government requests my data?',
  faq_a2: 'Our answer will be: "We\'re sorry, we don\'t have what you\'re looking for." We simply don\'t store any user data. If asked to break encryption, we will withdraw from that market.',
  faq_q3: 'How can I be sure the app is secure?',
  faq_a3: 'The code is fully open source on GitHub. Any security expert can audit it. We use X25519 + ML-KEM-1024 encryption resistant to quantum computing.',
  faq_q4: 'What if the app disappears from app stores?',
  faq_a4: 'We have a PWA (Progressive Web App) as a backup that works on any modern browser. We also provide direct APK download from our website.',
  faq_q5: 'Do I need a phone number or email to register?',
  faq_a5: 'No. We use a unique identifier system that requires no personal data. Your in-app identity is completely separate from your real identity.',
  faq_q6: 'How do you fund the project without selling data?',
  faq_a6: 'Through optional paid subscriptions that add extra features. The core service is completely free with no limits on privacy.',

  cta_title: 'Start Communicating Securely Now',
  cta_subtitle: 'Download the app on your preferred device and join a community that respects your privacy.',
  cta_android: 'Android APK',
  cta_pwa: 'Web App (PWA)',
  cta_ios: 'iOS TestFlight',
  cta_install_pwa: 'To install PWA: Open the link in your browser → Click "Add to Home Screen" or the install icon in the address bar.',

  footer_open_source: 'Open Source',
  footer_community: 'Community Supported',
  footer_no_data: 'We Don\'t Sell Your Data',
  footer_rights: '© 2026 Shield Messenger — All rights reserved. Code is open source under MIT License.',

  blog_title: 'Blog',
  blog_read_more: 'Read more',
  blog_no_posts: 'No posts yet.',
  blog_loading: 'Loading...',

  pp_title: 'Privacy Policy',
  pp_intro: 'Your privacy is not just a policy for us — it\'s the foundation of our existence. This document clearly explains how we handle your data — or rather, how we don\'t.',
  pp_section1_title: 'What Data Do We Collect?',
  pp_section1_body: 'We do not collect any of your personal data. Not your name, not your email, not your phone number, not your location. We don\'t know who you are and we don\'t want to know.',
  pp_section2_title: 'Messages & Content',
  pp_section2_body: 'Your messages and calls are encrypted from your device to the device of the person you\'re communicating with. Even we as developers do not have the keys to decrypt them. There are no central servers storing your messages — everything stays on your device.',
  pp_section3_title: 'Analytics & Advertising',
  pp_section3_body: 'We do not use any analytics tools whatsoever. No Google Analytics, no Facebook Pixel, no tracking tools of any kind. There are no ads in the app and there never will be.',
  pp_section4_title: 'Paid Subscription Data',
  pp_section4_body: 'If you choose to subscribe to paid services, we may ask for an email for billing communication. This email is stored encrypted (AES-256-GCM) and is never linked to your in-app activity. Your subscription identity is completely separate from your in-app identity.',
  pp_section5_title: 'Government Requests',
  pp_section5_body: 'If a government agency requests user data from us, we cannot comply because we simply do not have the data. The only data we may possess is an encrypted email address for paid subscribers.',
  pp_closing: 'At Shield Messenger, we cannot read your messages. We cannot know who you talk to. We cannot track your location. This is not just a promise — it\'s a technical reality. We don\'t want your data, and we couldn\'t take it even if we wanted to.',

  tos_title: 'Terms of Service',
  tos_intro: 'By using the Shield Messenger platform, you agree to the following terms. Please read them carefully.',
  tos_section1_title: 'Responsibility',
  tos_section1_body: 'You are solely responsible for your use of the application. We bear no responsibility for any content exchanged by users, nor can we monitor it due to end-to-end encryption.',
  tos_section2_title: 'Acceptable Use',
  tos_section2_body: 'Using the platform for illegal activities is prohibited. We cannot monitor this due to the nature of encryption, but we expect our users to comply with local laws.',
  tos_section3_title: 'Legal Compliance',
  tos_section3_body: 'If we receive a valid court order within our jurisdiction, we may be compelled to comply within the narrowest possible scope. We will not provide anything beyond the very limited data we hold (such as encrypted email addresses of paid subscribers only).',
  tos_section4_title: 'Intellectual Property',
  tos_section4_body: 'The code is open source under MIT License. The name "Shield Messenger", trademark, and logo are reserved rights.',
  tos_section5_title: 'Changes',
  tos_section5_body: 'We reserve the right to modify these terms. Users will be notified of any material changes through the app or website.',

  tr_title: 'Transparency Policy — Government Requests',
  tr_intro: 'We believe in complete transparency with our users. This page details how we handle any government or judicial requests.',
  tr_section1_title: 'Our Promise',
  tr_section1_body: 'We will publish a semi-annual transparency report listing the number of government requests received (if any) and how we handled them.',
  tr_section2_title: 'Our Principle',
  tr_section2_body: 'We make no compromises on encryption or privacy. If asked to break encryption or add backdoors, we will withdraw from the relevant market rather than comply — just as Signal has done.',
  tr_section3_title: 'Our Process',
  tr_section3_body: 'Any government request must come through proper legal channels. We will challenge broad or illegal requests through all available legal means.',
  tr_report_title: 'Transparency Reports',
  tr_report_body: 'To date: 0 government requests — 0 data disclosed. We will update this section every six months.',
};

/* ═══ Français ═══ */
const fr: LandingT = {
  nav_home: 'Accueil',
  nav_features: 'Fonctionnalités',
  nav_pricing: 'Tarifs',
  nav_faq: 'FAQ',
  nav_blog: 'Blog',
  nav_download: 'Télécharger',
  nav_login: 'Connexion',
  nav_privacy: 'Politique de confidentialité',
  nav_terms: 'Conditions d\'utilisation',
  nav_transparency: 'Transparence',
  nav_source: 'Open Source',
  nav_contact: 'Contact',

  hero_title: 'Communiquez sans limites. Sans surveillance. Sans peur.',
  hero_subtitle: 'Une plateforme de messagerie décentralisée et entièrement chiffrée qui protège votre identité et votre vie privée de tous — même de nous.',
  hero_cta_download: 'Télécharger maintenant',
  hero_cta_features: 'Découvrir les fonctionnalités',

  ps_title: 'Le problème et la solution',
  ps_problem: 'Le problème',
  ps_problem_desc: 'Les applications de messagerie traditionnelles collectent vos données, surveillent vos conversations et vendent vos informations aux annonceurs.',
  ps_solution: 'La solution',
  ps_e2ee: 'Chiffrement de bout en bout (E2EE)',
  ps_e2ee_desc: 'Chiffrement hybride combinant X25519 et ML-KEM-1024 — résistant même à l\'informatique quantique.',
  ps_tor: 'Réseau Tor intégré',
  ps_tor_desc: 'Votre position et votre identité ne peuvent pas être tracées.',
  ps_p2p: 'Pas de serveurs centraux (P2P)',
  ps_p2p_desc: 'Connexion directe appareil à appareil. Aucun serveur intermédiaire piratable.',
  ps_wallet: 'Portefeuille de paiement chiffré',
  ps_wallet_desc: 'Envoyez et recevez des crypto-monnaies (Zcash + Solana) directement dans les conversations.',

  feat_title: 'Fonctionnalités en détail',
  feat_messaging: 'Messages et appels sécurisés',
  feat_messaging_desc: 'Messages texte, vocaux, photos et vidéos chiffrés E2EE. Appels vocaux et vidéo via Tor.',
  feat_privacy: 'Confidentialité maximale',
  feat_privacy_desc: 'Masquez « dernière connexion » et les confirmations de lecture. Rejet silencieux des demandes.',
  feat_decentralized: 'Décentralisation complète',
  feat_decentralized_desc: 'Aucun serveur central de messages. Connexion directe via Tor Hidden Services.',
  feat_identifiers: 'Identifiants intelligents',
  feat_identifiers_desc: 'Système d\'identifiants unique comme ahmed.s9442@securechat avec composant aléatoire.',
  feat_wallet: 'Portefeuille numérique',
  feat_wallet_desc: 'Portefeuille intégré pour envoyer et recevoir Zcash et Solana dans les conversations.',
  feat_pwa: 'PWA en secours',
  feat_pwa_desc: 'Application web progressive fonctionnant sur tous les navigateurs modernes avec support Tor via WebAssembly.',
  feat_qr_verify: 'Vérification par QR',
  feat_qr_verify_desc: 'Vérifiez l\'identité de vos contacts en scannant un code QR contenant l\'empreinte de leur clé publique. Le protocole SM-VERIFY:1 garantit que vous parlez à la bonne personne.',
  feat_trust_levels: 'Niveaux de confiance',
  feat_trust_levels_desc: 'Trois niveaux de confiance (L0 Non fiable, L1 Chiffré, L2 Vérifié) stockés localement via SQLCipher. Chaque niveau définit des permissions d\'interaction différentes.',
  feat_file_restriction: 'Protection intelligente des fichiers',
  feat_file_restriction_desc: 'Les fichiers ne peuvent être envoyés ou reçus qu\'avec les contacts vérifiés (Niveau L2). Avertissement automatique lors de tentatives de partage avec des contacts non vérifiés.',

  priv_title: 'Comment garantissons-nous la confidentialité ?',
  priv_no_data: 'Nous ne collectons aucune donnée personnelle — ni nom, ni email, ni téléphone, ni localisation.',
  priv_no_decrypt: 'Nous ne pouvons pas déchiffrer vos messages — les clés n\'existent que sur votre appareil.',
  priv_no_servers: 'Pas de serveurs centraux de messages — connexion directe appareil à appareil.',
  priv_open_source: 'Le code est entièrement open source — tout le monde peut l\'auditer.',
  priv_bold_statement: 'Si un gouvernement nous demandait les données de nos utilisateurs, nous ne pourrions tout simplement pas les fournir car elles n\'existent pas.',

  price_title: 'Tarifs',
  price_free: 'Gratuit',
  price_free_price: '0 €',
  price_free_desc: 'Toutes les fonctionnalités de base — pour tous',
  price_free_f1: 'Messages et appels chiffrés E2EE',
  price_free_f2: 'Appels vocaux via Tor',
  price_free_f3: 'Groupes jusqu\'à 100 membres',
  price_free_f4: 'Portefeuille Zcash + Solana',
  price_free_f5: 'Masquer dernière connexion et accusés de lecture',
  price_supporter: 'Supporter',
  price_supporter_price: '4,99 €/mois',
  price_supporter_desc: 'Pour ceux qui veulent plus et soutenir le projet',
  price_supporter_f1: 'Identifiant simplifié sans suffixe aléatoire',
  price_supporter_f2: 'Stockage supplémentaire chiffré',
  price_supporter_f3: 'Support prioritaire',
  price_supporter_f4: 'Extensions et thèmes vérifiés',
  price_supporter_f5: 'Gestion avancée des groupes',
  price_supporter_f6: 'Toutes les fonctionnalités gratuites incluses',
  price_enterprise: 'Entreprise',
  price_enterprise_price: 'Contactez-nous',
  price_enterprise_desc: 'Pour les entreprises et organisations',
  price_enterprise_f1: 'Serveur privé géré',
  price_enterprise_f2: 'Sous-domaine personnalisé',
  price_enterprise_f3: 'Tableau de bord admin et journaux d\'audit chiffrés',
  price_enterprise_f4: 'Support dédié 24/7',
  price_reminder: 'Votre abonnement aide à maintenir le projet et n\'affecte pas votre confidentialité.',
  price_cta: 'Commencer',

  faq_title: 'Questions fréquemment posées',
  faq_q1: 'Pouvez-vous lire mes messages ?',
  faq_a1: 'Non. Vos messages sont chiffrés sur votre appareil avec des clés que nous ne possédons pas.',
  faq_q2: 'Que se passe-t-il si un gouvernement demande mes données ?',
  faq_a2: 'Notre réponse sera : « Nous sommes désolés, nous n\'avons pas ce que vous cherchez. » Nous ne stockons aucune donnée utilisateur.',
  faq_q3: 'Comment être sûr que l\'application est sécurisée ?',
  faq_a3: 'Le code est entièrement open source sur GitHub. Tout expert en sécurité peut l\'auditer.',
  faq_q4: 'Que se passe-t-il si l\'application disparaît des stores ?',
  faq_a4: 'Nous avons une PWA comme solution de secours et un téléchargement APK direct depuis notre site.',
  faq_q5: 'Ai-je besoin d\'un numéro de téléphone ou d\'un email pour m\'inscrire ?',
  faq_a5: 'Non. Nous utilisons un système d\'identifiants unique ne nécessitant aucune donnée personnelle.',
  faq_q6: 'Comment financez-vous le projet sans vendre de données ?',
  faq_a6: 'Par des abonnements payants optionnels ajoutant des fonctionnalités supplémentaires.',

  cta_title: 'Commencez à communiquer en toute sécurité',
  cta_subtitle: 'Téléchargez l\'application sur votre appareil préféré et rejoignez une communauté qui respecte votre vie privée.',
  cta_android: 'Android APK',
  cta_pwa: 'Application Web (PWA)',
  cta_ios: 'iOS TestFlight',
  cta_install_pwa: 'Pour installer la PWA : Ouvrez le lien dans votre navigateur → Cliquez sur « Ajouter à l\'écran d\'accueil ».',

  footer_open_source: 'Open Source',
  footer_community: 'Soutenu par la communauté',
  footer_no_data: 'Nous ne vendons pas vos données',
  footer_rights: '© 2026 Shield Messenger — Tous droits réservés. Code open source sous licence MIT.',

  blog_title: 'Blog',
  blog_read_more: 'Lire la suite',
  blog_no_posts: 'Aucun article pour le moment.',
  blog_loading: 'Chargement...',

  pp_title: 'Politique de confidentialité',
  pp_intro: 'Votre vie privée n\'est pas qu\'une politique pour nous — c\'est le fondement de notre existence.',
  pp_section1_title: 'Quelles données collectons-nous ?',
  pp_section1_body: 'Nous ne collectons aucune de vos données personnelles. Ni votre nom, ni votre email, ni votre numéro de téléphone, ni votre localisation.',
  pp_section2_title: 'Messages et contenu',
  pp_section2_body: 'Vos messages et appels sont chiffrés de votre appareil à celui de votre correspondant. Même nous, en tant que développeurs, n\'avons pas les clés pour les déchiffrer.',
  pp_section3_title: 'Analyses et publicité',
  pp_section3_body: 'Nous n\'utilisons aucun outil d\'analyse. Pas de Google Analytics, pas de Facebook Pixel, aucun outil de suivi.',
  pp_section4_title: 'Données d\'abonnement payant',
  pp_section4_body: 'Si vous souscrivez à un service payant, nous pouvons demander un email pour la facturation. Cet email est stocké chiffré (AES-256-GCM) et n\'est jamais lié à votre activité dans l\'application.',
  pp_section5_title: 'Demandes gouvernementales',
  pp_section5_body: 'Si une agence gouvernementale nous demande des données utilisateur, nous ne pouvons pas y répondre car nous ne possédons tout simplement pas les données.',
  pp_closing: 'Chez Shield Messenger, nous ne pouvons pas lire vos messages. Nous ne pouvons pas savoir à qui vous parlez. Ce n\'est pas une promesse — c\'est une réalité technique.',

  tos_title: 'Conditions d\'utilisation',
  tos_intro: 'En utilisant Shield Messenger, vous acceptez les conditions suivantes.',
  tos_section1_title: 'Responsabilité',
  tos_section1_body: 'Vous êtes seul responsable de votre utilisation de l\'application.',
  tos_section2_title: 'Utilisation acceptable',
  tos_section2_body: 'L\'utilisation de la plateforme pour des activités illégales est interdite.',
  tos_section3_title: 'Conformité légale',
  tos_section3_body: 'Si nous recevons une ordonnance judiciaire valide, nous pouvons être contraints de nous conformer dans les limites les plus étroites.',
  tos_section4_title: 'Propriété intellectuelle',
  tos_section4_body: 'Le code est open source sous licence MIT. Le nom et le logo sont des droits réservés.',
  tos_section5_title: 'Modifications',
  tos_section5_body: 'Nous nous réservons le droit de modifier ces conditions. Les utilisateurs seront informés de tout changement important.',

  tr_title: 'Politique de transparence — Demandes gouvernementales',
  tr_intro: 'Nous croyons en la transparence totale avec nos utilisateurs.',
  tr_section1_title: 'Notre promesse',
  tr_section1_body: 'Nous publierons un rapport de transparence semestriel.',
  tr_section2_title: 'Notre principe',
  tr_section2_body: 'Nous ne faisons aucun compromis sur le chiffrement ou la confidentialité.',
  tr_section3_title: 'Notre processus',
  tr_section3_body: 'Toute demande gouvernementale doit passer par les voies légales appropriées.',
  tr_report_title: 'Rapports de transparence',
  tr_report_body: 'À ce jour : 0 demandes gouvernementales — 0 données divulguées.',
};

/* ═══ Español ═══ */
const es: LandingT = {
  ...en,
  nav_home: 'Inicio', nav_features: 'Características', nav_pricing: 'Precios', nav_faq: 'Preguntas frecuentes', nav_blog: 'Blog', nav_download: 'Descargar', nav_login: 'Iniciar sesión', nav_privacy: 'Política de privacidad', nav_terms: 'Términos de servicio', nav_transparency: 'Transparencia', nav_source: 'Código abierto', nav_contact: 'Contacto',
  hero_title: 'Comunícate sin límites. Sin vigilancia. Sin miedo.',
  hero_subtitle: 'Una plataforma de mensajería descentralizada y completamente cifrada que protege tu identidad y privacidad de todos — incluso de nosotros.',
  hero_cta_download: 'Descargar ahora', hero_cta_features: 'Descubrir características',
  ps_title: 'El problema y la solución', ps_problem: 'El problema', ps_solution: 'La solución',
  ps_problem_desc: 'Las aplicaciones de mensajería tradicionales recopilan tus datos, monitorizan tus conversaciones y venden tu información.',
  feat_title: 'Características en detalle',
  priv_title: '¿Cómo garantizamos la privacidad?',
  priv_bold_statement: 'Si un gobierno nos pidiera datos de usuarios, simplemente no podríamos proporcionarlos porque no existen.',
  price_title: 'Precios', price_free: 'Gratis', price_free_price: '$0', price_supporter: 'Apoyo', price_supporter_price: '$4.99/mes', price_enterprise: 'Empresa', price_enterprise_price: 'Contáctanos',
  price_reminder: 'Tu suscripción ayuda a sostener el proyecto y no afecta tu privacidad.',
  faq_title: 'Preguntas frecuentes',
  cta_title: 'Comienza a comunicarte de forma segura',
  footer_rights: '© 2026 Shield Messenger — Todos los derechos reservados. Código abierto bajo licencia MIT.',
  pp_title: 'Política de privacidad', tos_title: 'Términos de servicio', tr_title: 'Política de transparencia — Solicitudes gubernamentales',
};

/* ═══ Deutsch ═══ */
const de: LandingT = {
  ...en,
  nav_home: 'Startseite', nav_features: 'Funktionen', nav_pricing: 'Preise', nav_faq: 'FAQ', nav_download: 'Herunterladen', nav_login: 'Anmelden', nav_privacy: 'Datenschutzrichtlinie', nav_terms: 'Nutzungsbedingungen', nav_transparency: 'Transparenz', nav_source: 'Open Source', nav_contact: 'Kontakt',
  hero_title: 'Kommuniziere ohne Grenzen. Ohne Überwachung. Ohne Angst.',
  hero_subtitle: 'Eine vollständig verschlüsselte, dezentrale Messaging-Plattform, die Ihre Identität und Privatsphäre vor allen schützt — sogar vor uns.',
  hero_cta_download: 'Jetzt herunterladen', hero_cta_features: 'Funktionen entdecken',
  ps_title: 'Das Problem und die Lösung', ps_problem: 'Das Problem', ps_solution: 'Die Lösung',
  feat_title: 'Funktionen im Detail', priv_title: 'Wie garantieren wir die Privatsphäre?',
  priv_bold_statement: 'Wenn eine Regierung uns nach Nutzerdaten fragt, können wir einfach nicht liefern, weil die Daten nicht existieren.',
  price_title: 'Preise', price_free: 'Kostenlos', price_free_price: '0 €', price_supporter: 'Unterstützer', price_supporter_price: '4,99 €/Monat', price_enterprise: 'Unternehmen', price_enterprise_price: 'Kontakt',
  faq_title: 'Häufig gestellte Fragen',
  cta_title: 'Jetzt sicher kommunizieren',
  footer_rights: '© 2026 Shield Messenger — Alle Rechte vorbehalten. Code ist Open Source unter MIT-Lizenz.',
  pp_title: 'Datenschutzrichtlinie', tos_title: 'Nutzungsbedingungen', tr_title: 'Transparenzpolitik — Regierungsanfragen',
};

/* ═══ Türkçe ═══ */
const tr: LandingT = {
  ...en,
  nav_home: 'Ana Sayfa', nav_features: 'Özellikler', nav_pricing: 'Fiyatlar', nav_faq: 'SSS', nav_download: 'İndir', nav_login: 'Giriş', nav_privacy: 'Gizlilik Politikası', nav_terms: 'Kullanım Şartları', nav_transparency: 'Şeffaflık', nav_source: 'Açık Kaynak', nav_contact: 'İletişim',
  hero_title: 'Sınırsız iletişim. Gözetimsiz. Korkusuz.',
  hero_subtitle: 'Kimliğinizi ve gizliliğinizi herkesten — hatta bizden bile — koruyan tamamen şifreli, merkezi olmayan bir mesajlaşma platformu.',
  hero_cta_download: 'Şimdi İndir', hero_cta_features: 'Özellikleri Keşfet',
  ps_title: 'Sorun ve Çözüm', ps_problem: 'Sorun', ps_solution: 'Çözüm',
  feat_title: 'Detaylı Özellikler', priv_title: 'Gizliliği nasıl garanti ediyoruz?',
  priv_bold_statement: 'Bir hükümet bizden kullanıcı verilerini istese bile, veriler mevcut olmadığı için bunu karşılayamayız.',
  price_title: 'Fiyatlar', price_free: 'Ücretsiz', price_free_price: '$0', price_supporter: 'Destekçi', price_supporter_price: '$4.99/ay', price_enterprise: 'Kurumsal', price_enterprise_price: 'Bize Ulaşın',
  faq_title: 'Sıkça Sorulan Sorular',
  cta_title: 'Güvenli İletişime Şimdi Başlayın',
  footer_rights: '© 2026 Shield Messenger — Tüm hakları saklıdır. Kod MIT Lisansı altında açık kaynaktır.',
  pp_title: 'Gizlilik Politikası', tos_title: 'Kullanım Şartları', tr_title: 'Şeffaflık Politikası — Hükümet Talepleri',
};

/* ═══ فارسی ═══ */
const fa: LandingT = {
  ...en,
  nav_home: 'خانه', nav_features: 'ویژگی‌ها', nav_pricing: 'قیمت‌ها', nav_faq: 'سوالات متداول', nav_download: 'دانلود', nav_login: 'ورود', nav_privacy: 'سیاست حریم خصوصی', nav_terms: 'شرایط استفاده', nav_transparency: 'شفافیت', nav_source: 'اپن سورس', nav_contact: 'تماس',
  hero_title: 'ارتباط بدون مرز. بدون نظارت. بدون ترس.',
  hero_subtitle: 'یک پلتفرم پیام‌رسان غیرمتمرکز و کاملاً رمزنگاری‌شده که هویت و حریم خصوصی شما را از همه محافظت می‌کند — حتی از ما.',
  hero_cta_download: 'اکنون دانلود کنید', hero_cta_features: 'کشف ویژگی‌ها',
  priv_bold_statement: 'اگر دولتی از ما داده‌های کاربران را بخواهد، ما نمی‌توانیم پاسخ دهیم زیرا داده‌ها اصلاً وجود ندارند.',
  price_title: 'قیمت‌ها', price_free: 'رایگان', price_free_price: '$0', price_supporter: 'حامی', price_supporter_price: '$4.99/ماه', price_enterprise: 'سازمانی', price_enterprise_price: 'تماس بگیرید',
  footer_rights: '© 2026 Shield Messenger — تمامی حقوق محفوظ است. کد تحت مجوز MIT اپن سورس است.',
  pp_title: 'سیاست حریم خصوصی', tos_title: 'شرایط استفاده', tr_title: 'سیاست شفافیت — درخواست‌های دولتی',
};

/* ═══ اردو ═══ */
const ur: LandingT = {
  ...en,
  nav_home: 'ہوم', nav_features: 'خصوصیات', nav_pricing: 'قیمتیں', nav_faq: 'عمومی سوالات', nav_download: 'ڈاؤن لوڈ', nav_login: 'لاگ ان', nav_privacy: 'رازداری کی پالیسی', nav_terms: 'استعمال کی شرائط', nav_transparency: 'شفافیت', nav_source: 'اوپن سورس', nav_contact: 'رابطہ',
  hero_title: 'بلا حد و حساب رابطہ۔ بغیر نگرانی۔ بغیر خوف۔',
  hero_subtitle: 'ایک مکمل طور پر انکرپٹڈ، غیر مرکزی پیغام رسانی پلیٹ فارم جو آپ کی شناخت اور رازداری کو سب سے بچاتا ہے — حتی ہم سے بھی۔',
  hero_cta_download: 'ابھی ڈاؤن لوڈ کریں', hero_cta_features: 'خصوصیات دریافت کریں',
  priv_bold_statement: 'اگر کوئی حکومت ہم سے صارفین کا ڈیٹا مانگے تو ہم فراہم نہیں کر سکتے کیونکہ ڈیٹا موجود ہی نہیں ہے۔',
  footer_rights: '© 2026 Shield Messenger — جملہ حقوق محفوظ ہیں۔ کوڈ MIT لائسنس کے تحت اوپن سورس ہے۔',
  pp_title: 'رازداری کی پالیسی', tos_title: 'استعمال کی شرائط', tr_title: 'شفافیت کی پالیسی — حکومتی درخواستیں',
};

/* ═══ 中文 ═══ */
const zh: LandingT = {
  ...en,
  nav_home: '首页', nav_features: '功能', nav_pricing: '定价', nav_faq: '常见问题', nav_download: '下载', nav_login: '登录', nav_privacy: '隐私政策', nav_terms: '服务条款', nav_transparency: '透明度', nav_source: '开源', nav_contact: '联系',
  hero_title: '没有限制地沟通。没有监视。没有恐惧。',
  hero_subtitle: '完全加密的去中心化消息平台，保护您的身份与隐私——甚至对我们也是如此。',
  hero_cta_download: '立即下载', hero_cta_features: '探索功能',
  priv_bold_statement: '如果政府要求我们提供用户数据，我们根本无法提供，因为数据不存在。',
  price_title: '定价', price_free: '免费', price_free_price: '$0', price_supporter: '支持者', price_supporter_price: '$4.99/月', price_enterprise: '企业', price_enterprise_price: '联系我们',
  footer_rights: '© 2026 Shield Messenger — 保留所有权利。代码根据 MIT 许可证开源。',
  pp_title: '隐私政策', tos_title: '服务条款', tr_title: '透明度政策——政府请求',
};

/* ═══ Русский ═══ */
const ru: LandingT = {
  ...en,
  nav_home: 'Главная', nav_features: 'Возможности', nav_pricing: 'Цены', nav_faq: 'Вопросы', nav_download: 'Скачать', nav_login: 'Войти', nav_privacy: 'Политика конфиденциальности', nav_terms: 'Условия использования', nav_transparency: 'Прозрачность', nav_source: 'Открытый код', nav_contact: 'Контакт',
  hero_title: 'Общайтесь без ограничений. Без слежки. Без страха.',
  hero_subtitle: 'Полностью зашифрованная децентрализованная платформа обмена сообщениями, которая защищает вашу личность и конфиденциальность от всех — даже от нас.',
  hero_cta_download: 'Скачать сейчас', hero_cta_features: 'Узнать больше',
  priv_bold_statement: 'Если правительство запросит у нас пользовательские данные, мы просто не сможем их предоставить, потому что данных не существует.',
  price_title: 'Цены', price_free: 'Бесплатно', price_free_price: '$0', price_supporter: 'Поддержка', price_supporter_price: '$4.99/мес', price_enterprise: 'Предприятие', price_enterprise_price: 'Связаться',
  footer_rights: '© 2026 Shield Messenger — Все права защищены. Код открыт под лицензией MIT.',
  pp_title: 'Политика конфиденциальности', tos_title: 'Условия использования', tr_title: 'Политика прозрачности — Правительственные запросы',
};

/* ═══ Português ═══ */
const pt: LandingT = {
  ...en,
  nav_home: 'Início', nav_features: 'Recursos', nav_pricing: 'Preços', nav_faq: 'Perguntas frequentes', nav_download: 'Baixar', nav_login: 'Entrar', nav_privacy: 'Política de Privacidade', nav_terms: 'Termos de Serviço', nav_transparency: 'Transparência', nav_source: 'Código Aberto', nav_contact: 'Contato',
  hero_title: 'Comunique-se sem limites. Sem vigilância. Sem medo.',
  hero_subtitle: 'Uma plataforma de mensagens descentralizada e completamente criptografada que protege sua identidade e privacidade de todos — até de nós.',
  hero_cta_download: 'Baixar agora', hero_cta_features: 'Descobrir recursos',
  priv_bold_statement: 'Se um governo nos pedir dados de usuários, simplesmente não podemos fornecer porque os dados não existem.',
  footer_rights: '© 2026 Shield Messenger — Todos os direitos reservados. Código aberto sob licença MIT.',
  pp_title: 'Política de Privacidade', tos_title: 'Termos de Serviço', tr_title: 'Política de Transparência — Solicitações Governamentais',
};

/* ═══ 日本語 ═══ */
const ja: LandingT = {
  ...en,
  nav_home: 'ホーム', nav_features: '機能', nav_pricing: '料金', nav_faq: 'FAQ', nav_download: 'ダウンロード', nav_login: 'ログイン', nav_privacy: 'プライバシーポリシー', nav_terms: '利用規約', nav_transparency: '透明性', nav_source: 'オープンソース', nav_contact: 'お問い合わせ',
  hero_title: '制限なく。監視なく。恐れなく。コミュニケーション。',
  hero_subtitle: 'あなたのアイデンティティとプライバシーをすべての人から保護する、完全に暗号化された分散型メッセージングプラットフォーム — 私たちからさえも。',
  hero_cta_download: '今すぐダウンロード', hero_cta_features: '機能を見る',
  priv_bold_statement: '政府がユーザーデータを要求しても、データが存在しないため提供することは不可能です。',
  footer_rights: '© 2026 Shield Messenger — 全著作権所有。コードはMITライセンスの下でオープンソースです。',
  pp_title: 'プライバシーポリシー', tos_title: '利用規約', tr_title: '透明性ポリシー — 政府からの要請',
};

/* ═══ 한국어 ═══ */
const ko: LandingT = {
  ...en,
  nav_home: '홈', nav_features: '기능', nav_pricing: '요금', nav_faq: 'FAQ', nav_download: '다운로드', nav_login: '로그인', nav_privacy: '개인정보처리방침', nav_terms: '이용약관', nav_transparency: '투명성', nav_source: '오픈소스', nav_contact: '연락처',
  hero_title: '제한 없이. 감시 없이. 두려움 없이 소통하세요.',
  hero_subtitle: '모든 사람으로부터 — 심지어 우리로부터도 — 당신의 신원과 프라이버시를 보호하는 완전히 암호화된 분산형 메시징 플랫폼.',
  hero_cta_download: '지금 다운로드', hero_cta_features: '기능 알아보기',
  priv_bold_statement: '정부가 사용자 데이터를 요청해도 데이터가 존재하지 않기 때문에 제공할 수 없습니다.',
  footer_rights: '© 2026 Shield Messenger — 모든 권리 보유. 코드는 MIT 라이선스 하에 오픈소스입니다.',
  pp_title: '개인정보처리방침', tos_title: '이용약관', tr_title: '투명성 정책 — 정부 요청',
};

/* ═══ हिन्दी ═══ */
const hi: LandingT = {
  ...en,
  nav_home: 'होम', nav_features: 'विशेषताएं', nav_pricing: 'मूल्य', nav_faq: 'सामान्य प्रश्न', nav_download: 'डाउनलोड', nav_login: 'लॉग इन', nav_privacy: 'गोपनीयता नीति', nav_terms: 'सेवा की शर्तें', nav_transparency: 'पारदर्शिता', nav_source: 'ओपन सोर्स', nav_contact: 'संपर्क',
  hero_title: 'बिना सीमाओं के संवाद करें। बिना निगरानी। बिना डर।',
  hero_subtitle: 'पूरी तरह से एन्क्रिप्टेड, विकेंद्रीकृत मैसेजिंग प्लेटफ़ॉर्म जो आपकी पहचान और गोपनीयता को सभी से सुरक्षित रखता है — हमसे भी।',
  hero_cta_download: 'अभी डाउनलोड करें', hero_cta_features: 'विशेषताएं जानें',
  priv_bold_statement: 'अगर कोई सरकार हमसे उपयोगकर्ता डेटा मांगती है, तो हम बस प्रदान नहीं कर सकते क्योंकि डेटा मौजूद ही नहीं है।',
  footer_rights: '© 2026 Shield Messenger — सभी अधिकार सुरक्षित। कोड MIT लाइसेंस के तहत ओपन सोर्स है।',
  pp_title: 'गोपनीयता नीति', tos_title: 'सेवा की शर्तें', tr_title: 'पारदर्शिता नीति — सरकारी अनुरोध',
};

/* ═══ Bahasa Indonesia ═══ */
const id: LandingT = {
  ...en,
  nav_home: 'Beranda', nav_features: 'Fitur', nav_pricing: 'Harga', nav_faq: 'FAQ', nav_download: 'Unduh', nav_login: 'Masuk', nav_privacy: 'Kebijakan Privasi', nav_terms: 'Ketentuan Layanan', nav_transparency: 'Transparansi', nav_source: 'Sumber Terbuka', nav_contact: 'Kontak',
  hero_title: 'Berkomunikasi tanpa batas. Tanpa pengawasan. Tanpa ketakutan.',
  hero_subtitle: 'Platform pesan terdesentralisasi yang sepenuhnya terenkripsi yang melindungi identitas dan privasi Anda dari semua orang — bahkan dari kami.',
  hero_cta_download: 'Unduh Sekarang', hero_cta_features: 'Jelajahi Fitur',
  priv_bold_statement: 'Jika pemerintah meminta data pengguna kami, kami tidak dapat memberikannya karena data tersebut tidak ada.',
  footer_rights: '© 2026 Shield Messenger — Hak cipta dilindungi. Kode sumber terbuka di bawah Lisensi MIT.',
  pp_title: 'Kebijakan Privasi', tos_title: 'Ketentuan Layanan', tr_title: 'Kebijakan Transparansi — Permintaan Pemerintah',
};

/* ═══ Bahasa Melayu ═══ */
const ms: LandingT = {
  ...en,
  nav_home: 'Utama', nav_features: 'Ciri-ciri', nav_pricing: 'Harga', nav_faq: 'Soalan Lazim', nav_download: 'Muat Turun', nav_login: 'Log Masuk', nav_privacy: 'Dasar Privasi', nav_terms: 'Terma Perkhidmatan', nav_transparency: 'Ketelusan', nav_source: 'Sumber Terbuka', nav_contact: 'Hubungi',
  hero_title: 'Berkomunikasi tanpa had. Tanpa pengawasan. Tanpa takut.',
  hero_subtitle: 'Platform pesanan terdesentralisasi yang disulitkan sepenuhnya yang melindungi identiti dan privasi anda daripada semua orang — malah daripada kami.',
  hero_cta_download: 'Muat Turun Sekarang', hero_cta_features: 'Terokai Ciri-ciri',
  priv_bold_statement: 'Jika kerajaan meminta data pengguna kami, kami tidak dapat memberikannya kerana data tersebut tidak wujud.',
  footer_rights: '© 2026 Shield Messenger — Hak cipta terpelihara. Kod sumber terbuka di bawah Lesen MIT.',
  pp_title: 'Dasar Privasi', tos_title: 'Terma Perkhidmatan', tr_title: 'Dasar Ketelusan — Permintaan Kerajaan',
};

/* ═══ Kiswahili ═══ */
const sw: LandingT = {
  ...en,
  nav_home: 'Nyumbani', nav_features: 'Vipengele', nav_pricing: 'Bei', nav_faq: 'Maswali', nav_download: 'Pakua', nav_login: 'Ingia', nav_privacy: 'Sera ya Faragha', nav_terms: 'Masharti ya Huduma', nav_transparency: 'Uwazi', nav_source: 'Chanzo Huria', nav_contact: 'Wasiliana',
  hero_title: 'Wasiliana bila mipaka. Bila ufuatiliaji. Bila hofu.',
  hero_subtitle: 'Jukwaa la ujumbe lisiloongozwa na kati ambalo limelindwa kwa usimbuaji kamili — hata sisi hatuwezi kusoma ujumbe wako.',
  hero_cta_download: 'Pakua Sasa', hero_cta_features: 'Gundua Vipengele',
  priv_bold_statement: 'Ikiwa serikali itatuomba data ya watumiaji, hatuwezi kutoa kwa sababu data haipo.',
  footer_rights: '© 2026 Shield Messenger — Haki zote zimehifadhiwa. Msimbo ni chanzo huria chini ya Leseni ya MIT.',
  pp_title: 'Sera ya Faragha', tos_title: 'Masharti ya Huduma', tr_title: 'Sera ya Uwazi — Maombi ya Serikali',
};

/* ═══ Italiano ═══ */
const it: LandingT = {
  ...en,
  nav_home: 'Home', nav_features: 'Funzionalità', nav_pricing: 'Prezzi', nav_faq: 'FAQ', nav_download: 'Scarica', nav_login: 'Accedi', nav_privacy: 'Informativa sulla Privacy', nav_terms: 'Termini di Servizio', nav_transparency: 'Trasparenza', nav_source: 'Open Source', nav_contact: 'Contatti',
  hero_title: 'Comunica senza limiti. Senza sorveglianza. Senza paura.',
  hero_subtitle: 'Una piattaforma di messaggistica decentralizzata completamente crittografata che protegge la tua identità e privacy da tutti — persino da noi.',
  hero_cta_download: 'Scarica ora', hero_cta_features: 'Scopri le funzionalità',
  priv_bold_statement: 'Se un governo ci chiedesse i dati degli utenti, semplicemente non potremmo fornirli perché i dati non esistono.',
  footer_rights: '© 2026 Shield Messenger — Tutti i diritti riservati. Codice open source sotto licenza MIT.',
  pp_title: 'Informativa sulla Privacy', tos_title: 'Termini di Servizio', tr_title: 'Politica di Trasparenza — Richieste Governative',
};

/* ═══ Nederlands ═══ */
const nl: LandingT = {
  ...en,
  nav_home: 'Home', nav_features: 'Functies', nav_pricing: 'Prijzen', nav_faq: 'FAQ', nav_blog: 'Blog', nav_download: 'Downloaden', nav_login: 'Inloggen', nav_privacy: 'Privacybeleid', nav_terms: 'Gebruiksvoorwaarden', nav_transparency: 'Transparantie', nav_source: 'Open Source', nav_contact: 'Contact',
  hero_title: 'Communiceer zonder grenzen. Zonder toezicht. Zonder angst.',
  hero_subtitle: 'Een volledig versleuteld, gedecentraliseerd berichtenplatform dat je identiteit en privacy beschermt tegen iedereen — zelfs tegen ons.',
  hero_cta_download: 'Nu downloaden', hero_cta_features: 'Ontdek de functies',
  ps_title: 'Het probleem en de oplossing',
  ps_problem: 'Het probleem',
  ps_problem_desc: 'Traditionele berichtenapps verzamelen je gegevens, monitoren je gesprekken en verkopen je informatie aan adverteerders. Zelfs apps die versleuteling claimen bewaren metadata die onthult met wie je praat en wanneer.',
  ps_solution: 'De oplossing',
  ps_e2ee: 'End-to-end versleuteling (E2EE)',
  ps_e2ee_desc: 'Hybride versleuteling met X25519 en ML-KEM-1024 — bestand tegen quantumcomputers.',
  ps_tor: 'Ingebouwd Tor-netwerk',
  ps_tor_desc: 'Je locatie en identiteit kunnen niet worden getraceerd. Je verbinding gaat door lagen van versleuteling.',
  ps_p2p: 'Geen centrale servers (P2P)',
  ps_p2p_desc: 'Directe verbinding van apparaat naar apparaat. Geen tussenliggende server die gehackt of uitgeschakeld kan worden.',
  ps_wallet: 'Versleutelde betaalportemonnee',
  ps_wallet_desc: 'Verzend en ontvang crypto (Zcash + Solana) rechtstreeks in gesprekken.',
  feat_title: 'Functies in detail',
  feat_messaging: 'Beveiligde berichten en oproepen',
  feat_messaging_desc: 'E2EE tekst-, spraak-, foto- en videoberichten. Versleutelde spraak- en video-oproepen via Tor met hybride versleuteling (X25519 + ML-KEM-1024).',
  feat_privacy: 'Maximale privacy',
  feat_privacy_desc: 'Verberg "laatst gezien" en leesbevestigingen. Stille afwijzing van vriendschapsverzoeken — geen melding aan de afzender. Multi-factor authenticatie (2FA) via WebAuthn.',
  feat_decentralized: 'Volledige decentralisatie',
  feat_decentralized_desc: 'Geen centrale berichtenservers. Directe verbinding tussen apparaten via Tor Hidden Services. Drie verborgen diensten: ontdekking, vriendschapsverzoeken en berichten.',
  feat_identifiers: 'Slimme identificatoren',
  feat_identifiers_desc: 'Uniek identificatiesysteem zoals ahmed.s9442@securechat met een willekeurig deel om raden te voorkomen. Zoeken via DHT zonder centrale server.',
  feat_wallet: 'Digitale portemonnee',
  feat_wallet_desc: 'Ingebouwde portemonnee voor het verzenden en ontvangen van Zcash (afgeschermde transacties) en Solana rechtstreeks in gesprekken met volledige beveiliging.',
  feat_pwa: 'PWA als back-up',
  feat_pwa_desc: 'Een progressieve webapp die werkt op alle moderne browsers met Tor-ondersteuning via WebAssembly. Een directe link om continuïteit te garanderen als de app uit de stores wordt verbannen.',
  feat_qr_verify: 'QR-vingerafdrukverificatie',
  feat_qr_verify_desc: 'Verifieer de identiteit van contacten door een QR-code te scannen die hun publieke sleutelvingerafdruk bevat. Het SM-VERIFY:1 protocol garandeert dat je met de juiste persoon praat.',
  feat_trust_levels: 'Vertrouwensniveaus',
  feat_trust_levels_desc: 'Drie vertrouwensniveaus (L0 Niet vertrouwd, L1 Versleuteld, L2 Geverifieerd) lokaal opgeslagen via SQLCipher. Elk niveau definieert verschillende interactiepermissies.',
  feat_file_restriction: 'Slimme bestandsbeveiliging',
  feat_file_restriction_desc: 'Bestanden kunnen alleen worden verzonden of ontvangen met geverifieerde contacten (Niveau L2). Automatische waarschuwing bij pogingen om bestanden te delen met niet-geverifieerde contacten.',
  priv_title: 'Hoe garanderen wij privacy?',
  priv_no_data: 'Wij verzamelen geen persoonlijke gegevens — geen naam, geen e-mail, geen telefoonnummer, geen locatie.',
  priv_no_decrypt: 'Wij kunnen je berichten niet ontsleutelen — de sleutels bestaan alleen op jouw apparaat.',
  priv_no_servers: 'Geen centrale berichtenservers — directe verbinding tussen apparaten.',
  priv_open_source: 'De code is volledig open source — iedereen kan deze controleren en verifiëren.',
  priv_bold_statement: 'Als een overheid ons om gebruikersgegevens zou vragen, kunnen we simpelweg niet meewerken omdat de gegevens niet bestaan.',
  price_title: 'Prijzen',
  price_free: 'Gratis', price_free_price: '€0', price_free_desc: 'Alle basisfuncties — voor iedereen',
  price_free_f1: 'E2EE versleutelde berichten en oproepen', price_free_f2: 'Spraakoproepen via Tor', price_free_f3: 'Groepen tot 100 leden', price_free_f4: 'Zcash + Solana portemonnee', price_free_f5: 'Verberg laatst gezien en leesbevestigingen',
  price_supporter: 'Supporter', price_supporter_price: '€4,99/mnd', price_supporter_desc: 'Voor wie meer wil en het project wil steunen',
  price_supporter_f1: 'Eenvoudig ID zonder willekeurig achtervoegsel', price_supporter_f2: 'Extra versleutelde opslag', price_supporter_f3: 'Gouden ondersteuning en prioriteit', price_supporter_f4: 'Geverifieerde add-ons en thema\'s', price_supporter_f5: 'Geavanceerd groepsbeheer', price_supporter_f6: 'Alle gratis functies inbegrepen',
  price_enterprise: 'Zakelijk', price_enterprise_price: 'Neem contact op', price_enterprise_desc: 'Voor bedrijven en organisaties',
  price_enterprise_f1: 'Beheerde privéserver (managed homeserver)', price_enterprise_f2: 'Aangepast subdomein (bedrijf.securechat)', price_enterprise_f3: 'Beheerderspaneel en versleutelde auditlogs', price_enterprise_f4: 'Toegewijde 24/7 ondersteuning',
  price_reminder: 'Je abonnement helpt het project in stand te houden en heeft geen invloed op je privacy.',
  price_cta: 'Nu beginnen',
  faq_title: 'Veelgestelde vragen',
  faq_q1: 'Kunnen jullie mijn berichten lezen?',
  faq_a1: 'Nee. Je berichten worden op je apparaat versleuteld met sleutels die wij niet bezitten. Zelfs als we zouden willen, kunnen we technisch gezien geen enkel bericht ontsleutelen.',
  faq_q2: 'Wat gebeurt er als een overheid mijn gegevens opvraagt?',
  faq_a2: 'Ons antwoord zal zijn: "Het spijt ons, we hebben niet wat u zoekt." We slaan simpelweg geen gebruikersgegevens op. Als ons gevraagd wordt versleuteling te breken, trekken we ons terug uit die markt.',
  faq_q3: 'Hoe weet ik zeker dat de app veilig is?',
  faq_a3: 'De code is volledig open source op GitHub. Elke beveiligingsexpert kan deze controleren. We gebruiken X25519 + ML-KEM-1024 versleuteling die bestand is tegen quantumcomputers.',
  faq_q4: 'Wat als de app uit de app stores verdwijnt?',
  faq_a4: 'We hebben een PWA (Progressive Web App) als back-up die werkt op elke moderne browser. We bieden ook directe APK-download aan vanaf onze website.',
  faq_q5: 'Heb ik een telefoonnummer of e-mail nodig om te registreren?',
  faq_a5: 'Nee. We gebruiken een uniek identificatiesysteem dat geen persoonlijke gegevens vereist. Je identiteit in de app is volledig gescheiden van je echte identiteit.',
  faq_q6: 'Hoe financieren jullie het project zonder gegevens te verkopen?',
  faq_a6: 'Via optionele betaalde abonnementen die extra functies toevoegen. De basisdienst is volledig gratis zonder beperkingen op privacy.',
  cta_title: 'Begin nu met veilig communiceren',
  cta_subtitle: 'Download de app op je favoriete apparaat en sluit je aan bij een gemeenschap die je privacy respecteert.',
  cta_android: 'Android APK', cta_pwa: 'Webapp (PWA)', cta_ios: 'iOS TestFlight',
  cta_install_pwa: 'Om de PWA te installeren: open de link in je browser → klik op "Toevoegen aan startscherm" of het installatiepictogram in de adresbalk.',
  footer_open_source: 'Open Source', footer_community: 'Ondersteund door de gemeenschap', footer_no_data: 'Wij verkopen je gegevens niet',
  footer_rights: '© 2026 Shield Messenger — Alle rechten voorbehouden. Code is open source onder MIT-licentie.',
  blog_title: 'Blog', blog_read_more: 'Lees meer', blog_no_posts: 'Nog geen berichten.', blog_loading: 'Laden...',
  pp_title: 'Privacybeleid',
  pp_intro: 'Je privacy is voor ons niet zomaar een beleid — het is de basis van ons bestaan. Dit document legt duidelijk uit hoe we met je gegevens omgaan — of beter gezegd, hoe we dat niet doen.',
  pp_section1_title: 'Welke gegevens verzamelen we?',
  pp_section1_body: 'Wij verzamelen geen van je persoonlijke gegevens. Niet je naam, niet je e-mail, niet je telefoonnummer, niet je locatie. We weten niet wie je bent en we willen het niet weten.',
  pp_section2_title: 'Berichten en inhoud',
  pp_section2_body: 'Je berichten en oproepen zijn versleuteld van jouw apparaat naar het apparaat van de persoon met wie je communiceert. Zelfs wij als ontwikkelaars hebben de sleutels niet om ze te ontsleutelen. Er zijn geen centrale servers die je berichten opslaan — alles blijft op jouw apparaat.',
  pp_section3_title: 'Analyse en advertenties',
  pp_section3_body: 'Wij gebruiken absoluut geen analysetools. Geen Google Analytics, geen Facebook Pixel, geen trackingtools van welke aard dan ook. Er zijn geen advertenties in de app en die zullen er nooit komen.',
  pp_section4_title: 'Gegevens betaald abonnement',
  pp_section4_body: 'Als je kiest voor een betaald abonnement, vragen we mogelijk een e-mailadres voor factuurcommunicatie. Dit e-mailadres wordt versleuteld opgeslagen (AES-256-GCM) en wordt nooit gekoppeld aan je activiteit in de app. Je abonnementsidentiteit is volledig gescheiden van je identiteit in de app.',
  pp_section5_title: 'Overheidsverzoeken',
  pp_section5_body: 'Als een overheidsinstantie gebruikersgegevens bij ons opvraagt, kunnen we niet meewerken omdat we de gegevens simpelweg niet hebben. De enige gegevens die we mogelijk bezitten is een versleuteld e-mailadres van betaalde abonnees.',
  pp_closing: 'Bij Shield Messenger kunnen we je berichten niet lezen. We kunnen niet weten met wie je praat. We kunnen je locatie niet volgen. Dit is niet alleen een belofte — het is een technische realiteit. We willen je gegevens niet, en we zouden ze niet kunnen nemen zelfs als we dat wilden.',
  tos_title: 'Gebruiksvoorwaarden',
  tos_intro: 'Door het gebruik van het Shield Messenger-platform ga je akkoord met de volgende voorwaarden. Lees ze zorgvuldig door.',
  tos_section1_title: 'Verantwoordelijkheid',
  tos_section1_body: 'Je bent zelf verantwoordelijk voor je gebruik van de applicatie. Wij dragen geen verantwoordelijkheid voor inhoud die door gebruikers wordt uitgewisseld, noch kunnen we deze monitoren vanwege end-to-end versleuteling.',
  tos_section2_title: 'Aanvaardbaar gebruik',
  tos_section2_body: 'Het gebruik van het platform voor illegale activiteiten is verboden. Wij kunnen dit niet monitoren vanwege de aard van versleuteling, maar we verwachten dat onze gebruikers zich houden aan lokale wetten.',
  tos_section3_title: 'Juridische naleving',
  tos_section3_body: 'Als we een geldig gerechtelijk bevel ontvangen binnen ons rechtsgebied, kunnen we verplicht worden om binnen de smalst mogelijke reikwijdte mee te werken. We zullen niets verstrekken dat verder gaat dan de zeer beperkte gegevens die we hebben (zoals versleutelde e-mailadressen van alleen betaalde abonnees).',
  tos_section4_title: 'Intellectueel eigendom',
  tos_section4_body: 'De code is open source onder MIT-licentie. De naam "Shield Messenger", het handelsmerk en het logo zijn voorbehouden rechten.',
  tos_section5_title: 'Wijzigingen',
  tos_section5_body: 'We behouden ons het recht voor om deze voorwaarden te wijzigen. Gebruikers worden op de hoogte gebracht van wezenlijke wijzigingen via de app of website.',
  tr_title: 'Transparantiebeleid — Overheidsverzoeken',
  tr_intro: 'Wij geloven in volledige transparantie naar onze gebruikers. Deze pagina beschrijft hoe we omgaan met overheids- of juridische verzoeken.',
  tr_section1_title: 'Onze belofte',
  tr_section1_body: 'We publiceren een halfjaarlijks transparantierapport met het aantal ontvangen overheidsverzoeken (indien aanwezig) en hoe we ermee zijn omgegaan.',
  tr_section2_title: 'Ons principe',
  tr_section2_body: 'Wij doen geen concessies op het gebied van versleuteling of privacy. Als ons gevraagd wordt versleuteling te breken of achterdeuren toe te voegen, trekken we ons terug uit de betreffende markt in plaats van mee te werken — net zoals Signal heeft gedaan.',
  tr_section3_title: 'Ons proces',
  tr_section3_body: 'Elk overheidsverzoek moet via de juiste juridische kanalen komen. We zullen brede of onwettige verzoeken aanvechten met alle beschikbare juridische middelen.',
  tr_report_title: 'Transparantierapporten',
  tr_report_body: 'Tot op heden: 0 overheidsverzoeken — 0 gegevens verstrekt. We werken dit gedeelte elke zes maanden bij.',
};

/* ═══ Locale map ═══ */
export const landingLocales: Record<string, LandingT> = {
  ar, en, fr, es, de, tr, fa, ur, zh, ru, pt, ja, ko, hi, id, ms, sw, it, nl,
};

export function getLandingT(locale: string): LandingT {
  return landingLocales[locale] || en;
}
