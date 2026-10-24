
/*
  PORTAL CETI - MELHORIAS DE INTERFACE
  Não altera autenticação nem dados do Supabase.
*/

(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const settings = {
    dark: localStorage.getItem("ceti-dark") === "true",
    large: localStorage.getItem("ceti-large") === "true",
    motion: localStorage.getItem("ceti-motion") === "true"
  };

  const svg = (paths) => `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >${paths}</svg>
  `;

  const icons = {
    moon: svg(
      '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z"/>'
    ),
    sun: svg(
      '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>'
    ),
    type: svg(
      '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'
    ),
    motion: svg(
      '<path d="M3 12h5m3 0h10M6 7l-3 5 3 5M18 7l3 5-3 5"/>'
    ),
    search: svg(
      '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>'
    ),
    up: svg(
      '<path d="m6 14 6-6 6 6"/>'
    )
  };

  function applySettings() {
    document.body.classList.toggle(
      "extra-dark",
      settings.dark
    );

    document.body.classList.toggle(
      "extra-large-text",
      settings.large
    );

    document.body.classList.toggle(
      "extra-reduced-motion",
      settings.motion
    );

    const themeButton = $("extra-theme");

    if (themeButton) {
      themeButton.innerHTML =
        settings.dark ? icons.sun : icons.moon;

      themeButton.title =
        settings.dark ? "Modo claro" : "Modo escuro";

      themeButton.setAttribute(
        "aria-label",
        themeButton.title
      );
    }

    const sizeButton = $("extra-text-size");

    if (sizeButton) {
      sizeButton.setAttribute(
        "aria-pressed",
        String(settings.large)
      );
    }

    const motionButton = $("extra-motion");

    if (motionButton) {
      motionButton.setAttribute(
        "aria-pressed",
        String(settings.motion)
      );
    }
  }

  function makeButton(id, label, image, action) {
    const button = document.createElement("button");

    button.type = "button";
    button.id = id;
    button.className = "extra-tool";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = image;
    button.addEventListener("click", action);

    return button;
  }

  function createToolbar() {
    const bar = document.querySelector(".topbar-right");

    if (!bar || $("extra-theme")) return;

    const theme = makeButton(
      "extra-theme",
      "Alternar tema",
      icons.moon,
      () => {
        settings.dark = !settings.dark;
        localStorage.setItem(
          "ceti-dark",
          String(settings.dark)
        );
        applySettings();
      }
    );

    const textSize = makeButton(
      "extra-text-size",
      "Aumentar ou reduzir texto",
      icons.type,
      () => {
        settings.large = !settings.large;
        localStorage.setItem(
          "ceti-large",
          String(settings.large)
        );
        applySettings();
      }
    );

    const motion = makeButton(
      "extra-motion",
      "Ativar ou reduzir animações",
      icons.motion,
      () => {
        settings.motion = !settings.motion;
        localStorage.setItem(
          "ceti-motion",
          String(settings.motion)
        );
        applySettings();
      }
    );

    bar.prepend(motion);
    bar.prepend(textSize);
    bar.prepend(theme);

    applySettings();
  }

  const searchablePages = new Set([
    "avisos",
    "calendario",
    "merenda",
    "ouvidoria",
    "notificacoes"
  ]);

  function activePage() {
    return document.querySelector(
      "#navigation .nav-button.active"
    )?.dataset.page || "";
  }

  function createSearch(content) {
    if (!searchablePages.has(activePage())) return;

    const items = [...content.querySelectorAll(".item")];

    if (!items.length) return;

    const wrapper = document.createElement("div");
    wrapper.className = "extra-search";

    const image = document.createElement("span");
    image.innerHTML = icons.search;

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Pesquisar nesta página...";
    input.setAttribute(
      "aria-label",
      "Pesquisar informações da página"
    );

    const count = document.createElement("span");
    count.className = "extra-search-count";

    const update = () => {
      const term = input.value
        .trim()
        .toLocaleLowerCase("pt-BR");

      let visible = 0;

      items.forEach(item => {
        const matches = item.textContent
          .toLocaleLowerCase("pt-BR")
          .includes(term);

        item.classList.toggle(
          "extra-hidden",
          !matches
        );

        if (matches) visible++;
      });

      count.textContent =
        `${visible} de ${items.length}`;
    };

    input.addEventListener("input", update);

    wrapper.append(image, input, count);
    content.prepend(wrapper);

    update();
  }

  function createTopButton() {
    if ($("extra-top")) return;

    const button = document.createElement("button");
    button.id = "extra-top";
    button.className = "extra-top";
    button.type = "button";
    button.title = "Voltar ao topo";
    button.setAttribute(
      "aria-label",
      "Voltar ao topo"
    );
    button.innerHTML = icons.up;

    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: settings.motion ? "instant" : "smooth"
      });
    });

    document.body.append(button);
  }

  function observePages() {
    const content = $("content");
    if (!content) return;

    let queued = false;

    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;

      requestAnimationFrame(() => {
        queued = false;

        // Evita inserir a pesquisa durante "Carregando".
        if (!content.querySelector(".extra-search")) {
          createSearch(content);
        }
      });
    });

    observer.observe(content, {
      childList: true,
      subtree: false
    });

    createSearch(content);
  }

    {
 function init() {
  applySettings();
  createTopButton();
  observePages();
}
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
