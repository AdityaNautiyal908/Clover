// Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.getElementById('page-body');

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

     // Enhanced Animation System
     document.addEventListener('DOMContentLoaded', function() {
      
      // Scroll-triggered animations
      const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            
            // Trigger counter animation for stats
            if (entry.target.classList.contains('stat-number') && entry.target.dataset.count) {
              animateCounter(entry.target);
            }
          }
        });
      }, observerOptions);

      // Observe all elements with animate-on-scroll class
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
      });

      // Counter animation function
      function animateCounter(element) {
        const target = parseInt(element.dataset.count);
        const duration = 2000; // 2 seconds
        const start = performance.now();
        
        function updateCounter(currentTime) {
          const elapsed = currentTime - start;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          const current = Math.floor(target * easeOutQuart);
          
          element.textContent = current + '+';
          
          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            element.textContent = target + '+';
          }
        }
        
        requestAnimationFrame(updateCounter);
      }

      // Removed parallax effect to avoid layout overlap and keep normal flow

      // Enhanced button interactions
      document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        btn.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0) scale(1)';
        });
        
        btn.addEventListener('mousedown', function() {
          this.style.transform = 'translateY(0) scale(0.98)';
        });
        
        btn.addEventListener('mouseup', function() {
          this.style.transform = 'translateY(-2px) scale(1.05)';
        });
      });

      // Feature card hover effects
      document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-10px) scale(1.02)';
          this.style.boxShadow = '0 20px 40px rgba(30, 136, 229, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0) scale(1)';
          this.style.boxShadow = '0 4px 15px var(--color-shadow)';
        });
      });

      // Contributor card hover effects
      document.querySelectorAll('.contributor-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
          this.style.transform = 'scale(1.08) rotate(2deg)';
        });
        
        card.addEventListener('mouseleave', function() {
          this.style.transform = 'scale(1) rotate(0deg)';
        });
      });

      // Smooth scroll for anchor links
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

      // Add loading animation to page
      document.body.classList.add('loading');
      setTimeout(() => {
        document.body.classList.remove('loading');
      }, 1000);

      // Typing effect for code block (optional enhancement)
      const codeLines = document.querySelectorAll('.code-line');
      codeLines.forEach((line, index) => {
        line.style.opacity = '0';
        setTimeout(() => {
          line.style.opacity = '1';
          line.style.animation = 'fadeInUp 0.6s ease-out forwards';
        }, 500 + (index * 500));
      });

      // Add ripple effect to buttons
      document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
          const ripple = document.createElement('span');
          const rect = this.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top - size / 2;
          
          ripple.style.width = ripple.style.height = size + 'px';
          ripple.style.left = x + 'px';
          ripple.style.top = y + 'px';
          ripple.classList.add('ripple');
          
          this.appendChild(ripple);
          
          setTimeout(() => {
            ripple.remove();
          }, 600);
        });
      });

      // Add CSS for ripple effect
      const style = document.createElement('style');
      style.textContent = `
        .btn {
          position: relative;
          overflow: hidden;
        }
        
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: scale(0);
          animation: ripple-animation 0.6s linear;
          pointer-events: none;
        }
        
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);

      console.log('🎨 Animation system initialized successfully!');
    });

    // Performance optimization: Throttle scroll events
    function throttle(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Add reduced motion support
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');
    }