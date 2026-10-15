(() => {
let seed=41985; Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const create=URL.createObjectURL.bind(URL), revoke=URL.revokeObjectURL.bind(URL), urls=new Map();
URL.createObjectURL=b=>{const u=create(b);urls.set(u,{bytes:b.size,type:b.type});return u};
URL.revokeObjectURL=u=>{urls.delete(u);return revoke(u)};
window.__resources=()=>({urls:urls.size,blobBytes:[...urls.values()].reduce((s,b)=>s+b.bytes,0)});
window.__errors=[]; addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
})();
window.Worker=undefined; Object.defineProperty(window,"indexedDB",{value:{open(){return {}},deleteDatabase(){}}});
