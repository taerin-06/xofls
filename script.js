// Navigation and page interactions
const menuToggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
const topButton=document.querySelector('#topButton');
if(menuToggle&&nav){
  menuToggle.addEventListener('click',()=>{
    const opened=nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded',String(opened));
    menuToggle.textContent=opened?'×':'☰';
  });
  document.querySelectorAll('.nav a').forEach(link=>link.addEventListener('click',()=>{
    nav.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');menuToggle.textContent='☰';
  }));
}
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
  }),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));}
window.addEventListener('scroll',()=>{if(topButton)topButton.classList.toggle('show',window.scrollY>500);});
if(topButton)topButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();

// Guestbook: one script handler, one Apps Script endpoint
(()=>{
  const API_URL='https://script.google.com/macros/s/AKfycbx5RvVQMAHrGLil0mVn28DHPhLGXwwMK10ZvVH8_JQ0ioD1XWOa0ABOrWIi6z5MZ4Ip/exec';
  const form=document.querySelector('#commentForm');
  const input=document.querySelector('#commentInput');
  const submit=document.querySelector('#commentSubmit');
  const list=document.querySelector('#commentList');
  const status=document.querySelector('#commentStatus');
  const count=document.querySelector('#commentCount');
  const honeypot=document.querySelector('#commentWebsite');
  if(!form||!input||!submit||!list||!status||!count)return;
  const say=message=>status.textContent=message;
  function loadComments(){
    return new Promise((resolve,reject)=>{
      const callback='taerinGuestbook_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const tag=document.createElement('script');
      const timeout=setTimeout(()=>{cleanup();reject(new Error('댓글 목록을 불러오지 못했습니다.'));},10000);
      function cleanup(){clearTimeout(timeout);delete window[callback];tag.remove();}
      window[callback]=data=>{
        cleanup();
        if(!data||data.ok!==true||!Array.isArray(data.comments)){reject(new Error('서버 응답을 확인할 수 없습니다.'));return;}
        list.replaceChildren();count.textContent=String(data.comments.length);
        if(!data.comments.length){const empty=document.createElement('li');empty.className='comment-empty';empty.textContent='아직 등록된 메시지가 없습니다. 첫 번째 인사를 남겨주세요!';list.appendChild(empty);}
        data.comments.forEach(item=>{
          const li=document.createElement('li');li.className='comment-item';
          const avatar=document.createElement('span');avatar.className='comment-avatar';avatar.textContent=(item.name||'익명').trim().slice(0,1);
          const body=document.createElement('div');body.className='comment-body';
          const message=document.createElement('p');message.className='comment-text';message.textContent=item.comment||'';
          const byline=document.createElement('p');byline.className='comment-byline';byline.textContent=(item.name||'익명')+(item.createdAt?' · '+new Date(item.createdAt).toLocaleString('ko-KR'):'');
          body.append(message,byline);li.append(avatar,body);list.appendChild(li);
        });
        resolve(data.comments);
      };
      tag.onerror=()=>{cleanup();reject(new Error('댓글 서버에 연결하지 못했습니다.'));};
      tag.src=API_URL+'?action=list&limit=30&callback='+encodeURIComponent(callback)+'&_='+Date.now();
      document.head.appendChild(tag);
    });
  }
  loadComments().then(()=>say('방문자들의 메시지')).catch(error=>say(error.message));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const comment=input.value.trim();
    if(honeypot&&honeypot.value)return;
    if(!comment){say('댓글 내용을 입력해 주세요.');input.focus();return;}
    if(comment.length>200){say('댓글은 200자 이내로 입력해 주세요.');return;}
    submit.disabled=true;say('댓글을 등록하고 있습니다.');
    try{
      await fetch(API_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({name:'익명',comment,website:honeypot?honeypot.value:''}).toString()});
      await new Promise(resolve=>setTimeout(resolve,1400));
      const comments=await loadComments();
      if(comments[0]&&comments[0].comment===comment){input.value='';say('댓글이 등록되었습니다. 감사합니다!');}
      else say('등록 여부를 확인하지 못했습니다. 잠시 후 새로고침해 주세요.');
    }catch(error){say(error.message||'댓글 등록에 실패했습니다.');}
    finally{submit.disabled=false;}
  });
})();