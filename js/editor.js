/*
 * Editor de código real (Ace) que reemplaza a un <textarea>.
 * Da: Tab que indenta (espacios), resaltado de sintaxis Python,
 * y autocompletado con las palabras/variables ya escritas en el documento.
 * Mantiene sincronizado el <textarea> original, así que leer textarea.value
 * sigue funcionando en el resto del código.
 */
(function () {
  const ACE_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.6/';
  let readyPromise = null;
  const map = new Map(); // textarea -> ace editor

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar el editor de código (¿hay internet?)'));
      document.head.appendChild(s);
    });
  }

  function loadAce() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      await loadScript(ACE_BASE + 'ace.js');
      await loadScript(ACE_BASE + 'ext-language_tools.js');
      window.ace.config.set('basePath', ACE_BASE); // para que cargue mode/theme solos
      return window.ace;
    })();
    return readyPromise;
  }

  // Convierte un <textarea> en editor Ace. Idempotente.
  async function enhance(textarea, opts = {}) {
    if (map.has(textarea)) return map.get(textarea);
    const ace = await loadAce();

    const div = document.createElement('div');
    div.className = 'ace_editor_wrap';
    textarea.style.display = 'none';
    textarea.parentNode.insertBefore(div, textarea.nextSibling);

    const editor = ace.edit(div);
    editor.setTheme('ace/theme/one_dark');
    editor.session.setMode('ace/mode/python');
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,   // sugiere mientras escribes
      enableSnippets: false,            // sin plantillas raras
      showPrintMargin: false,
      fontSize: '13.5px',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
      tabSize: 4,
      useSoftTabs: true,                // Tab inserta espacios, no cambia de foco
      minLines: opts.minLines || 8,
      maxLines: opts.maxLines || 40,
      highlightActiveLine: true,
    });
    editor.setValue(textarea.value || '', -1);
    editor.session.on('change', () => { textarea.value = editor.getValue(); });
    map.set(textarea, editor);
    return editor;
  }

  function setValue(textarea, val) {
    const ed = map.get(textarea);
    textarea.value = val || '';
    if (ed) ed.setValue(val || '', -1); // -1 = cursor al inicio, sin seleccionar todo
  }

  function getValue(textarea) {
    const ed = map.get(textarea);
    return ed ? ed.getValue() : textarea.value;
  }

  function resize(textarea) {
    const ed = map.get(textarea);
    if (ed) ed.resize();
  }

  window.PyEditor = { enhance, setValue, getValue, resize, loadAce };
})();
