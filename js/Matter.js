// js/Matter.js
window.addEventListener('DOMContentLoaded', () => {
  // ---------- DOM refs ----------
  const section = document.querySelector('.secA');
  const zone = section.querySelector('.falling-zone');
  const noteImg = section.querySelector('.note-fixed');

  // ★ 기존 캔버스를 사용 (새로 만들지 않음)
  const canvas = section.querySelector('#physicsCanvas');
  if (!canvas) return; // 안전장치

  // ---------- Assets / Param ----------
  const textures = [
    'img/flake1.png',
    'img/flake2.png',
    'img/flake3.png',
  ];
  const FLAKE_SIZE = 45;    // 픽셀 그대로
  const FALL_SPEED = 80;    // px/s (항상 일정)
  const H_DRIFT    = 18;    // px/s 좌우 고정 드리프트
  const TRANSFER_Y_RATIO = 0.9; // 물리전환 높이(secA 높이 비율)

  const MAX_LIVE_SOFT = 8;     // 동시에 떠다니는 DOM 조각 수 (겹침 억제)
  const MIN_SPAWN_GAP = 150;   // 스폰 X 최소 간격(겹침 억제)
  const SPAWN_INTERVAL = 1600; // 생성 주기
  const MAX_BODIES = 80; 

  // ---------- Matter.js ----------
  const { Engine, Render, Runner, Bodies, World, Body, Sleeping, Composite } = Matter;
  const engine = Engine.create();
  engine.world.gravity.y = 0.35;
  const world = engine.world;

  // 렌더러: 기존 canvas 사용 + 픽셀비율
  const render = Render.create({
    canvas,
    engine,
    options: {
      width: section.clientWidth,
      height: section.scrollHeight,
      wireframes: false,
      background: 'transparent'
    }
  });
  // 디바이스 픽셀비율 반영 (축소/확대 왜곡 방지)
  Matter.Render.setPixelRatio(render, window.devicePixelRatio || 1);

  // CSS 사이즈와 내부 사이즈 싱크
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '1';
  canvas.style.pointerEvents = 'none';

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);


// ---------- Invisible Walls: secA 전체 기준 ----------
function makeNoteWalls() {
  // secA의 전체 픽셀 크기 (250vh 높이 포함)
  const secW = section.clientWidth;
  const secH = section.scrollHeight;

  const wallThickness = 40;   // 양옆 벽 두께
  const floorThickness = 40;  // 바닥 두께

  // ★ 여기 숫자로 바닥 높이 조절 ★
  //   floorTop = secH - FLOOR_MARGIN
  //   (secA 맨 아래에서 몇 px 위에 바닥 윗면이 올지)
  const FLOOR_MARGIN = 16;    // 40px 위에 바닥 윗면

  const floorTop = secH - FLOOR_MARGIN;
  const floorY   = floorTop + floorThickness / 2;

  const common = {
    isStatic: true,
    friction: 0.6,
    restitution: 0,
    render: { visible: false }
  };

  // 왼쪽 벽 (섹션 전체 높이만큼)
  const leftWall = Bodies.rectangle(
    -wallThickness / 2,
    secH / 2,
    wallThickness,
    secH + wallThickness,
    common
  );

  // 오른쪽 벽
  const rightWall = Bodies.rectangle(
    secW + wallThickness / 2,
    secH / 2,
    wallThickness,
    secH + wallThickness,
    common
  );

  // 바닥: secA 안쪽, FLOOR_MARGIN 만큼 위에
  const ground = Bodies.rectangle(
    secW / 2,
    floorY,
    secW * 1.2,
    floorThickness,
    { ...common, friction: 0.8 }
  );

  World.add(world, [leftWall, rightWall, ground]);
}


  // 벽 재생성 (리사이즈/이미지 로드)
  const BODIES = []; // 이미 쌓인 바디 보존
  function rebuildWalls() {
    // 스태틱만 골라 제거 → 월드를 싹 비우면 쌓인 조각까지 날아가니 주의
    const all = Composite.allBodies(world);
    const statics = all.filter(b => b.isStatic);
    World.remove(world, statics);
    // 중력 재설정(안전)
    engine.world.gravity.y = 0.35;
    makeNoteWalls();
    // 쌓인 바디는 그대로 유지
  }

  if (noteImg.complete) makeNoteWalls();
  else noteImg.addEventListener('load', makeNoteWalls);

  window.addEventListener('resize', () => {
    render.canvas.width = section.clientWidth;
    render.canvas.height = section.scrollHeight;
    Matter.Render.setPixelRatio(render, window.devicePixelRatio || 1);
    rebuildWalls();
  });

  // ---------- Soft falling (DOM img) ----------
  const SOFTS = [];
  const recentXs = [];

  function pickSpawnX() {
    let tries = 24;
    while (tries--) {
      const x = Math.random() * section.clientWidth;
      if (recentXs.every(rx => Math.abs(rx - x) >= MIN_SPAWN_GAP)) {
        recentXs.push(x);
        if (recentXs.length > 10) recentXs.shift();
        return x;
      }
    }
    return Math.random() * section.clientWidth;
  }

  function spawnSoft() {
    if (!inView) return;
    if (SOFTS.length >= MAX_LIVE_SOFT) return;

    const el = document.createElement('img');
    el.src = textures[Math.floor(Math.random() * textures.length)];
    el.className = 'falling-flake';
    el.style.width = FLAKE_SIZE + 'px';
    zone.appendChild(el);

    const startX = pickSpawnX();
    el.style.left = `${startX}px`;

    const dir = Math.random() < 0.5 ? -1 : 1;
    SOFTS.push({
      el,
      x: startX,
      y: 0,
      vx: H_DRIFT * dir,   // 수평 고정
      vy: FALL_SPEED,      // 수직 고정
      transferred: false
    });
  }

  let last = performance.now();
  function softLoop(now = performance.now()) {
    const dt = (now - last) / 1000;
    last = now;

    for (let i = SOFTS.length - 1; i >= 0; i--) {
      const f = SOFTS[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      // 가로 범위 클램프
      if (f.x < 0) f.x = 0;
      if (f.x > section.clientWidth - FLAKE_SIZE) f.x = section.clientWidth - FLAKE_SIZE;

      // 크기/속도 변화 없이 translate만
      f.el.style.transform = `translate(${Math.round(f.x) - parseFloat(f.el.style.left)}px, ${Math.round(f.y)}px)`;

      // 전환 트리거
      const transferY = section.scrollHeight * TRANSFER_Y_RATIO;
      if (!f.transferred && f.y >= transferY) {
        f.transferred = true;

        const body = Bodies.circle(
          f.x + FLAKE_SIZE / 2,
          f.y + FLAKE_SIZE / 2,
          FLAKE_SIZE / 2,
          {
            restitution: 0.05,
            friction: 0.6,
            frictionAir: 0.06,
            render: {
              sprite: {
                texture: f.el.src,
                xScale: 1,
                yScale: 1
              }
            }
          }
        );
        // 전환 순간 속도는 수평만 약하게 유지, 수직은 0에서 다시 중력 시작
        // 1) 속도 전체를 살짝 줄여서 이어주기 (방향은 그대로 유지)
        const SPEED_SCALE = 0.3;  // 0.3~0.5 사이에서 취향대로 조절

        Body.setVelocity(body, {
          x: f.vx * SPEED_SCALE,
          y: f.vy * SPEED_SCALE
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.04);

        World.add(world, body);
        BODIES.push(body);

        f.el.remove();
        SOFTS.splice(i, 1);
      }

      // 혹시라도 섹션 끝까지 가면 정리
      if (f.y > section.scrollHeight + 200) {
        f.el.remove();
        SOFTS.splice(i, 1);
      }
    }

    requestAnimationFrame(softLoop);
  }
  requestAnimationFrame(softLoop);

  // ---------- spawn control ----------
  let inView = false;
  let spawnTimer = null;
  const io = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView && !spawnTimer) {
      for (let i = 0; i < 4; i++) spawnSoft();
      spawnTimer = setInterval(spawnSoft, SPAWN_INTERVAL);
    } else if (!inView && spawnTimer) {
      clearInterval(spawnTimer);
      spawnTimer = null;
    }
  }, { threshold: 0.1 });
  io.observe(section);

  // ---------- sleep on settle ----------
  Sleeping.set(world, true);
});
