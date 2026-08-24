/* ---------- controls ---------- */
const ICON={
  circle:'<circle cx="26" cy="26" r="24"/>',
  rectangle:'<rect x="1" y="12" width="50" height="28"/>',
  triangle:'<polygon points="26,2 51,48 1,48"/>'
};
function ctrlShapes(q){
  const el=document.createElement('div'); el.className='shapes';
  Object.keys(q.options).forEach(k=>{
    const b=document.createElement('button');
    b.type='button';
    b.innerHTML='<svg viewBox="0 0 52 52" aria-hidden="true">'+ICON[k]+'</svg><b>'+q.options[k].label+'</b>';
    b.setAttribute('aria-pressed',String(ans(q.id)===k));
    b.setAttribute('aria-label',q.options[k].label);
    b.addEventListener('click',()=>{
      S.answers[q.id]=k; S.touched[q.id]=true; draw();
      [...el.children].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));
    });
    el.appendChild(b);
  });
  return el;
}
function ctrlDuo(q){
  const el=document.createElement('div'); el.className='duo';
  q.options.forEach(([k,t,sub])=>{
    const b=document.createElement('button');
    b.type='button';
    b.innerHTML='<strong>'+t+'</strong><span>'+sub+'</span>';
    b.setAttribute('aria-pressed',String(ans(q.id)===k));
    b.addEventListener('click',()=>{
      S.answers[q.id]=k; S.touched[q.id]=true; draw();
      [...el.children].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));
    });
    el.appendChild(b);
  });
  return el;
}
function ctrlNumber(q){
  const D=derive();
  const min=val(q.min,D), max=val(q.max,D);
  const start=Math.max(min,Math.min(max,Math.round(ans(q.id))));
  S.answers[q.id]=start;
  const el=document.createElement('div');
  el.innerHTML=
    '<div class="num"><input type="number" min="'+min+'" max="'+max+'" step="1" value="'+start+'"><em>'+(q.unit||'')+'</em></div>'+
    '<input type="range" min="'+min+'" max="'+max+'" step="1" value="'+start+'">'+
    '<div class="scale"><span>'+pad2(min)+'</span><span>'+pad2(max)+'</span></div>';
  const num=el.querySelector('input[type=number]'), rng=el.querySelector('input[type=range]');
  num.setAttribute('aria-label',q.unit||'Value'); rng.setAttribute('aria-label',q.unit||'Value');
  const set=(v,syncNum)=>{
    const n=Math.max(min,Math.min(max,Math.round(v)||0));
    S.answers[q.id]=n; S.touched[q.id]=true; rng.value=n; if(syncNum) num.value=n; draw();
  };
  rng.addEventListener('input',()=>set(+rng.value,true));
  num.addEventListener('input',()=>{ if(num.value!=='') set(+num.value,false); });
  num.addEventListener('blur',()=>{ num.value=S.answers[q.id]; });
  num.addEventListener('keydown',e=>{ if(e.key==='Enter'){ num.blur(); saveAnswer(); } });
  return el;
}
/* A flat grid of equal buttons — the duo control's logic with no cap on how
   many sides a question may have. Twelve months need to be scannable at a
   glance, so they are laid out as a grid rather than a list or a scrubber:
   picking a month is a recognition task, not a measurement. */
function ctrlChoice(q){
  const el=document.createElement('div'); el.className='choice';
  q.options.forEach(k=>{
    const b=document.createElement('button');
    b.type='button'; b.textContent=k;
    b.setAttribute('aria-pressed',String(ans(q.id)===k));
    b.addEventListener('click',()=>{
      S.answers[q.id]=k; S.touched[q.id]=true;
      /* A question whose layer ARRIVES rather than appears owns that arrival,
         so the bank declares it and the control just runs it. onPick replaces
         the plain draw() — it is expected to paint. */
      if(q.onPick) q.onPick(); else draw();
      [...el.children].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));
    });
    el.appendChild(b);
  });
  return el;
}
const CONTROLS={shapes:ctrlShapes, duo:ctrlDuo, number:ctrlNumber, choice:ctrlChoice};

/* The roll, for the three questions that own a tool. It sits UNDER the control
   and ABOVE the exits on purpose: it belongs to the mark this question makes,
   not to leaving the question, and putting it in the nav row would have made
   it read as a third exit next to Save and Skip.

   Dead until the question has been chosen. Rolling redraws a layer that is not
   on the sheet yet would be a button that visibly does nothing, and the honest
   alternative — having it register the default answer on the person's behalf —
   would put an answer in the record nobody gave. So it waits, and says why. */
/* The Randomize control is GONE from the interface, by decision along with
   Skip: the question system's mock has one action on it and that action is
   Save. ROLLS/rolled()/rollFor() all stay — every tool still reads its
   randomisable control through rolled(), which now always returns the frozen
   default. Bringing the control back is a matter of a button that calls
   rollFor(id) and then draw(); nothing else has to change. */

