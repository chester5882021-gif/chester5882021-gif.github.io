/* 烘焙交響｜五線譜與音符背景（V1／V2 共用）
 *
 * 用法：<script src="../shared/music-bg.js" data-music-bg="v1" defer></script>
 *
 * 兩層，同一支程式：
 *   首屏舞台：插在首屏照片之後——蓋在照片上、壓在文字塊下面，譜線看起來是「鑽進文字塊後面再出來」
 *   定點譜線：固定放在幾個區塊頂端的留白帶（不壓字），左右交錯、從一側伸出往中間淡掉；捲到那裡，音符從譜線上彈出來
 *            （2026-10-07 Chester 改版：原本「整頁一條跟著捲動、調到很淡的譜線」等於沒效果）
 *
 * 要調數量、透明度、速度、顏色：只改下面的 THEMES，程式本體不用動。
 * 動態原理參考 21st.dev「Background Paths」（kokonutd，MIT）：描邊畫入＋相位漂移＋透明度呼吸，改用原生 Canvas 重寫，
 * 不引入 React／Framer Motion。音符造型全部自己用路徑畫。
 */
(() => {
  'use strict';

  // [桌機 ≥1100, 平板 ≥768, 手機] 三格的參數，順序固定
  const THEMES = {
    v1: {
      hero: {
        section: '.hero',
        after: '.h-photo',                       // canvas 插在這個元素後面（照片之上）
        hide: ['.h-copy', '.h-strip', '.h-inset'], // 會蓋住 canvas 的區塊：音符不放在它們底下
        clipTo: '.trust',                        // 畫到這個元素的上緣為止（信任列的字不能被線穿過）
        // 照片主體（瑪德蓮）的位置，以原圖比例表示 [中心x, 中心y, 半寬, 半高]：譜線經過這裡會淡出讓位，音符不放進來
        subject: { '.h-photo .ha': [0.67, 0.62, 0.31, 0.18], '.h-photo .hd': [0.48, 0.54, 0.28, 0.24] },
        band: [0.13, 0.84],                      // 桌機／平板：譜線分布的高度範圍（佔首屏高度）
        stacked: '(max-width: 900px)',           // 頁面切成上下堆疊版面的斷點（與 index.html 的手機斷點相同）
        bandMobile: ['.h-photo', 0.12, 110],     // 堆疊版面：只在照片範圍內（上緣往下 12%，到底部往上 110px）
        staffs: [3, 3, 2],
        gap: [11, 10, 8],                        // 五線譜的線距（px）
        line: '243,224,190',                     // 譜線色：暖奶油
        shade: ['5,53,76', 0.75],                 // 深藍細陰影（顏色, 相對強度）：暗處看不出來，亮色照片上才浮出來，線才讀得到
        lineAlpha: [0.30, 0.22, 0.16],           // 三組譜線各自的透明度（首屏上限約 0.35）
        lineWidth: 1,
        notes: ['250,236,210', '250,174,98'],    // 音符色：奶油、蜜杏橘
        accent: 0.25,                            // 蜜杏橘音符的比例
        noteAlpha: 0.72,                         // 音符透明度上限；實際在 ×0.35～×0.85 之間緩慢閃爍
        count: [15, 11, 7],
        sparks: [6, 4, 3],                       // 偶爾一閃的小星光
        float: [4, 8],                           // 上下漂浮振幅範圍（px）
        drawIn: 1.6,                             // 譜線畫入秒數
        noteGap: 0.12,                           // 音符依序登場的間隔（秒）
        parallax: [0.10, 0.18],                  // 捲動視差（捲動距離的倍數）
        push: { radius: 120, dist: 16 },         // 桌機滑鼠：作用半徑與最大推開距離
        ripple: { radius: 150, kick: 240 },      // 點一下：漣漪範圍與音符被彈開的力道
      },
      // 往下捲的「定點譜線」：固定放在某幾個區塊頂端的留白帶，從左或右伸出、往中間淡掉；捲到那裡，音符從譜線上彈出來
      spots: {
        // [區塊, 從哪一側伸出, 長度（佔畫面寬）, 音符數]——順序就是由上往下，左右刻意交錯、長短不一
        list: [
          ['.pain', 'left', 0.52, 4],
          ['.steps', 'right', 0.40, 3],
          ['.flv', 'left', 0.46, 4],
          ['.why', 'right', 0.56, 4],
          // 形象照上緣右側（2026-10-07 Chester 指定）：桌機從照片後面伸出往右淡掉；手機放在照片上方的空隙
          // near：el＝貼著哪個元素、at＝在照片高度的哪裡、from＝從照片寬度的哪裡開始（藏在照片後面）、above＝手機時距照片上緣多高
          ['.why', 'right', 0.42, 3, { el: '.maker-photo', at: 0.15, from: 0.8, above: 36 }],
          ['.when', 'left', 0.38, 3],
          ['.faq', 'right', 0.48, 4],
          ['.rest', 'left', 0.44, 3],
        ],
        stacked: '(max-width: 900px)',           // 與首屏同一個斷點
        lenMobile: 0.78,                         // 手機上的長度（畫面窄，伸長一點才看得出是譜）
        notesMobile: 3,
        gap: [10, 10, 8],
        height: [150, 150, 120],                 // 每條譜線的畫布高度（px），置中在區塊頂端留白的正中間
        // 依區塊底色自動選：淺底用焦糖棕，深底（深海藍）用暖奶油
        light: { line: '102,60,27', lineAlpha: 0.42, notes: ['102,60,27', '250,174,98'], noteAlpha: 0.82 },
        dark: { line: '243,224,190', lineAlpha: 0.34, notes: ['250,236,210', '250,174,98'], noteAlpha: 0.8 },
        accent: 0.28,
        drawIn: 1.0,                             // 第一次捲到時，譜線從側邊畫進來的秒數
        popGap: 0.16,                            // 音符依序彈出的間隔（秒）
        hop: [6, 11],                            // 停在畫面上時，每隔幾秒有一顆再輕跳一下
        float: [2, 4],
        push: { radius: 110, dist: 12 },
      },
    },

    // ═══ V2「轉場故事型」：米白底、拱形與圓。配色 2026-10-07 Chester 拍板：
    //     淺底＝煙燻粉藕譜線＋深可可音符（少數粉藕）；深可可底＝暖奶油譜線，才夾蜜杏橘音符（淺底不放橘，避免和 31 顆橘圓點混在一起）
    v2: {
      // Hero C（預設）：五線譜沿著拱形肖像的輪廓走——左側直線往上、繞過拱頂、右側往下，碰到文字就淡出
      arch: {
        section: '.hero-c',
        frame: '.hc-fig img',                    // 沿著這張拱形照片的輪廓
        avoid: ['.hc-head', '.hc-body', '.nav', '.trustrow'], // 碰到這些（文字、導覽列）就淡出
        covers: ['.hc-fig .bg', '.hc-fig img', '.stamp', '.o-h1'], // 會蓋住譜線的東西：音符不放在它們底下
        offset: [22, 22, 14],                    // 最內側那條線離照片邊緣多遠（px）
        gap: [10, 10, 7],
        side: [0.7, 0.7, 0.7],                   // 兩側直線往下延伸多長（佔照片直線段的比例）
        line: '186,151,147', lineAlpha: 0.8,     // 煙燻粉藕
        notes: ['66,20,7', '186,151,147'], accent: 0.3, noteAlpha: 0.88, // 深可可，少數粉藕
        count: [9, 8, 5],
        drawIn: 2.2, noteGap: 0.14, float: [1.5, 3],
        push: { radius: 110, dist: 12 },
        ripple: { radius: 140, kick: 220 },
      },
      // Hero B（?v=b）：照 V1 的做法——譜線只畫在右邊照片上，鑽到大標與半透明字卡後面，經過瑪德蓮時讓位
      heroB: {
        section: '.hero-b',
        after: '.hb-photo',
        hide: ['.hb h1', '.glass', '.hb .eyebrow'],
        clipBox: '.hb-photo',                    // 線只畫在照片框裡
        subject: { '.hb-photo img': [0.505, 0.71, 0.21, 0.14] },
        band: [0.16, 0.8],
        stacked: '(max-width: 900px)',
        bandMobile: ['.hb-photo', 0.14, 90],
        staffs: [3, 3, 2],
        gap: [11, 10, 8],
        line: '255,240,220',
        shade: ['66,20,7', 0.7],                 // 深可可細陰影：照片亮處也讀得到
        lineAlpha: [0.34, 0.26, 0.2],
        lineWidth: 1,
        notes: ['255,246,233', '231,214,207'], accent: 0.3, noteAlpha: 0.78,
        count: [12, 10, 7],
        sparks: [5, 4, 3],
        float: [4, 8],
        drawIn: 1.6,
        noteGap: 0.12,
        parallax: [0.08, 0.14],
        push: { radius: 120, dist: 16 },
        ripple: { radius: 150, kick: 240 },
      },
      spots: {
        // [區塊, 從哪一側伸出, 長度, 音符數, 選項]——左右刻意和區塊交界上的橘圓點錯開（圓點在哪一側，譜線就放另一側）
        list: [
          ['.pain', 'left', 0.5, 4],
          ['.sol', 'right', 0.44, 3],
          ['.story', 'right', 0.46, 4],          // 深可可底
          // 名字的由來：把卡片底部原本那條靜態譜線換成會動的（JS 沒跑時原本那條還在）
          // at：對齊原本那條靜態譜線的下半部（往上就碰到內文）；flat：幾乎不起伏；pitch：只用低音區，符桿不伸進文字
          ['.origin', 'full', 1, 5, { el: '.staff', mode: 'center', at: 0.78, hide: '.staff', pal: 'onRose', gap: 8, flat: true, pitch: [-1, 2], notesAt: [0.56, 0.86] }],
          ['.flv', 'left', 0.48, 4],
          ['.why', 'right', 0.42, 3],
          ['.when', 'left', 0.46, 4],
          ['.rest', 'right', 0.44, 3],           // 深可可底
        ],
        stacked: '(max-width: 900px)',
        lenMobile: 0.78,
        notesMobile: 3,
        gap: [10, 10, 8],
        height: [150, 150, 120],
        // 粉藕本身偏淺，在杏仁底上對比低：線加粗一點、透明度給足
        light: { line: '186,151,147', lineAlpha: 0.95, lineWidth: 1.25, notes: ['66,20,7', '186,151,147'], noteAlpha: 0.85 },
        dark: { line: '243,224,190', lineAlpha: 0.36, notes: ['250,236,210', '250,174,98'], noteAlpha: 0.85 },
        onRose: { line: '255,246,233', lineAlpha: 0.6, notes: ['255,246,233', '66,20,7'], noteAlpha: 0.9 }, // 粉藕卡片上
        accent: 0.3,
        drawIn: 1.0,
        popGap: 0.16,
        hop: [6, 11],
        float: [2, 4],
        push: { radius: 110, dist: 12 },
      },
    },
  };

  const me = document.currentScript;
  const T = THEMES[(me && me.dataset.musicBg) || 'v1'];
  if (!T || !window.requestAnimationFrame || !window.IntersectionObserver) return;

  const mq = q => window.matchMedia && matchMedia(q).matches;
  const REDUCED = mq('(prefers-reduced-motion: reduce)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const LOW = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const TAU = Math.PI * 2, SG = 14; // SG：音符精靈圖的基準線距，畫的時候再縮放
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = p => 1 - Math.pow(1 - p, 3);
  const rand = (a, b) => a + Math.random() * (b - a);
  const backOut = p => { const c = 1.9, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; }; // 略過頭再回來：彈出感
  const M = { x: -1e4, y: -1e4, on: false }; // 桌機滑鼠位置（視窗座標），兩層共用
  if (FINE && !REDUCED) {
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { M.x = e.clientX; M.y = e.clientY; M.on = true; } }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { M.on = false; });
  }
  const tierOf = () => (innerWidth >= 1100 ? 0 : innerWidth >= 768 ? 1 : 2);
  const dprOf = tier => Math.min(window.devicePixelRatio || 1, tier === 2 || LOW ? 1.5 : 2);

  // ───────── 音符精靈圖：每種顏色畫一次，動畫迴圈裡只貼圖 ─────────
  function sprites(rgb, dpr) {
    const g = SG * dpr;
    const mk = (w, h, ax, ay, draw) => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * g); c.height = Math.ceil(h * g);
      const x = c.getContext('2d');
      x.fillStyle = `rgb(${rgb})`;
      x.translate(ax * g, ay * g);
      draw(x);
      return { c, ax: ax * g, ay: ay * g };
    };
    const head = (x, dx, dy, hollow) => {
      x.save(); x.translate(dx * g, dy * g); x.rotate(-0.35);
      x.beginPath(); x.ellipse(0, 0, 0.66 * g, 0.46 * g, 0, 0, TAU); x.fill();
      if (hollow) { x.globalCompositeOperation = 'destination-out'; x.rotate(-0.25); x.beginPath(); x.ellipse(0, 0, 0.5 * g, 0.22 * g, 0, 0, TAU); x.fill(); }
      x.restore();
    };
    const stem = (x, dx, top, bot) => x.fillRect((0.52 + dx) * g, top * g, 0.11 * g, (bot - top) * g);
    return {
      q: mk(1.9, 5, 0.8, 4, x => { head(x, 0, 0); stem(x, 0, -3.4, -0.1); }),
      h: mk(1.9, 5, 0.8, 4, x => { head(x, 0, 0, true); stem(x, 0, -3.4, -0.15); }),
      e: mk(2.7, 5, 0.8, 4, x => {
        head(x, 0, 0); stem(x, 0, -3.4, -0.1);
        x.beginPath(); x.moveTo(0.6 * g, -3.4 * g);
        x.bezierCurveTo(0.7 * g, -2.6 * g, 1.75 * g, -2.3 * g, 1.2 * g, -1.05 * g);
        x.bezierCurveTo(1.45 * g, -2.0 * g, 0.95 * g, -2.35 * g, 0.6 * g, -2.55 * g);
        x.closePath(); x.fill();
      }),
      b: mk(4, 5, 0.8, 4.3, x => {
        head(x, 0, 0); head(x, 2.3, -0.5); stem(x, 0, -3.4, -0.1); stem(x, 2.3, -3.8, -0.6);
        x.beginPath(); x.moveTo(0.52 * g, -3.4 * g); x.lineTo(2.93 * g, -3.8 * g);
        x.lineTo(2.93 * g, -3.33 * g); x.lineTo(0.52 * g, -2.93 * g); x.closePath(); x.fill();
      }),
      s: mk(2, 2, 1, 1, x => {
        const r = 0.9 * g;
        x.beginPath(); x.moveTo(0, -r);
        x.quadraticCurveTo(0, 0, r, 0); x.quadraticCurveTo(0, 0, 0, r);
        x.quadraticCurveTo(0, 0, -r, 0); x.quadraticCurveTo(0, 0, 0, -r); x.fill();
      }),
      o: mk(4, 4, 2, 2, x => {
        const gr = x.createRadialGradient(0, 0, 0, 0, 0, 2 * g);
        gr.addColorStop(0, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
        x.fillStyle = gr; x.fillRect(-2 * g, -2 * g, 4 * g, 4 * g);
      }),
    };
  }
  const TYPES = ['q', 'q', 'q', 'e', 'e', 'e', 'h', 'h', 'b'];

  function blit(ctx, sp, x, y, k, rot, a) {
    const c = Math.cos(rot) * k, s = Math.sin(rot) * k;
    ctx.globalAlpha = a;
    ctx.setTransform(c, s, -s, c, x, y);
    ctx.drawImage(sp.c, -sp.ax, -sp.ay);
  }

  // ───────── 五線譜：一條中心曲線＋會呼吸的線距，五條線同一次 stroke ─────────
  function staff(base, g, mobile) {
    return {
      base, g, par: 0, a: 1, delay: 0,
      k1: TAU / (rand(0.85, 1.25) * (mobile ? 560 : 1150)), A1: rand(0.7, 1.2) * (mobile ? 12 : 24), p1: rand(0, TAU), w1: rand(0.10, 0.16),
      k2: TAU / (mobile ? 260 : 460), A2: rand(4, mobile ? 6 : 9), p2: rand(0, TAU), w2: rand(0.07, 0.11),
      k3: TAU / rand(500, 900), p3: rand(0, TAU), w3: rand(0.05, 0.09), tw: rand(0.08, 0.14),
      tilt: rand(-0.035, 0.035),
    };
  }
  const yc = (s, x, t, W) => s.base + s.tilt * (x - W / 2) + s.A1 * Math.sin(x * s.k1 + s.p1 + t * s.w1) + s.A2 * Math.sin(x * s.k2 + s.p2 - t * s.w2);
  const gapAt = (s, x, t) => s.g * (1 + s.tw * Math.sin(x * s.k3 + s.p3 + t * s.w3));
  const XS = new Float32Array(400), YS = new Float32Array(400), GS = new Float32Array(400);
  function drawStaff(ctx, s, t, W, xEnd, dy, step, x0 = 0) {
    let n = 0;
    for (let x = x0; n < 400; x += step) {
      const xx = x < xEnd ? x : xEnd;
      XS[n] = xx; YS[n] = yc(s, xx, t, W) + dy; GS[n] = gapAt(s, xx, t); n++;
      if (xx >= xEnd) break;
    }
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(XS[0], YS[0] + k * GS[0]);
      for (let i = 1; i < n; i++) ctx.lineTo(XS[i], YS[i] + k * GS[i]);
    }
    ctx.stroke();
  }

  function makeCanvas(css) {
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.setAttribute('role', 'presentation');
    cv.tabIndex = -1;
    cv.style.cssText = 'pointer-events:none;display:block;opacity:0;transition:opacity 1.2s ease;' + css;
    return cv;
  }

  // ───────── 首屏舞台 ─────────
  function Hero(C) {
    const sec = document.querySelector(C.section), anchor = sec && sec.querySelector(C.after);
    if (!sec || !anchor || !sec.getClientRects().length) return null; // 這個首屏沒顯示（另一個 ?v= 版本）就不建
    const cv = makeCanvas('position:absolute;left:0;top:0;width:100%;height:100%');
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    anchor.after(cv);

    let W = 0, H = 0, dpr = 1, tier = 2, top = 0, step = 24, grad = null, gradS = null, sp = [], spS = null, start = -1, clipY = 0;
    let subj = null, hole = null; // 主體橢圓（首屏座標）與淡出用的徑向漸層
    let box = [0, 0, 0, 0];       // 可以畫的範圍 [左, 上, 右, 下]
    let staffs = [], notes = [], sparks = [], holes = [];
    const ripples = [];

    function hidden(x, y) {
      if (y < 84 || y > clipY - 24 || x < box[0] + 16 || x > box[2] - 16 || y > box[3] - 16) return true;
      if (subj) { const u = (x - subj[0]) / subj[2], v = (y - subj[1]) / subj[3]; if (u * u + v * v < 1.15) return true; }
      for (const r of holes) if (x > r[0] - 12 && x < r[2] + 12 && y > r[1] - 12 && y < r[3] + 12) return true;
      return false;
    }

    function layout(force) {
      const R = sec.getBoundingClientRect();
      const w = Math.round(R.width), h = Math.round(R.height), tr = tierOf();
      const same = w === W && Math.abs(h - H) < 80 && tr === tier && staffs.length;
      if (same) { // 手機網址列伸縮造成的小幅高度變化：只更新裁切線，不重排音符
        const ce = C.clipTo && sec.querySelector(C.clipTo);
        clipY = ce ? ce.getBoundingClientRect().top - R.top : h;
        if (!C.clipBox) box[3] = clipY;
      }
      top = R.top + scrollY;
      if (same && !force) return;
      W = w; H = h; tier = tr; dpr = dprOf(tier); step = tier === 2 ? 18 : 24;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      sp = C.notes.map(c => sprites(c, dpr));
      spS = C.shade ? sprites(C.shade[0], dpr) : null;
      const edge = (rgb, b) => {
        const gr = ctx.createLinearGradient(b[0], 0, b[2], 0);
        gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.06, `rgba(${rgb},1)`);
        gr.addColorStop(0.94, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
        return gr;
      };

      holes = C.hide.map(q => sec.querySelector(q)).filter(Boolean).map(el => el.getBoundingClientRect())
        .filter(r => r.width > 0 && r.height > 0).map(r => [r.left - R.left, r.top - R.top, r.right - R.left, r.bottom - R.top]);
      const ce = C.clipTo && sec.querySelector(C.clipTo);
      clipY = ce ? ce.getBoundingClientRect().top - R.top : H;
      // 只畫在某個框裡（例如只畫在照片上，不畫到旁邊的大標題底下）
      const be = C.clipBox && sec.querySelector(C.clipBox);
      if (be) { const r = be.getBoundingClientRect(); box = [r.left - R.left, r.top - R.top, r.right - R.left, Math.min(r.bottom - R.top, clipY)]; }
      else box = [0, 0, W, clipY];
      grad = edge(C.line, box);
      gradS = C.shade ? edge(C.shade[0], box) : null;

      // 主體位置：依 object-fit:cover 與 object-position 換算成首屏座標
      subj = null;
      for (const q in C.subject || {}) {
        const img = sec.querySelector(q);
        if (!img || !img.naturalWidth || !img.getClientRects().length) continue;
        const b = img.getBoundingClientRect(), [u, v, ru, rv] = C.subject[q];
        if (!b.width || !b.height) continue;
        const s = Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight);
        const pos = getComputedStyle(img).objectPosition.split(' ').map(p => (p.endsWith('%') ? parseFloat(p) / 100 : 0.5));
        const ox = (b.width - img.naturalWidth * s) * pos[0], oy = (b.height - img.naturalHeight * s) * (pos[1] == null ? 0.5 : pos[1]);
        subj = [b.left - R.left + ox + u * img.naturalWidth * s, b.top - R.top + oy + v * img.naturalHeight * s, ru * img.naturalWidth * s, rv * img.naturalHeight * s];
        break;
      }
      hole = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(0.62, 'rgba(0,0,0,.92)'); hole.addColorStop(1, 'rgba(0,0,0,0)');

      // 譜線的高度範圍
      let y0 = H * C.band[0], y1 = H * C.band[1];
      if (mq(C.stacked)) {
        const b = sec.querySelector(C.bandMobile[0]);
        if (b) { const r = b.getBoundingClientRect(); y0 = r.top - R.top + r.height * C.bandMobile[1]; y1 = r.bottom - R.top - C.bandMobile[2]; }
      }
      const n = C.staffs[tier], g = C.gap[tier], depth = [1, 1.2, 0.85];
      staffs = [];
      for (let i = 0; i < n; i++) {
        const s = staff(y0 + (y1 - y0) * (n === 1 ? 0.5 : i / (n - 1)), g * depth[i % 3], tier === 2);
        // 最高點不得進導覽列（品牌字與選單在那一帶）
        const reach = 2 * s.g * (1 + s.tw) + s.A1 + s.A2 + Math.abs(s.tilt) * W / 2;
        s.base = Math.max(s.base, 84 + reach + i * 4 * g);
        s.a = C.lineAlpha[i % C.lineAlpha.length];
        s.par = rand(C.parallax[0], C.parallax[1]);
        s.delay = i * 0.22;
        staffs.push(s);
      }

      // 音符：依每組譜線「沒被蓋住」的長度分配數量，再在可見段裡平均撒開
      const N = Math.max(3, Math.round(C.count[tier] * (LOW ? 0.7 : 1)));
      const vis = staffs.map(s => { const xs = []; for (let x = 24; x < W - 24; x += 8) if (!hidden(x, yc(s, x, 0, W))) xs.push(x); return xs; });
      const total = vis.reduce((a, v) => a + v.length, 0) || 1;
      notes = [];
      staffs.forEach((s, i) => {
        const xs = vis[i], k = Math.round(N * xs.length / total);
        for (let j = 0; j < k; j++) {
          const type = TYPES[(Math.random() * TYPES.length) | 0];
          const p = type === 'b' ? (Math.random() * 6) | 0 : ((Math.random() * 11) | 0) - 1;
          notes.push({
            s: i, x: xs[Math.floor((j + rand(0.25, 0.75)) / k * xs.length)], p, type,
            down: (type === 'q' || type === 'h') && p >= 5,
            col: Math.random() < C.accent ? 1 : 0, sc: rand(0.9, 1.1),
            fA: rand(C.float[0], C.float[1]), fW: rand(0.5, 0.9), fP: rand(0, TAU),
            rW: rand(0.2, 0.4), rP: rand(0, TAU), tW: rand(0.5, 1.1), tP: rand(0, TAU),
            birth: 0, ox: 0, oy: 0, vx: 0, vy: 0, glow: 0,
          });
        }
      });
      // 登場順序：由左到右；不早於譜線畫到那個位置
      notes.sort((a, b) => a.x - b.x);
      const gap = Math.min(C.noteGap, 1.5 / notes.length);
      notes.forEach((nt, i) => {
        const s = staffs[nt.s];
        const reach = s.delay + C.drawIn * 0.45 * (nt.x / W);
        nt.birth = Math.max(0.35 + i * gap, reach);
      });
      sparks = [];
      for (let i = 0; i < Math.round(C.sparks[tier] * (LOW ? 0.5 : 1)) && notes.length; i++) {
        const nt = notes[(Math.random() * notes.length) | 0];
        sparks.push({ nt, dx: rand(-2.4, 2.4), dy: rand(-4.2, 1.2), w: rand(0.6, 1.3), ph: rand(0, TAU), sc: rand(0.35, 0.6), col: Math.random() < 0.5 ? 1 : 0 });
      }
      if (force === 'static') frame(1e3, 0, scrollY, true);
    }

    if (!REDUCED) sec.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('a,button,summary,input,label')) return;
      const R = sec.getBoundingClientRect(), x = e.clientX - R.left, y = e.clientY - R.top;
      if (ripples.length > 2) ripples.shift();
      ripples.push({ x, y, t: -1 });
      for (const nt of notes) {
        const dx = nt.hx - x, dy = nt.hy - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < C.ripple.radius) { const f = C.ripple.kick * (1 - d / C.ripple.radius); nt.vx += dx / d * f; nt.vy += dy / d * f; }
      }
    }, { passive: true });

    function frame(t, dt, sy, still) {
      if (start < 0) start = t;
      const te = still ? 1e3 : t - start;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.beginPath(); ctx.rect(box[0] * dpr, box[1] * dpr, (box[2] - box[0]) * dpr, (box[3] - box[1]) * dpr); ctx.clip();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = C.lineWidth;
      for (const s of staffs) {
        const rv = ease(clamp((te - s.delay) / C.drawIn, 0, 1));
        if (rv <= 0) continue;
        if (gradS) { ctx.strokeStyle = gradS; ctx.globalAlpha = s.a * C.shade[1]; drawStaff(ctx, s, t, W, rv * W, sy * s.par + 1, step); }
        ctx.strokeStyle = grad; ctx.globalAlpha = s.a;
        drawStaff(ctx, s, t, W, rv * W, sy * s.par, step);
      }
      if (subj) { // 譜線在瑪德蓮周圍淡出，讓位給主體
        ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.fillStyle = hole;
        ctx.setTransform(subj[2] * 1.25 * dpr, 0, 0, subj[3] * 1.35 * dpr, subj[0] * dpr, subj[1] * dpr);
        ctx.fillRect(-1, -1, 2, 2);
        ctx.globalCompositeOperation = 'source-over';
      }

      // 漣漪
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        if (r.t < 0) r.t = t;
        const p = (t - r.t) / 1.2;
        if (p >= 1) { ripples.splice(i, 1); continue; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = `rgba(${C.line},1)`; ctx.lineWidth = 1;
        for (const [d, m] of [[0, 1], [0.14, 0.62]]) {
          const q = clamp((p - d) / (1 - d), 0, 1);
          if (q <= 0) continue;
          ctx.globalAlpha = 0.42 * (1 - q) * (1 - q);
          ctx.beginPath(); ctx.arc(r.x, r.y, (10 + 74 * ease(q)) * m, 0, TAU); ctx.stroke();
        }
      }

      const R = C.push.radius, hmx = M.x, hmy = M.y + sy - top;
      const K = 70, D = 10, dtt = still ? 0 : dt;
      for (const nt of notes) {
        const e0 = clamp((te - nt.birth) / 0.7, 0, 1);
        if (e0 <= 0) { nt.hx = -1e4; continue; }
        const e = ease(e0), s = staffs[nt.s], g = gapAt(s, nt.x, t);
        const hx = nt.x;
        const hy = yc(s, nt.x, t, W) + sy * s.par + 2 * g - nt.p * g / 2 + Math.sin(t * nt.fW + nt.fP) * nt.fA + (1 - e) * 8;
        nt.hx = hx; nt.hy = hy;
        let tx = 0, ty = 0, push = 0;
        if (M.on && !LOW) {
          const dx = hx - hmx, dy = hy - hmy, d2 = dx * dx + dy * dy;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * (1 - d / R); tx = dx / d * C.push.dist * f; ty = dy / d * C.push.dist * f; push = f; }
        }
        nt.vx += ((tx - nt.ox) * K - nt.vx * D) * dtt; nt.ox += nt.vx * dtt;
        nt.vy += ((ty - nt.oy) * K - nt.vy * D) * dtt; nt.oy += nt.vy * dtt;
        nt.glow += (push - nt.glow) * Math.min(1, dtt * 6);
        const tw = still ? 0.7 : 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * nt.tW + nt.tP));
        const a = Math.min(0.95, C.noteAlpha * tw * e + nt.glow * 0.4);
        const k = g / SG * nt.sc * (0.86 + 0.14 * e) * (1 + nt.glow * 0.1);
        const rot = Math.sin(t * nt.rW + nt.rP) * 0.05 + (nt.down ? Math.PI : 0);
        const X = (hx + nt.ox) * dpr, Y = (hy + nt.oy) * dpr, S = sp[nt.col];
        if (nt.glow > 0.03 && !LOW) blit(ctx, S.o, X, Y, k, 0, nt.glow * 0.6);
        if (spS) blit(ctx, spS[nt.type], X + dpr, Y + dpr, k, rot, a * C.shade[1]);
        blit(ctx, S[nt.type], X, Y, k, rot, a);
      }

      if (!still) for (const k of sparks) {
        const nt = k.nt;
        if (nt.hx < -1e3) continue;
        const f = Math.pow(Math.max(0, Math.sin(t * k.w + k.ph)), 10);
        if (f < 0.02) continue;
        const g = staffs[nt.s].g;
        blit(ctx, sp[k.col].s, (nt.hx + k.dx * g) * dpr, (nt.hy + k.dy * g) * dpr, g / SG * k.sc * (0.6 + 0.4 * f), t * 0.4, 0.8 * f);
      }
      ctx.restore();
    }

    return { sec, cv, layout, frame };
  }

  // ───────── 拱形譜線（V2 Hero C）：沿著拱形照片的輪廓走——左側直線往上、繞過拱頂、右側往下；碰到文字就淡出 ─────────
  function Arch(C) {
    const sec = document.querySelector(C.section), pic = sec && sec.querySelector(C.frame);
    if (!sec || !pic || !sec.getClientRects().length) return null;
    const cv = makeCanvas('position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1');
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    sec.style.isolation = 'isolate'; // 畫布在首屏底色之上、所有內容（含照片與粉藕拱形）之下
    sec.prepend(cv);

    const MAXN = 600;
    const BX = new Float32Array(MAXN), BY = new Float32Array(MAXN), NX = new Float32Array(MAXN), NY = new Float32Array(MAXN);
    const SS = new Float32Array(MAXN), VA = new Float32Array(MAXN);
    let N = 0, L = 0, W = 0, H = 0, dpr = 1, tier = 2, g = 10, top = 0, left = 0, start = -1, sp = [], notes = [];
    const ripples = [];

    function layout(force) {
      const S = sec.getBoundingClientRect(), P = pic.getBoundingClientRect(), tr = tierOf();
      if (!force && Math.round(S.width) === W && Math.abs(S.height - H) < 80 && tr === tier && N) { top = S.top + scrollY; return; }
      W = Math.round(S.width); H = Math.round(S.height); tier = tr; dpr = dprOf(tier); g = C.gap[tier];
      top = S.top + scrollY; left = S.left;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      sp = C.notes.map(c => sprites(c, dpr));

      // 中線：拱形半徑＋離照片的距離＋兩個線距（五條線的正中間那條）
      const r0 = P.width / 2, cx = P.left - S.left + r0, cy = P.top - S.top + r0;
      const rm = r0 + C.offset[tier] + 2 * g, side = Math.max(0, (P.bottom - S.top - cy) * C.side[tier]);
      L = side * 2 + Math.PI * rm;
      N = Math.min(MAXN, Math.ceil(L / 7) + 1);
      for (let i = 0; i < N; i++) {
        const s = L * i / (N - 1);
        let bx, by, nx, ny;
        if (s < side) { bx = cx - rm; by = cy + side - s; nx = -1; ny = 0; }
        else if (s < side + Math.PI * rm) { const a = Math.PI + (s - side) / rm; nx = Math.cos(a); ny = Math.sin(a); bx = cx + rm * nx; by = cy + rm * ny; }
        else { bx = cx + rm; by = cy + (s - side - Math.PI * rm); nx = 1; ny = 0; }
        BX[i] = bx; BY[i] = by; NX[i] = nx; NY[i] = ny; SS[i] = s;
      }

      // 碰到文字（與導覽列）就淡出：離得越近越淡，兩端也收尖
      const rel = el => { const r = el.getBoundingClientRect(); return [r.left - S.left, r.top - S.top, r.right - S.left, r.bottom - S.top]; };
      const avoid = C.avoid.map(q => document.querySelector(q)).filter(e => e && e.getClientRects().length).map(rel);
      const dist = (x, y) => {
        let m = 1e9;
        for (const r of avoid) {
          const dx = Math.max(r[0] - 14 - x, 0, x - r[2] - 14), dy = Math.max(r[1] - 14 - y, 0, y - r[3] - 14);
          m = Math.min(m, Math.sqrt(dx * dx + dy * dy));
        }
        return m;
      };
      for (let i = 0; i < N; i++) {
        let v = 1;
        for (const k of [-2.6, 2.6]) v = Math.min(v, clamp(dist(BX[i] + NX[i] * k * g, BY[i] + NY[i] * k * g) / 30, 0, 1));
        VA[i] = v * clamp(SS[i] / 50, 0, 1) * clamp((L - SS[i]) / 50, 0, 1);
      }

      // 音符：只放在完全看得到、也沒被照片／粉藕拱形／圓章蓋住的地方
      const covers = C.covers.map(q => sec.querySelector(q)).filter(Boolean).map(rel);
      const ok = [];
      for (let i = 0; i < N; i++) {
        if (VA[i] < 0.98) continue;
        const x = BX[i], y = BY[i];
        if (covers.some(r => x > r[0] - 10 && x < r[2] + 10 && y > r[1] - 10 && y < r[3] + 10)) continue;
        ok.push(i);
      }
      const n = Math.min(ok.length, Math.round(C.count[tier] * (LOW ? 0.7 : 1)));
      notes = [];
      for (let j = 0; j < n; j++) {
        const i = ok[Math.floor((j + rand(0.25, 0.75)) / n * ok.length)];
        const type = TYPES[(Math.random() * TYPES.length) | 0];
        const p = type === 'b' ? (Math.random() * 4) | 0 : ((Math.random() * 8) | 0) - 1;
        notes.push({
          i, p, type, down: (type === 'q' || type === 'h') && p >= 5, col: Math.random() < C.accent ? 1 : 0, sc: rand(0.95, 1.1),
          fA: rand(C.float[0], C.float[1]), fW: rand(0.5, 0.9), fP: rand(0, TAU), rW: rand(0.2, 0.4), rP: rand(0, TAU),
          tW: rand(0.4, 0.8), tP: rand(0, TAU), birth: 0, ox: 0, oy: 0, vx: 0, vy: 0, hx: -1e4, hy: -1e4,
        });
      }
      notes.forEach((nt, j) => { nt.birth = Math.max(0.3 + j * C.noteGap, C.drawIn * ease(nt.i / N) * 0.9); });
      if (force === 'static') frame(1e3, 0, scrollY, true);
    }

    if (!REDUCED) sec.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('a,button,summary,input,label')) return;
      const R = sec.getBoundingClientRect(), x = e.clientX - R.left, y = e.clientY - R.top;
      if (ripples.length > 2) ripples.shift();
      ripples.push({ x, y, t: -1 });
      for (const nt of notes) {
        const dx = nt.hx - x, dy = nt.hy - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < C.ripple.radius) { const f = C.ripple.kick * (1 - d / C.ripple.radius); nt.vx += dx / d * f; nt.vy += dy / d * f; }
      }
    }, { passive: true });

    function frame(t, dt, sy, still) {
      if (start < 0) start = t;
      const te = still ? 1e3 : t - start;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = `rgb(${C.line})`;
      const end = Math.round(ease(clamp(te / C.drawIn, 0, 1)) * (N - 1));

      // 五條線：同一段透明度的連續區間合併成一次 stroke
      for (let k = -2; k <= 2; k++) {
        let run = -1;
        ctx.beginPath();
        for (let i = 0; i <= end; i++) {
          const w = Math.sin(SS[i] * 0.018 + t * 0.5 + k * 0.3) * 2.2, off = k * g + w;
          const x = BX[i] + NX[i] * off, y = BY[i] + NY[i] * off;
          const a = Math.round(VA[i] * 10) / 10;
          if (a !== run) {
            if (run > 0) { ctx.lineTo(x, y); ctx.globalAlpha = C.lineAlpha * run; ctx.stroke(); }
            ctx.beginPath(); ctx.moveTo(x, y); run = a;
          } else ctx.lineTo(x, y);
        }
        if (run > 0) { ctx.globalAlpha = C.lineAlpha * run; ctx.stroke(); }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        if (r.t < 0) r.t = t;
        const p = (t - r.t) / 1.2;
        if (p >= 1) { ripples.splice(i, 1); continue; }
        for (const [d, m] of [[0, 1], [0.14, 0.62]]) {
          const q = clamp((p - d) / (1 - d), 0, 1);
          if (q <= 0) continue;
          ctx.globalAlpha = 0.5 * (1 - q) * (1 - q);
          ctx.beginPath(); ctx.arc(r.x, r.y, (10 + 74 * ease(q)) * m, 0, TAU); ctx.stroke();
        }
      }

      const mx = M.x - left, my = M.y + sy - top, R2 = C.push.radius, K = 70, D = 10, dtt = still ? 0 : dt;
      for (const nt of notes) {
        const e0 = clamp((te - nt.birth) / 0.7, 0, 1);
        if (e0 <= 0) { nt.hx = -1e4; continue; }
        const i = nt.i, off = -2 * g + nt.p * g / 2 + Math.sin(t * nt.fW + nt.fP) * nt.fA;
        const hx = BX[i] + NX[i] * off, hy = BY[i] + NY[i] * off;
        nt.hx = hx; nt.hy = hy;
        let tx = 0, ty = 0;
        if (M.on && !LOW) {
          const dx = hx - mx, dy = hy - my, d2 = dx * dx + dy * dy;
          if (d2 < R2 * R2) { const d = Math.sqrt(d2) || 1, f = (1 - d / R2) * (1 - d / R2); tx = dx / d * C.push.dist * f; ty = dy / d * C.push.dist * f; }
        }
        nt.vx += ((tx - nt.ox) * K - nt.vx * D) * dtt; nt.ox += nt.vx * dtt;
        nt.vy += ((ty - nt.oy) * K - nt.vy * D) * dtt; nt.oy += nt.vy * dtt;
        const k = g / SG * nt.sc * (still ? 1 : backOut(e0));
        if (k < 0.01) continue;
        const a = C.noteAlpha * (0.8 + 0.2 * Math.sin(t * nt.tW + nt.tP)) * Math.min(1, e0 * 2.5);
        const rot = Math.atan2(NY[i], NX[i]) + Math.PI / 2 + Math.sin(t * nt.rW + nt.rP) * 0.05 + (nt.down ? Math.PI : 0);
        blit(ctx, sp[nt.col][nt.type], (hx + nt.ox) * dpr, (hy + nt.oy) * dpr, k, rot, a);
      }
      ctx.globalAlpha = 1;
    }

    return { sec, cv, layout, frame };
  }

  // ───────── 定點譜線：固定在幾個區塊頂端的留白帶，從一側伸出、往中間淡掉；捲到那裡，音符從譜線上彈出來 ─────────
  function bgDark(el) {
    for (let e = el; e; e = e.parentElement) {
      const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > 0.5)) return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255 < 0.45;
    }
    return false;
  }

  function Spots(C) {
    const items = [];
    for (const [sel, side, len, count, near] of C.list) {
      const sec = document.querySelector(sel);
      if (!sec) continue;
      const cv = makeCanvas('position:absolute;left:0;width:100%;z-index:-1');
      const ctx = cv.getContext('2d');
      if (!ctx) continue;
      if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
      sec.style.isolation = 'isolate'; // 讓 z-index:-1 的畫布留在這個區塊的底色之上、內容之下
      sec.prepend(cv);
      // 換掉頁面上原本的靜態譜線（JS 沒跑時，原本那條還在，當作備援）
      const old = near && near.hide && sec.querySelector(near.hide);
      if (old) old.style.visibility = 'hidden';
      const pal = near && near.pal ? C[near.pal] : bgDark(sec) ? C.dark : C.light;
      items.push({ sec, cv, ctx, side, len, count, near, pal, vis: false, drawn: -1, popT: -1, hopAt: 0, notes: [] });
    }
    if (!items.length) return null;
    let tier = 2, dpr = 1;

    function layout() {
      tier = tierOf(); dpr = dprOf(tier);
      const H = C.height[tier], g = C.gap[tier];
      for (const it of items) {
        const W = it.sec.clientWidth, pad = parseFloat(getComputedStyle(it.sec).paddingTop) || 0;
        let mid = Math.max(pad / 2, 44), top = Math.max(0, mid - H / 2); // 譜線中心＝區塊頂端留白帶的正中間
        const full = it.side === 'full', gg = (it.near && it.near.gap) || g;
        let L = full ? W + 20 : W * (tier === 2 ? C.lenMobile : it.len), left = it.side !== 'right', a0, a1;
        it.x0 = left ? -10 : W - L; it.x1 = left ? L - 10 : W + 10;
        if (full) { a0 = W * it.near.notesAt[0]; a1 = W * it.near.notesAt[1]; }

        // 貼著某個元素放。center：譜線中心對齊那個元素（例如名字卡原本那條靜態譜線）；
        // 其他（形象照）：桌機從照片後面伸出、往右淡掉；堆疊版面改放在照片上方的空隙，從右側伸進來
        const el = it.near && it.sec.querySelector(it.near.el);
        if (el) {
          const S = it.sec.getBoundingClientRect(), P = el.getBoundingClientRect();
          if (it.near.mode === 'center') {
            mid = P.top - S.top + P.height * (it.near.at == null ? 0.5 : it.near.at);
          } else if (mq(C.stacked)) {
            mid = P.top - S.top - it.near.above; left = false;
            it.x0 = W - L; it.x1 = W + 10;
          } else {
            mid = P.top - S.top + P.height * it.near.at; left = true;
            it.x0 = P.left - S.left + P.width * it.near.from; it.x1 = it.x0 + L;
            a0 = P.right - S.left + 26; a1 = it.x0 + L * 0.6;
          }
          top = mid - H / 2;
        }
        it.from = left ? 'left' : 'right';
        it.W = W; it.cy = mid - top;
        it.cv.style.top = top + 'px'; it.cv.style.height = H + 'px';
        it.cv.width = Math.round(W * dpr); it.cv.height = Math.round(H * dpr);
        it.sp = it.pal.notes.map(c => sprites(c, dpr));

        const gr = it.ctx.createLinearGradient(it.x0, 0, it.x1, 0), on = `rgba(${it.pal.line},1)`, off = `rgba(${it.pal.line},0)`;
        if (full) { gr.addColorStop(0, off); gr.addColorStop(0.08, on); gr.addColorStop(0.92, on); gr.addColorStop(1, off); }
        else if (left) { gr.addColorStop(0, on); gr.addColorStop(0.45, on); gr.addColorStop(1, off); }
        else { gr.addColorStop(0, off); gr.addColorStop(0.55, on); gr.addColorStop(1, on); }
        it.grad = gr;
        it.g = gg;

        const s = staff(it.cy, gg, tier === 2), flat = it.near && it.near.flat;
        s.A1 *= flat ? 0.12 : 0.45; s.A2 *= flat ? 0.2 : 0.6; s.tw *= flat ? 0.2 : 0.6; s.tilt = flat ? 0 : rand(-0.015, 0.015);
        it.s = s;
        const pr = (it.near && it.near.pitch) || null; // 限定音高範圍（上方緊貼文字時，符桿不能伸太高）

        // 音符落在譜線比較濃的那一段；彈出順序由外側往中間
        const n = tier === 2 ? Math.min(it.count, C.notesMobile) : it.count;
        if (a0 == null) { a0 = left ? 28 : W - L * 0.6; a1 = left ? L * 0.6 : W - 28; }
        it.notes = [];
        for (let j = 0; j < n; j++) {
          let type = TYPES[(Math.random() * TYPES.length) | 0];
          if (pr && type === 'b') type = 'e';
          const p = pr ? pr[0] + ((Math.random() * (pr[1] - pr[0] + 1)) | 0) : type === 'b' ? (Math.random() * 4) | 0 : ((Math.random() * 8) | 0) - 1;
          it.notes.push({
            x: a0 + (a1 - a0) * (j + rand(0.25, 0.75)) / n, p, type, down: (type === 'q' || type === 'h') && p >= 5,
            col: Math.random() < C.accent ? 1 : 0, sc: rand(0.95, 1.12),
            fA: rand(C.float[0], C.float[1]), fW: rand(0.5, 0.9), fP: rand(0, TAU), rW: rand(0.2, 0.4), rP: rand(0, TAU),
            tW: rand(0.4, 0.8), tP: rand(0, TAU), hopT: -9, ox: 0, oy: 0, vx: 0, vy: 0,
          });
        }
        if (!left) it.notes.reverse();
      }
    }

    // 進入畫面 60% 才彈；完全離開就重置，下次捲回來再彈一次
    function setVis(it, ratio, t) {
      it.vis = ratio > 0;
      if (!it.vis) { it.popT = -1; return; }
      if (it.popT < 0 && ratio >= 0.6) {
        it.popT = t;
        if (it.drawn < 0) it.drawn = t;
        it.hopAt = t + rand(C.hop[0], C.hop[1]);
      }
    }

    function draw(it, t, dt) {
      const { ctx, s, W } = it;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, it.cv.width, it.cv.height);
      if (it.drawn < 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rv = ease(clamp((t - it.drawn) / C.drawIn, 0, 1)), L = it.x1 - it.x0;
      const x0 = it.from === 'left' ? it.x0 : it.x1 - rv * L, x1 = it.from === 'left' ? it.x0 + rv * L : it.x1;
      ctx.strokeStyle = it.grad; ctx.lineWidth = it.pal.lineWidth || 1; ctx.globalAlpha = it.pal.lineAlpha;
      drawStaff(ctx, s, t, W, x1, 0, 18, x0);
      if (it.popT < 0) { ctx.globalAlpha = 1; return; }

      if (t > it.hopAt && dt) { it.notes[(Math.random() * it.notes.length) | 0].hopT = t; it.hopAt = t + rand(C.hop[0], C.hop[1]); }
      let mx = -1e4, my = -1e4;
      if (M.on && !LOW) { const r = it.cv.getBoundingClientRect(); mx = M.x - r.left; my = M.y - r.top; }
      const R = C.push.radius, K = 70, D = 10;
      for (let i = 0; i < it.notes.length; i++) {
        const nt = it.notes[i];
        const p = clamp((t - it.popT - 0.3 - i * C.popGap) / 0.7, 0, 1);
        if (p <= 0) continue;
        const g = gapAt(s, nt.x, t), q = clamp((t - nt.hopT) / 0.6, 0, 1);
        const hop = -16 * Math.sin(Math.PI * p) - (q < 1 ? 9 * Math.sin(Math.PI * q) : 0);
        const hx = nt.x, hy = yc(s, nt.x, t, W) + 2 * g - nt.p * g / 2 + Math.sin(t * nt.fW + nt.fP) * nt.fA * p + hop;
        let tx = 0, ty = 0;
        const dx = hx - mx, dy = hy - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * (1 - d / R); tx = dx / d * C.push.dist * f; ty = dy / d * C.push.dist * f; }
        nt.vx += ((tx - nt.ox) * K - nt.vx * D) * dt; nt.ox += nt.vx * dt;
        nt.vy += ((ty - nt.oy) * K - nt.vy * D) * dt; nt.oy += nt.vy * dt;
        const k = g / SG * nt.sc * backOut(p);
        if (k < 0.01) continue;
        const a = it.pal.noteAlpha * (0.8 + 0.2 * Math.sin(t * nt.tW + nt.tP)) * Math.min(1, p * 2.5);
        const rot = Math.sin(t * nt.rW + nt.rP) * 0.06 + (nt.down ? Math.PI : 0);
        blit(ctx, it.sp[nt.col][nt.type], (hx + nt.ox) * dpr, (hy + nt.oy) * dpr, k, rot, a);
      }
      ctx.globalAlpha = 1;
    }

    return {
      items, layout, setVis,
      frame(t, dt) { for (const it of items) if (it.vis) draw(it, t, dt); },
      // 減少動態效果：譜線與音符都直接畫好，不彈不動
      still() { for (const it of items) { it.drawn = it.popT = -100; it.hopAt = 1e9; draw(it, 0, 0); } },
    };
  }

  // ───────── 啟動：主要內容載入後、瀏覽器閒下來再開始，不拖慢首屏 ─────────
  function init() {
    // 首屏舞台：橫向穿梭（Hero）或沿拱形走（Arch）；?v= 切換時沒顯示的那個首屏會自己略過
    let stages = [], spots = null;
    for (const [make, conf] of [[Hero, T.hero], [Hero, T.heroB], [Arch, T.arch]]) {
      try { const s = conf && make(conf); if (s) stages.push(s); } catch (e) { /* 建不起來就靜默略過 */ }
    }
    try { spots = T.spots && Spots(T.spots); } catch (e) { spots = null; }
    if (!stages.length && !spots) return;

    let spotsOn = 0, raf = 0, last = 0, clock = 0;
    const fps = () => (tierOf() === 2 || LOW ? 30 : 60);
    const show = cv => requestAnimationFrame(() => { cv.style.opacity = 1; });

    stages.forEach(s => { s.layout(REDUCED ? 'static' : true); show(s.cv); });
    if (spots) { spots.layout(); if (REDUCED) spots.still(); spots.items.forEach(it => show(it.cv)); }

    let rt = 0;
    const relayout = () => {
      clearTimeout(rt);
      rt = setTimeout(() => { stages.forEach(s => s.layout(REDUCED ? 'static' : false)); if (spots) { spots.layout(); if (REDUCED) spots.still(); } }, 250);
    };
    addEventListener('resize', relayout, { passive: true });
    addEventListener('orientationchange', relayout, { passive: true });
    if (REDUCED) return; // 減少動態效果：只留靜態畫面，淡入後不再動

    const anyOn = () => spotsOn || stages.some(s => s.on);
    const loop = now => {
      raf = 0;
      if (now - last < 1000 / fps() - 2) { schedule(); return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now; clock += dt;
      try {
        for (const s of stages) if (s.on) s.frame(clock, dt, scrollY);
        if (spots && spotsOn) spots.frame(clock, dt);
      } catch (e) { stop(); return; }
      schedule();
    };
    const schedule = () => { if (!raf && !document.hidden && anyOn()) raf = requestAnimationFrame(loop); };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; stages.forEach(s => s.cv.remove()); spots && spots.items.forEach(it => it.cv.remove()); stages = []; spots = null;
    };

    stages.forEach(s => new IntersectionObserver(([e]) => { s.on = e.isIntersecting; schedule(); }).observe(s.sec));
    if (spots) {
      const io = new IntersectionObserver(es => {
        es.forEach(e => { const it = spots && spots.items.find(i => i.cv === e.target); if (it) spots.setVis(it, e.isIntersecting ? e.intersectionRatio : 0, clock); });
        spotsOn = spots ? spots.items.filter(i => i.vis).length : 0;
        schedule();
      }, { threshold: [0, 0.6] });
      spots.items.forEach(it => io.observe(it.cv));
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else { last = performance.now(); schedule(); } });

    last = performance.now();
    schedule();
  }

  const go = () => (window.requestIdleCallback ? requestIdleCallback(init, { timeout: 1200 }) : setTimeout(init, 300));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
})();
