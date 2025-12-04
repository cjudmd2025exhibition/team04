  
  // =============== top버튼 ===============
  (function(){
    const btn = document.querySelector('.backtop');
    if(!btn) return;

    btn.addEventListener('click', () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) window.scrollTo(0, 0);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();



// ====== [index.html] ====== //
// =============== index 섹션A: 마우스반응 히어로 ===============

(function () {
  class Pt { constructor(x=0,y=0){ this.x=x; this.y=y } }
  class Circle {
    constructor(baseR, x, y){
      this._r = baseR; this.r = baseR; this.add = 0; this.pos = new Pt(x,y);
    }
    grow(v){ this.add = v }
    draw(ctx, ease){
      this.r += ((this._r + this.add) - this.r) * ease;
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI*2);
    }
  }

  function map(v, inMin, inMax, outMin, outMax){
    const t = (v - inMin) / (inMax - inMin);
    const tc = Math.max(0, Math.min(1, t));
    return outMin + (outMax - outMin) * tc;
  }

  function fitCover(w, h, W, H){
    const r = Math.max(W / w, H / h);
    return { w: w*r, h: h*r, x: (W - w*r)/2, y: (H - h*r)/2 };
  }

  function HeroSecA(section){
    const canvas = section.querySelector('.secA-canvas');
    const ctx = canvas.getContext('2d', { alpha: true });

    // data-* 속성으로 튜닝
    const CELL   = parseFloat(section.getAttribute('data-cell-size')) || 30;
    const R0     = parseFloat(section.getAttribute('data-dot-radius')) || 1;
    const PROX   = parseFloat(section.getAttribute('data-proximity')) || 120;
    const GROW   = parseFloat(section.getAttribute('data-growth')) || 60;
    const EASE   = parseFloat(section.getAttribute('data-ease')) || 0.085;
    const IMGURL = section.getAttribute('data-image') || '';

    const mouse = new Pt(-9999,-9999);
    const circles = [];

    let iw=0, ih=0, imgLoaded=false;
    const img = new Image();
    if(IMGURL){
      img.crossOrigin = 'anonymous';
      img.onload = ()=>{ iw=img.naturalWidth; ih=img.naturalHeight; imgLoaded=true; };
      img.src = IMGURL;
    }

    function sizeCanvas(){
      const rect = section.getBoundingClientRect();
      // 디바이스 픽셀 비율 반영(선택)
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      canvas.width  = Math.ceil(rect.width * dpr);
      canvas.height = Math.ceil(rect.height * dpr);
      canvas.style.width  = Math.ceil(rect.width) + 'px';
      canvas.style.height = Math.ceil(rect.height) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    function buildGrid(){
      circles.length = 0;
      const rect = section.getBoundingClientRect();
      const cols = Math.ceil(rect.width  / CELL) + 1;
      const rows = Math.ceil(rect.height / CELL) + 1;
      const count = cols * rows;
      for(let i=0;i<count;i++){
        const col = i % cols;
        const row = (i / cols) | 0;
        circles.push(new Circle(R0, CELL*col, CELL*row));
      }
    }

    function updatePointer(clientX, clientY){
      const rect = canvas.getBoundingClientRect();
      mouse.x = clientX - rect.left;
      mouse.y = clientY - rect.top;
    }

    function onMouseMove(e){ updatePointer(e.clientX, e.clientY); }
    function onTouchMove(e){
      const t = e.touches && e.touches[0];
      if(!t) return;
      updatePointer(t.clientX, t.clientY);
    }
    function onLeave(){ mouse.x = mouse.y = -9999; }

    function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.save();
      ctx.beginPath();

      for(const c of circles){
        const dx = c.pos.x - mouse.x;
        const dy = c.pos.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const add = map(dist, c._r, c._r + PROX, GROW, 0);
        c.grow(add > 0 ? add : 0);
        c.draw(ctx, EASE);
      }

      if(imgLoaded){
        ctx.clip();
        const rect = canvas.getBoundingClientRect();
        const { w, h, x, y } = fitCover(iw, ih, rect.width, rect.height);
        ctx.drawImage(img, 0,0, iw,ih, x, y, w, h);
      } else {
        // CSS 배경색이 비치도록 투명 fill (원형만 채워 보이게 하려면 검정 등으로 바꿔도 OK)
        ctx.fillStyle = '#000';
        ctx.fill();
      }
      ctx.restore();
      requestAnimationFrame(tick);
    }

    // 이벤트 바인딩
    window.addEventListener('resize', sizeCanvas, { passive: true });
    canvas.addEventListener('mousemove', onMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', onLeave, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onLeave, { passive: true });

    // 시작
    sizeCanvas();
    tick();
  }

  // .secA 모두 자동 초기화 (여러 히어로 가능)
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.home .secA').forEach(HeroSecA);
  });
})();



// =============== index 섹션B: 드래그로 종이 치우기 ===============
window.addEventListener('load', () => {
  (async function dragPapers(){
    const root  = document.querySelector('.secB');
    if(!root) return;

    const board  = root.querySelector('.papers-board');
    const pieces = Array.from(root.querySelectorAll('.paper-piece'));

    // 이미지 기본 드래그(ghost) 방지
    pieces.forEach(img => img.setAttribute('draggable', 'false'));

    // 1) 이미지 로드 보장 (width/height 확보)
    await Promise.all(pieces.map(img => img.decode?.().catch(()=>{})));

    
    // 2) 초기 배치: 더 넓게 흩뿌리기 + 초반 몇 장은 중앙 덮기
    /*
    const br = board.getBoundingClientRect();

    // 튜닝 가능한 상수들
    const PAD      = 12;                               // 보드 가장자리 여백
    const CENTER_R = Math.min(br.width, br.height) * 0.30; // 중앙 덮는 반지름(0.30~0.40 사이 추천)
    const CENTER_N = Math.min(3, pieces.length);       // 중앙을 확실히 가릴 장 수(2~4 추천)

    pieces.forEach((el, i) => {
      // 이미지 크기 (로드 직후 width가 0일 수 있어 naturalWidth 우선)
      const w = el.naturalWidth  || el.width  || 200;
      const h = el.naturalHeight || el.height || 120;

      let x, y;

      if (i < CENTER_N) {
        // 중앙 원 내부에 랜덤 배치(메시지 가리기)
        const theta = Math.random() * Math.PI * 2;
        const r     = Math.sqrt(Math.random()) * CENTER_R; // 중앙 쪽에 살짝 더 밀집
        x = br.width  / 2 + Math.cos(theta) * r - w / 2;
        y = br.height / 2 + Math.sin(theta) * r - h / 2;
      } else {
        // 보드 전체로 넓게 분포
        x = PAD + Math.random() * (br.width  - w - PAD * 2);
        y = PAD + Math.random() * (br.height - h - PAD * 2);
      }

      // 보드 경계 안으로 클램프
      x = Math.max(PAD, Math.min(br.width  - w - PAD, x));
      y = Math.max(PAD, Math.min(br.height - h - PAD, y));

      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    });
*/
    // 3) 드래그 (자유도 유지: 좌/우/상/하 모두)
    let dragging = null, dx = 0, dy = 0;

board.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.paper-piece'); 
  if (!el) return;

  dragging = el;
  el.setPointerCapture?.(e.pointerId);

  const r  = el.getBoundingClientRect();
  const rb = board.getBoundingClientRect();

  dx = e.clientX - r.left;
  dy = e.clientY - r.top;

  // 다른 조각들에서 강조 제거
  pieces.forEach(p => p.classList.remove('is-active'));

  // 지금 잡은 조각만 강조
  el.classList.add('is-active');

  el.style.transition = 'none';
  el.style.zIndex = 10;
  e.preventDefault();
});

    board.addEventListener('pointermove', (e) => {
      if (!dragging) return;

      const rb = board.getBoundingClientRect();
      const rw = dragging.width;
      const rh = dragging.height;

      let x = e.clientX - rb.left - dx;
      let y = e.clientY - rb.top  - dy;

      // 보드 내부로만 이동
      x = Math.max(0, Math.min(rb.width  - rw, x));
      y = Math.max(0, Math.min(rb.height - rh, y));

      dragging.style.left = x + 'px';
      dragging.style.top  = y + 'px';
    });

      window.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging.style.transition = '';
        dragging.style.zIndex = '';
        // 드래그 끝났을 때도 강조를 유지하고 싶으면 이 줄은 지워도 됨
        // dragging.classList.remove('is-active');
        dragging = null;
      });
  })();
});


// =============== 섹션3: 스크롤 텍스트 인 ===============
const articles = document.querySelectorAll(".article");

const articleObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
    } else {
      entry.target.classList.remove('show');
    }
  });
}, { threshold: 0.3 });

articles.forEach(article => {
  articleObserver.observe(article);
});

const delays = document.querySelectorAll('.delay');

delays.forEach((delay) => {
  const delayTime = delay.getAttribute("data-delay");
  delay.style.animationDelay = `${delayTime}s`
})

