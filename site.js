// Mobile menu, inquiry form and review form. Forms send through Web3Forms to Mak's inbox.
(function () {
  var KEY = "76e190de-1d31-439b-95f6-00a21030977a";
  var EMAIL = "hello@makeithappenmoments.com";

  var menu = document.querySelector(".menu-btn"), nav = document.querySelector(".nav");
  if (menu && nav) menu.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function send(fields) {
    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(Object.assign({ access_key: KEY, from_name: "MAK(e) It Happen website", botcheck: "" }, fields))
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res || String(res.success) !== "true") throw new Error("not sent");
    });
  }
  function val(f, k) { return String(new FormData(f).get(k) || "").trim(); }

  var form = document.getElementById("inquiry");
  if (form) {
    var status = document.getElementById("inquiry-status");
    var REQ = [["name", "your name"], ["phone", "your phone number"], ["email", "your email"], ["type", "the event type"], ["date", "the event date"], ["guests", "the guest count"], ["venue", "the city or venue"], ["budget", "your budget"]];
    form.addEventListener("input", function (e) { if (e.target.setAttribute) e.target.setAttribute("aria-invalid", "false"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (val(form, "botcheck")) return;
      var missing = [], first = null;
      REQ.forEach(function (p) {
        var el = form.elements.namedItem(p[0]), bad = !el || !String(el.value || "").trim();
        if (el) el.setAttribute("aria-invalid", bad ? "true" : "false");
        if (bad) { missing.push(p[1]); first = first || el; }
      });
      var em = val(form, "email");
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { missing.push("a valid email"); first = first || form.elements.namedItem("email"); }
      if (!form.elements.namedItem("consent").checked) { missing.push("your agreement to the Privacy Policy"); first = first || form.elements.namedItem("consent"); }
      if (missing.length) { status.textContent = "Please add " + missing.join(", ") + "."; if (first) first.focus(); return; }
      var d = {
        "Name": val(form, "name"), "Phone": val(form, "phone"), "Email": em, "Event type": val(form, "type"),
        "Event date": val(form, "date"), "Guest count": val(form, "guests"), "City or venue": val(form, "venue"),
        "Budget": val(form, "budget"), "How they heard about you": val(form, "source"),
        "Agreed to Privacy Policy": "Yes", "Sent by": "Website form", "Anything else": val(form, "notes") || "(nothing added)"
      };
      var subject = "New event inquiry: " + d["Event type"] + " on " + d["Event date"] + " (" + d["Name"] + ")";
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true; status.textContent = "Sending your details...";
      send(Object.assign({ subject: subject, replyto: em }, d)).then(function () {
        status.textContent = "Thank you, " + d["Name"].split(" ")[0] + "! Your details are on their way, and I'll be in touch within a day.";
        form.reset();
      }).catch(function () {
        var body = Object.keys(d).map(function (k) { return k + ": " + d[k]; }).join("\n");
        status.innerHTML = "My form is having trouble, but nothing is lost. <a href=\"mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body) + "\">Email me your details</a> or text 817-458-8699.";
      }).then(function () { btn.disabled = false; });
    });
  }

  var gf = document.getElementById("guide-form");
  if (gf) {
    var gs = document.getElementById("guide-status");
    gf.addEventListener("submit", function (e) {
      e.preventDefault();
      if (val(gf, "botcheck")) return;
      var name = val(gf, "gname"), mail = val(gf, "gemail");
      if (!name) { gs.textContent = "Please add your name."; gf.elements.namedItem("gname").focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { gs.textContent = "Please add a valid email."; gf.elements.namedItem("gemail").focus(); return; }
      if (!gf.elements.namedItem("gconsent").checked) { gs.textContent = "Please check the box to agree to the Privacy Policy."; return; }
      var btn = gf.querySelector("button[type=submit]");
      btn.disabled = true; gs.textContent = "One moment...";
      var show = function () { gs.textContent = "Thank you, " + name.split(" ")[0] + "! Your template is ready."; document.getElementById("guide-download").hidden = false; btn.hidden = true; };
      var type = val(gf, "gtype"), date = val(gf, "gdate");
      // Same subject format as the inquiry form, so the Client Book imports it as a new lead.
      send({ subject: "New event inquiry: " + (type || "Free timeline download") + " on " + (date || "date TBD") + " (" + name + ")", replyto: mail,
        "Name": name, "Phone": val(gf, "gphone"), "Email": mail, "Event type": type || "Free timeline download", "Event date": date,
        "How they heard about you": "Free timeline template download", "Agreed to Privacy Policy": "Yes", "Sent by": "Free timeline template form",
        "Anything else": "Downloaded the free Day-of Timeline template from the website." })
        .then(show).catch(show).then(function () { btn.disabled = false; });
    });
  }

  // Photos show in black and white; tapping one opens it in full color.
  var figs = Array.prototype.slice.call(document.querySelectorAll(".grid6 figure, .gallery figure"));
  if (figs.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox"; lb.hidden = true; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Photo");
    lb.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button><button class="lb-prev" aria-label="Previous photo">&larr;</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-next" aria-label="Next photo">&rarr;</button>';
    document.body.appendChild(lb);
    var cur = 0, li = lb.querySelector("img"), lc = lb.querySelector("figcaption"), last = null;
    var open = function (i) {
      cur = (i + figs.length) % figs.length;
      var im = figs[cur].querySelector("img"), cap = figs[cur].querySelector("figcaption");
      li.src = im.getAttribute("data-full") || im.getAttribute("src"); li.alt = im.alt; lc.textContent = cap ? cap.textContent : im.alt;
      if (lb.hidden) { last = document.activeElement; lb.hidden = false; document.body.style.overflow = "hidden"; lb.querySelector(".lb-close").focus(); }
    };
    var close = function () { lb.hidden = true; document.body.style.overflow = ""; if (last) last.focus(); };
    figs.forEach(function (f, i) {
      f.tabIndex = 0; f.setAttribute("role", "button"); f.setAttribute("aria-label", "Open photo: " + (f.querySelector("img").alt || ""));
      f.addEventListener("click", function () { open(i); });
      f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); } });
    });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { open(cur - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { open(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") open(cur - 1); else if (e.key === "ArrowRight") open(cur + 1);
    });
  }

  // Links to the inquiry form or free template open their dropdown.
  function openDrop(id) { var s = document.getElementById(id); var d = s && s.querySelector("details.drop"); if (d) d.open = true; }
  function onHash() { var h = location.hash.slice(1); if (h === "inquire" || h === "free-timeline") openDrop(h); }
  window.addEventListener("hashchange", onHash); onHash();
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href$="#inquire"], a[href$="#free-timeline"]');
    if (a) openDrop(a.getAttribute("href").split("#")[1]);
  });

  var rv = document.getElementById("review-form");
  if (rv) {
    var rs = document.getElementById("review-status");
    rv.addEventListener("submit", function (e) {
      e.preventDefault();
      if (val(rv, "botcheck")) return;
      if (!val(rv, "rtext")) { rs.textContent = "Please write a few words for your review."; return; }
      if (!rv.elements.namedItem("rconsent").checked) { rs.textContent = "Please check the box to agree to the Privacy Policy."; return; }
      var n = val(rv, "stars") || "5", name = val(rv, "rname"), mail = val(rv, "remail");
      var fields = { subject: "New review: " + n + " stars" + (name ? " from " + name : ""), "Stars": n + " of 5", "Name": name || "(not given)", "Event": val(rv, "revent") || "(not given)", "Email": mail || "(not given)", "Agreed to Privacy Policy": "Yes", "Review": val(rv, "rtext") };
      if (mail) fields.replyto = mail;
      rs.textContent = "Sending your review...";
      send(fields).then(function () { rs.textContent = "Thank you so much! Your review is on its way to me."; rv.reset(); })
        .catch(function () { rs.textContent = "Something went wrong. Please email " + EMAIL + " instead."; });
    });
  }
})();
