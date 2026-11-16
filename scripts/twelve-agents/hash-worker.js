'use strict';
// Private-LAN HTTP may lack SubtleCrypto. Keep the verified fallback off the UI thread.
importScripts('baseline/demo/data.js','baseline/demo/engine.js');
self.onmessage=e=>{
  try { self.postMessage({sha256:self.NashaEngine.sha256(new TextDecoder('utf-8',{fatal:true}).decode(e.data))}); }
  catch(error) { self.postMessage({error:error.message}); }
};
