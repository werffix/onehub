const sanitizeHtml = require('sanitize-html');
const options = {
  allowedTags: ['p','br','h1','h2','h3','h4','strong','b','em','i','u','s','del','blockquote','hr','ul','ol','li','pre','code','a','table','thead','tbody','tr','th','td','mark','sub','sup','img','figure','figcaption','div','span','input'],
  allowedAttributes: { a:['href','target','rel'], img:['src','alt','title','width','height','data-align'], code:['class'], pre:['class'], mark:['style'], th:['colspan','rowspan'], td:['colspan','rowspan'], span:['style','id','data-outline-anchor'],p:['style'],h1:['style'],h2:['style'],h3:['style'],h4:['style'],figure:['data-image-figure'],div:['class','style','data-callout'],input:['type','checked','disabled'] },
  allowedSchemes: ['http','https','mailto'], allowProtocolRelative:false,
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/], 'color': [/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d\s,.%]+\)$/], 'background-color': [/^#[0-9a-f]{3,8}$/i,/^rgba?\([\d\s,.%]+\)$/], 'font-family': [/^[\w\s,"'-]{1,80}$/], 'font-size': [/^(?:[1-9]|[1-6][0-9])(?:px|pt|rem|em)$/] } },
  transformTags: {
    span: (_tag, attrs) => { if(attrs.id&&!/^section-[a-f0-9]{16,}$/.test(attrs.id))delete attrs.id; if(attrs['data-outline-anchor']!=='true')delete attrs['data-outline-anchor']; return {tagName:'span',attribs:attrs}; },
    a: (_tag, attrs) => { const href=attrs.href||''; if(!/^(?:https?:\/\/|mailto:)/i.test(href)) delete attrs.href; return {tagName:'a',attribs:{...attrs,rel:'noopener noreferrer',target:'_blank'}}; },
    img: (_tag, attrs) => { const src=attrs.src||''; if(!/^https:\/\//i.test(src)&&!/^\/uploads\/[a-f0-9-]+\.(?:webp|png|jpe?g|gif)$/i.test(src)) delete attrs.src; if(!['left','right','center'].includes(attrs['data-align']))delete attrs['data-align']; return {tagName:'img',attribs:attrs}; }
  }
};
function sanitize(value='') { return sanitizeHtml(String(value).slice(0,500000), options); }
function normalizeLegacyHtml(html='') { return String(html).replace(/<(h[1-4])([^>]*)>([\s\S]*?)<\/\1>/gi,(_,tag,attrs,inner)=>`<${tag}${attrs}>${inner.replace(/<\/?(?:span|div|br)\b[^>]*>/gi,'')}</${tag}>`).replace(/<p(?:\s[^>]*)?>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/p>/gi,'').replace(/(?:<br\s*\/?>\s*){3,}/gi,'<br><br>'); }
module.exports={sanitize,normalizeLegacyHtml};
