import { ShieldIcon } from './icons/ShieldIcon';

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-dark-950">
      <div className="text-center px-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-dark-900 rounded-3xl mb-6">
          <ShieldIcon className="w-12 h-12 text-primary-500" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">Secure Legion</h2>
        <p className="text-dark-400 max-w-md leading-relaxed mb-6">
          اختر محادثة من القائمة أو ابدأ محادثة جديدة.
          جميع الرسائل مشفرة تشفيراً تاماً بين الطرفين.
        </p>
        <div className="space-y-3 text-sm text-dark-500">
          <Feature icon="🔒" text="تشفير تام بين الطرفين (E2EE)" />
          <Feature icon="🌐" text="بروتوكول Matrix اللامركزي" />
          <Feature icon="🛡️" text="لا نجمع أي بيانات شخصية" />
          <Feature icon="📱" text="متوفر على الويب و Android و iOS" />
          <Feature icon="🔓" text="مفتوح المصدر بالكامل" />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
