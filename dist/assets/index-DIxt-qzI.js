(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=document.getElementById(`app`),t=document.getElementById(`loader`),n=document.getElementById(`loader-text`),r={ingredients:i(),recipes:[],diet:localStorage.getItem(`freat.diet`)||`none`,preview:null,showShopping:!1,checked:a()};function i(){try{return JSON.parse(localStorage.getItem(`freat.ingredients`))||[]}catch{return[]}}function a(){try{return new Set(JSON.parse(localStorage.getItem(`freat.checked`))||[])}catch{return new Set}}function o(){localStorage.setItem(`freat.ingredients`,JSON.stringify(r.ingredients)),localStorage.setItem(`freat.diet`,r.diet),localStorage.setItem(`freat.checked`,JSON.stringify([...r.checked]))}function s(e){let t=new Set(r.ingredients.map(e=>e.toLowerCase()));for(let n of e){let e=n.trim();e&&!t.has(e.toLowerCase())&&(r.ingredients.push(e),t.add(e.toLowerCase()))}}function c(){let e=new Set,t=[];for(let n of r.recipes)for(let r of n.missing){let n=r.trim(),i=n.toLowerCase();i&&!e.has(i)&&(e.add(i),t.push(n))}return t}async function l(e,t=1024,n=.8){let r=await createImageBitmap(e,{imageOrientation:`from-image`}),i=Math.min(1,t/Math.max(r.width,r.height)),a=Math.round(r.width*i),o=Math.round(r.height*i),s=document.createElement(`canvas`);s.width=a,s.height=o,s.getContext(`2d`).drawImage(r,0,0,a,o);let c=await new Promise(e=>s.toBlob(e,`image/jpeg`,n)),l=new Uint8Array(await c.arrayBuffer()),u=``;for(let e=0;e<l.length;e++)u+=String.fromCharCode(l[e]);return{b64:btoa(u),url:URL.createObjectURL(c)}}async function u(e,r,i){n.textContent=i,t.hidden=!1;let a=new AbortController,o=setTimeout(()=>a.abort(),12e4);try{let t=await fetch(e,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify(r),signal:a.signal});if(!t.headers.get(`content-type`)?.includes(`application/json`))throw Error(`The freat API didn't respond (status ${t.status}). Is the server running? (bun run dev / bun server.js)`);let n=await t.json();if(!t.ok)throw Error(n.error||`something went wrong`);return n}catch(e){throw e.name===`AbortError`?Error(`Timed out after 2 minutes — the model took too long or the server is unreachable.`):e}finally{clearTimeout(o),t.hidden=!0}}async function d(e){if(!e)return;let{b64:t,url:n}=await l(e);r.preview=n,m();try{let{ingredients:e}=await u(`/api/ingredients`,{image:t,mediaType:`image/jpeg`},`spotting ingredients…`);s(e),o(),m()}catch(e){alert(e.message)}}async function f(){try{let{recipes:e}=await u(`/api/recipes`,{ingredients:r.ingredients,diet:r.diet},`cooking up ideas…`);r.recipes=e,m(),document.getElementById(`recipes`)?.scrollIntoView({behavior:`smooth`})}catch(e){alert(e.message)}}var p=e=>e.replace(/[&<>"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`})[e]);function m(){let{ingredients:t,recipes:n,diet:i,preview:a}=r;e.innerHTML=`
    <section class="capture">
      <label class="camera-btn">
        <input type="file" accept="image/*" capture="environment" hidden />
        ${a?`📸 Scan again`:`📷 Scan your fridge`}
      </label>
      ${a?`<img class="preview" src="${a}" alt="your fridge" />`:`<p class="hint">Snap your open fridge — freat figures out what's in it.</p>`}
    </section>

    ${t.length?`<section class="panel">
        <h2>In your fridge <small>${t.length}</small></h2>
        <div class="chips">
          ${t.map((e,t)=>`<span class="chip" data-rm="${t}">${p(e)}<b>×</b></span>`).join(``)}
        </div>
        <form class="add">
          <input name="ing" placeholder="add something we missed…" autocomplete="off" />
          <button type="submit">add</button>
        </form>
        <div class="controls">
          <select id="diet">
            ${[`none`,`vegetarian`,`vegan`,`pescatarian`,`gluten-free`].map(e=>`<option value="${e}" ${e===i?`selected`:``}>${e===`none`?`any diet`:e}</option>`).join(``)}
          </select>
          <button class="cook">🍳 Find recipes</button>
        </div>
      </section>`:``}

    ${n.length?`<section id="recipes" class="panel">
        <div class="r-section-head">
          <h2>Make this tonight</h2>
          <button class="shop-toggle ${r.showShopping?`open`:``}">🛒 Shopping list${c().length?` <small>${c().length}</small>`:``}</button>
        </div>
        ${r.showShopping?h():``}
        ${n.map(g).join(``)}
      </section>`:``}
  `,e.querySelector(`.camera-btn input`).addEventListener(`change`,e=>d(e.target.files[0])),e.querySelector(`.cook`)?.addEventListener(`click`,f),e.querySelector(`#diet`)?.addEventListener(`change`,e=>{r.diet=e.target.value,o()}),e.querySelector(`.add`)?.addEventListener(`submit`,e=>{e.preventDefault(),s(e.target.ing.value.split(`,`)),e.target.reset(),o(),m()}),e.querySelectorAll(`[data-rm]`).forEach(e=>e.addEventListener(`click`,()=>{r.ingredients.splice(Number(e.dataset.rm),1),o(),m()})),e.querySelector(`.shop-toggle`)?.addEventListener(`click`,()=>{r.showShopping=!r.showShopping,m()}),e.querySelectorAll(`[data-buy]`).forEach(e=>e.addEventListener(`change`,()=>{let t=e.dataset.buy.toLowerCase();e.checked?r.checked.add(t):r.checked.delete(t),o(),m()}))}function h(){let e=c();return e.length?`<div class="shopping">
    ${e.map(e=>{let t=r.checked.has(e.toLowerCase());return`<label class="shop-item${t?` done`:``}">
          <input type="checkbox" data-buy="${p(e)}" ${t?`checked`:``} />
          <span>${p(e)}</span>
        </label>`}).join(``)}
  </div>`:`<p class="hint shop-empty">Nothing to buy — these recipes use only what's in your fridge. 🎉</p>`}function g(e){return`<article class="recipe">
    <div class="r-head">
      <h3>${p(e.name)}</h3>
      <span class="meta">${e.time_minutes}m · ${p(e.difficulty)}</span>
    </div>
    <p class="desc">${p(e.description)}</p>
    <div class="chips small">
      ${e.uses.map(e=>`<span class="chip have">${p(e)}</span>`).join(``)}
      ${e.missing.map(e=>`<span class="chip need">+ ${p(e)}</span>`).join(``)}
    </div>
    <details>
      <summary>steps</summary>
      <ol>${e.steps.map(e=>`<li>${p(e)}</li>`).join(``)}</ol>
    </details>
  </article>`}m(),`serviceWorker`in navigator&&window.addEventListener(`load`,()=>navigator.serviceWorker.register(`/sw.js`).catch(()=>{}));