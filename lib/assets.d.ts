declare module '*?raw' {const content:string;export default content;}
/// <reference types="vite/client" />
interface ImportMeta { glob: import('vite').ImportGlobFunction; }