document.addEventListener('DOMContentLoaded', () => {
    // 1. 관찰 대상 요소와 배경색을 변경할 요소 정의
    const targetSection = document.querySelector('.secC-dark'); // 관찰 대상 (섹션C)
    const backgroundElement = document.body;             // 배경색을 변경할 요소 (body)
    const darkBgClass = 'dark-mode-bg';                   // 적용할 클래스 이름

    if (!targetSection) return; // 대상 섹션이 없으면 종료

    // 2. 옵저버 옵션 설정
    const options = {
        root: null, // 뷰포트(Viewport)를 기준으로 설정
        rootMargin: '0px',
        // threshold: 0.1은 섹션의 10%가 보일 때 작동, 1.0은 섹션 전체가 보일 때 작동
        threshold: 0.2 
    };

    // 3. 콜백 함수 정의
    const callback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 섹션이 뷰포트에 진입했을 때
                backgroundElement.classList.add(darkBgClass);
                
                // 추가 기능: 스크롤 텍스트 애니메이션 등을 시작할 수 있습니다.
                console.log('섹션C 진입: 배경색 변경 및 애니메이션 시작');
                // targetSection.classList.add('animate-in');
                
            } else {
                // 섹션이 뷰포트에서 벗어났을 때
                backgroundElement.classList.remove(darkBgClass);

                // 추가 기능: 애니메이션 등을 초기화할 수 있습니다.
                console.log('섹션C 이탈: 배경색 원래대로 복구');
                // targetSection.classList.remove('animate-in');
            }
        });
    };

    // 4. Intersection Observer 인스턴스 생성 및 관찰 시작
    const observer = new IntersectionObserver(callback, options);
    observer.observe(targetSection);
});


// =============== index .star ===============
(function(){
  const star = document.querySelector(".star");
  if (!star || typeof gsap === 'undefined') return; // ★ gsap 없거나 star 없으면 그냥 스킵

  function sparkle() {
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: Math.random() * 1.5 + 0.5
    });

    tl.to(star, {
      opacity: 0.2,
      duration: 0.15,
      ease: "power2.in"
    })
    .to(star, {
      opacity: 1,
      scale: 1.15,
      filter: "drop-shadow(0 0 24px white)",
      duration: 0.2,
      ease: "power2.out"
    })
    .to(star, {
      opacity: 0.7,
      scale: 1,
      filter: "drop-shadow(0 0 0px white)",
      duration: 0.3,
      ease: "sine.inOut"
    })
    .to(star, {
      opacity: 1,
      scale: 1.15,
      duration: 0.15,
      ease: "power1.inOut"
    })
    .to(star, {
      opacity: 0.8,
      scale: 1,
      duration: 0.25,
      ease: "power1.out"
    });
  }

  sparkle();
})();

