import React, { useEffect, useState } from 'react';

/** Shared startup and dashboard loader. Keep the caller's main message stable;
 * rotate a quiet reassurance line so waits feel considered, not falsely measured. */
export const BOOT_MESSAGE = 'Setting up your school workspace...';

const REASSURANCE = [
    'Bringing your school workspace together.',
    'Getting the details ready for you.',
    'Keeping your next step clear.',
    'Almost ready — thanks for your patience.',
];

const PremiumLoader: React.FC<{ message?: string; fullScreen?: boolean }> = ({
    message = BOOT_MESSAGE,
    fullScreen = true,
}) => {
    const [line, setLine] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => setLine((value) => (value + 1) % REASSURANCE.length), 5200);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className={`oliskey-loader-surface flex flex-col items-center justify-center ${fullScreen
                ? 'fixed inset-0 z-[10000] min-h-[100dvh]'
                : 'relative w-full h-full flex-1 min-h-[60vh] z-50 rounded-2xl my-auto'}`}
        >
            <div className="oliskey-loader-glow oliskey-loader-glow-one" aria-hidden="true" />
            <div className="oliskey-loader-glow oliskey-loader-glow-two" aria-hidden="true" />
            <div className="oliskey-loader-content relative flex w-full max-w-md flex-col items-center px-6 py-10 text-center sm:px-9">
                <div className="oliskey-loader-mark mb-8" aria-hidden="true">
                    <div className="oliskey-loader-orbit oliskey-loader-orbit-one" />
                    <div className="oliskey-loader-orbit oliskey-loader-orbit-two" />
                    <div className="oliskey-loader-glass"><span className="oliskey-loader-star">✦</span></div>
                    <span className="oliskey-loader-spark oliskey-loader-spark-one">✧</span>
                    <span className="oliskey-loader-spark oliskey-loader-spark-two">✦</span>
                </div>
                <div className="mb-7">
                    <p className="oliskey-loader-wordmark">oliskey</p>
                    <p className="oliskey-loader-product">SCHOOL APP</p>
                </div>
                <p className="oliskey-loader-message">{message}</p>
                <p key={line} className="oliskey-loader-reassurance">{REASSURANCE[line]}</p>
                <div className="oliskey-loader-progress mt-8" aria-hidden="true"><span /></div>
                <p className="oliskey-loader-footnote mt-3">A little more clarity, every school day.</p>
            </div>
            <style>{`
                .oliskey-loader-surface{isolation:isolate;overflow:hidden;color:#132344;background:radial-gradient(ellipse at 13% 8%,rgba(174,213,255,.62),transparent 37%),radial-gradient(ellipse at 88% 19%,rgba(219,211,255,.54),transparent 34%),radial-gradient(ellipse at 50% 105%,rgba(190,224,255,.58),transparent 43%),linear-gradient(145deg,#fbfdff,#f0f6ff 53%,#f8fbff)}
                .oliskey-loader-surface:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.34;background:linear-gradient(120deg,rgba(255,255,255,.72),transparent 35%,transparent 68%,rgba(255,255,255,.65))}
                .oliskey-loader-glow{position:absolute;z-index:-1;width:min(72vw,430px);aspect-ratio:1;border-radius:50%;filter:blur(36px);pointer-events:none;opacity:.46;animation:oliskey-loader-breathe 9s ease-in-out infinite}
                .oliskey-loader-glow-one{top:8%;left:-23%;background:rgba(105,169,255,.25)}.oliskey-loader-glow-two{right:-25%;bottom:5%;background:rgba(150,139,255,.19);animation-delay:-4.5s}
                .oliskey-loader-content{z-index:1}.oliskey-loader-mark{position:relative;display:grid;width:174px;height:174px;place-items:center;perspective:900px}
                .oliskey-loader-glass{position:relative;display:grid;width:116px;height:116px;place-items:center;border:1px solid rgba(255,255,255,.96);border-radius:38px;background:linear-gradient(145deg,rgba(255,255,255,.9),rgba(219,235,255,.44) 52%,rgba(255,255,255,.74));box-shadow:inset 1px 1px 2px #fff,inset -8px -10px 24px rgba(93,145,220,.1),0 20px 44px rgba(55,105,180,.16),0 3px 9px rgba(255,255,255,.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);transform:rotateX(7deg) rotateY(-9deg);animation:oliskey-loader-float 6.4s ease-in-out infinite}
                .oliskey-loader-glass:before{content:'';position:absolute;inset:8px;border:1px solid rgba(255,255,255,.9);border-radius:30px;box-shadow:inset 0 0 18px rgba(255,255,255,.55)}
                .oliskey-loader-glass:after{content:'';position:absolute;top:13px;left:20px;width:44px;height:16px;border-radius:50%;background:rgba(255,255,255,.95);filter:blur(9px);transform:rotate(-36deg)}
                .oliskey-loader-star{z-index:1;color:#2676f4;font-size:48px;line-height:1;text-shadow:0 7px 18px rgba(37,104,230,.24);transform:translateZ(24px)}
                .oliskey-loader-orbit{position:absolute;width:166px;height:76px;border:1px solid rgba(255,255,255,.94);border-radius:50%;box-shadow:0 0 16px rgba(93,157,245,.12),inset 0 0 12px rgba(255,255,255,.42);pointer-events:none}
                .oliskey-loader-orbit-one{transform:rotate(-28deg) rotateX(14deg);animation:oliskey-loader-orbit 16s linear infinite}.oliskey-loader-orbit-two{width:146px;height:106px;border-color:rgba(154,195,255,.56);transform:rotate(48deg) rotateX(20deg);animation:oliskey-loader-orbit 21s linear infinite reverse}
                .oliskey-loader-spark{position:absolute;color:#fff;text-shadow:0 0 12px rgba(76,145,255,.62);animation:oliskey-loader-twinkle 4.8s ease-in-out infinite}.oliskey-loader-spark-one{top:24px;left:20px;font-size:22px}.oliskey-loader-spark-two{right:15px;bottom:30px;font-size:16px;animation-delay:-2.4s}
                .oliskey-loader-wordmark{margin:0;color:#102448;font-size:clamp(34px,8vw,42px);font-weight:800;line-height:1;letter-spacing:-1.8px}.oliskey-loader-product{margin:9px 0 0;color:#6880a3;font-size:10px;font-weight:800;letter-spacing:3.2px}
                .oliskey-loader-message{max-width:330px;min-height:28px;margin:0;color:#233958;font-size:16px;font-weight:700;line-height:1.55;letter-spacing:-.15px;text-wrap:balance}
                .oliskey-loader-reassurance{max-width:320px;min-height:24px;margin:10px 0 0;color:#71829c;font-size:13px;line-height:1.6;animation:oliskey-loader-copy-in 1.1s cubic-bezier(.2,.75,.25,1) both}
                .oliskey-loader-progress{width:min(100%,260px);height:5px;overflow:hidden;border-radius:99px;background:rgba(168,191,223,.43);box-shadow:inset 0 1px 2px rgba(49,84,133,.08)}
                .oliskey-loader-progress span{display:block;width:34%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2168ed,#4c9fff,#a9e2ff);box-shadow:0 0 12px rgba(54,139,255,.34);animation:oliskey-loader-progress 2.8s cubic-bezier(.45,0,.35,1) infinite}
                .oliskey-loader-footnote{color:#8a9ab1;font-size:10px;line-height:1.5;letter-spacing:.2px}
                @keyframes oliskey-loader-float{0%,100%{transform:translateY(0) rotateX(7deg) rotateY(-9deg)}50%{transform:translateY(-5px) rotateX(3deg) rotateY(5deg)}}
                @keyframes oliskey-loader-orbit{from{rotate:0deg}to{rotate:360deg}}
                @keyframes oliskey-loader-breathe{0%,100%{transform:scale(.94);opacity:.34}50%{transform:scale(1.06);opacity:.56}}
                @keyframes oliskey-loader-twinkle{0%,100%{opacity:.38;transform:translateY(0) scale(.9)}50%{opacity:.9;transform:translateY(-3px) scale(1.05)}}
                @keyframes oliskey-loader-progress{0%{transform:translateX(-125%);width:30%}55%{transform:translateX(115%);width:48%}100%{transform:translateX(320%);width:28%}}
                @keyframes oliskey-loader-copy-in{from{opacity:0;transform:translateY(5px);filter:blur(2px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
                @media(max-width:420px){.oliskey-loader-mark{width:154px;height:154px;margin-bottom:24px}.oliskey-loader-glass{width:104px;height:104px;border-radius:34px}.oliskey-loader-orbit{width:146px}.oliskey-loader-orbit-two{width:132px;height:96px}.oliskey-loader-message{font-size:15px}.oliskey-loader-content{padding-inline:24px}}
                @media(prefers-reduced-motion:reduce){.oliskey-loader-glow,.oliskey-loader-glass,.oliskey-loader-orbit,.oliskey-loader-spark,.oliskey-loader-progress span,.oliskey-loader-reassurance{animation:none!important}}
                @media(prefers-reduced-transparency:reduce){.oliskey-loader-glass{backdrop-filter:none;-webkit-backdrop-filter:none;background:#f2f7ff}}
            `}</style>
        </div>
    );
};

export default PremiumLoader;
