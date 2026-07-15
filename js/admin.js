/* Lógica del panel de profesor. */
(function () {
  const $ = id => document.getElementById(id);
  // ⚠️ Cámbiala por la que quieras. En la versión con Supabase esto pasa a ser login real.
  const ADMIN_PASSWORD = 'profe123';

  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  /* ---------- Acceso ---------- */
  async function checkLogged() {
    const ok = sessionStorage.getItem('clases_admin') === '1';
    $('adminLogin').classList.toggle('hidden', ok);
    $('adminMain').classList.toggle('hidden', !ok);
    if (ok) {
      await (window.seedReady || Promise.resolve());
      // Monta los editores de código (respaldo al textarea si no carga Ace).
      try {
        await PyEditor.enhance($('fStarter'), { minLines: 5, maxLines: 30 });
        await PyEditor.enhance($('fSolution'), { minLines: 5, maxLines: 30 });
        await PyEditor.enhance($('fTestCode'), { minLines: 6, maxLines: 30 });
      } catch (e) {}
      renderAdminExList();
      refreshSubFilter();
    }
  }
  $('pwBtn').onclick = () => {
    if ($('pwInput').value === ADMIN_PASSWORD) {
      sessionStorage.setItem('clases_admin', '1');
      $('pwErr').textContent = '';
      checkLogged();
    } else {
      $('pwErr').textContent = 'Contraseña incorrecta.';
    }
  };
  $('pwInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('pwBtn').click(); });
  $('logoutBtn').onclick = () => { sessionStorage.removeItem('clases_admin'); checkLogged(); };

  /* ---------- Pestañas ---------- */
  function showTab(which) {
    $('paneEx').classList.toggle('hidden', which !== 'ex');
    $('paneSub').classList.toggle('hidden', which !== 'sub');
    $('tabEx').className = which === 'ex' ? '' : 'secondary';
    $('tabSub').className = which === 'sub' ? '' : 'secondary';
    if (which === 'sub') renderSubs();
  }
  $('tabEx').onclick = () => showTab('ex');
  $('tabSub').onclick = () => showTab('sub');

  /* ---------- Editor de ejercicios ---------- */
  function toggleTypeConfig() {
    const isCode = $('fType').value === 'code';
    $('ioConfig').classList.toggle('hidden', isCode);
    $('codeConfig').classList.toggle('hidden', !isCode);
    // Ace mal mide su tamaño si se creó oculto: recalcula al mostrarlo.
    if (isCode) PyEditor.resize($('fTestCode'));
  }
  $('fType').onchange = toggleTypeConfig;

  function addCaseRow(data = {}) {
    const div = document.createElement('div');
    div.className = 'io-case-editor';
    div.innerHTML = `
      <div class="grid-io">
        <div>
          <label style="margin-top:0">Entradas (una por línea, como las teclearía el alumno)</label>
          <textarea class="code caseIn" style="min-height:70px">${esc(data.stdin || '')}</textarea>
        </div>
        <div>
          <label style="margin-top:0">Salida esperada</label>
          <textarea class="code caseOut" style="min-height:70px">${esc(data.expected || '')}</textarea>
        </div>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="danger removeCase" type="button">Quitar caso</button>
      </div>`;
    div.querySelector('.removeCase').onclick = () => div.remove();
    $('ioCases').appendChild(div);
  }
  $('addCaseBtn').onclick = () => addCaseRow();

  function collectExercise() {
    const type = $('fType').value;
    const ex = {
      title: $('fTitle').value.trim(),
      description: $('fDesc').value,
      starter_code: PyEditor.getValue($('fStarter')),
      solution: PyEditor.getValue($('fSolution')),
      test_type: type,
    };
    if (type === 'io') {
      ex.match_mode = $('fMatch').value;
      ex.io_cases = [...document.querySelectorAll('#ioCases .io-case-editor')].map(row => ({
        stdin: row.querySelector('.caseIn').value,
        expected: row.querySelector('.caseOut').value,
      })).filter(c => c.expected.trim() !== '');
    } else {
      ex.test_code = PyEditor.getValue($('fTestCode'));
    }
    return ex;
  }

  function loadIntoEditor(ex) {
    $('exId').value = ex ? ex.id : '';
    $('editorTitle').textContent = ex ? 'Editar ejercicio' : 'Nuevo ejercicio';
    $('fTitle').value = ex ? ex.title : '';
    $('fDesc').value = ex ? (ex.description || '') : '';
    PyEditor.setValue($('fStarter'), ex ? (ex.starter_code || '') : '');
    PyEditor.setValue($('fSolution'), ex ? (ex.solution || '') : '');
    $('fType').value = ex ? ex.test_type : 'io';
    $('fMatch').value = ex ? (ex.match_mode || 'contains') : 'contains';
    PyEditor.setValue($('fTestCode'), ex ? (ex.test_code || '') : '');
    $('ioCases').innerHTML = '';
    if (ex && ex.io_cases && ex.io_cases.length) ex.io_cases.forEach(addCaseRow);
    else if (!ex) addCaseRow();
    toggleTypeConfig();
    $('editorResults').innerHTML = '';
    $('editorStatus').textContent = '';
  }
  $('newExBtn').onclick = () => loadIntoEditor(null);

  $('saveExBtn').onclick = async () => {
    const ex = collectExercise();
    if (!ex.title) { $('editorStatus').textContent = 'Ponle un título.'; return; }
    const id = $('exId').value;
    if (id) await DB.updateExercise(id, ex);
    else await DB.createExercise(ex);
    $('editorStatus').textContent = '✓ Guardado.';
    loadIntoEditor(null);
    renderAdminExList();
    refreshSubFilter();
  };

  // Corre la SOLUCIÓN de referencia contra los tests para verificar que están bien.
  $('testSolBtn').onclick = async () => {
    const ex = collectExercise();
    if (!ex.solution || !ex.solution.trim()) {
      $('editorStatus').textContent = 'Escribe una solución de referencia para probar.';
      return;
    }
    $('editorStatus').textContent = '';
    $('testSolBtn').disabled = true;
    try {
      const result = await Runner.runExercise(ex.solution, ex, msg => { $('editorStatus').textContent = msg; });
      $('editorStatus').textContent = result.passed
        ? '✅ La solución pasa todos los tests. ¡Listos para publicar!'
        : '⚠️ La solución NO pasa: revisa los tests o la solución.';
      renderCaseResults($('editorResults'), result);
    } catch (e) {
      $('editorStatus').textContent = 'Error: ' + e.message;
    } finally {
      $('testSolBtn').disabled = false;
    }
  };

  function renderCaseResults(box, result) {
    box.innerHTML = result.cases.map(c => `
      <div class="case">
        <div class="case-head">
          <strong>${esc(c.name)}</strong>
          <span class="pill ${c.ok ? 'ok' : 'bad'}">${c.ok ? 'OK' : 'Falla'}</span>
        </div>
        ${c.error ? `<pre style="color:var(--bad)">${esc(c.error)}</pre>` : ''}
        ${!c.ok && !c.error ? `<div class="grid-io">
            <div><div class="muted">Esperado:</div><pre>${esc(c.expected)}</pre></div>
            <div><div class="muted">Obtenido:</div><pre>${esc(c.got) || '<vacío>'}</pre></div>
          </div>` : ''}
      </div>`).join('');
  }

  async function renderAdminExList() {
    const list = await DB.listExercises();
    const ul = $('adminExList');
    if (!list.length) { ul.innerHTML = '<p class="muted">Aún no hay ejercicios.</p>'; return; }
    ul.innerHTML = '';
    for (const ex of list) {
      const subs = await DB.listSubmissions({ exerciseId: ex.id });
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <div class="title">${esc(ex.title)}</div>
          <div class="meta">${ex.test_type === 'code' ? 'Funciones' : (ex.io_cases || []).length + ' caso(s)'} · ${subs.length} entrega(s)</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="secondary editBtn">Editar</button>
          <button class="danger delBtn">Borrar</button>
        </div>`;
      li.querySelector('.editBtn').onclick = () => { loadIntoEditor(ex); window.scrollTo(0, 0); };
      li.querySelector('.delBtn').onclick = async () => {
        if (confirm(`¿Borrar "${ex.title}" y sus entregas?`)) {
          await DB.deleteExercise(ex.id);
          renderAdminExList(); refreshSubFilter();
        }
      };
      ul.appendChild(li);
    }
  }

  /* ---------- Revisión de entregas ---------- */
  async function refreshSubFilter() {
    const list = await DB.listExercises();
    const sel = $('subFilter');
    const cur = sel.value;
    sel.innerHTML = '<option value="">Todos los ejercicios</option>' +
      list.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
    sel.value = cur;
  }
  $('subFilter').onchange = renderSubs;

  async function renderSubs() {
    const exId = $('subFilter').value;
    const subs = await DB.listSubmissions(exId ? { exerciseId: exId } : {});
    const box = $('subList');
    if (!subs.length) { box.innerHTML = '<p class="muted">No hay entregas todavía.</p>'; return; }
    box.innerHTML = '';
    for (const s of subs) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = 'var(--panel-2)';
      const testPill = s.passed
        ? '<span class="pill ok">Pasó los tests</span>'
        : '<span class="pill bad">No pasó los tests</span>';
      const revPill = s.reviewed
        ? `<span class="pill ok">Revisado${s.grade != null ? ' · ' + esc(s.grade) : ''}</span>`
        : '<span class="pill pending">Sin revisar</span>';
      card.innerHTML = `
        <div class="case-head">
          <div><strong>${esc(s.student)}</strong> — <span class="muted">${esc(s.exercise_title || '')}</span></div>
          <div style="display:flex;gap:8px">${testPill} ${revPill}</div>
        </div>
        <div class="muted" style="margin:6px 0">${new Date(s.created_at).toLocaleString()}</div>
        <pre style="background:#0b1220;padding:10px;border-radius:6px;overflow-x:auto"><code>${esc(s.code)}</code></pre>
        <div class="grid-io">
          <div>
            <label style="margin-top:6px">Nota</label>
            <input type="text" class="gradeIn" value="${esc(s.grade ?? '')}" placeholder="Ej: 7.0 / Aprobado">
          </div>
          <div>
            <label style="margin-top:6px">Comentario para el alumno</label>
            <textarea class="fbIn" style="min-height:44px">${esc(s.feedback || '')}</textarea>
          </div>
        </div>
        <div class="btn-row"><button class="saveRev">Guardar revisión</button><span class="status revStatus"></span></div>`;
      card.querySelector('.saveRev').onclick = async () => {
        await DB.updateSubmission(s.id, {
          reviewed: true,
          grade: card.querySelector('.gradeIn').value.trim() || null,
          feedback: card.querySelector('.fbIn').value,
        });
        card.querySelector('.revStatus').textContent = '✓ Guardado';
        renderSubs();
      };
      box.appendChild(card);
    }
  }

  // Init
  loadIntoEditor(null);
  checkLogged();
})();
