// Runs synchronously in <head> on every page. Kept out of the HTML so the
// Content-Security-Policy can forbid inline scripts.

// Apply the saved theme before first paint so there is no flash.
try {
  var savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    var root = document.documentElement;
    root.setAttribute('data-theme', savedTheme);
    root.classList.add(savedTheme);
  }
} catch (err) {}

// Prevent horizontal scroll on mobile.
(function () {
  var scrollTimeout;
  window.addEventListener('scroll', function () {
    if (window.scrollX !== 0) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function () {
        window.scrollTo(0, window.scrollY);
      }, 10);
    }
  }, { passive: true });
})();
