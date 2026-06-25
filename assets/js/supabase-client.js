window.CN10_VERSION = 'V14.0.0';
window.CN10 = window.CN10 || {};
(function(){
  function requireConfig(){
    if(!window.CN10_CONFIG || !window.CN10_CONFIG.SUPABASE_URL || !window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY){
      throw new Error('Thiếu cấu hình Supabase trong assets/js/config.js');
    }
  }
  requireConfig();
  window.CN10.supa = window.supabase.createClient(window.CN10_CONFIG.SUPABASE_URL, window.CN10_CONFIG.SUPABASE_PUBLISHABLE_KEY);
})();
