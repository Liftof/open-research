(()=> {
  const s=document.currentScript;
  if(!s||window!==window.top||(new URLSearchParams(location.search).has('embed')||new URLSearchParams(location.search).get('audience')==='off')||globalThis.pbAudienceDisabled===true||navigator.globalPrivacyControl||navigator.doNotTrack==='1'||window.doNotTrack==='1')return;
  if(document.prerendering){
    document.addEventListener('prerenderingchange',count,{once:true});
  }else count();
  function count(){
    const site=s.dataset.site,page=s.dataset.page||'home';
    if(location.pathname!==(s.dataset.path||'/'))return;
    let endpoint;
    try{endpoint=new URL(s.dataset.endpoint||new URL('/api/collect',s.src));if(endpoint.protocol!=='https:'||endpoint.pathname!=='/api/collect'||endpoint.search||endpoint.hash||endpoint.username||endpoint.password)return}catch{return}
    if(!/^[a-z][a-z0-9-]{0,39}$/.test(site)||!/^[a-z][a-z0-9-]{0,39}$/.test(page)||globalThis.__pbPageViewSent)return;
    globalThis.__pbPageViewSent=true;
    fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,referrerPolicy:'no-referrer',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({site,page})}).catch(()=>{});
  }
})();
