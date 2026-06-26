// Load mermaid and render all code blocks with class language-mermaid
(function () {
  var script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
  script.onload = function () {
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    document.querySelectorAll("code.language-mermaid").forEach(function (el) {
      var container = document.createElement("div");
      container.className = "mermaid";
      container.textContent = el.textContent;
      el.parentElement.replaceWith(container);
    });
    mermaid.run();
  };
  document.head.appendChild(script);
})();
