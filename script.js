// Navigation and page interactions
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const topButton = document.querySelector('#topButton');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const opened = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(opened));
    menuToggle.textContent = opened ? '×' : '☰';
  });

  document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.textContent = '☰';
    });
  });
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

window.addEventListener('scroll', () => {
  if (topButton) topButton.classList.toggle('show', window.scrollY > 500);
});

if (topButton) {
  topButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

// One-line guestbook: Apps Script doPost accepts URL-encoded form fields.
(() => {
  const API_URL = 'https://script.google.com/macros/s/AKfycbzKnNS1gCiXc8yxFD-pUiKfGK4KqV7_qc8xOFxbjrm-xgPnNjBfkVkT9Q1PoolsP3TB/exec';
  const form = document.querySelector('#commentForm');
  const input = document.querySelector('#commentInput');
  const submit = document.querySelector('#commentSubmit');
  const status = document.querySelector('#commentStatus');
  const honeypot = document.querySelector('#commentWebsite');

  if (!form || !input || !submit || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const comment = input.value.trim();

    if (honeypot && honeypot.value) return;

    if (!comment) {
      status.textContent = '짧은 댓글을 입력해 주세요.';
      input.focus();
      return;
    }

    if (comment.length > 200) {
      status.textContent = '댓글은 200자 이내로 입력해 주세요.';
      input.focus();
      return;
    }

    if (/[\r\n]/.test(comment)) {
      status.textContent = '한 줄로 입력해 주세요.';
      input.focus();
      return;
    }

    submit.disabled = true;
    status.textContent = '댓글을 전송하고 있습니다.';

    try {
      // no-cors is required for a static GitHub Pages site calling Apps Script.
      // The opaque response cannot confirm the actual sheet write.
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({ comment }).toString()
      });

      input.value = '';
      status.textContent = '전송 요청을 보냈습니다. DB 저장 여부는 잠시 후 확인해 주세요.';
    } catch (error) {
      status.textContent = '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    } finally {
      submit.disabled = false;
    }
  });
})();
