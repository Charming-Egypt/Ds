const TripDisplay = (() => {
  const S = {
    tripName: '#tripName', spinner: '#spinner', tourTitle: '#tourTitle',
    tourDuration: '#tourDuration', tourPrice: '#tourPrice',
    tourDescription: '#tourDescription', descriptionContainer: '#descriptionContainer',
    swiperWrapper: '.swiper-wrapper', swiperContainer: '.swiper',
    thumbnailsOverlay: '#thumbnailsOverlay', includedItems: '#includedItems',
    notIncludedItems: '#notIncludedItems', timelineContainer: '#timelineContainer',
    whatToBringList: '#whatToBringList', reviewModal: '#reviewModal',
    openReviewBtn: '#openReviewBtn', submitReviewBtn: '#submitReviewBtn',
    starSelector: '#starSelector', ratingValue: '#ratingValue',
    commentInput: '#commentInput', charCount: '#charCount',
    voucherInput: '#voucherInput', avgStars: '#avgStars',
    reviewsCountText: '#reviewsCountText', reviewsListContainer: '#reviewsListContainer',
    cancelReviewBtn: '#cancelReviewBtn'
  };

  let swiper = null, currentVideoSlide = null, videoInterval = null;
  let tripData = {}, currentTrip = {}, tourTypes = {}, tripOwnerId = '';
  let tripReviews = [], currentUserReview = null, currentUserUid = '';
  let currency = 'EGP', rates = { EGP: 1 }, ratesLoaded = false, currencyHandler = null;

  function getTripId() { return new URLSearchParams(location.search).get('trip-id'); }
  const tripSlug = getTripId();

  function sanitize(s) { if(!s)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function fmtTime(s) { if(!s||isNaN(s)||s<0)return'00:00'; const m=Math.floor(s/60), sec=Math.floor(s%60); return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'); }

  function toast(msg, type='success') {
    const old=document.querySelector('.toast'); if(old)old.remove();
    const t=document.createElement('div'); t.className='toast';
    t.style.cssText=`position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#252526;color:#fff;padding:14px 24px;border-radius:30px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,0.5);border-left:4px solid ${type==='success'?'#22c55e':'#ef4444'};white-space:nowrap;`;
    t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transition='0.3s';setTimeout(()=>t.remove(),300);},4000);
  }

  function getYTId(url) {
    if(!url)return null; url=url.trim();
    if(/^[a-zA-Z0-9_-]{11}$/.test(url))return url;
    const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m?m[1]:null;
  }

  function getThumb(data, vid) {
    if(data.thumbnail&&data.thumbnail.trim())return data.thumbnail.trim();
    return `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
  }

  function formatPrice(p) {
    if(!ratesLoaded||currency==='EGP')return parseFloat(p).toFixed(2)+' EGP';
    const c=p*rates[currency];
    switch(currency){case'USD':return'$'+c.toFixed(2);case'EUR':return'€'+c.toFixed(2);case'GBP':return'£'+c.toFixed(2);default:return p.toFixed(2)+' EGP';}
  }

  function initCurrency() {
    currency=localStorage.getItem('preferredCurrency')||'EGP';
    if(window.SharmCurrency?.rates){rates=window.SharmCurrency.rates;ratesLoaded=true;}
    currencyHandler=e=>{if(e.detail?.currency){currency=e.detail.currency;if(e.detail.rates){rates=e.detail.rates;ratesLoaded=true;}updatePrice();}};
    window.addEventListener('currencyChanged',currencyHandler);
  }

  function hideSwiperCtrls(){const s=document.querySelector('.swiper');if(s)s.classList.add('swiper-controls-hidden');}
  function showSwiperCtrls(){const s=document.querySelector('.swiper');if(s)s.classList.remove('swiper-controls-hidden');}

  function stopVideo(slide) {
    if(!slide)return;
    if(slide._cleanup){slide._cleanup();slide._cleanup=null;}
    const vid=slide.getAttribute('data-video-id'), thumb=slide.getAttribute('data-thumbnail'), idx=slide.getAttribute('data-index');
    if(!vid||!thumb)return;
    if(swiper?.autoplay)swiper.autoplay.start();
    if(swiper?.allowTouchMove!==undefined)swiper.allowTouchMove=true;
    showSwiperCtrls();
    slide.innerHTML='';
    const img=document.createElement('img');img.src=thumb;img.alt='Video '+(parseInt(idx)+1);img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;';
    const btn=document.createElement('div');btn.className='play-button';btn.innerHTML='<i class="fas fa-play"></i>';btn.onclick=e=>{e.stopPropagation();playVideo(slide);};
    slide.appendChild(img);slide.appendChild(btn);currentVideoSlide=null;
  }

  function stopAllVideos(){if(currentVideoSlide)stopVideo(currentVideoSlide);}

  function playVideo(slide) {
    if(!slide)return;
    const vid=slide.getAttribute('data-video-id');if(!vid)return;
    stopAllVideos();currentVideoSlide=slide;
    if(swiper?.autoplay)swiper.autoplay.stop();
    if(swiper?.allowTouchMove!==undefined)swiper.allowTouchMove=false;
    hideSwiperCtrls();
    slide.innerHTML='';

    const wrap=document.createElement('div');wrap.className='custom-video-wrapper';
    const iframe=document.createElement('iframe');iframe.src=`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&controls=0&enablejsapi=1&playsinline=1`;iframe.allow='autoplay;encrypted-media;picture-in-picture';iframe.allowFullscreen=true;iframe.className='custom-video-iframe';
    const overlay=document.createElement('div');overlay.className='custom-video-overlay';
    const ctrls=document.createElement('div');ctrls.className='custom-video-controls';

    const pp=document.createElement('button');pp.className='vc-btn vc-play';pp.innerHTML='<i class="fas fa-pause"></i>';
    const pg=document.createElement('div');pg.className='vc-progress-wrap';const pf=document.createElement('div');pf.className='vc-progress-fill';pf.style.width='0%';pg.appendChild(pf);
    const tm=document.createElement('span');tm.className='vc-time';tm.textContent='00:00 / 00:00';
    const vol=document.createElement('button');vol.className='vc-btn vc-volume';vol.innerHTML='<i class="fas fa-volume-up"></i>';
    const fs=document.createElement('button');fs.className='vc-btn vc-fullscreen';fs.innerHTML='<i class="fas fa-expand"></i>';
    const tog=document.createElement('button');tog.className='vc-toggle-swiper';tog.innerHTML='<i class="fas fa-eye"></i> Show Controls';
    const cls=document.createElement('button');cls.className='vc-btn vc-close';cls.innerHTML='<i class="fas fa-times"></i>';
    const big=document.createElement('div');big.className='vc-big-play';big.innerHTML='<i class="fas fa-pause"></i>';

    ctrls.appendChild(pp);ctrls.appendChild(pg);ctrls.appendChild(tm);ctrls.appendChild(vol);ctrls.appendChild(fs);ctrls.appendChild(cls);
    wrap.appendChild(iframe);wrap.appendChild(overlay);wrap.appendChild(big);wrap.appendChild(tog);wrap.appendChild(ctrls);
    slide.appendChild(wrap);

    let player,playing=true,muted=false,hideTimer;

    function initPlayer(){player=new YT.Player(iframe,{events:{onReady:e=>{e.target.playVideo();e.target.unMute();startProg();},onStateChange:e=>{if(e.data===1){playing=true;big.classList.add('hidden');pp.innerHTML='<i class="fas fa-pause"></i>';startProg();}else if(e.data===2){playing=false;big.classList.remove('hidden');big.innerHTML='<i class="fas fa-play"></i>';pp.innerHTML='<i class="fas fa-play"></i>';stopProg();}else if(e.data===0){playing=false;big.classList.remove('hidden');big.innerHTML='<i class="fas fa-redo"></i>';pp.innerHTML='<i class="fas fa-redo"></i>';stopProg();}}}});}

    function startProg(){stopProg();videoInterval=setInterval(updateProg,300);}
    function stopProg(){if(videoInterval){clearInterval(videoInterval);videoInterval=null;}}
    function updateProg(){if(!player?.getCurrentTime||!player?.getDuration)return;try{const c=player.getCurrentTime()||0,d=player.getDuration()||0;if(d>0){pf.style.width=Math.min(100,(c/d)*100)+'%';tm.textContent=fmtTime(c)+' / '+fmtTime(d);}}catch(e){}}

    function showTemp(){ctrls.classList.add('visible');tog.style.opacity='1';big.classList.add('shift-up');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(playing){ctrls.classList.remove('visible');tog.style.opacity='0';big.classList.remove('shift-up');}},3000);}

    overlay.addEventListener('click',()=>{if(!player)return;playing?player.pauseVideo():player.playVideo();showTemp();});
    overlay.addEventListener('mousemove',showTemp);
    overlay.addEventListener('dblclick',()=>{try{wrap.requestFullscreen?.()||wrap.webkitRequestFullscreen?.();}catch(e){}});
    pp.addEventListener('click',e=>{e.stopPropagation();if(!player)return;playing?player.pauseVideo():player.playVideo();});
    big.addEventListener('click',e=>{e.stopPropagation();if(!player)return;playing?player.pauseVideo():player.playVideo();});
    pg.addEventListener('click',e=>{e.stopPropagation();if(!player?.getDuration)return;const r=pg.getBoundingClientRect();player.seekTo(player.getDuration()*Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));updateProg();});
    vol.addEventListener('click',e=>{e.stopPropagation();if(!player)return;muted=!muted;muted?player.mute():player.unMute();vol.innerHTML=muted?'<i class="fas fa-volume-mute"></i>':'<i class="fas fa-volume-up"></i>';});
    fs.addEventListener('click',e=>{e.stopPropagation();try{wrap.requestFullscreen?.()||wrap.webkitRequestFullscreen?.();}catch(e){}});
    tog.addEventListener('click',e=>{e.stopPropagation();const sw=document.querySelector('.swiper');if(!sw)return;const h=sw.classList.contains('swiper-controls-hidden');h?showSwiperCtrls():hideSwiperCtrls();tog.innerHTML=h?'<i class="fas fa-eye-slash"></i> Hide Controls':'<i class="fas fa-eye"></i> Show Controls';});
    cls.addEventListener('click',e=>{e.stopPropagation();stopVideo(slide);});

    function keyH(e){if(!currentVideoSlide)return;switch(e.key){case' ':e.preventDefault();if(player)playing?player.pauseVideo():player.playVideo();break;case'ArrowLeft':e.preventDefault();if(player)player.seekTo((player.getCurrentTime()||0)-10);break;case'ArrowRight':e.preventDefault();if(player)player.seekTo((player.getCurrentTime()||0)+10);break;case'm':e.preventDefault();if(player){muted=!muted;muted?player.mute():player.unMute();vol.innerHTML=muted?'<i class="fas fa-volume-mute"></i>':'<i class="fas fa-volume-up"></i>';}break;case'f':e.preventDefault();try{wrap.requestFullscreen?.();}catch(e){}break;}}
    document.addEventListener('keydown',keyH);

    slide._cleanup=()=>{document.removeEventListener('keydown',keyH);stopProg();clearTimeout(hideTimer);try{player?.destroy();}catch(e){}if(swiper?.allowTouchMove!==undefined)swiper.allowTouchMove=true;showSwiperCtrls();};

    if(window.YT?.Player)initPlayer();else{const o=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{o?.();initPlayer();};}
  }

  function createSlide(type,data,idx){
    const s=document.createElement('div');s.className='swiper-slide';if(type==='video')s.classList.add('swiper-slide-video');
    s.setAttribute('data-type',type);s.setAttribute('data-index',idx);
    if(type==='video'){
      const vid=getYTId(data.videoUrl||data.url||'');if(!vid)return null;
      const thumb=getThumb(data,vid);s.setAttribute('data-video-id',vid);s.setAttribute('data-thumbnail',thumb);
      const img=document.createElement('img');img.src=thumb;img.alt='Video '+(idx+1);img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;';
      img.onerror=()=>{img.src=`https://img.youtube.com/vi/${vid}/hqdefault.jpg`;s.setAttribute('data-thumbnail',img.src);};
      s.appendChild(img);
      const btn=document.createElement('div');btn.className='play-button';btn.innerHTML='<i class="fas fa-play"></i>';btn.onclick=e=>{e.stopPropagation();playVideo(s);};s.appendChild(btn);
    }else{const img=document.createElement('img');img.src=data;img.alt='Photo '+(idx+1);img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;';s.appendChild(img);}
    return s;
  }

  function createThumbs(){
    const c=document.querySelector(S.thumbnailsOverlay);if(!c)return;c.innerHTML='';
    document.querySelectorAll('.swiper-slide').forEach((s,i)=>{
      const t=s.getAttribute('data-type'),v=t==='video',src=v?s.getAttribute('data-thumbnail'):s.querySelector('img')?.src;if(!src)return;
      const w=document.createElement('div');w.className='thumbnail-wrapper';w.setAttribute('data-index',i);w.setAttribute('data-type',t||'image');
      const img=document.createElement('img');img.src=src;img.className='thumbnail-image';img.alt='Thumb '+(i+1);img.loading='lazy';w.appendChild(img);
      if(v){const ind=document.createElement('div');ind.className='video-indicator';ind.innerHTML='<i class="fas fa-play"></i>';w.appendChild(ind);const b=document.createElement('span');b.className='video-duration';b.textContent='VIDEO';w.appendChild(b);}
      w.onclick=()=>{if(swiper){stopAllVideos();swiper.slideTo(i);updateThumb(i);}};c.appendChild(w);
    });updateThumb(0);
  }

  function updateThumb(i){document.querySelectorAll('.thumbnail-wrapper').forEach(w=>w.classList.toggle('active',parseInt(w.getAttribute('data-index'))===i));}

  function initGallery(media){
    if(typeof Swiper==='undefined')return;
    const w=document.querySelector(S.swiperWrapper);if(!w)return;
    if(swiper){stopAllVideos();swiper.destroy(true,true);swiper=null;}w.innerHTML='';let c=0;
    (media?.images||[]).forEach(s=>{if(s){const sl=createSlide('image',s,c);if(sl){w.appendChild(sl);c++;}}});
    (media?.videos||[]).forEach(v=>{if(v.videoUrl||v.url){const sl=createSlide('video',v,c);if(sl){w.appendChild(sl);c++;}}});
    if(c===0){const ph=document.createElement('div');ph.className='swiper-slide';ph.style.cssText='display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#fff;';ph.innerHTML='<div><i class="fas fa-image" style="font-size:48px;opacity:0.3;"></i><p style="margin-top:16px;">No images</p></div>';w.appendChild(ph);c=1;}
    swiper=new Swiper('.swiper',{slidesPerView:1,loop:c>1,spaceBetween:0,speed:400,pagination:{el:'.swiper-pagination',clickable:true},navigation:{nextEl:'.swiper-button-next',prevEl:'.swiper-button-prev'},on:{init:createThumbs,slideChange:function(){stopAllVideos();updateThumb(this.realIndex);},slideChangeTransitionStart:stopAllVideos}});
  }

  function displayInfo(trip){
    const t=document.querySelector(S.tourTitle);if(t)t.textContent=trip.name||'';
    const d=document.querySelector(S.tourDuration);if(d)d.textContent=trip.duration||'Full Day';
    if(trip.name)document.title=trip.name+' - Discover Sharm';
    const tn=document.querySelector(S.tripName);if(tn)tn.value=trip.name||'';
  }

  function displayDesc(desc){
    const c=document.querySelector(S.descriptionContainer),d=document.querySelector(S.tourDescription);if(!c)return;
    if(desc?.trim()){d.innerHTML=desc.split('\n').filter(p=>p.trim()).map(p=>{const t=p.trim();if(t.startsWith('!')||t.startsWith('IMPORTANT:'))return`<div class="highlight-note"><i class="fas fa-star" style="color:var(--gold);margin-right:8px;"></i>${sanitize(t.replace(/^!/,'').replace(/^IMPORTANT:/,'').trim())}</div>`;return`<p>${sanitize(t)}</p>`;}).join('');c.style.display='block';}else{c.style.display='none';}
  }

  function updatePrice(){const e=document.querySelector(S.tourPrice);if(e&&currentTrip.basePrice)e.innerHTML=formatPrice(currentTrip.basePrice);}

  function loadIncluded(data){
    [{c:S.includedItems,k:'included',i:'fa-check',cl:'#22c55e'},{c:S.notIncludedItems,k:'notIncluded',i:'fa-times',cl:'#ef4444'}].forEach(({c,k,i,cl})=>{const el=document.querySelector(c),items=data[k];if(el&&items?.length)el.innerHTML=items.map(it=>`<div class="included-item"><i class="fas ${i}" style="color:${cl};"></i><span>${sanitize(it)}</span></div>`).join('');});
  }

  function loadTimeline(td){const el=document.querySelector(S.timelineContainer);if(el&&td?.length)el.innerHTML=td.map(i=>`<div class="timeline-item"><div class="timeline-time">${sanitize(i.time||'')}</div><div class="timeline-content"><h4>${sanitize(i.title||'')}</h4><p>${sanitize(i.description||'')}</p></div></div>`).join('');}

  function loadBring(items){const el=document.querySelector(S.whatToBringList);if(el&&items?.length)el.innerHTML=items.map(i=>`<li><i class="fas fa-check"></i> ${sanitize(i)}</li>`).join('');}

  function getUserPhoto(uid){return uid?`/app/photos/${uid}.jpg`:null;}

  function reviewSkeletons(){const c=document.querySelector(S.reviewsListContainer);if(c)c.innerHTML=Array(3).fill('<div class="review-card" style="opacity:0.5;"><div class="review-card-header"><div class="review-card-user"><div class="review-card-avatar" style="background:#3a3a3a;"></div><div><div style="width:100px;height:14px;background:#3a3a3a;border-radius:4px;margin-bottom:6px;"></div><div style="width:80px;height:12px;background:#3a3a3a;border-radius:4px;"></div></div></div></div><div style="width:100%;height:40px;background:#3a3a3a;border-radius:4px;"></div></div>').join('');}

  async function loadReviews(){
    if(!tripSlug||typeof db==='undefined')return;reviewSkeletons();
    try{const snap=await db.ref('trip-reviews/'+tripSlug).once('value');const data=snap.val();
      tripReviews=data?.reviews?Object.entries(data.reviews).map(([id,r])=>({id,...r})).filter(r=>r.approved).sort((a,b)=>new Date(b.date)-new Date(a.date)):[];
      updateStars(data?.average||0,data?.count||0);renderReviews();
      if(typeof auth!=='undefined'&&auth.currentUser){currentUserReview=tripReviews.find(r=>r.userId===auth.currentUser.uid);const btn=document.querySelector(S.openReviewBtn);if(btn)btn.innerHTML=currentUserReview?'<i class="fas fa-edit"></i> <span>Edit Review</span>':'<i class="fas fa-pen-alt"></i> <span>Write a Review</span>';}
    }catch(e){renderReviews();}
  }

  function updateStars(avg,cnt){const c=document.querySelector(S.avgStars);if(!c)return;const f=Math.floor(avg),h=avg%1>=0.5;c.innerHTML='<i class="fas fa-star"></i>'.repeat(f)+(h?'<i class="fas fa-star-half-alt"></i>':'')+'<i class="far fa-star"></i>'.repeat(5-f-(h?1:0));const ce=document.querySelector(S.reviewsCountText);if(ce)ce.textContent=`(${cnt} ${cnt===1?'review':'reviews'})`;}

  function renderReviews(){
    const c=document.querySelector(S.reviewsListContainer);if(!c)return;
    if(!tripReviews.length){c.innerHTML='<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p><span>Be the first</span></div>';return;}
    c.innerHTML=tripReviews.map(r=>{const d=new Date(r.date),ds=isNaN(d)?'N/A':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const nm=r.userName||'Traveler',ini=nm.charAt(0).toUpperCase(),ph=getUserPhoto(r.userId);const st=Array(5).fill().map((_,i)=>i<r.rating?'<i class="fas fa-star"></i>':'<i class="far fa-star"></i>').join('');return`<div class="review-card"><div class="review-card-header"><div class="review-card-user"><div class="review-card-avatar"><img src="${sanitize(ph)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy" alt="${sanitize(nm)}"><div class="avatar-fallback" style="display:none;">${sanitize(ini)}</div></div><div><div class="review-card-user-name">${sanitize(nm)}</div><div class="review-card-stars">${st}</div></div></div><span class="review-card-date">${ds}</span></div><p class="review-card-comment">${sanitize(r.comment||'')}</p></div>`;}).join('');
  }

  function openReviewModal(){if(typeof auth==='undefined'||!auth.currentUser){toast('Please sign in','error');return;}const m=document.querySelector(S.reviewModal);if(m){m.classList.remove('hidden');document.body.style.overflow='hidden';}}
  function closeReviewModal(){const m=document.querySelector(S.reviewModal);if(m){m.classList.add('hidden');document.body.style.overflow='';}}

  function setupStars(){
    const sc=document.querySelector(S.starSelector);if(!sc)return;
    sc.querySelectorAll('i').forEach(s=>s.addEventListener('click',()=>{const r=parseInt(s.dataset.rating);document.querySelector(S.ratingValue).value=r;sc.querySelectorAll('i').forEach((st,i)=>{st.classList.toggle('active',i<r);st.classList.toggle('fas',i<r);st.classList.toggle('far',i>=r);});}));
    const ci=document.querySelector(S.commentInput),cc=document.querySelector(S.charCount);if(ci&&cc)ci.addEventListener('input',()=>{let l=ci.value.length;if(l>500){ci.value=ci.value.substring(0,500);l=500;}cc.textContent=l;});
  }

  async function submitReview(){
    if(typeof db==='undefined')return;
    const voucher=document.querySelector(S.voucherInput)?.value?.trim()?.toUpperCase();if(!voucher||!/^DS_[A-Z0-9]{8,}$/.test(voucher)){toast('Invalid voucher','error');return;}
    const rating=parseInt(document.querySelector(S.ratingValue)?.value||'0');if(!rating||rating<1){toast('Select rating','error');return;}
    const comment=document.querySelector(S.commentInput)?.value?.trim();if(!comment||comment.length<5){toast('Min 5 characters','error');return;}
    try{const snap=await db.ref('trip-bookings/'+voucher).once('value');if(!snap.val()||snap.val().uid!==auth.currentUser.uid){toast('Invalid voucher','error');return;}
      const user=auth.currentUser;let userName='Traveler';try{const us=await db.ref('egy_user/'+user.uid).once('value');if(us.val())userName=us.val().username||'Traveler';}catch(e){}
      const rd={userId:user.uid,userName:sanitize(userName),rating,comment:sanitize(comment),date:new Date().toISOString(),approved:true,voucher};
      const ref=db.ref('trip-reviews/'+tripSlug);const curr=(await ref.once('value')).val()||{reviews:{},count:0,average:0};let count=curr.count||0,total=(curr.average||0)*count;
      if(currentUserReview&&curr.reviews[currentUserReview.id]){total=total-(curr.reviews[currentUserReview.id].rating||0)+rating;await ref.child('reviews/'+currentUserReview.id).update(rd);}else{await ref.child('reviews/'+Date.now()).set(rd);count++;total+=rating;}
      await ref.update({count,average:parseFloat((total/count).toFixed(1))});closeReviewModal();resetForm();await loadReviews();toast('Thank you!','success');}catch(e){toast('Error','error');}
  }

  function resetForm(){['voucherInput','commentInput'].forEach(id=>{const el=document.querySelector(S[id]);if(el)el.value='';});const rv=document.querySelector(S.ratingValue);if(rv)rv.value='0';const cc=document.querySelector(S.charCount);if(cc)cc.textContent='0';document.querySelectorAll(`${S.starSelector} i`).forEach(s=>{s.classList.remove('active','fas');s.classList.add('far');});}

  function setupEvents(){
    document.querySelector(S.openReviewBtn)?.addEventListener('click',openReviewModal);
    document.querySelector(S.submitReviewBtn)?.addEventListener('click',submitReview);
    document.querySelector(`${S.reviewModal} .services-popup-overlay`)?.addEventListener('click',closeReviewModal);
    document.querySelectorAll(`${S.reviewModal} .close-popup-btn`).forEach(b=>b.addEventListener('click',closeReviewModal));
    document.querySelector(S.cancelReviewBtn)?.addEventListener('click',closeReviewModal);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.querySelector(S.reviewModal);if(m&&!m.classList.contains('hidden'))closeReviewModal();}});
  }

  function cleanup(){if(currencyHandler)window.removeEventListener('currencyChanged',currencyHandler);stopAllVideos();if(swiper){swiper.destroy(true,true);swiper=null;}}

  async function fetchData(){
    if(typeof db==='undefined')return;
    try{const snap=await db.ref('trips').once('value');const data=snap.val();if(data&&data[tripSlug]){currentTrip=data[tripSlug];currentTrip.basePrice=currentTrip.price||0;tourTypes=currentTrip.tourtype||{};tripOwnerId=currentTrip.owner||'';displayInfo(currentTrip);displayDesc(currentTrip.description);initGallery(currentTrip.media);loadIncluded(currentTrip);loadTimeline(currentTrip.timeline);loadBring(currentTrip.whatToBring);updatePrice();}}catch(e){}
  }

  async function init(){if(!tripSlug)return;initCurrency();setupStars();setupEvents();if(typeof auth!=='undefined')auth.onAuthStateChanged(u=>{currentUserUid=u?.uid||'';});await Promise.all([fetchData(),tripSlug?loadReviews():Promise.resolve()]);window.addEventListener('beforeunload',cleanup);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAllVideos();});}

  const api={init,getCurrentTrip:()=>currentTrip,getTourTypes:()=>tourTypes,getTripOwnerId:()=>tripOwnerId,getTripSlug:()=>tripSlug,formatPrice,showToast:toast,cleanup,refreshReviews:loadReviews};
  return api;
})();

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',TripDisplay.init);else TripDisplay.init();
window.tripModule=TripDisplay;window.formatPrice=TripDisplay.formatPrice;window.showToast=TripDisplay.showToast;
