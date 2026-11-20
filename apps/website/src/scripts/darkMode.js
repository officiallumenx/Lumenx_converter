/* ========  themeSwitcher start ========= */
document.addEventListener('DOMContentLoaded', () => {
  const themeSwitchers = document.querySelectorAll('[data-theme-toggle], #themeSwitcher');

  // Initial Theme Check — Light Mode is strictly the default for new visitors.
  // Dark Mode is only enabled when the user explicitly selects 'dark'.
  const themeCheck = () => {
    const userTheme = localStorage.getItem('theme');
    if (userTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Manual Theme Switch
  const themeSwitch = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  // Call theme switch on clicking any theme toggle button (desktop or mobile)
  themeSwitchers.forEach((btn) => {
    btn.addEventListener('click', () => {
      themeSwitch();
    });
  });

  // Invoke theme check on initial load
  themeCheck();
});

