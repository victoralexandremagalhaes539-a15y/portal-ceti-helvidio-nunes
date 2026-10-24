
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  SUPABASE_URL,
  SUPABASE_KEY,
  WEATHER
} from "./config.js";

const $ = id => document.getElementById(id);

const ready =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_KEY.length > 25;

const db = ready
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let user = null;
let profile = null;
let currentPage = "inicio";
let channel = null;

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

const dateBR = value =>
  value
    ? new Date(
        String(value).length === 10
          ? value + "T12:00:00"
          : value
      ).toLocaleDateString("pt-BR")
    : "—";

const roleName = {
  student: "Aluno",
  teacher: "Professor",
  director: "Direção"
};

// ÍCONES PROFISSIONAIS
const menu = [
  ["inicio", "house", "Início"],
  ["avisos", "megaphone", "Avisos"],
  ["calendario", "calendar-days", "Calendário"],
  ["merenda", "utensils", "Merenda"],
  ["clima", "cloud-sun", "Clima"],
  ["ouvidoria", "message-square-text", "Ouvidoria"],
  ["notificacoes", "bell", "Notificações"],
  ["perfil", "user-round", "Meu perfil"]
];

function icon(name, size = 20) {
  const paths = {
    house: '<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/>',
    megaphone: '<path d="m3 11 18-5v12L3 13z"/><path d="M7 14l2 6h4l-3-7"/><path d="M3 11v2"/>',
    "calendar-days": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/>',
    utensils: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 2-5 7-5 12h5"/>',
    "cloud-sun": '<path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M17.7 6.3l1.4-1.4"/><path d="M12 6a6 6 0 0 1 5.7 4"/><path d="M7 20h11a4 4 0 0 0 0-8h-1a6 6 0 0 0-11.5 2A3 3 0 0 0 7 20z"/>',
    "message-square-text": '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.9-5A9 9 0 1 1 21 11.5z"/><path d="M8 10h8M8 14h5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    "user-round": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    "log-out": '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };

  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${size}"
    height="${size}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    style="flex-shrink:0;vertical-align:middle"
  >${paths[name] || paths.info}</svg>`;
}

// Ícones em HTML já existente
function setupStaticIcons() {
  const menuToggle = $("menu-toggle");
  const notificationButton = $("notification-button");
  const logoutButton = $("logout");

  if (menuToggle) {
    menuToggle.innerHTML = icon("house").replace(
      /<path d="m3 10 9-7 9 7"\/>[\s\S]*?<path d="M9 21v-7h6v7"\/>/,
      '<path d="M4 6h16M4 12h16M4 18h16"/>'
    );
  }

  if (notificationButton) {
    notificationButton.innerHTML =
      icon("bell") + '<span id="notification-count"></span>';
  }

  if (logoutButton) {
    logoutButton.innerHTML =
      icon("log-out", 18) + '<span>Sair da conta</span>';
    logoutButton.style.display = "flex";
    logoutButton.style.alignItems = "center";
    logoutButton.style.justifyContent = "center";
    logoutButton.style.gap = "10px";
  }
}

const card = (title, body) => `
  <section class="card">
    <h3>${title}</h3>
    ${body}
  </section>
`;

const empty =
  '<p class="muted">Nenhum registro encontrado.</p>';

function renderList(data, renderer) {
  return data.length
    ? data.map(renderer).join("")
    : empty;
}

function renderMenu() {
  $("navigation").innerHTML = menu.map(([id, symbol, label]) => `
    <button
      class="nav-button ${id === currentPage ? "active" : ""}"
      data-page="${id}"
      style="display:flex;align-items:center;gap:12px"
    >
      ${icon(symbol)}
      <span>${label}</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.page);
  });
}

