
async function loadFAQs() {
    try {
      const res = await fetch('/faq');       // your /faq endpoint
      const { faqs } = await res.json();     // { faqs: [ ... ] }
  
      const list = document.getElementById('faq-list');
      list.innerHTML = '';                   // clear any old entries
  
      faqs.forEach(q => {
        const li = document.createElement('li');
        li.textContent = q;
        list.appendChild(li);
      });
    } catch (err) {
      console.error('Failed to load FAQs', err);
      document.getElementById('faq-list').innerHTML =
        '<li>Error loading FAQs</li>';
    }
  }
  
  window.addEventListener('DOMContentLoaded', loadFAQs);
  