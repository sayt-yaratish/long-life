(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var COOLDOWN_MS = (CFG.COOLDOWN_MINUTES || 10) * 60 * 1000;
  var STORAGE_KEY = "bogimgel_last_submit";

  // ---------- 1. Реклама: определяем источник по ЛЮБОМУ числовому пути /100 /205 /9999 ----------
  // Работает для любого числа благодаря 404.html (см. README) — сюда попадает
  // и обычный переход по /100, и переход по несуществующему пути вроде /587.
  function detectAdSource() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var parts = path.split("/").filter(Boolean);
    var last = parts[parts.length - 1];
    if (last && /^\d+$/.test(last)) {
      return last;
    }
    return "direct";
  }

  var adSourceField = document.getElementById("adSource");
  if (adSourceField) {
    adSourceField.value = detectAdSource();
  }

  // Подставляем ссылку на Telegram-канал из config.js, чтобы её не нужно было
  // менять руками в HTML
  var tgLink = document.getElementById("tgSubscribeLink");
  if (tgLink && CFG.TELEGRAM_CHANNEL_URL && CFG.TELEGRAM_CHANNEL_URL.indexOf("ВАШ_КАНАЛ") === -1) {
    tgLink.href = CFG.TELEGRAM_CHANNEL_URL;
  }

  // ---------- 2. Маска телефона +998 (__) ___-__-__ — полностью управляемая ----------
  // Раньше значение пересчитывалось из текста поля, из-за чего одно нажатие Backspace
  // на разделителе "-" или ")" не удаляло цифру, и казалось что цифры стираются через раз.
  // Теперь мы сами храним только цифры (digits) и сами решаем, что показать —
  // Backspace/Delete всегда удаляет ровно одну цифру, независимо от положения курсора.
  var phoneInput = document.getElementById("phone");
  var digits = "";

  function formatPhone(d) {
    d = d.slice(0, 9);
    var out = "+998 (";
    out += d.slice(0, 2);
    if (d.length >= 2) out += ") ";
    else return out;
    out += d.slice(2, 5);
    if (d.length >= 5) out += "-";
    out += d.slice(5, 7);
    if (d.length >= 7) out += "-";
    out += d.slice(7, 9);
    return out;
  }

  function extractDigitsAfter998(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("998") === 0) d = d.slice(3);
    return d;
  }

  function renderPhone() {
    phoneInput.value = digits.length ? formatPhone(digits) : "+998 (";
    var len = phoneInput.value.length;
    // курсор всегда в конце — редактирование идёт последовательно, как в реальных масках
    try { phoneInput.setSelectionRange(len, len); } catch (err) {}
  }

  if (phoneInput) {
    phoneInput.addEventListener("focus", function () {
      renderPhone();
    });

    // beforeinput даёт семантику действия (вставка/удаление) и работает
    // одинаково стабильно и на компьютере, и на мобильной клавиатуре
    phoneInput.addEventListener("beforeinput", function (e) {
      e.preventDefault();
      var type = e.inputType || "";

      if (type.indexOf("delete") === 0) {
        digits = digits.slice(0, -1);
      } else if (type === "insertFromPaste") {
        // обрабатывается в обработчике paste ниже
        return;
      } else if (e.data) {
        var onlyDigits = e.data.replace(/\D/g, "");
        if (onlyDigits && digits.length < 9) {
          digits = (digits + onlyDigits).slice(0, 9);
        }
      }
      renderPhone();
    });

    // Фолбэк для очень старых браузеров без beforeinput
    phoneInput.addEventListener("keydown", function (e) {
      if (typeof InputEvent !== "undefined" && InputEvent.prototype.hasOwnProperty && window.PointerEvent) {
        // beforeinput поддерживается практически везде в современных браузерах —
        // тут просто не даём Backspace ломать префикс, если beforeinput вдруг не сработал
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        // ничего дополнительно делать не нужно — обработает beforeinput,
        // но если браузер очень старый и beforeinput не поддержан, подстрахуемся:
        if (!("onbeforeinput" in phoneInput)) {
          e.preventDefault();
          digits = digits.slice(0, -1);
          renderPhone();
        }
      }
    });

    phoneInput.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData("text");
      digits = extractDigitsAfter998(text).slice(0, 9);
      renderPhone();
    });
  }

  function isPhoneComplete() {
    return digits.length === 9;
  }

  // ---------- 3. Верхний баннер срочности (обратный отсчёт до конца суток) ----------
  var topTimerEl = document.getElementById("topTimer");

  function updateTopTimer() {
    var now = new Date();
    var end = new Date(now);
    end.setHours(23, 59, 59, 999);
    var diff = Math.max(0, end - now);
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    if (topTimerEl) {
      topTimerEl.textContent =
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0");
    }
  }
  updateTopTimer();
  setInterval(updateTopTimer, 1000);

  // ---------- 4. Антиспам: 10 минут между заявками (переживает обновление страницы) ----------
  var form = document.getElementById("orderForm");
  var submitBtn = document.getElementById("submitBtn");
  var cooldownNote = document.getElementById("cooldownNote");
  var cooldownTimerEl = document.getElementById("cooldownTimer");
  var successCard = document.getElementById("successCard");
  var cooldownInterval = null;

  function getLastSubmitTime() {
    var v = localStorage.getItem(STORAGE_KEY);
    return v ? parseInt(v, 10) : 0;
  }

  function setLastSubmitTime() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  function msToClock(ms) {
    var totalSec = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function startCooldownUI() {
    var last = getLastSubmitTime();
    var remaining = COOLDOWN_MS - (Date.now() - last);
    if (remaining <= 0) {
      endCooldownUI();
      return;
    }

    submitBtn.disabled = true;
    cooldownNote.hidden = false;

    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownInterval = setInterval(function () {
      var last2 = getLastSubmitTime();
      var remaining2 = COOLDOWN_MS - (Date.now() - last2);
      if (remaining2 <= 0) {
        endCooldownUI();
        return;
      }
      cooldownTimerEl.textContent = msToClock(remaining2);
    }, 1000);

    cooldownTimerEl.textContent = msToClock(remaining);
  }

  function endCooldownUI() {
    if (cooldownInterval) clearInterval(cooldownInterval);
    submitBtn.disabled = false;
    cooldownNote.hidden = true;
  }

  (function checkCooldownOnLoad() {
    var last = getLastSubmitTime();
    if (last && Date.now() - last < COOLDOWN_MS) {
      startCooldownUI();
    }
  })();

  // ---------- 5. Отправка заявки в Telegram ----------
  function sendToTelegram(data) {
    var token = CFG.TELEGRAM_BOT_TOKEN;
    var chatId = CFG.TELEGRAM_CHAT_ID;
    if (!token || token.indexOf("ВСТАВЬТЕ") !== -1 || !chatId || chatId.indexOf("ВСТАВЬТЕ") !== -1) {
      console.warn("Telegram не настроен: заполните TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в config.js");
      return Promise.resolve({ skipped: true });
    }

    var text =
      "🔔 Yangi buyurtma!\n" +
      "👤 Ism: " + data.name + "\n" +
      "📞 Telefon: " + data.phone + "\n" +
      "📦 Tanlangan paket: " + data.packageLabel + "\n" +
      "📍 Reklama manbasi: /" + data.adSource + "\n" +
      "🌐 Sahifa: " + window.location.href;

    var url = "https://api.telegram.org/bot" + token + "/sendMessage";

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    }).then(function (res) {
      if (!res.ok) throw new Error("Telegram API error: " + res.status);
      return res.json();
    });
  }

  // ---------- 6. Отправка письма на почту через EmailJS ----------
  function sendToEmail(data) {
    var pub = CFG.EMAILJS_PUBLIC_KEY;
    var service = CFG.EMAILJS_SERVICE_ID;
    var template = CFG.EMAILJS_TEMPLATE_ID;

    if (
      !window.emailjs ||
      !pub || pub.indexOf("ВСТАВЬТЕ") !== -1 ||
      !service || service.indexOf("ВСТАВЬТЕ") !== -1 ||
      !template || template.indexOf("ВСТАВЬТЕ") !== -1
    ) {
      console.warn("EmailJS не настроен: заполните EMAILJS_* в config.js");
      return Promise.resolve({ skipped: true });
    }

    return window.emailjs.send(service, template, {
      to_email: CFG.DESTINATION_EMAIL,
      customer_name: data.name,
      customer_phone: data.phone,
      package: data.packageLabel,
      ad_source: data.adSource,
      page_url: window.location.href
    }, pub);
  }

  if (window.emailjs && CFG.EMAILJS_PUBLIC_KEY && CFG.EMAILJS_PUBLIC_KEY.indexOf("ВСТАВЬТЕ") === -1) {
    window.emailjs.init({ publicKey: CFG.EMAILJS_PUBLIC_KEY });
  }

  // ---------- 7. Обработка отправки формы ----------
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var last = getLastSubmitTime();
      if (last && Date.now() - last < COOLDOWN_MS) {
        startCooldownUI();
        return;
      }

      var nameInput = document.getElementById("name");
      var nameError = document.getElementById("nameError");
      var phoneError = document.getElementById("phoneError");
      var valid = true;

      nameError.textContent = "";
      phoneError.textContent = "";
      nameInput.classList.remove("is-invalid");
      phoneInput.classList.remove("is-invalid");

      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        nameError.textContent = "Ismingizni kiriting";
        nameInput.classList.add("is-invalid");
        valid = false;
      }

      if (!isPhoneComplete()) {
        phoneError.textContent = "Telefon raqamini to'liq kiriting";
        phoneInput.classList.add("is-invalid");
        valid = false;
      }

      if (!valid) return;

      var packageInput = form.querySelector('input[name="package"]:checked');

      var data = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        packageLabel: packageInput ? packageInput.dataset.label : "1 dona Bog'im Gel",
        adSource: adSourceField ? adSourceField.value : "direct"
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Yuborilmoqda...";

      Promise.allSettled([sendToTelegram(data), sendToEmail(data)]).then(function (results) {
        results.forEach(function (r) {
          if (r.status === "rejected") {
            console.error("Yuborishda xatolik:", r.reason);
          }
        });

        setLastSubmitTime();
        form.hidden = true;
        successCard.hidden = false;
        successCard.scrollIntoView({ behavior: "smooth", block: "start" });
        startCooldownUI();
        submitBtn.textContent = "Buyurtma berish";
      });
    });
  }

  // ---------- 7b. Подсветка выбранного пакета (подстраховка для старых браузеров без :has()) ----------
  var packageRadios = document.querySelectorAll('.package input[type="radio"]');
  packageRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      packageRadios.forEach(function (r) {
        r.closest(".package").classList.toggle("is-selected", r.checked);
      });
    });
    if (radio.checked) radio.closest(".package").classList.add("is-selected");
  });

  // ---------- 8. Красивое появление блоков и кнопок при скролле ----------
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = entry.target.getAttribute("data-delay") || 0;
          setTimeout(function () {
            entry.target.classList.add("is-visible");
          }, parseInt(delay, 10));
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }
})();
