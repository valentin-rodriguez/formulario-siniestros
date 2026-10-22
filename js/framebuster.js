/* Anti-clickjacking: GitHub Pages no permite enviar X-Frame-Options / frame-ancestors,
   así que si la página queda dentro de un iframe de otro sitio se oculta y se intenta salir. */
(function(){
  if(window.top===window.self)return;
  document.documentElement.style.display="none";
  try{window.top.location.href=window.self.location.href;}catch(e){}
})();
