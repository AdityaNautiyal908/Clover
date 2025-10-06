// Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.getElementById('page-body');

    // 1. Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        body.classList.add('dark-theme');
        themeToggle.textContent = '🌙'; // Set initial icon
    } else {
        themeToggle.textContent = '☀️'; // Set initial icon
    }
    
    // 2. Function to toggle the theme
    function toggleTheme() {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '🌙';
        }
    }

    // 3. Add event listener to the button
    themeToggle.addEventListener('click', toggleTheme);

    // Set current year and smooth scrolling (original logic)
    document.getElementById('year').textContent = new Date().getFullYear();
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });