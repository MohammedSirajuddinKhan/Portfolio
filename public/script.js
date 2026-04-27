(function initPortfolioSite() {
  const menuBtn = document.getElementById("menu-btn");
  const navLinks = document.getElementById("nav-links");
  const loader = document.getElementById("loader");
  const yearEl = document.getElementById("year");
  const contactForm = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

  const hideLoader = () => {
    if (!loader || loader.dataset.hidden === "true") {
      return;
    }

    if (hasGSAP) {
      window.gsap.to(loader, {
        opacity: 0,
        duration: 0.6,
        delay: 0.2,
        onComplete: () => {
          loader.style.display = "none";
          loader.dataset.hidden = "true";
        },
      });
      return;
    }

    loader.style.display = "none";
    loader.dataset.hidden = "true";
  };

  // Safety timeout so loader never blocks content if third-party scripts fail.
  setTimeout(hideLoader, 2500);
  window.addEventListener("load", hideLoader);

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });

    document.querySelectorAll(".nav-links a").forEach((anchor) => {
      anchor.addEventListener("click", () => {
        navLinks.classList.remove("open");
      });
    });
  }

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (hasGSAP && hasScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    window.gsap.from(
      ".hero .kicker, .hero h1, .hero h2, .hero-line, .cta-group .btn",
      {
        y: 26,
        opacity: 0,
        duration: 0.85,
        stagger: 0.14,
        ease: "power3.out",
      },
    );

    window.gsap.utils.toArray("section").forEach((section) => {
      window.gsap.from(
        section.querySelectorAll(
          "h3, h4, p, li, article, img, .btn, .skill-bar",
        ),
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

    window.gsap.utils.toArray(".skill-bar").forEach((bar) => {
      const meter = bar.querySelector("i");
      const level = Number(bar.dataset.level || 0);

      window.gsap.to(meter, {
        width: `${level}%`,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: bar,
          start: "top 90%",
        },
      });
    });

    window.gsap.utils.toArray(".stat-num").forEach((counter) => {
      const rawTarget = String(counter.dataset.target || "0");
      const target =
        Number(rawTarget.replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
      const suffix = rawTarget.replace(/[\d,\s.-]/g, "");
      const value = { score: 0 };

      window.gsap.to(value, {
        score: target,
        duration: 1.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: counter,
          start: "top 85%",
        },
        onUpdate: () => {
          counter.textContent = `${Math.floor(value.score).toLocaleString()}${suffix}`;
        },
      });
    });
  }

  if (!contactForm || !formStatus) {
    return;
  }

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
})();
