/* Guía de estudio: resalta el código de los ejemplos y permite ejecutarlos. */
(function () {
  const KEYWORDS = ['False','None','True','and','as','assert','async','await','break','class',
    'continue','def','del','elif','else','except','finally','for','from','global','if','import',
    'in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield'];
  const BUILTINS = ['print','input','int','float','str','bool','len','range','list','dict','set',
    'tuple','append','pop','sum','min','max','abs','round','type','sorted','reversed','enumerate',
    'zip','map','filter','open','format','lower','upper','keys','values','items','split','join'];
  const KW = new Set(KEYWORDS);
  const BI = new Set(BUILTINS);

  function esc(s) {
    return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  // Resaltador de sintaxis Python muy simple (regex, tema One Dark).
  function highlight(code) {
    const re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|f"(?:\\.|[^"\\])*"|f'(?:\\.|[^'\\])*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      last = re.lastIndex;
      if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="t-num">${esc(m[3])}</span>`;
      else {
        const w = m[4];
        if (KW.has(w)) out += `<span class="t-kw">${w}</span>`;
        else if (BI.has(w)) out += `<span class="t-bi">${w}</span>`;
        else out += esc(w);
      }
    }
    out += esc(code.slice(last));
    return out;
  }

  // Quita la indentación común (para poder escribir el código indentado en el HTML).
  function dedent(text) {
    let lines = text.replace(/\t/g, '    ').split('\n');
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length);
    const min = indents.length ? Math.min(...indents) : 0;
    return lines.map(l => l.slice(min)).join('\n');
  }

  async function ejecutar(code, stdin, salidaEl, btn) {
    btn.disabled = true;
    salidaEl.style.display = 'block';
    salidaEl.textContent = 'Ejecutando…';
    try {
      const { out, err } = await Runner.runRaw(code, stdin, msg => { salidaEl.textContent = msg; });
      salidaEl.textContent = (out || '') + (err ? '\n⚠️ ' + err : '') || '(sin salida)';
    } catch (e) {
      salidaEl.textContent = 'Error: ' + e.message;
    } finally {
      btn.disabled = false;
    }
  }

  // Prepara cada ejemplo: <div class="ejemplo"> con un <script type="text/x-python"> dentro.
  function initEjemplos() {
    document.querySelectorAll('.ejemplo').forEach(box => {
      const src = box.querySelector('script[type="text/x-python"]');
      if (!src) return;
      const code = dedent(src.textContent);
      const stdin = box.dataset.stdin ? box.dataset.stdin.replace(/\\n/g, '\n') : '';

      const pre = document.createElement('pre');
      pre.className = 'code-block';
      pre.innerHTML = `<code>${highlight(code)}</code>`;

      const bar = document.createElement('div');
      bar.className = 'ejemplo-bar';
      const btn = document.createElement('button');
      btn.className = 'secondary';
      btn.textContent = '▶ Probar';
      const salida = document.createElement('pre');
      salida.className = 'salida';
      salida.style.display = 'none';
      bar.appendChild(btn);

      box.insertBefore(pre, src);
      box.appendChild(bar);
      box.appendChild(salida);
      btn.onclick = () => ejecutar(code, stdin, salida, btn);
    });
  }

  // Playground libre al final.
  function initPlayground() {
    const runBtn = document.getElementById('pgRun');
    if (!runBtn) return;
    const area = document.getElementById('pgCode');
    const salida = document.getElementById('pgOut');
    PyEditor.enhance(area, { minLines: 8, maxLines: 40 }).catch(() => {});
    runBtn.onclick = () => ejecutar(PyEditor.getValue(area), '', salida, runBtn);
  }

  initEjemplos();
  initPlayground();
})();