async function query(table, order = "created_at") {
  const { data, error } = await db
    .from(table)
    .select("*")
    .order(order, { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

async function insert(table, values) {
  const { error } = await db
    .from(table)
    .insert(values);

  if (error) throw error;
}

async function navigate(page) {
  currentPage = page;
  renderMenu();

  const item = menu.find(x => x[0] === page);
  $("page-title").textContent = item?.[2] || "Portal";

  $("sidebar").classList.remove("open");
  $("content").innerHTML = card("Carregando", "Aguarde...");

  try {
    await screens[page]();
  } catch (err) {
    $("content").innerHTML = card(
      "Não foi possível carregar",
      `<p class="error">${escapeHTML(err.message)}</p>`
    );
  }
}

// AUTENTICAÇÃO GOOGLE
$("google-login").onclick = async () => {
  if (!db) return;

  const { error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: location.origin + location.pathname
    }
  });

  if (error) {
    $("login-message").textContent = error.message;
  }
};

$("logout").onclick = async () => {
  if (channel) {
    await db.removeChannel(channel);
    channel = null;
  }

  await db.auth.signOut();
};

$("menu-toggle").onclick = () =>
  $("sidebar").classList.toggle("open");

$("profile-button").onclick = () =>
  navigate("perfil");

$("notification-button").onclick = () =>
  navigate("notificacoes");

// SESSÃO
async function loadSession(session) {
  user = session?.user ?? null;

  if (!user) {
    profile = null;
    $("login").hidden = false;
    $("app").hidden = true;
    return;
  }

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data || !data.approved) {
    $("login").hidden = false;
    $("app").hidden = true;
    $("login-message").textContent =
      "Sua conta ainda não foi autorizada pela escola.";
    return;
  }

  profile = data;

  $("login").hidden = true;
  $("app").hidden = false;

  $("header-name").textContent =
    profile.display_name || "Usuário";

  $("header-avatar").src =
    profile.avatar_url ||
    "https://ui-avatars.com/api/?background=173f90&color=fff&name=" +
    encodeURIComponent(profile.display_name || "Aluno");

  if (channel) {
    await db.removeChannel(channel);
  }

  channel = db.channel("my-notifications")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `recipient_id=eq.${user.id}`
    }, async () => {
      await notificationCount();

      if (currentPage === "notificacoes") {
        await navigate("notificacoes");
      }
    })
    .subscribe();

  await notificationCount();
  await navigate("inicio");
}

async function notificationCount() {
  const { count } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  $("notification-count").textContent =
    count ? count : "";
}

async function start() {
  setupStaticIcons();

  if (!ready) {
    $("login-message").textContent =
      "Configure o Supabase no arquivo config.js.";
    return;
  }

  const { data } = await db.auth.getSession();
  await loadSession(data.session);

  db.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => loadSession(session), 0);
  });
}

// FORMULÁRIO DE PUBLICAÇÃO
function editor(table, fields, buttonLabel) {
  return card(buttonLabel, `
    <form id="editor-form">
      ${fields.map(([name, label, type]) => `
        <label>${label}</label>
        ${type === "textarea"
          ? `<textarea name="${name}" required></textarea>`
          : `<input
               name="${name}"
               type="${type || "text"}"
               required
             >`}
      `).join("")}

      <button class="primary" type="submit">
        ${buttonLabel}
      </button>
    </form>
  `);
}

function bindEditor(table) {
  const form = $("editor-form");
  if (!form) return;

  form.onsubmit = async event => {
    event.preventDefault();

    const button = form.querySelector("button");
    button.disabled = true;

    try {
      const values =
        Object.fromEntries(new FormData(form));

      await insert(table, values);
      await navigate(currentPage);
    } catch (err) {
      alert(err.message);
      button.disabled = false;
    }
  };
}

