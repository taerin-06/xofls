const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const navLinks = document.querySelectorAll('.nav a');
const topButton = document.querySelector('#topButton');

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', isOpen);
  menuToggle.textContent = isOpen ? '×' : '☰';
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

window.addEventListener('scroll', () => {
  topButton.classList.toggle('show', window.scrollY > 500);
});

topButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#year').textContent = new Date().getFullYear();


// Google Apps Script guestbook API
const COMMENT_API_URL = 'https://script.google.com/macros/s/AKfycbyK9foHf3KcCMmaayNvvNnv4NOi923TE1PZe1N9L5EBW_VCmBnmR3JYf4vWrQDDQh5L/exec';
const commentForm = document.querySelector('#commentForm');
const commentInput = document.querySelector('#commentInput');
const commentSubmit = document.querySelector('#commentSubmit');
const commentList = document.querySelector('#commentList');
const commentStatus = document.querySelector('#commentStatus');
const commentCount = document.querySelector('#commentCount');

function setCommentStatus(message) {
  if (commentStatus) commentStatus.textContent = message;
}

// Apps Script ContentService may redirect across origins. JSONP is used for GET.
function getComments() {
  return new Promise((resolve, reject) => {
    const callbackName = '__taerinComments_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => finish(new Error('댓글 목록 요청 시간이 초과되었습니다.')), 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
    }
    function finish(error, data) {
      cleanup();
      if (error) reject(error);
      else resolve(data);
    }

    window[callbackName] = data => finish(null, data);
    script.onerror = () => finish(new Error('댓글 서버에 연결하지 못했습니다.'));
    script.src = COMMENT_API_URL + '?action=list&limit=30&callback=' + encodeURIComponent(callbackName) + '&_=' + Date.now();
    document.head.appendChild(script);
  });
}

function formatCommentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function renderComments(items) {
  commentList.replaceChildren();
  commentCount.textContent = String(items.length);

  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'comment-empty';
    empty.textContent = '아직 등록된 메시지가 없습니다. 첫 번째 인사를 남겨주세요!';
    commentList.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'comment-item';

    const avatar = document.createElement('span');
    avatar.className = 'comment-avatar';
    avatar.textContent = (item.name || '익').trim().slice(0, 1);

    const body = document.createElement('div');
    body.className = 'comment-body';
    const message = document.createElement('p');
    message.className = 'comment-text';
    message.textContent = item.comment || '';
    const byline = document.createElement('p');
    byline.className = 'comment-byline';
    byline.textContent = (item.name || '익명') + (item.createdAt ? ' · ' + formatCommentDate(item.createdAt) : '');

    body.append(message, byline);
    li.append(avatar, body);
    commentList.appendChild(li);
  });
}

async function loadComments() {
  try {
    const data = await getComments();
    if (!data || data.ok !== true || !Array.isArray(data.comments)) {
      throw new Error((data && data.error) || '댓글 목록 형식이 올바르지 않습니다.');
    }
    renderComments(data.comments);
    setCommentStatus('최신 댓글을 불러왔습니다.');
    return data.comments;
  } catch (error) {
    setCommentStatus('댓글을 불러오지 못했습니다. 서버 배포 및 접근 권한을 확인해 주세요.');
    console.error('[Guestbook]', error);
    return null;
  }
}

if (commentForm) {
  commentForm.addEventListener('submit', async event => {
    event.preventDefault();
    const comment = commentInput.value.trim();
    const website = document.querySelector('#commentWebsite').value;

    if (!comment) {
      setCommentStatus('댓글을 한 글자 이상 입력해 주세요.');
      commentInput.focus();
      return;
    }
    if (comment.length > 200) {
      setCommentStatus('댓글은 200자 이하로 입력해 주세요.');
      return;
    }

    commentSubmit.disabled = true;
    setCommentStatus('댓글을 저장하고 있습니다.');

    try {
      // Simple form encoding avoids a CORS preflight. The no-cors response is opaque,
      // so the actual save is confirmed by re-reading the latest comments via JSONP.
      await fetch(COMMENT_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ name: '익명', comment, website }).toString()
      });

      await new Promise(resolve => window.setTimeout(resolve, 1300));
      const latest = await loadComments();
      if (latest && latest[0] && latest[0].comment === comment) {
        commentInput.value = '';
        setCommentStatus('댓글이 Google 스프레드시트에 저장되었습니다.');
      } else if (latest) {
        setCommentStatus('댓글 목록에 반영되지 않았습니다. Apps Script 배포 버전을 확인해 주세요.');
      }
    } catch (error) {
      setCommentStatus('전송에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
      console.error('[Guestbook submit]', error);
    } finally {
      commentSubmit.disabled = false;
    }
  });
}

