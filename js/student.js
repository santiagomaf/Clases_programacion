/* Lógica de la vista del alumno. */
(function () {
  const $ = id => document.getElementById(id);
  let studentName = localStorage.getItem('clases_student') || '';
  let current = null; // ejercicio abierto

  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  async function showLoggedIn() {
    $('whoami').textContent = studentName ? `👤 ${studentName}` : '';
    $('loginCard').classList.toggle('hidden', !!studentName);
    $('listCard').classList.toggle('hidden', !studentName);
    if (studentName) {
      await (window.seedReady || Promise.resolve());
      renderList();
    }
  }

  async function renderList() {
    const list = await DB.listExercises();
    const ul = $('exerciseList');
    if (!list.length) {
      ul.innerHTML = '<p class="muted">Todavía no hay ejercicios. Pídele a tu profe que cree alguno en el panel de Admin.</p>';
      return;
    }
    // Trae las entregas del alumno para marcar cuáles ya resolvió.
    const subs = await DB.listSubmissions({ student: studentName });
    const bestByEx = {};
    for (const s of subs) {
      if (!bestByEx[s.exercise_id] || (s.passed && !bestByEx[s.exercise_id].passed)) {
        bestByEx[s.exercise_id] = s;
      }
    }
    ul.innerHTML = '';
    for (const ex of list) {
      const done = bestByEx[ex.id];
      let badge = '';
      if (done) badge = done.passed
        ? '<span class="pill ok">Resuelto</span>'
        : '<span class="pill pending">Intentado</span>';
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <div class="title">${esc(ex.title)}</div>
          <div class="meta">${ex.test_type === 'code' ? 'Ejercicio de funciones' : 'Programa con entrada/salida'}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">${badge}<button data-id="${ex.id}">Resolver</button></div>`;
      li.querySelector('button').onclick = () => openExercise(ex.id);
      ul.appendChild(li);
    }
  }

  // Muestra los casos de ejemplo para que el alumno sepa qué debe lograr.
  function renderCases(ex) {
    const box = $('exCases');
    if (ex.test_type === 'code') {
      $('exCases').innerHTML =
        '<p class="muted">Tu código debe cumplir estas comprobaciones:</p>' +
        `<pre class="code-block">${esc(ex.test_code || '')}</pre>`;
      return;
    }
    const cases = ex.io_cases || [];
    if (!cases.length) { box.innerHTML = '<p class="muted">Sin casos de ejemplo.</p>'; return; }
    const nota = (ex.match_mode === 'exact')
      ? 'La salida debe coincidir exactamente.'
      : 'Basta con que tu salida contenga estas líneas.';
    box.innerHTML = `<p class="muted">${nota}</p>` + cases.map((c, i) => `
      <div class="case">
        <div class="case-head"><strong>Caso ${i + 1}</strong></div>
        <div class="grid-io">
          <div><div class="muted">Si se ingresa:</div><pre>${esc(c.stdin) || '(sin entrada)'}</pre></div>
          <div><div class="muted">Debe mostrar:</div><pre>${esc(c.expected)}</pre></div>
        </div>
      </div>`).join('');
  }

  async function openExercise(id) {
    current = await DB.getExercise(id);
    if (!current) return;
    $('listCard').classList.add('hidden');
    $('solveView').classList.remove('hidden');
    $('exTitle').textContent = current.title;
    $('exDesc').textContent = current.description || '';
    renderCases(current);
    // Recupera el último código enviado por el alumno, o el código inicial.
    const subs = await DB.listSubmissions({ student: studentName, exerciseId: id });
    const code = subs.length ? subs[0].code : (current.starter_code || '');
    // Monta el editor de código (con respaldo al textarea si no carga Ace).
    try { await PyEditor.enhance($('codeArea'), { minLines: 14, maxLines: 60 }); } catch (e) {}
    PyEditor.setValue($('codeArea'), code);
    $('results').innerHTML = '';
    $('status').textContent = '';
    // Precarga Pyodide en segundo plano para que "Probar" sea rápido.
    Runner.loadPyodideOnce(msg => { $('status').textContent = msg; })
      .then(() => { if ($('status').textContent.startsWith('Cargando')) $('status').textContent = ''; })
      .catch(() => {});
  }

  function renderResults(result) {
    const box = $('results');
    const head = result.passed
      ? '<p><span class="pill ok">¡Todos los casos pasaron! 🎉</span></p>'
      : '<p><span class="pill bad">Aún hay casos que fallan</span></p>';
    const cases = result.cases.map(c => `
      <div class="case">
        <div class="case-head">
          <strong>${esc(c.name)}</strong>
          <span class="pill ${c.ok ? 'ok' : 'bad'}">${c.ok ? 'OK' : 'Falla'}</span>
        </div>
        ${c.error ? `<pre style="color:var(--bad)">${esc(c.error)}</pre>` : ''}
        ${!c.ok && !c.error ? `
          <div class="grid-io">
            <div><div class="muted">Se esperaba:</div><pre>${esc(c.expected)}</pre></div>
            <div><div class="muted">Tu salida:</div><pre>${esc(c.got) || '<vacío>'}</pre></div>
          </div>` : ''}
      </div>`).join('');
    box.innerHTML = head + cases;
  }

  async function run(save) {
    const code = $('codeArea').value;
    $('status').textContent = '';
    $('runBtn').disabled = true; $('submitBtn').disabled = true;
    try {
      const result = await Runner.runExercise(code, current, msg => { $('status').textContent = msg; });
      $('status').textContent = '';
      renderResults(result);
      if (save) {
        await DB.createSubmission({
          exercise_id: current.id,
          exercise_title: current.title,
          student: studentName,
          code,
          passed: result.passed,
          results: result.cases,
        });
        $('status').textContent = '✓ Entrega guardada. Tu profe la revisará.';
      }
    } catch (e) {
      $('status').textContent = 'Error: ' + e.message;
    } finally {
      $('runBtn').disabled = false; $('submitBtn').disabled = false;
    }
  }

  // Eventos
  $('enterBtn').onclick = () => {
    const n = $('nameInput').value.trim();
    if (!n) return;
    studentName = n;
    localStorage.setItem('clases_student', n);
    showLoggedIn();
  };
  $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('enterBtn').click(); });
  $('backBtn').onclick = () => {
    $('solveView').classList.add('hidden');
    $('listCard').classList.remove('hidden');
    renderList();
  };
  $('runBtn').onclick = () => run(false);
  $('submitBtn').onclick = () => run(true);

  $('nameInput').value = studentName;
  showLoggedIn();
})();
