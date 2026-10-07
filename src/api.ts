export type User = { id:string; name:string; role:'admin'|'user' };
export type Category = { id:string; name:string; slug:string; description:string; icon:string; sort_order:number; hidden:boolean; created:string; count?:number };
export type Article = { id:string; title:string; slug:string; description:string; cover:string; status:'draft'|'published'; hidden:boolean; categoryId:string; categoryName:string; categorySlug?:string; html:string; content?:unknown; updated:string; created:string; seoTitle?:string; metaDescription?:string };
let csrf = '';
export async function api<T=any>(path:string, options:RequestInit={}) {
 const headers = new Headers(options.headers); if(options.body) headers.set('content-type','application/json'); if(csrf && options.method && options.method!=='GET') headers.set('x-csrf-token',csrf);
 const r=await fetch(path,{...options,headers,credentials:'same-origin'}); const data=await r.json().catch(()=>({})); if(r.status===401 && path!=='/api/session') { window.location.assign('/login'); }
 if(!r.ok) throw new Error(data.error||`Ошибка ${r.status}`); return data as T;
}
export async function session(){ const x=await api<{user:User|null,csrf:string|null}>('/api/session'); csrf=x.csrf||''; return x; }
