gsap.registerPlugin(ScrollTrigger);

const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const loader = document.getElementById("loader");
const yearEl = document.getElementById("year");
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

document.querySelectorAll(".nav-links a").forEach((anchor) => {
  anchor.addEventListener("click", () => {
    navLinks.classList.remove("open");
  });
});

window.addEventListener("load", () => {
  gsap.to(loader, {
    opacity: 0,
    duration: 0.6,
    delay: 0.4,
    onComplete: () => {
      loader.style.display = "none";
    },
  });

  gsap.from(".hero .kicker, .hero h1, .hero h2, .hero-line, .cta-group .btn", {
    y: 26,
    opacity: 0,
    duration: 0.85,
    stagger: 0.14,
    ease: "power3.out",
  });
});

yearEl.textContent = new Date().getFullYear();

gsap.utils.toArray("section").forEach((section) => {
  gsap.from(
    section.querySelectorAll("h3, h4, p, li, article, img, .btn, .skill-bar"),
    {
      scrollTrigger: {
        trigger: section,
        start: "top 78%",
      },
      y: 18,
      opacity: 0,
      duration: 0.65,
      stagger: 0.04,
      ease: "power2.out",
    },
  );
});

gsap.utils.toArray(".skill-bar").forEach((bar) => {
  const meter = bar.querySelector("i");
  const level = Number(bar.dataset.level || 0);

  gsap.to(meter, {
    width: `${level}%`,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: bar,
      start: "top 90%",
    },
  });
});

gsap.utils.toArray(".stat-num").forEach((counter) => {
  const target = Number(counter.dataset.target || 0);
  const value = { score: 0 };

  gsap.to(value, {
    score: target,
    duration: 1.8,
    ease: "power2.out",
    scrollTrigger: {
      trigger: counter,
      start: "top 85%",
    },
    onUpdate: () => {
      counter.textContent = Math.floor(value.score).toLocaleString();
    },
  });
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: contactForm.name.value.trim(),
    email: contactForm.email.value.trim(),
    message: contactForm.message.value.trim(),
  };

  formStatus.textContent = "Sending message...";

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send message.");
    }

    formStatus.textContent = "Message sent successfully. Thank you!";
    formStatus.style.color = "#14f195";
    contactForm.reset();
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.style.color = "#ff6b6b";
  }
});
