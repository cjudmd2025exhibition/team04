// ========== test_question 전용 스크립트 ==========
(function () {
  // 가드: 해당 페이지에서만 실행
  if (!document.querySelector('.mdm-quiz[data-page="test_question"]')) return;

  /* ----- 데이터: 3문항 x 3선택 ----- */
  const QUESTIONS = [
    {
      body:  "공항까지 가는 시간이 촉박해 앱으로 택시를 부른 당신.<br>그런데 기사로부터 전화가 걸려온다.<br><strong>“지금 어디 계세요? 도착했는데 안 보이시네요.”</strong><br>그 말에 당신이 주위를 둘러 보니,<br>반대편 도로에 택시가 와 있는 것이 보인다.",
      choices: [
        { key:'A', text:'“ 제가 위치를 좀 헷갈리게 찍었나봐요. 저 반대쪽에 있어요. ”' },
        { key:'B', text:'“ 앱 보시면 위치 바로 나와요. 거기 아니에요. ”' },
        { key:'C', text:'“ 앱이랑 차이가 좀 있었나 봐요. 반대쪽으로 오시면 될 것 같아요. ”' },
      ]
    },
    {
      body:  "마침내 택시에 타 한숨을 돌리려 하던 바로 그때,<br>택시 기사님이 대뜸 말을 건다.<br><strong>“이 쪽에서 택시를 부르시면 제가 차를 한참 돌려야 하잖아요.”</strong><br>라며 기사님이 불편한 기색을 띄자,<br>당신은 약간 당황스러워졌다.",
      choices: [
        { key:'A', text:'“아 네…… 죄송합니다.” 고 말하며 그냥 넘긴다.' },
        { key:'B', text:'“ 실제랑 다른 건 어쩔 수 없죠. ”' },
        { key:'C', text:'“ 저도 당황했어요. 설마 다를 줄은 몰랐네요. ”' },
      ]
    },
    {
      body:  "드디어 공항에 도착한 후 택시에서 내린 당신.<br>택시 앱에서 <strong>“이번 탑승에 대한 후기를 남겨 주세요.”</strong> 라는 알림이 떴다.<br>최대한 빨리 운전해주신 덕분에 시간은 여유 있게 도착할 수 있었지만,<br>아무래도 기사님의 태도가 마음에 걸린다.",
      choices: [
        { key:'A', text:'좋은 평가를 쓸 수 없을 것 같아, 평가하지 않고 그냥 알림을 지운다.' },
        { key:'B', text:'별점 2점과 함께 “탑승 과정이 좀 별로였어요.” 라고 남긴다.' },
        { key:'C', text:'별점 4점과 함께 “처음에 착오가 있었지만 친절하셨어요.” 라고 남긴다.' },
      ]
    }
  ];

  /* ----- 상태 ----- */
  let idx = 0;                    // 0..2
  const answers = [null, null, null]; // 'A' | 'B' | 'C'

  /* ----- DOM ----- */
  const qBody  = document.getElementById('qBody');
  const group  = document.getElementById('answerGroup');
  const prevBtn = document.getElementById('quizPrev');
  const nextBtn = document.getElementById('quizNext');
  const progress = document.getElementById('quizProgress');
  const loadingEl = document.getElementById('quizLoading');

  /* ----- 렌더 ----- */
  function render() {
    const q = QUESTIONS[idx];
    qBody.innerHTML  = q.body;

    // 프로그레스 스텝 (1~3)
    progress.dataset.step = String(idx + 1);

    // 답변 버튼 갱신
    group.innerHTML = '';
    q.choices.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mdm-quiz__answer';
      btn.dataset.choice = c.key; // 'A' | 'B' | 'C'
      btn.textContent = c.text;
      btn.setAttribute('aria-pressed', answers[idx] === c.key ? 'true' : 'false');
      btn.addEventListener('click', () => onAnswer(c.key));
      group.appendChild(btn);
    });

    // 내비 상태
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx >= QUESTIONS.length - 1; // 마지막 문항에선 숨 쉬게만
  }

  /* ----- 이벤트 ----- */
  function onAnswer(key) {
    answers[idx] = key;

    if (idx < QUESTIONS.length - 1) {
      idx++;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      startLoadingAndGo();
    }
  }

  prevBtn.addEventListener('click', () => {
    if (idx > 0) {
      idx--;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  nextBtn.addEventListener('click', () => {
    if (idx < QUESTIONS.length - 1) {
      idx++;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ----- 패턴 매핑 → 결과 페이지 ----- */
  // AAA/AAB/AAC/ABA/ACA/BAA/CAA   => type1.html
  // BBB/BBA/BBC/BAB/BCB/ABB/CBB   => type2.html
  // CCC/CCA/CCB/CAC/CBC/ACC/BCC   => type3.html
  // ABC/ACB/BAC/BCA/CAB/CBA       => type4.html
  function patternToResult(seq) {
    const s = seq.join('');
    const t1 = new Set(['AAA','AAB','AAC','ABA','ACA','BAA','CAA']);
    const t2 = new Set(['BBB','BBA','BBC','BAB','BCB','ABB','CBB']);
    const t3 = new Set(['CCC','CCA','CCB','CAC','CBC','ACC','BCC']);
    const t4 = new Set(['ABC','ACB','BAC','BCA','CAB','CBA']);

    if (t1.has(s)) return 'type1.html';
    if (t2.has(s)) return 'type2.html';
    if (t3.has(s)) return 'type3.html';
    if (t4.has(s)) return 'type4.html';
    return 'type4.html'; // fallback
  }

  /* ----- 로딩 후 이동 ----- */
  function startLoadingAndGo() {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    group.querySelectorAll('button').forEach(b => b.disabled = true);

    loadingEl.classList.add('is-on');
    const target = patternToResult(answers);

    setTimeout(() => { window.location.href = target; }, 1200);
  }

  // 초기 렌더
  render();
})();
