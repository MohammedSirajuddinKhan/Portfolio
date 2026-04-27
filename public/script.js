(function initPortfolioSite() {
  const loader = document.getElementById("loader");
  const loaderText = loader ? loader.querySelector("p") : null;

  if (loader) {
    document.body.style.overflow = "hidden";
  }

  const hasGSAP = typeof window.gsap !== "undefined";
  const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";
  let loaderTick = null;

  const setLoaderMessage = (text) => {
    if (loaderText) {
      loaderText.textContent = text;
    }
  };

  const startLoaderAnimation = () => {
    if (!loaderText) {
      return;
    }

    let dots = 0;
    loaderTick = setInterval(() => {
      dots = (dots + 1) % 4;
      loaderText.textContent = `Building your experience${".".repeat(dots)}`;
    }, 450);
  };

  const stopLoaderAnimation = () => {
    if (loaderTick) {
      clearInterval(loaderTick);
      loaderTick = null;
    }
  };

  const hideLoader = () => {
    if (!loader || loader.dataset.hidden === "true") {
      return;
    }

    stopLoaderAnimation();
    document.body.style.overflow = "";

    if (hasGSAP) {
      window.gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
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

  const collectReadinessIssues = async () => {
    const issues = [];
    const requiredIds = [
      "menu-btn",
      "nav-links",
      "year",
      "contact-form",
      "form-status",
    ];

    requiredIds.forEach((id) => {
      if (!document.getElementById(id)) {
        issues.push(`Missing #${id}`);
      }
    });

    const sections = document.querySelectorAll("main section");
    if (sections.length < 8) {
      issues.push("Required sections not fully rendered");
    }

    if (!hasGSAP || !hasScrollTrigger) {
      issues.push("Animation libraries failed to load");
    }

    const criticalImages = Array.from(
      document.querySelectorAll('img[src^="assets/"]'),
    );

    await Promise.all(
      criticalImages.map((img) => {
        if (img.complete) {
          if (img.naturalWidth === 0) {
            issues.push(`Image failed: ${img.getAttribute("src")}`);
          }
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          img.addEventListener(
            "load",
            () => resolve(),
            { once: true },
          );
          img.addEventListener(
            "error",
            () => {
              issues.push(`Image failed: ${img.getAttribute("src")}`);
              resolve();
            },
            { once: true },
          );
        });
      }),
    );

    return issues;
  };

  const setupInteractions = () => {
    const menuBtn = document.getElementById("menu-btn");
    const navLinks = document.getElementById("nav-links");
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

    yearEl.textContent = new Date().getFullYear();

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
  };

  const boot = async () => {
    startLoaderAnimation();
    await new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));

    const issues = await collectReadinessIssues();

    if (issues.length > 0) {
      setLoaderMessage("Building your experience... still loading components");
      console.error("Startup checks failed:", issues);
      return;
    }

    setupInteractions();
    hideLoader();
  };

  boot().catch((error) => {
    setLoaderMessage("Building your experience... startup error detected");
    console.error("Startup boot error:", error);
  });
})();
