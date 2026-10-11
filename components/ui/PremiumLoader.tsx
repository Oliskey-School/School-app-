import React from 'react';

/**
 * Shared Oliskey education loader.
 * One visual language for app boot and inline loading; skeletons remain content
 * placeholders because they preserve page geometry while data is being fetched.
 */
export const BOOT_MESSAGE = 'Setting up your school workspace...';

type PremiumLoaderProps = {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const PremiumLoader: React.FC<PremiumLoaderProps> = ({
  message = BOOT_MESSAGE,
  fullScreen = true,
  size = 'md',
  className = '',
}) => {
  const markSize = size === 'sm' ? 'h-14 w-14' : size === 'lg' ? 'h-28 w-28' : 'h-20 w-20';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={[
        'oliskey-education-loader flex flex-col items-center justify-center overflow-hidden text-center',
        fullScreen
          ? 'fixed inset-0 z-[10000] min-h-[100dvh] w-full'
          : 'relative min-h-[200px] w-full flex-1 rounded-2xl',
        className,
      ].join(' ')}
    >
      <div aria-hidden="true" className="oliskey-loader-atmosphere" />
      <div aria-hidden="true" className={`oliskey-loader-orb ${markSize}`}>
        <div className="oliskey-loader-orbit oliskey-loader-orbit-one" />
        <div className="oliskey-loader-orbit oliskey-loader-orbit-two" />
        <div className="oliskey-loader-glass">
          <svg viewBox="0 0 64 64" className="h-[58%] w-[58%] drop-shadow-sm" fill="none">
            <path d="M7 24.5 32 12l25 12.5L32 37 7 24.5Z" fill="url(#oliskey-cap)" stroke="#5688DE" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M17 30v10.5c8.8 7.1 21.2 7.1 30 0V30L32 37.5 17 30Z" fill="#8CB8F5" fillOpacity=".9" stroke="#5688DE" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M56.5 25v14" stroke="#4F78C8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="56.5" cy="41.5" r="2.8" fill="#77A7F2" />
            <defs><linearGradient id="oliskey-cap" x1="10" y1="12" x2="52" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#D8E9FF"/><stop offset=".55" stopColor="#8BB8FF"/><stop offset="1" stopColor="#5E8DE8"/></linearGradient></defs>
          </svg>
        </div>
        <span className="oliskey-loader-spark oliskey-loader-spark-one" />
        <span className="oliskey-loader-spark oliskey-loader-spark-two" />
      </div>

      <div className="relative z-10 mt-7 px-5">
        <div className={`font-semibold tracking-tight text-slate-800 ${titleSize}`}>
          Oliskey <span className="text-blue-600">School App</span>
        </div>
        <p className="mt-2 max-w-[min(86vw,360px)] text-sm font-medium leading-6 text-slate-500">
          {message}
        </p>
        <div aria-hidden="true" className="oliskey-loader-progress mx-auto mt-5">
          <span />
        </div>
      </div>

      <style>{`
        .oliskey-education-loader {
          isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 42%, rgba(224, 238, 255, .78) 0%, rgba(248, 251, 255, .92) 34%, #fff 74%);
          color: #1e293b;
        }
        .oliskey-loader-atmosphere {
          position: absolute; inset: 0; pointer-events: none; opacity: .8;
          background:
            radial-gradient(circle at 18% 24%, rgba(147, 197, 253, .17), transparent 23%),
            radial-gradient(circle at 82% 70%, rgba(125, 211, 252, .18), transparent 25%);
          animation: oliskey-atmosphere 7s ease-in-out infinite alternate;
        }
        .oliskey-loader-orb {
          position: relative; display: grid; place-items: center; flex: none;
          filter: drop-shadow(0 18px 28px rgba(64, 117, 203, .14));
          animation: oliskey-float 3.4s ease-in-out infinite;
        }
        .oliskey-loader-glass {
          position: relative; z-index: 2; display: grid; place-items: center; width: 74%; height: 74%;
          border: 1px solid rgba(255,255,255,.95); border-radius: 30%;
          background: linear-gradient(145deg, rgba(255,255,255,.88), rgba(224,239,255,.55) 52%, rgba(255,255,255,.78));
          box-shadow: inset 0 1px 1px rgba(255,255,255,.98), inset 0 -8px 18px rgba(117,166,235,.12), 0 8px 22px rgba(84,130,204,.12);
          -webkit-backdrop-filter: blur(14px) saturate(145%); backdrop-filter: blur(14px) saturate(145%);
        }
        .oliskey-loader-glass::after {
          content: ''; position: absolute; inset: 1px; border-radius: inherit; pointer-events: none;
          background: linear-gradient(135deg, rgba(255,255,255,.7), transparent 45%, rgba(255,255,255,.18));
        }
        .oliskey-loader-orbit { position: absolute; border: 1px solid rgba(96, 151, 232, .22); border-radius: 50%; }
        .oliskey-loader-orbit-one { inset: 0; transform: rotate(-28deg) scaleX(.84); animation: oliskey-orbit 5.2s linear infinite; }
        .oliskey-loader-orbit-two { inset: 8%; transform: rotate(45deg) scaleX(.72); border-color: rgba(125, 211, 252, .38); animation: oliskey-orbit-reverse 6.4s linear infinite; }
        .oliskey-loader-spark { position: absolute; z-index: 3; width: 7px; height: 7px; border-radius: 50%; background: linear-gradient(145deg, #fff, #73a7f8); box-shadow: 0 0 13px rgba(96,165,250,.55); }
        .oliskey-loader-spark-one { top: 12%; right: 9%; animation: oliskey-spark 2.8s ease-in-out infinite; }
        .oliskey-loader-spark-two { bottom: 13%; left: 8%; width: 5px; height: 5px; animation: oliskey-spark 3.2s ease-in-out infinite reverse; }
        .oliskey-loader-progress { width: 116px; height: 3px; overflow: hidden; border-radius: 999px; background: rgba(148,163,184,.18); }
        .oliskey-loader-progress span { display: block; width: 42%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #7aa9f8, #38bdf8); animation: oliskey-progress 2.1s cubic-bezier(.45,0,.55,1) infinite; }
        @keyframes oliskey-float { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-7px) rotate(1deg); } }
        @keyframes oliskey-orbit { to { transform: rotate(332deg) scaleX(.84); } }
        @keyframes oliskey-orbit-reverse { to { transform: rotate(-315deg) scaleX(.72); } }
        @keyframes oliskey-spark { 0%,100% { opacity: .55; transform: scale(.82); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes oliskey-atmosphere { from { opacity: .52; } to { opacity: .92; } }
        @keyframes oliskey-progress { 0% { transform: translateX(-125%); } 100% { transform: translateX(270%); } }
        @media (prefers-reduced-motion: reduce) {
          .oliskey-loader-atmosphere, .oliskey-loader-orb, .oliskey-loader-orbit,
          .oliskey-loader-spark, .oliskey-loader-progress span { animation: none !important; }
          .oliskey-loader-progress span { width: 58%; transform: none; opacity: .85; }
        }
        @media (prefers-reduced-transparency: reduce) {
          .oliskey-loader-glass { background: #eff6ff; -webkit-backdrop-filter: none; backdrop-filter: none; }
        }
      `}</style>
    </div>
  );
};

export default PremiumLoader;