// =============== 섹션4: 카드 살짝 기울기 (마우스 반응) ===============
(function tiltCards(){
  const cards = document.querySelectorAll('.home .tilt');
  if(!cards.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cards.forEach(card=>{
    if (reduced) return;
    card.addEventListener('mousemove', (e)=>{
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - .5) * 6;
      const ry = ((e.clientX - r.left) / r.width - .5) * 6;
      card.style.transform = `rotate(var(--tilt)) rotateX(${ -rx }deg) rotateY(${ ry }deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.transform = `rotate(var(--tilt))`;
    });
  });
})();

// =============== 섹션5: 봉투에서 티켓 튀어나오기 ===============
// autor: Marco Barría (vanilla JS로 포팅)

(function () {
  const section = document.getElementById('inviteSection'); // .secE
  if (!section) return;  // 섹션 없으면 종료

  // 요소 캐싱
  const C = document.getElementById('contenedor');
  const A = document.getElementById('abrir');
  const E = document.getElementById('carta');
  const P = document.getElementById('perspectiva');
  const F = section.querySelector('#carta hgroup h2'); // 없으면 null

  // 초기 상태 (닫힘)
  function setInit() {
    if (C) C.style.transform = 'rotateY(0deg)';
    if (A) { A.style.transform = 'rotateX(0deg)'; A.style.zIndex = '10'; }
    if (E) { E.style.top = '3px'; E.style.height = '200px'; }
    if (P) P.style.transform = 'translateY(0px)';
    if (F) F.style.transform = 'rotateZ(0deg)';
  }
  setInit();

  // 위치값
  let sectionTop = 0;
  let sectionHeight = 0;
  let startOffset = 0;

  function recalc() {
    const rect = section.getBoundingClientRect();
    // 문서 기준 오프셋 계산
    sectionTop = window.scrollY + rect.top;
    sectionHeight = section.offsetHeight;
    startOffset = window.innerHeight * 0.1; // 섹션이 20% 들어왔을 때부터 로컬 스크롤 시작
  }
  recalc();
  window.addEventListener('resize', recalc);
  window.addEventListener('orientationchange', recalc);

  // 스크롤 핸들러
  function onScroll() {
    const scr = window.scrollY || window.pageYOffset;
    const local = scr + startOffset - sectionTop;

    // 섹션 진입 전엔 무반응
    if (local < 0) return;

    // 봉투 열림(회전)
    if (local >= 300) {
      if (C) { C.style.transition = 'all 1s';       C.style.transform = 'rotateY(180deg)'; }
      if (A) { A.style.transition = 'all 1s .5s';   A.style.transform = 'rotateX(180deg)'; A.style.zIndex = '0'; }
    } else {
      if (C) { C.style.transition = 'all 1s .5s';   C.style.transform = 'rotateY(0deg)'; }
      if (A) { A.style.transition = 'all 1s';       A.style.transform = 'rotateX(0deg)';   A.style.zIndex = '10'; }
    }

    // 편지 위로 길게 나오기
    if (local >= 600) {
      if (E) { E.style.transition = 'all .5s 1s';   E.style.top = '-500px'; E.style.height = '800px'; }
      if (P) { P.style.transition = 'all 1s';       P.style.transform = 'translateY(550px)'; }
      if (F) { F.style.transition = 'all 1s';       F.style.transform = 'rotateZ(180deg)'; }
    } else {
      if (E) { E.style.transition = 'all .5s';      E.style.top = '3px'; E.style.height = '450px'; }
      if (P) {                                     P.style.transform = 'translateY(0px)'; }
      if (F) {                                     F.style.transform = 'rotateZ(0deg)'; }
    }
  }

  // 바인딩 + 처음 1회 반영
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();




// ====== [About1.html] ====== //
/* ───────────────────────────
   secA: about 타이핑
   ─────────────────────────── */
function autoTypeK(outerSel, baseSpeed){
  const $wrap = $(outerSel);
  $wrap.css({ position:"relative", display:"inline-block" });
  $wrap.prepend('<div class="cursor" style="right:initial;left:0;"></div>');

  const $h2 = $wrap.find(".text-js");
  const $pre = $h2.find('[data-part="pre"]');
  const $hl  = $h2.find('[data-part="hl"]');
  const $post= $h2.find('[data-part="post"]');

  const parts = [
    { $el:$pre,  text:$pre.text()  },
    { $el:$hl,   text:$hl.text()   },
    { $el:$post, text:$post.text() }
  ];

  // 초기화: 화면에는 비우고 불투명도 올림
  parts.forEach(p => p.$el.text(''));
  $h2.css("opacity", 1);
  $wrap.find(".cursor").removeAttr("style"); // 커서 왼쪽 고정 해제

  let pi = 0, ci = 0;
  const punctPause = /[.,!?…·]/;  // 구두점에서 잠깐 쉬기

  function jitterDelay(ch){
    // 기본속도 ±(15~40%) 지터 + 구두점이면 추가 대기
    let d = baseSpeed * (0.85 + Math.random()*0.40);
    if (punctPause.test(ch)) d += baseSpeed * 1.2;
    return d;
  }

  function tick(){
    if (pi >= parts.length) return;
    const p = parts[pi];

    if (ci < p.text.length){
      const ch = p.text.charAt(ci);
      p.$el.text(p.$el.text() + ch);

      // ‘타닥’ 느낌: 살짝 톡 애니메이션
      $h2.addClass('type-tap');
      setTimeout(()=> $h2.removeClass('type-tap'), 60);

      ci++;
      setTimeout(tick, jitterDelay(ch));
    } else {
      // 다음 파트로
      pi++; ci = 0;
      setTimeout(tick, baseSpeed);
    }
  }

  // 시작 전 잠깐 기다렸다 타이핑 시작
  setTimeout(tick, 400);
}

if (window.jQuery && typeof $ === 'function' && document.querySelector('.about1-subtitle')) {
  $(function(){ autoTypeK(".about1-subtitle", 85); });
}


// ====== [About2.html] ====== //
/* ───────────────────────────
   secA: Highlight
   ─────────────────────────── */
    /**
     * Scroll-based sequential word highlight interaction logic (스크롤 기반 순차적 단어 하이라이트 인터랙션)
     * 전역 오염을 최소화하기 위해 즉시 실행 함수(IIFE)로 묶었습니다.
     */
    (function () {
        const targetSection = document.querySelector('.secB-highlight');
        if (!targetSection) {
            console.warn("Target section '.secB-highlight' not found. Scroll highlight feature disabled.");
            return;
        }
        
        const highlightWords = targetSection.querySelectorAll('.highlight-word');
        if (highlightWords.length === 0) {
            console.warn("Highlight words not found within '.secB-highlight'. Feature disabled.");
            return;
        }

        // 하이라이트 클래스 이름
        const highlightedClass = 'is-highlighted';
        
        // 각 단어를 하이라이트할 스크롤 진행도 임계값 (0.0에서 1.0 사이)
        // 예를 들어, 섹션 높이의 20%, 50%, 80% 지점
        const thresholds = [0.2, 0.5, 0.8]; 
        
        // 스크롤 성능 최적화를 위한 플래그
        let rafId = null;

        /**
         * 스크롤 위치에 따라 하이라이트 상태를 업데이트합니다.
         */
        function updateHighlight() {
            // 섹션의 위치 및 크기 정보 가져오기
            const rect = targetSection.getBoundingClientRect();
            
            // 뷰포트 상단에서 섹션의 바닥까지의 거리
            const sectionBottom = rect.top + rect.height; 
            
            // 섹션이 뷰포트에 완전히 진입(Top 기준)하고 바닥을 벗어나지 않았을 때
            // 섹션의 상단이 뷰포트 상단으로 들어올 때 (rect.top <= window.innerHeight)
            // 섹션의 하단이 뷰포트 하단보다 아래에 있을 때 (rect.bottom >= 0)
            
            let scrollProgress = 0;

            // 1. 섹션이 뷰포트에 진입했는지 확인
            if (rect.top <= window.innerHeight && rect.bottom >= 0) {
                
                // 2. 섹션 내에서의 스크롤 진행도를 계산
                // 섹션 상단이 뷰포트 하단을 지나기 시작한 지점 (rect.top < window.innerHeight)
                // 섹션 하단이 뷰포트 상단을 지나기 전 지점 (rect.bottom > 0)
                
                // 섹션이 뷰포트 하단(window.innerHeight)을 지나기 시작할 때 0%
                // 섹션이 뷰포트 상단(0)을 완전히 지나갈 때 100%
                
                // 계산을 위해 섹션의 진입점과 이탈점을 정의합니다.
                // 진입점 (Start Point): 섹션 상단이 뷰포트 하단에 도달할 때
                const startPoint = window.innerHeight;
                // 이탈점 (End Point): 섹션 하단이 뷰포트 상단에 도달할 때
                const endPoint = -rect.height; 
                
                // 현재 스크롤 위치 (뷰포트 상단 기준)
                const currentPos = rect.top;
                
                // 진행도 계산: (시작점 - 현재 위치) / (시작점 - 끝점)
                // rect.top이 window.innerHeight일 때 0
                // rect.top이 0일 때 (window.innerHeight / (window.innerHeight + rect.height))
                
                // 섹션 전체를 관통하는 진행도를 계산 (0.0 ~ 1.0)
                // 섹션의 상단이 뷰포트 하단에 있을 때 (100% 진행도)
                // 섹션의 하단이 뷰포트 상단에 있을 때 (0% 진행도)
                
                // 단순화된 진행도: 섹션 상단이 뷰포트 상단에 도달했을 때 0%, 섹션 바닥이 뷰포트 상단에 도달했을 때 100%
                // scrollProgress = (0 - rect.top) / rect.height; // (이전 방법 - 섹션 내부 기준)
                
                // 개선된 진행도 (뷰포트 진입부터 이탈까지):
                const totalScrollDistance = window.innerHeight + rect.height;
                const scrolledDistance = window.innerHeight - rect.top;
                
                scrollProgress = Math.max(0, Math.min(1, scrolledDistance / totalScrollDistance));
            }

            // 스크롤 진행도에 따라 하이라이트 클래스 적용/제거
            highlightWords.forEach((word, index) => {
                const threshold = thresholds[index];
                
                if (scrollProgress >= threshold) {
                    // 임계값을 넘으면 하이라이트 적용
                    word.classList.add(highlightedClass);
                } else {
                    // 임계값 미만이면 하이라이트 제거
                    word.classList.remove(highlightedClass);
                }
            });
            
            // 디버깅: 콘솔에 스크롤 진행도 표시
            // console.log(`secB Scroll Progress: ${scrollProgress.toFixed(2)}`);
            
            // 다음 프레임 요청을 null로 설정
            rafId = null; 
        }

        /**
         * 스크롤 이벤트 핸들러 (requestAnimationFrame 최적화)
         */
        function handleScroll() {
            if (!rafId) {
                rafId = requestAnimationFrame(updateHighlight);
            }
        }
        
        // 초기 로드 시 한 번 실행
        updateHighlight(); 
        
        // 스크롤 이벤트 리스너 등록
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll); // 리사이즈 시에도 위치 재계산
        
    })();


/* ───────────────────────────
   secD: accordian
   ─────────────────────────── */
const items = document.querySelectorAll(".accordion button");

function toggleAccordion() {
  const itemToggle = this.getAttribute('aria-expanded');
  
  for (i = 0; i < items.length; i++) {
    items[i].setAttribute('aria-expanded', 'false');
  }
  
  if (itemToggle == 'false') {
    this.setAttribute('aria-expanded', 'true');
  }
}

items.forEach(item => item.addEventListener('click', toggleAccordion));


// ====== [service_interaction.html] ====== //
/* ───────────────────────────
   popout
   ─────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const sec = document.querySelector('.interact .secC-popout');
  if (!sec) return;

  const target = sec.querySelector('.text-on-img1');
  if (!target) return;

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        target.classList.add('pop-on');  // 애니메이션 시작
        obs.unobserve(entry.target);     // 한 번만 실행
      }
    });
  }, { threshold: 0.3 });

  io.observe(sec);
});


// ====== [service_test.html] ====== //
/* ───────────────────────────
   (선택) modal – 파일에 요소가 없으면 자동 skip
   ─────────────────────────── */
(function () {
  const openBtn = document.getElementById('openTestModal');
  const modal   = document.getElementById('testIntroModal');
  if (!openBtn || !modal) return;

  const startBtn = document.getElementById('startTestBtn');
  const open  = () => modal.classList.add('is-open');
  const close = () => modal.classList.remove('is-open');

  openBtn.addEventListener('click', (e)=>{ e.preventDefault(); open(); });
  modal.addEventListener('click', (e)=>{
    if (e.target.matches('[data-close], .mdm-testmodal__backdrop')) close();
  });
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
  if (startBtn) startBtn.addEventListener('click', ()=>{
    window.location.href = 'test_question.html';
  });
})();


/* ───────────────────────────
   알파벳
   ─────────────────────────── */
(function () {
  // 여러 세트를 쓰고 싶을 수도 있으니, 같은 클래스를 가진 래퍼를 전부 대상으로 처리
  var wrappers = document.querySelectorAll('.seq-image-wrapper');

  wrappers.forEach(function (wrapper) {
    var items = Array.prototype.slice.call(
      wrapper.querySelectorAll('.seq-image-item')
    );

    if (!items.length) return;

    // === 타이밍 설정 부분 ===
    var intervalBetweenImages = 300; // 각 이미지가 등장하는 간격(ms) → 0.8초
    var afterAllVisibleDelay = 3500; // 마지막 이미지 등장 후 유지 시간(ms) → 5초

    function runCycle() {
      // 먼저 모두 숨김
      items.forEach(function (item) {
        item.classList.remove('seq-image-visible');
      });

      var index = 0;

      function showNext() {
        if (index < items.length) {
          // 순차적으로 하나씩 보이게
          items[index].classList.add('seq-image-visible');
          index += 1;

          // 다음 이미지로 넘어가는 타이머
          setTimeout(showNext, intervalBetweenImages);
        } else {
          // 11개가 다 나온 후, 5초 동안 그대로 유지
          setTimeout(function () {
            // 한 번에 전부 사라짐
            items.forEach(function (item) {
              item.classList.remove('seq-image-visible');
            });

            // 바로 다음 사이클 시작 (무한 반복)
            // 0ms로 두면 거의 즉시 다시 시작
            setTimeout(runCycle, 0);
          }, afterAllVisibleDelay);
        }
      }

      showNext();
    }

    runCycle();
  });
})();

// ====== [type1.html] ====== //
/* ───────────────────────────
   receipt – .secC-receipt가 뷰포트에 들어오면 .print-on 부여
   ─────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.secC-receipt');
  if (!sections.length) return;

  const markOn = (sec) => { if (!sec.classList.contains('print-on')) sec.classList.add('print-on'); };

  // 이미 보이면 즉시
  sections.forEach((sec) => {
    const r = sec.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh * 0.7 && r.bottom > vh * 0.3) markOn(sec);
  });

  // 스크롤 진입 시 1회
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(({isIntersecting, target}) => {
      if (isIntersecting) {
        markOn(target);
        obs.unobserve(target);
      }
    });
  }, { threshold: 0.37 });

  sections.forEach(sec => io.observe(sec));
});


// ====== [flagship.html] ====== //
/* ───────────────────────────
  secA: doorHero
   ─────────────────────────── */
(function(){
  const root   = document.getElementById('doorHero');
  const button = document.getElementById('doorHeroBtn');
  if (!root || !button) return;

  // 항상 #siEntry(더미 섹션)를 우선 타깃으로 사용
  let target = document.querySelector('#siEntry');
  if (!target) target = document.querySelector('.si-entry') || document.querySelector('.si-section');

  // 문/간판이 올라가 있는 섹션
  const secASection = root.closest('.secA-store');

  // 스크롤 잠금/해제 (html에만 걸기)
  const lockScroll   = () => { document.documentElement.style.overflow = 'hidden'; };
  const unlockScroll = () => { document.documentElement.style.overflow = ''; };

  function getTargetY(el) {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return window.scrollY + rect.top;
  }

  const knock = document.getElementById('clickSound');

  // 타이밍 값 (원하면 여기 숫자만 조절하면 됨)
  const EXTRA_AFTER_KNOCK = 800; // 노크 끝난 뒤 추가 대기 시간
  const DOOR_HOLD_MS      = 1300; // 문이 열린 채로 유지되는 시간
  const DOOR_FADE_MS      = 600;  // doorHero opacity 트랜지션 시간과 동일하게

  let played = false;

  function runDoorSequence() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) 문 열기
    root.classList.add('doorHero--open');

    // 2) 문이 열린 상태로 유지
    window.setTimeout(() => {
      // 3) doorHero 먼저 사라지기 시작 (CSS: opacity transition 이용)
      root.setAttribute('aria-hidden', 'true');

      // 4) 문이 다 사라진 뒤에 레이아웃 정리 + 스크롤
      window.setTimeout(() => {
        // 먼저 secA-store 전체를 숨겨서(높이 제거) 레이아웃을 확정
        if (secASection) {
          secASection.classList.add('is-hidden'); // CSS에서 display:none 처리
        }

        // 그 상태에서 #siEntry 기준으로 y를 다시 계산 → 항상 제일 처음에 #siEntry 상단이 보이게
        const y = getTargetY(target);

        if (!prefersReduced) {
          const whoosh = document.createElement('div');
          whoosh.className = 'doorHero__whoosh';
          document.body.appendChild(whoosh);
        }

        try {
          window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
        } catch (_) {
          window.scrollTo(0, y);
        }

        // 마지막에 스크롤락 해제
        unlockScroll();
      }, DOOR_FADE_MS);

    }, DOOR_HOLD_MS);
  }

  function openDoorWithKnock() {
    if (played) return;
    played = true;

    const startAfterKnock = () => {
      if (startAfterKnock._done) return;
      startAfterKnock._done = true;
      // 노크 사운드 종료 + 1.5s 뒤에 문 시퀀스 시작
      window.setTimeout(runDoorSequence, EXTRA_AFTER_KNOCK);
    };

    // 노크 사운드 재생
    if (knock) {
      try {
        knock.currentTime = 0;
        const p = knock.play();
        if (p && p.catch) {
          p.catch(() => {
            // 브라우저 정책으로 재생 막히면 그냥 0.8초 정도 후에 바로 진행
            window.setTimeout(startAfterKnock, 800);
          });
        }
      } catch (_) {
        window.setTimeout(startAfterKnock, 800);
      }

      // ended 이벤트 기준으로 “노크 끝난 뒤”를 잡고,
      // 거기에 EXTRA_AFTER_KNOCK(1.5s)을 더해서 문 열기
      knock.addEventListener('ended', startAfterKnock, { once: true });
      // 혹시 ended가 안 오는 경우 대비 안전타이머
      window.setTimeout(startAfterKnock, 8000);
    } else {
      // 오디오 엘리먼트가 없다면, 그냥 1.5s 후에 시작
      window.setTimeout(runDoorSequence, EXTRA_AFTER_KNOCK);
    }
  }

  function init() {
    const atTop = Math.round(window.scrollY) === 0;
    const secAAlreadyHidden = secASection && secASection.classList.contains('is-hidden');

    // ✅ (1) 페이지 맨 위가 아니거나, secA-store가 이미 숨겨진 상태라면:
    // 문/히어로 & secA-store를 스킵 + 스크롤 자유
    if (!atTop || secAAlreadyHidden) {
      root.setAttribute('aria-hidden', 'true');
      unlockScroll();
      if (secASection) secASection.classList.add('is-hidden');
      return;
    }

    // ✅ (2) “진짜 처음으로 맨 위에서 들어온 경우”에만
    // 문 히어로를 보여주고 스크롤락 건다.
    root.setAttribute('aria-hidden', 'false');
    if (secASection) secASection.classList.remove('is-hidden');
    lockScroll();
  }

  // 클릭 / 키보드로 문 열기 시작
  button.addEventListener('click', openDoorWithKnock);
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDoorWithKnock();
    }
  });

  // 히어로가 떠 있는 동안에는 휠/터치 스크롤 막기
  const block = (e) => {
    if (root.getAttribute('aria-hidden') !== 'true') {
      e.preventDefault();
    }
  };
  window.addEventListener('wheel', block, { passive: false });
  window.addEventListener('touchmove', block, { passive: false });

  window.addEventListener('load', init);
})();





/* ───────────────────────────
  secA: board
   ─────────────────────────── */
// ===== Scroll-Image (scoped, tunable) =====
(function(){
  var sections = document.querySelectorAll('.si-section');
  if (!sections.length) return;

  var supportsIO = 'IntersectionObserver' in window;

  sections.forEach(function(section){
    var sticky = section.querySelector('.si-sticky');
    var media  = section.querySelector('.si-media');

    // 조절 가능한 파라미터 (HTML data-*로 오버라이드 가능)
    var MAX_SCALE    = parseFloat(section.dataset.maxScale   || '1.2');   // 최대 확대 (예: 1.2 = 20%)
    var FINAL_SCALE  = parseFloat(section.dataset.finalScale || '0.9');  // 최종 고정 배율
    var GROW_END     = parseFloat(section.dataset.growEnd    || '0.55');  // 1 → MAX로 커지는 구간 끝(0~1 사이)
    var SHRINK_END   = parseFloat(section.dataset.shrinkEnd  || '0.85');  // MAX → FINAL로 줄어드는 구간 끝(0~1 사이)

    // 가드: 구간값 보정
    GROW_END   = Math.max(0.05, Math.min(0.95, GROW_END));
    SHRINK_END = Math.max(GROW_END + 0.05, Math.min(0.98, SHRINK_END));

    // CSS 변수에 최종 스케일 주입
    section.style.setProperty('--si-final', String(FINAL_SCALE));

    // 진입 감지 (enter drop-in)
    if (supportsIO) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            section.classList.add('is-visible');
          } else {
            section.classList.remove('is-visible');
          }
        });
      }, { root: null, threshold: 0.3 });
      io.observe(section);
    } else {
      section.classList.add('is-visible');
    }

    var ticking = false;

    function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }
    function lerp(a, b, t){ return a + (b - a) * t; }

    function update(){
      var rect = section.getBoundingClientRect();
      var vh   = window.innerHeight || document.documentElement.clientHeight;

      // sticky on/off에 따라 진행도 기준 길이 계산
      var stickyOff = section.getAttribute('data-sticky') === 'off';
      var totalScrollable = stickyOff ? (section.offsetHeight - (vh * 0.2)) // sticky를 안 쓰면 조금 덜 민감하게
                                      : (section.offsetHeight - vh);

      if (totalScrollable <= 0) {
        section.style.setProperty('--si-scale', '1');
        section.classList.remove('is-exit');
        return;
      }

      // 진행도 p: 0(섹션 상단 닿음) ~ 1(섹션 끝)
      var p = clamp((vh - rect.top) / totalScrollable, 0, 1);

      // 스케일 맵핑: [0, GROW_END] 1→MAX, [GROW_END, SHRINK_END] MAX→FINAL, 이후 FINAL 고정
      var s;
      if (p <= GROW_END) {
        s = lerp(1, MAX_SCALE, p / GROW_END);
      } else if (p <= SHRINK_END) {
        s = lerp(MAX_SCALE, FINAL_SCALE, (p - GROW_END) / (SHRINK_END - GROW_END));
      } else {
        s = FINAL_SCALE;
      }
      section.style.setProperty('--si-scale', s.toFixed(4));

      // 끝지점 도달 시 exit 애니메이션 클래스 토글
      if (p >= 1) {
        section.classList.add('is-exit');
      } else {
        section.classList.remove('is-exit');
      }
    }

    function onScroll(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        update();
        ticking = false;
      });
    }

    // 초기 계산 + 이벤트
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  });
})();

  
  /* ───────────────────────────
     Parallax Scroll Logic
     ─────────────────────────── */
  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  const mainContainer = document.querySelector('.MainContainer');

  if (parallaxLayers.length > 0 && mainContainer) {
    function updateParallax() {
      // 1. MainContainer의 시작 위치 계산
      const mainContainerTop = mainContainer.offsetTop;

      // 2. MainContainer가 시작된 이후의 상대적 스크롤 양 (Relative Scroll)
      // Math.max(0, ...)를 사용하여 스크롤이 컨테이너 시작 전에는 0이 되도록 합니다.
      const relativeScroll = Math.max(0, window.scrollY - mainContainerTop);

      parallaxLayers.forEach(layer => {
        const speed = parseFloat(layer.getAttribute('data-speed')) || 1.0;
        let yPos = 0;

        // speed 값이 0이면 고정 (store.png)
        if (speed === 0) {
          yPos = 0;
        } 
        // speed 값이 1.0보다 크면 (예: 1.2), 스크롤과 반대 방향(음수)으로 움직여서 
        // 덮는 레이어가 더 빠르게 위로 지나가는 듯한 입체감을 줍니다.
        // 스크롤이 내려갈 때 (relativeScroll 증가) yPos는 음수가 되어 요소가 위로 올라갑니다.
        else if (speed > 1.0) {
           // (speed - 1) 값을 사용하여 움직이는 속도를 조절
          yPos = -relativeScroll * (speed - 1); 
        }

        layer.style.transform = `translateY(${yPos}px)`;
      });
    }

    // 초기 계산 및 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', updateParallax); // 리사이즈 시 위치 재계산
    updateParallax();
  }

  
/* ───────────────────────────
  .zigzag-container
   ─────────────────────────── */
if (window.jQuery && typeof $ === 'function') {
  $(function() {
    // 애니메이션을 적용할 모든 요소 선택
    var $zigzags = $('.zigzag-container');

    function checkVisibility() {
      var windowHeight = $(window).height();
      var scrollPos = $(window).scrollTop();
      var viewportTrigger = scrollPos + (windowHeight * 0.85);

      $zigzags.each(function(index) {
        var $this = $(this);
        var elementTop = $this.offset().top;

        if (!$this.hasClass('is-visible') && elementTop < viewportTrigger) {
          var delay = index * 200;
          setTimeout(function() {
            $this.addClass('is-visible');
          }, delay);
        }
      });
    }

    checkVisibility();
    $(window).on('scroll resize', checkVisibility);
  });
}

/* ───────────────────────────
  .service_app.html 막기
   ─────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
      // 1) service_app.html로 가는 a 태그 클릭 막기
      const links = document.querySelectorAll(
        'a[href$="service_app.html"], a[href*="service_app.html?"]'
      );

      links.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault(); // 페이지 이동 막기
          alert('준비중입니다!');
        });
      });

      // 2) JS로 location.href로 보내는 경우를 막고 싶다면 (선택)
      // 버튼에 data-coming-soon="true" 같은 속성을 달고 이렇게 처리할 수도 있어요.
      const comingSoonButtons = document.querySelectorAll('[data-coming-soon="true"]');
      comingSoonButtons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          alert('준비중입니다!');
        });
      });
    });