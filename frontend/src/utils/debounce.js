/**
 * Debounce function to prevent excessive function calls
 * Reduces layout thrashing and improves Total Blocking Time (TBT)
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 * @example
 * const debouncedResize = debounce(() => setIsDesktop(window.innerWidth >= 768), 150);
 * window.addEventListener('resize', debouncedResize);
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function to limit function calls frequency
 * Useful for scroll/touch events
 * @param {Function} func - Function to throttle
 * @param {number} limit - Maximum frequency in milliseconds
 * @returns {Function} Throttled function
 * @example
 * const throttledScroll = throttle(() => handleScroll(), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
