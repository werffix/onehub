import {useEffect,useRef} from 'react';
import {basicSetup,EditorView} from 'codemirror';
import {keymap,highlightWhitespace} from '@codemirror/view';
import {Compartment} from '@codemirror/state';
import {StreamLanguage,indentOnInput} from '@codemirror/language';
import {shell} from '@codemirror/legacy-modes/mode/shell';
import {oneDark} from '@codemirror/theme-one-dark';

type Props={initial:string,onChange:(value:string)=>void,onReady:(view:EditorView|null)=>void,onSave:()=>void,showWhitespace:boolean,dark:boolean,fontSize:number};
export default function BashCodeEditor({initial,onChange,onReady,onSave,showWhitespace,dark,fontSize}:Props){
  const host=useRef<HTMLDivElement>(null),viewRef=useRef<EditorView|null>(null),changeRef=useRef(onChange),saveRef=useRef(onSave),white=useRef(new Compartment()),theme=useRef(new Compartment());
  changeRef.current=onChange;saveRef.current=onSave;
  useEffect(()=>{
    if(!host.current)return;
    const view=new EditorView({parent:host.current,doc:initial,extensions:[basicSetup,StreamLanguage.define(shell),indentOnInput(),white.current.of(showWhitespace?highlightWhitespace():[]),theme.current.of(dark?oneDark:[]),keymap.of([{key:'Mod-s',run:()=>{saveRef.current();return true}}]),EditorView.updateListener.of(u=>{if(u.docChanged)changeRef.current(u.state.doc.toString())})]});
    viewRef.current=view;onReady(view);
    return()=>{viewRef.current=null;onReady(null);view.destroy()};
  },[]);
  useEffect(()=>{viewRef.current?.dispatch({effects:white.current.reconfigure(showWhitespace?highlightWhitespace():[])});},[showWhitespace]);
  useEffect(()=>{viewRef.current?.dispatch({effects:theme.current.reconfigure(dark?oneDark:[])});},[dark]);
  return <div className="cm-host" ref={host} style={{'--cm-font-size':`${fontSize}px`} as any}/>;
}
