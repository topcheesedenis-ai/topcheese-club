/* Product visual: persistent nested branches; motion reveals their actual hierarchy. */
(function () {
  'use strict';
  const data = window.CLUB_MAP, host = document.querySelector('[data-map-tree]');
  if (!data || !host) return;
  host.classList.add('is-pending');
  const el = (tag, cls, text) => { const n=document.createElement(tag); n.className=cls; if(text)n.textContent=text; return n; };
  const svgEl = tag => document.createElementNS('http://www.w3.org/2000/svg',tag);
  const hover=matchMedia('(hover:hover)'), reduced=matchMedia('(prefers-reduced-motion:reduce)');
  function icon(name) {
    const svg=svgEl('svg');svg.classList.add('cv-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const use=svgEl('use');use.setAttribute('href',`#club-icon-${name||'layers'}`);svg.append(use);return svg;
  }
  const root=el('div','cv-root');
  const logo=el('span','cv-root-logo');logo.setAttribute('aria-hidden','true');
  const name=el('div',''), metric=el('p','cv-metric');
  const metricLead=data.root.metric.match(/^\d+\s+\S+/)?.[0];
  if(metricLead)metric.append(el('strong','',metricLead),data.root.metric.slice(metricLead.length));else metric.textContent=data.root.metric;
  name.append(el('p','cv-title',data.root.label),metric);root.append(logo,name);host.append(root);
  const stage=el('div','cv-stage'), svg=svgEl('svg');
  svg.classList.add('cv-links');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');host.append(svg,stage);
  const entries=[];
  let active=null;
  function leaf(text,index,extra=false) {
    const item=el('div','cv-leaf'+(extra?' cv-leaf--extra':''));item.setAttribute('role','listitem');item.style.setProperty('--i',index);
    const inner=el('div','cv-leaf-inner');inner.append(el('span','cv-item-label',text));item.append(inner);return item;
  }
  function list(items,peek=0) {
    const n=el('div','cv-tree-list');n.setAttribute('role','list');
    items.forEach((text,i)=>n.append(leaf(text,i,peek>0&&i>=peek)));return n;
  }
  function fold(items,peek=0,more=false) {
    const wrap=el('div','cv-fold'), inner=el('div','cv-fold-inner');inner.append(list(items,peek));
    if(more)inner.append(el('span','cv-more',typeof more==='string'?more:'+ ещё'));wrap.append(inner);return wrap;
  }
  function mode(wrap,state) {
    wrap.classList.toggle('is-open',state==='open');wrap.classList.toggle('is-peek',state==='peek');
    wrap.inert=state==='closed';wrap.setAttribute('aria-hidden',String(state==='closed'));
    wrap.querySelectorAll('.cv-leaf--extra').forEach(n=>n.setAttribute('aria-hidden',String(state!=='open')));
  }
  function focus(entry) {
    clearTimeout(entry.leaveTimer);
    if(active&&active!==entry)reset(active);
    active=entry;host.classList.add('is-focused');
    entries.forEach(e=>{e.node.classList.toggle('is-active',e===entry);e.link.classList.toggle('is-active',e===entry);});
  }
  function reset(entry) {
    clearTimeout(entry.leaveTimer);
    entry.lastTarget=null;
    entry.node.querySelectorAll('.is-pointed').forEach(n=>n.classList.remove('is-pointed'));
    entry.idle();entry.node.classList.remove('is-active');entry.link.classList.remove('is-active');
    if(active===entry){active=null;host.classList.remove('is-focused');}
  }
  data.sections.forEach((section,index)=>{
    const node=el('section','cv-group');node.dataset.section=section.id;node.style.setProperty('--order',index);
    if(section.featuredOrder)node.classList.add('cv-group--featured');
    if(section.children?.length>1)node.classList.add('cv-group--nested');
    if(section.upcoming?.length)node.classList.add('cv-group--cheeses');
    const head=el('button','cv-heading');head.type='button';head.setAttribute('aria-label',section.label);
    const mark=el('span','cv-icon-wrap');mark.append(icon(section.icon));
    const label=el('span','cv-label');label.append(el('span','cv-label-text',section.visualLabel||section.label));head.append(mark,label);
    const body=el('div','cv-content');body.id=`cv-${section.id}`;head.setAttribute('aria-controls',body.id);
    if(section.caption)body.append(el('p','cv-caption',section.caption));
    const link=svgEl('path');link.classList.add('cv-branch-link');svg.append(link);
    const entry={node,head,link,body,idle:null,measure:null,leaveTimer:null,lastTarget:null,pointerX:null,pointerY:null};entries.push(entry);
    function leave(){
      clearTimeout(entry.leaveTimer);
      entry.leaveTimer=setTimeout(()=>reset(entry),180);
    }
    function bindHover(target,activate){
      // Layout can fire pointerenter on a stationary cursor. Only actual motion
      // may choose another node; an open section keeps all its branches unfolded.
      target.addEventListener('pointermove',event=>{
        if(!hover.matches)return;
        clearTimeout(entry.leaveTimer);
        if(event.clientX===entry.pointerX&&event.clientY===entry.pointerY)return;
        entry.pointerX=event.clientX;entry.pointerY=event.clientY;
        if(entry.lastTarget===target)return;
        activate();entry.lastTarget=target;
      });
      target.addEventListener('pointerleave',()=>{if(entry.lastTarget===target)entry.lastTarget=null;});
    }
    const children=[], folds=[];
    function select(child) {
      children.forEach((c,i)=>{
        c.node.classList.toggle('is-selected',c===child);
        c.button?.setAttribute('aria-expanded',String(!!child));
        if(c.fold)mode(c.fold,child?'open':i===0?'peek':'closed');
      });
    }
    if(section.children?.length) {
      const tree=el('div','cv-subgroups');tree.setAttribute('role','list');body.append(tree);
      section.children.forEach((child,i)=>{
        const row=el('div','cv-subtree');row.setAttribute('role','listitem');
        const button=el(child.status==='soon'?'span':'button','cv-subgroup',child.label);
        row.append(button);tree.append(row);
        if(child.status==='soon'){row.classList.add('cv-future');button.append(el('small','cv-soon','скоро'));return;}
        button.type='button';
        button.setAttribute('aria-label',child.label);
        button.append(el('small','cv-topic-count',`${child.topics.length} ${child.topics.length===1?'тема':child.topics.length<5?'темы':'тем'}`));
        const samples=(child.reveal||child.preview||child.topics||[]).slice(0,4);
        const remaining=Math.max(0,(child.topics||[]).length-samples.length);
        const f=fold(samples,i===0?2:0,remaining?`+ ещё ${remaining} ${remaining===1?'тема':remaining<5?'темы':'тем'}`:false);
        f.id=`cv-${child.id}`;button.setAttribute('aria-controls',f.id);row.append(f);folds.push(f);
        const item={node:row,button,fold:f};children.push(item);
        const activate=()=>{focus(entry);head.setAttribute('aria-expanded','true');select(item);};
        bindHover(button,activate);
        button.addEventListener('focus',()=>{if(hover.matches)activate();});
        button.addEventListener('click',()=>{if(!hover.matches)activate();});
      });
    }
    const preview=section.preview||(section.topics||[]).slice(0,3);
    if(preview.length)body.append(list(preview));
    let extension=null;
    const extra=section.reveal?.slice(0,3)||(section.topics||[]).slice(preview.length);
    if(extra.length){
      extension=fold(extra,0,!!section.reveal&&section.reveal.length>extra.length);extension.classList.add('cv-extension');body.append(extension);folds.push(extension);
    }
    if(extension||section.continuation){
      const cue=el('div','cv-continuation');
      const branches=svgEl('svg');branches.setAttribute('viewBox','0 0 20 22');branches.setAttribute('aria-hidden','true');
      ['M2 1V19','M2 5H18','M2 11H14','M2 17H10'].forEach((d,i)=>{const path=svgEl('path');path.setAttribute('d',d);path.style.opacity=String(1-i*.16);branches.append(path);});
      cue.append(branches,el('span','',section.continuation||(section.upcoming?'Ещё один сыр':'Ещё внутри')));body.append(cue);
    }
    if(section.upcoming?.length){const future=el('div','cv-future cv-future-leaf',section.upcoming.join(' · ')+' —');future.append(el('small','cv-soon','скоро'));body.append(future);}
    if(!preview.length&&!section.children?.length)body.append(el('p','cv-note',section.hint));
    if(section.topicMeta)body.querySelectorAll('.cv-item-label').forEach(label=>label.append(el('small','cv-topic-meta',section.topicMeta)));
    function idle(){
      head.setAttribute('aria-expanded','false');select(null);
      if(extension)mode(extension,'closed');
    }
    function open(){
      focus(entry);head.setAttribute('aria-expanded','true');
      if(children.length)select(children[0]);
      if(extension)mode(extension,'open');
    }
    entry.idle=idle;
    // Simple branches reserve their preview space; theory unfolds as one section.
    entry.measure=()=>{
      if(section.children?.length>1){node.style.minHeight='';return;}
      const saved=folds.map(f=>f.className);
      function previewState(){
        folds.forEach(f=>f.classList.remove('is-open','is-peek'));
        children[0]?.fold.classList.add('is-peek');
      }
      previewState();
      let maximum=body.getBoundingClientRect().height;
      children.forEach(c=>{c.fold.classList.remove('is-peek');c.fold.classList.add('is-open');});
      extension?.classList.add('is-open');
      maximum=Math.max(maximum,body.getBoundingClientRect().height);
      folds.forEach((f,i)=>{f.className=saved[i];});
      node.style.minHeight='';
      const minimum=parseFloat(getComputedStyle(node).minHeight)||0;
      node.style.minHeight=`${Math.ceil(Math.max(minimum,head.offsetHeight+20+maximum+16))}px`;
    };
    bindHover(mark,open);bindHover(label.firstElementChild,open);
    const cue=body.querySelector('.cv-continuation');if(cue)bindHover(cue,open);
    body.querySelectorAll('.cv-item-label').forEach(text=>{
      const leaf=text.closest('.cv-leaf');
      bindHover(text,()=>{
        const child=children.find(c=>c.node.contains(text));
        if(child){focus(entry);head.setAttribute('aria-expanded','true');select(child);}else open();
        leaf.classList.add('is-pointed');
      });
      text.addEventListener('pointerleave',()=>leaf.classList.remove('is-pointed'));
    });
    // Crossing a gap inside the already chosen branch must not collapse it.
    node.addEventListener('pointerenter',()=>{if(active===entry)clearTimeout(entry.leaveTimer);});
    node.addEventListener('pointerleave',()=>{if(hover.matches)leave();});
    head.addEventListener('focus',()=>{if(hover.matches)open();});
    head.addEventListener('click',()=>{if(!hover.matches){if(active===entry)reset(entry);else open();}});
    node.addEventListener('focusout',e=>{if(!node.contains(e.relatedTarget))reset(entry);});
    node.addEventListener('keydown',e=>{if(e.key==='Escape')reset(entry);});
    node.append(head,body);stage.append(node);idle();
  });
  function draw(){
    if(!stage.offsetWidth)return;
    const box=host.getBoundingClientRect(), rootBox=root.getBoundingClientRect();
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    const rootX=rootBox.left-box.left+rootBox.width/2, startY=rootBox.bottom-box.top;
    const rows=[];
    entries.forEach(entry=>{
      const group=entry.node.getBoundingClientRect();
      const point={entry, x:group.left-box.left+group.width/2, y:group.top-box.top, row:group.top-box.top};
      let row=rows.find(r=>Math.abs(r.y-point.row)<3);if(!row){row={y:point.row,points:[]};rows.push(row);}row.points.push(point);
    });
    let trunk=svg.querySelector('.cv-trunk');if(!trunk){trunk=svgEl('path');trunk.classList.add('cv-trunk');svg.prepend(trunk);}
    let backbone=svg.querySelector('.cv-backbone');if(!backbone){backbone=svgEl('path');backbone.classList.add('cv-backbone');trunk.after(backbone);}
    const first=rows[0];
    // Even first tier leaves the central stem in a gutter, aligned with the root.
    let lane=rootX;
    if(first.points.length%2&&rows.length>1){
      const a=first.points[0].entry.node.getBoundingClientRect(),b=first.points[1]?.entry.node.getBoundingClientRect();
      if(b)lane=(a.right+b.left)/2-box.left;
    }
    const paths=[], backbonePaths=[];
    rows.forEach((row,index)=>{
      const rail=row.y-26, origin=index===0?rootX:lane;
      row.points.forEach(({entry,x,y},position)=>{
        const dx=x-origin, direction=Math.sign(dx), r=Math.min(10,Math.abs(dx)/3);
        let d;
        if(Math.abs(dx)<1){
          // A node on the stem gets a straight vertical drop, without a decorative bend.
          d=`M ${origin} ${startY} V ${y}`;
        }else{
          d=`M ${origin} ${index===0?startY:first.y-26} V ${rail-r} Q ${origin} ${rail} ${origin+direction*r} ${rail}`;
          if(position===0||position===row.points.length-1){
            d+=` H ${x-direction*r} Q ${x} ${rail} ${x} ${rail+r}`;
            backbonePaths.push(d);
            d+=` V ${y}`;
          }else{
            d+=` H ${x} V ${y}`;
          }
        }
        entry.link.setAttribute('d',d);paths.push(d);
      });
    });
    // One base stroke avoids dark seams from repeated overlapping rail segments.
    trunk.setAttribute('d',paths.join(' '));
    backbone.setAttribute('d',backbonePaths.join(' '));
    svg.querySelectorAll('path').forEach(p=>p.setAttribute('pathLength','1'));
  }
  const mobile=el('div','cv-mobile'), mobileDisclosures=[];
  let mobileAnchorFrame=null;
  function mobileGroup(item,nested=false) {
    const wrap=el('div','cv-mobile-group');wrap.dataset.mobileSection=item.id;
    if(item.status==='soon'){
      const future=el('p','cv-future',item.label);future.append(el('small','cv-soon','скоро'));wrap.append(future);return wrap;
    }
    const branches=(item.children||[]).filter(c=>c.status!=='soon');
    const total=branches.length?branches.reduce((sum,c)=>sum+(c.topics?.length||0),0):(item.topics?.length||0);
    const disclosure=!nested&&item.id!=='intro';
    const title=el(disclosure?'span':'p','cv-mobile-title',item.label), body=el('div','cv-mobile-body');
    if(item.icon)title.prepend(icon(item.icon));
    function quantity(n,forms){const end=n%100;return `${n} ${forms[end>=11&&end<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2]}`;}
    const topicCount=n=>quantity(n,['тема','темы','тем']);
    if(nested&&total)title.append(el('small','cv-mobile-count',topicCount(total)));
    (item.children||[]).forEach(c=>body.append(mobileGroup(c,true)));
    if(item.topics?.length){const ul=el('ul','');item.topics.forEach((t,i)=>{const li=el('li','',t);li.style.setProperty('--i',i);if(item.topicMeta)li.append(el('small','cv-mobile-topic-meta',item.topicMeta));ul.append(li);});body.append(ul);}
    if(item.upcoming?.length){const future=el('p','cv-future',item.upcoming.join(' · ')+' —');future.append(el('small','cv-soon','скоро'));body.append(future);}
    if(!disclosure){wrap.append(title,body);return wrap;}
    const d=el('details',''), summary=el('summary','');summary.append(title);
    const count=branches.length?`${topicCount(total)} · ${quantity(branches.length,['раздел','раздела','разделов'])}`:
      item.id==='cheeses'?quantity(total,['видеоурок','видеоурока','видеоуроков']):
      item.id==='milk-control'?quantity(total,['метод','метода','методов']):
      item.id==='practice'?quantity(total,['урок','урока','уроков']):
      item.id==='sales'?quantity(total,['подкаст','подкаста','подкастов']):'';
    if(count)summary.append(el('span','cv-mobile-cue',count));
    if(branches.length){
      const preview=el('ul','cv-mobile-branches');branches.forEach(c=>preview.append(el('li','',c.label)));summary.append(preview);
    }
    d.append(summary,body);wrap.append(d);
    let animation=null, itemAnimations=[];
    const controller={d,opening:false,setOpen(opening,immediate=false){
      const from=d.getBoundingClientRect().height;
      animation?.cancel();animation=null;
      itemAnimations.forEach(a=>a.cancel());itemAnimations=[];
      controller.opening=opening;d.classList.toggle('is-closing',!opening&&!immediate&&!reduced.matches);
      d.open=opening;
      const to=d.getBoundingClientRect().height;
      if(reduced.matches)return;
      if(!opening&&!immediate)d.open=true;
      animation=d.animate([{height:`${from}px`},{height:`${to}px`}],{duration:opening?360:240,easing:'cubic-bezier(.2,.65,.3,1)'});
      animation.onfinish=()=>{d.open=controller.opening;d.classList.remove('is-closing');animation=null;};
      if(opening){
        const items=[...body.children].flatMap(n=>n.tagName==='UL'?[...n.children]:[n]);
        items.forEach((n,i)=>itemAnimations.push(n.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:200,delay:Math.min(i,4)*30,easing:'ease-out',fill:'backwards'})));
      }else if(!immediate)itemAnimations.push(body.animate([{opacity:1},{opacity:0}],{duration:200,fill:'forwards'}));
    }};
    mobileDisclosures.push(controller);
    summary.addEventListener('click',event=>{
      event.preventDefault();
      cancelAnimationFrame(mobileAnchorFrame);
      const anchorTop=summary.getBoundingClientRect().top;
      let lastScroll=scrollY;
      const opening=!controller.opening;
      if(opening)mobileDisclosures.forEach(other=>{if(other!==controller&&other.d.open)other.setOpen(false,true);});
      controller.setOpen(opening);
      // Closing a long section above must not carry the tapped heading offscreen.
      const keepHeading=()=>{
        if(!mobile.offsetWidth||Math.abs(scrollY-lastScroll)>2)return;
        const shift=summary.getBoundingClientRect().top-anchorTop;
        if(Math.abs(shift)>.5)window.scrollBy({top:shift,behavior:'instant'});
        lastScroll=scrollY;
        if(mobileDisclosures.some(other=>other.d.getAnimations().length))mobileAnchorFrame=requestAnimationFrame(keepHeading);
      };
      keepHeading();
    });
    return wrap;
  }
  [...data.sections].sort((a,b)=>(a.featuredOrder??99)-(b.featuredOrder??99)).forEach((s,i)=>{const group=mobileGroup(s);group.style.setProperty('--order',i);mobile.append(group);});host.append(mobile);
  reduced.addEventListener('change',()=>{if(reduced.matches)mobileDisclosures.forEach(controller=>controller.setOpen(controller.opening,true));});
  let width=0;
  function layout(){
    if(stage.offsetWidth&&width!==stage.offsetWidth){
      width=stage.offsetWidth;host.classList.add('is-measuring');entries.forEach(e=>e.measure());host.classList.remove('is-measuring');
    }
    draw();
  }
  new ResizeObserver(layout).observe(host);
  document.fonts.ready.then(()=>{width=0;layout();visual?.dispatchEvent(new CustomEvent('club-map:ready'));});
  let introTimer=null, introFrame=null, focusAfterIntro=false;
  function finishIntro(){
    clearTimeout(introTimer);host.classList.remove('is-pending','is-entering');host.inert=false;
    cancelAnimationFrame(introFrame);
    if(focusAfterIntro){focusAfterIntro=false;stage.querySelector('button')?.focus({preventScroll:true});}
    visual?.dispatchEvent(new CustomEvent('club-map:revealed'));
  }
  function reveal(staged=false,morph=false){
    layout();
    if(reduced.matches||matchMedia('(max-width:699px)').matches){finishIntro();return;}
    const copy=host.closest('.hero').querySelector('.hero__copy').getBoundingClientRect();
    // Give the offer a head start only while both columns share the first screen.
    // On mobile, the visitor has already passed the offer before reaching the tree.
    const delay=!staged&&matchMedia('(min-width:1100px)').matches&&copy.top>=0&&copy.top<innerHeight?1.6:0;
    host.style.setProperty('--cv-intro-delay',`${delay}s`);
    host.inert=true;host.classList.add('is-entering');host.classList.remove('is-pending');
    if(morph){
      // Follow the same moving root only for the duration of its desktop morph.
      const until=performance.now()+780;
      const followRoot=()=>{draw();if(performance.now()<until)introFrame=requestAnimationFrame(followRoot);};
      introFrame=requestAnimationFrame(followRoot);
    }
    introTimer=setTimeout(finishIntro,(delay+(morph ? .78 : 1.45))*1000);
  }
  reduced.addEventListener('change',e=>{if(e.matches)finishIntro();});
  const visual=host.closest('[data-product-visual]');
  let started=false;
  function start(staged=false,morph=false){if(started)return;started=true;reveal(staged,morph);}
  visual?.addEventListener('club-map:reveal',event=>{
    focusAfterIntro=!!event.detail?.focus;
    start(true,!!event.detail?.morph);
  });
  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(items=>{
      if(items.some(e=>e.isIntersecting)&&!visual?.classList.contains('is-compact')){start();observer.disconnect();}
    },{threshold:.08});observer.observe(root);
  }else if(!visual?.classList.contains('is-compact'))start();
  layout();
  visual?.dispatchEvent(new CustomEvent('club-map:ready'));
})();