// Load the guestbook when the page opens.
loadComments();


/* Google Sheets guestbook */
(() => {
  const API_URL = "https://script.google.com/macros/s/AKfycbx5RvVQMAHrGLil0mVn28DHPhLGXwwMK10ZvVH8_JQ0ioD1XWOa0ABOrWIi6z5MZ4Ip/exec";
  const form=document.querySelector("#commentForm");
  const input=document.querySelector("#commentInput");
  const submit=document.querySelector("#commentSubmit");
  const list=document.querySelector("#commentList");
  const status=document.querySelector("#commentStatus");
  const count=document.querySelector("#commentCount");
  if(!form||!input||!submit||!list||!status||!count)return;
  const say=(message)=>{status.textContent=message;};
  function loadComments(){
    return new Promise((resolve,reject)=>{
      const callback="guestbookCallback_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      const script=document.createElement("script");
      const timeout=setTimeout(()=>{cleanup();reject(new Error("댓글 목록을 불러오지 못했습니다."));},10000);
      function cleanup(){clearTimeout(timeout);delete window[callback];script.remove();}
      window[callback]=(data)=>{
        cleanup();
        if(!data||data.ok!==true||!Array.isArray(data.comments)){reject(new Error("서버 응답 형식이 올바르지 않습니다."));return;}
        list.replaceChildren();count.textContent=String(data.comments.length);
        if(!data.comments.length){const empty=document.createElement("li");empty.className="comment-empty";empty.textContent="아직 등록된 메시지가 없습니다. 첫 번째 인사를 남겨주세요!";list.appendChild(empty);}
        data.comments.forEach(item=>{
          const li=document.createElement("li");li.className="comment-item";
          const avatar=document.createElement("span");avatar.className="comment-avatar";avatar.textContent="익";
          const body=document.createElement("div");body.className="comment-body";
          const message=document.createElement("p");message.className="comment-text";message.textContent=item.comment||"";
          const byline=document.createElement("div");byline.className="comment-byline";byline.textContent=(item.name||"익명")+" · "+(item.createdAt||"");
          body.append(message,byline);li.append(avatar,body);list.appendChild(li);
        });
        resolve(data.comments);
      };
      script.onerror=()=>{cleanup();reject(new Error("댓글 서버에 연결할 수 없습니다."));};
      script.src=API_URL+"?action=list&limit=30&callback="+encodeURIComponent(callback)+"&_="+Date.now();
      document.head.appendChild(script);
    });
  }
  loadComments().then(()=>say("방문자들의 메시지")).catch(error=>say(error.message));
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const comment=input.value.trim();
    const website=document.querySelector("#commentWebsite").value;
    if(!comment){say("댓글 내용을 입력해 주세요.");input.focus();return;}
    if(comment.length>200){say("댓글은 200자 이내로 입력해 주세요.");return;}
    submit.disabled=true;say("댓글을 등록하고 있습니다.");
    try{
      await fetch(API_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams({name:"익명",comment,website}).toString()});
      await new Promise(resolve=>setTimeout(resolve,1400));
      const comments=await loadComments();
      if(comments[0]&&comments[0].comment===comment){input.value="";say("댓글이 등록되었습니다. 감사합니다!");}
      else say("등록 여부를 확인하지 못했습니다. 잠시 후 새로고침해 주세요.");
    }catch(error){say(error.message||"댓글 등록에 실패했습니다.");}
    finally{submit.disabled=false;}
  });
})();