// TELAS DO PORTAL
const screens = {

  async inicio() {
    const name = escapeHTML(
      profile.display_name || "Estudante"
    );

    $("content").innerHTML = `
      <section class="hero">
        <span class="eyebrow">BEM-VINDO AO PORTAL</span>
        <h2>Olá, ${name}!</h2>

        <p>
          Seu espaço de comunicação e informação
          no CETI Helvídio Nunes.
        </p>

        <span class="badge">
          ${roleName[profile.role]}
        </span>
      </section>

      <div class="grid">
        ${card(
          `<span class="card-heading">
            ${icon("megaphone", 22)}
            Comunicados
          </span>`,
          "Acompanhe os avisos publicados pela escola."
        )}

        ${card(
          `<span class="card-heading">
            ${icon("calendar-days", 22)}
            Calendário
          </span>`,
          "Veja eventos e datas importantes."
        )}

        ${card(
          `<span class="card-heading">
            ${icon("utensils", 22)}
            Alimentação
          </span>`,
          "Confira o cardápio escolar."
        )}

        ${card(
          `<span class="card-heading">
            ${icon("message-square-text", 22)}
            Ouvidoria
          </span>`,
          "Envie solicitações e acompanhe respostas."
        )}
      </div>
    `;
  },

  async avisos() {
    const data = await query("announcements");

    let html = card(
      "Avisos da escola",
      renderList(data, r => `
        <div class="item">
          <h4>${escapeHTML(r.title)}</h4>
          <p>${escapeHTML(r.body)}</p>
          <small class="muted">
            ${dateBR(r.created_at)}
          </small>
        </div>
      `)
    );

    if (profile.role !== "student") {
      html += editor("announcements", [
        ["title", "Título"],
        ["body", "Mensagem", "textarea"]
      ], "Publicar comunicado");
    }

    $("content").innerHTML = html;
    bindEditor("announcements");
  },

  async calendario() {
    const data = await query(
      "school_events",
      "event_date"
    );

    let html = card(
      "Agenda escolar",
      renderList(data, r => `
        <div class="item">
          <h4>${escapeHTML(r.title)}</h4>
          <p>${escapeHTML(r.description)}</p>
          <span class="badge">
            ${dateBR(r.event_date)}
          </span>
        </div>
      `)
    );

    if (profile.role !== "student") {
      html += editor("school_events", [
        ["title", "Nome do evento"],
        ["event_date", "Data", "date"],
        ["description", "Descrição", "textarea"]
      ], "Adicionar evento");
    }

    $("content").innerHTML = html;
    bindEditor("school_events");
  },

  async merenda() {
    const data = await query(
      "meals",
      "meal_date"
    );

    let html = card(
      "Cardápio escolar",
      renderList(data, r => `
        <div class="item">
          <div class="row">
            <h4>${escapeHTML(r.title)}</h4>
            <span class="badge">
              ${dateBR(r.meal_date)}
            </span>
          </div>

          <p>${escapeHTML(r.description)}</p>

          <small class="muted">
            Alérgenos informados:
            ${escapeHTML(
              r.allergens || "Não informados"
            )}
          </small>
        </div>
      `)
    );

    if (profile.role === "director") {
      html += editor("meals", [
        ["title", "Nome da merenda"],
        ["meal_date", "Data", "date"],
        ["description", "Descrição e ingredientes", "textarea"],
        ["allergens", "Alérgenos"]
      ], "Publicar cardápio");
    }

    $("content").innerHTML = html;
    bindEditor("meals");
  },

  
async clima() {
  const content = $("content");
  const savedCity =
    localStorage.getItem("ceti-weather-city") ||
    "Paes Landim, Piauí";

  content.innerHTML = `
    <section class="card">
      <span class="eyebrow">CLIMA EM TEMPO REAL</span>
      <h3>Consultar outra cidade</h3>
      <form id="weather-form">
        <label for="weather-city">Cidade e estado</label>
        <input
          id="weather-city"
          name="city"
          value="${escapeHTML(savedCity)}"
          placeholder="Ex.: Paes Landim, Piauí"
          required
        >
        <button class="primary" type="submit">
          Consultar clima
        </button>
      </form>
      <p id="weather-status" class="muted" role="status">
        Buscando previsão...
      </p>
    </section>
    <div id="weather-results"></div>
  `;

  const form = $("weather-form");
  const status = $("weather-status");
  const results = $("weather-results");

  async function loadWeather(city) {
    status.textContent = "Buscando a cidade e o clima...";
    results.innerHTML = "";

    try {
      const geoUrl = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
      );

      geoUrl.search = new URLSearchParams({
        name: city,
        count: "10",
        language: "pt",
        countryCode: "BR"
      });

      const geoResponse = await fetch(geoUrl);

      if (!geoResponse.ok) {
        throw new Error("Não foi possível pesquisar a cidade.");
      }

      const geoData = await geoResponse.json();
      const places = geoData.results || [];

      if (!places.length) {
        throw new Error(
          "Cidade não encontrada. Tente escrever cidade e estado."
        );
      }

      // Prioriza uma correspondência com o nome digitado.
      const normalized = value =>
        value.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase().trim();

      const exact = places.find(place =>
        normalized(place.name) === normalized(city.split(",")[0].trim())
      );

      const place = exact || places[0];
      const locationName =
        `${place.name}, ${place.admin1 || "Brasil"}`;

      status.textContent = `Consultando ${locationName}...`;

      const weatherUrl = new URL(
        "https://api.open-meteo.com/v1/forecast"
      );

      weatherUrl.search = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current:
          "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
        daily:
          "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: "7"
      });

      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error("Não foi possível carregar a previsão.");
      }

      const data = await weatherResponse.json();
      const current = data.current;
      const daily = data.daily;

      localStorage.setItem("ceti-weather-city", locationName);
      $("weather-city").value = locationName;

      results.innerHTML = `
        <section class="hero">
          <span class="eyebrow">TEMPO AGORA</span>
          <h2>${current.temperature_2m} °C</h2>
          <p>${escapeHTML(locationName)}</p>
          <p>
            Umidade: ${current.relative_humidity_2m}%<br>
            Vento: ${current.wind_speed_10m} km/h<br>
            Precipitação: ${current.precipitation} mm
          </p>
        </section>

        ${card(
          "Previsão para os próximos 7 dias",
          daily.time.map((day, i) => `
            <div class="item row">
              <strong>${dateBR(day)}</strong>
              <span>
                ${daily.temperature_2m_min[i]}° /
                ${daily.temperature_2m_max[i]}°
              </span>
              <span>
                Chuva: ${daily.precipitation_probability_max[i] ?? "—"}%
              </span>
            </div>
          `).join("")
        )}

        <p class="muted">
          Dados meteorológicos: Open-Meteo.
          A previsão pode mudar.
        </p>
      `;

      status.textContent = `Clima atualizado: ${locationName}.`;
    } catch (error) {
      status.textContent =
        error.message || "Erro ao carregar o clima.";
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const city = $("weather-city").value.trim();
    if (city) await loadWeather(city);
  });

  await loadWeather(savedCity);
},

    );

    url.search = new URLSearchParams({
      latitude: WEATHER.latitude,
      longitude: WEATHER.longitude,
      current:
        "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
      daily:
        "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "America/Fortaleza",
      forecast_days: "7"
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Previsão indisponível.");
    }

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    $("content").innerHTML = `
      <section class="hero">
        <span class="eyebrow">METEOROLOGIA</span>
        <h2>${current.temperature_2m} °C</h2>
        <p>${escapeHTML(WEATHER.label)}</p>

        <p>
          Umidade: ${current.relative_humidity_2m}% •
          Vento: ${current.wind_speed_10m} km/h
        </p>
      </section>

      ${card(
        "Previsão para os próximos 7 dias",
        daily.time.map((day, i) => `
          <div class="item row">
            <strong>${dateBR(day)}</strong>

            <span>
              ${daily.temperature_2m_min[i]}° /
              ${daily.temperature_2m_max[i]}°
            </span>

            <span>
              Chuva:
              ${daily.precipitation_probability_max[i] ?? "—"}%
            </span>
          </div>
        `).join("")
      )}

      <p class="muted">
        Dados: Open-Meteo. Previsões são estimativas
        e podem sofrer alterações.
      </p>
    `;
  },

  async ouvidoria() {
    const data = await query("complaints");
    let html = "";

    if (profile.role !== "director") {
      html += card(
        "Enviar mensagem à direção",
        `
        <p class="muted">
          A direção poderá identificar o remetente.
          Não utilize este formulário para emergências.
        </p>

        <form id="complaint-form">
          <label>Assunto</label>
          <input
            name="subject"
            maxlength="120"
            required
          >

          <label>Categoria</label>
          <select name="category">
            <option>Reclamação</option>
            <option>Sugestão</option>
            <option>Elogio</option>
            <option>Outro</option>
          </select>

          <label>Mensagem</label>
          <textarea
            name="body"
            maxlength="3000"
            required
          ></textarea>

          <button class="primary" type="submit">
            Enviar à direção
          </button>
        </form>
        `
      );
    }

    html += card(
      profile.role === "director"
        ? "Caixa de entrada da direção"
        : "Minhas solicitações",

      renderList(data, r => `
        <div class="item">
          <div class="row">
            <h4>${escapeHTML(r.subject)}</h4>
            <span class="badge">
              ${escapeHTML(r.status)}
            </span>
          </div>

          <p>${escapeHTML(r.body)}</p>

          <small class="muted">
            ${escapeHTML(r.category)} •
            ${dateBR(r.created_at)}
          </small>

          ${r.reply ? `
            <p>
              <strong>Resposta da direção:</strong>
              ${escapeHTML(r.reply)}
            </p>
          ` : ""}

          ${profile.role === "director" ? `
            <form
              class="reply-form"
              data-id="${r.id}"
            >
              <label>Resposta</label>

              <textarea
                name="reply"
                maxlength="3000"
              >${escapeHTML(r.reply || "")}</textarea>

              <label>Situação</label>

              <select name="status">
                ${[
                  "Aberta",
                  "Em análise",
                  "Resolvida"
                ].map(s => `
                  <option
                    value="${s}"
                    ${r.status === s ? "selected" : ""}
                  >
                    ${s}
                  </option>
                `).join("")}
              </select>

              <button class="primary" type="submit">
                Salvar resposta
              </button>
            </form>
          ` : ""}
        </div>
      `)
    );

    $("content").innerHTML = html;

    const form = $("complaint-form");

    if (form) {
      form.onsubmit = async event => {
        event.preventDefault();

        const button =
          form.querySelector("button");

        button.disabled = true;

        try {
          const values =
            Object.fromEntries(new FormData(form));

          await insert("complaints", values);
          await navigate("ouvidoria");
        } catch (err) {
          alert(err.message);
          button.disabled = false;
        }
      };
    }

    document.querySelectorAll(
      ".reply-form"
    ).forEach(form => {
      form.onsubmit = async event => {
        event.preventDefault();

        const values =
          Object.fromEntries(new FormData(form));

        const { error } = await db
          .from("complaints")
          .update(values)
          .eq("id", form.dataset.id);

        if (error) {
          alert(error.message);
        } else {
          await navigate("ouvidoria");
        }
      };
    });
  },

  async notificacoes() {
    const data = await query("notifications");

    $("content").innerHTML = card(
      "Central de notificações",
      renderList(data, r => `
        <div class="item">
          <h4>${escapeHTML(r.title)}</h4>
          <p>${escapeHTML(r.body)}</p>

          <small class="muted">
            ${dateBR(r.created_at)}
          </small>

          ${!r.read ? `
            <button
              class="primary mark-read"
              data-id="${r.id}"
            >
              Marcar como lida
            </button>
          ` : '<span class="badge">Lida</span>'}
        </div>
      `)
    );

    document.querySelectorAll(
      ".mark-read"
    ).forEach(btn => {
      btn.onclick = async () => {
        const { error } = await db
          .from("notifications")
          .update({ read: true })
          .eq("id", btn.dataset.id);

        if (error) {
          alert(error.message);
        } else {
          await notificationCount();
          await navigate("notificacoes");
        }
      };
    });
  },

  async perfil() {
    $("content").innerHTML = card(
      "Meu perfil",
      `
      <p>
        <strong>E-mail:</strong>
        ${escapeHTML(user.email)}
      </p>

      <p>
        <strong>Perfil:</strong>
        ${roleName[profile.role]}
      </p>

      <form id="profile-form">
        <label>Nome de exibição</label>

        <input
          name="display_name"
          maxlength="80"
          required
          value="${escapeHTML(
            profile.display_name || ""
          )}"
        >

        <label>Alterar foto de perfil</label>

        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
        >

        <p class="muted">
          JPG, PNG ou WEBP, até 2 MB.
        </p>

        <button class="primary" type="submit">
          Salvar alterações
        </button>
      </form>

      <p
        id="profile-status"
        role="status"
      ></p>
      `
    );

    $("profile-form").onsubmit = async event => {
      event.preventDefault();

      const form = event.target;
      const name =
        form.elements.display_name.value.trim();

      const file =
        form.elements.photo.files[0];

      const changes = {
        display_name: name
      };

      try {
        if (!name) {
          throw Error("Informe seu nome.");
        }

        if (file) {
          const extensions = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
          };

          if (
            !extensions[file.type] ||
            file.size > 2000000
          ) {
            throw Error(
              "Imagem inválida ou maior que 2 MB."
            );
          }

          const path =
            `${user.id}/avatar.${extensions[file.type]}`;

          const { error } = await db.storage
            .from("avatars")
            .upload(path, file, {
              upsert: true,
              contentType: file.type
            });

          if (error) throw error;

          const { data } = db.storage
            .from("avatars")
            .getPublicUrl(path);

          changes.avatar_url =
            data.publicUrl + "?v=" + Date.now();
        }

        const { error } = await db
          .from("profiles")
          .update(changes)
          .eq("id", user.id);

        if (error) throw error;

        profile = {
          ...profile,
          ...changes
        };

        $("header-name").textContent = name;

        if (changes.avatar_url) {
          $("header-avatar").src =
            changes.avatar_url;
        }

        $("profile-status").textContent =
          "Perfil atualizado com sucesso!";

      } catch (err) {
        $("profile-status").textContent =
          err.message;
      }
    };
  }
};

start();
