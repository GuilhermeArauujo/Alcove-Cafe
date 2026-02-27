const buttons = [...document.querySelectorAll('.tab-btn')];
const panels = [...document.querySelectorAll('.tab-panel')];

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    buttons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });

    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === target);
    });
  });
});
