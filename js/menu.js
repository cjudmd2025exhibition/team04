(() => {
  document.querySelectorAll('[data-mdm-menu]').forEach((menu) => {
    const btn = menu.querySelector('.mdm-menu__button');
    const overlay = menu.querySelector('.mdm-menu__overlay');
    const panel = menu.querySelector('.mdm-menu__panel');
    const closeBtn = menu.querySelector('.mdm-menu__close');
    let lastFocus = null;

    function openMenu() {
      if (menu.classList.contains('is-open')) return;
      lastFocus = document.activeElement;
      menu.classList.add('is-open');
      overlay.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      panel.focus();
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      overlay.addEventListener(
        'transitionend',
        () => (overlay.hidden = true),
        { once: true }
      );
      lastFocus && lastFocus.focus();
    }

    btn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  });
})();