/* Lógica del panel de profesor. */
(function () {
  const $ = id => document.getElementById(id);
  // Solo se usa si NO hay Supabase configurado (modo local de respaldo).
  const ADMIN_PASSWORD = 'profe123';
  const useAuth = !!(window.DB && window.DB._isSupabase);

  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  /* ---------- Acceso ---------- */
  async function checkLogged() {
    let ok;
    if (useAuth) {
      try { ok = !!(await DB.currentUser()); } catch (e) { ok = false; }
    } else {
      ok = sessionStorage.getItem('clases_admin') === '1';
    }
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
  $('pwBtn').onclick = async () => {
    $('pwErr').textContent = '';
    if (useAuth) {
      $('pwBtn').disabled = true;
      try {
        await DB.signIn($('emailInput').value.trim(), $('pwInput').value);
        checkLogged();
      } catch (e) {
        $('pwErr').textContent = 'No se pudo entrar: ' + (e.message || e);
      } finally {
        $('pwBtn').disabled = false;
      }
    } else {
      if ($('pwInput').value === ADMIN_PASSWORD) {
        sessionStorage.setItem('clases_admin', '1');
        checkLogged();
      } else {
        $('pwErr').textContent = 'Contraseña incorrecta.';
      }
    }
  };
  $('pwInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('pwBtn').click(); });
  $('logoutBtn').onclick = async () => {
    if (useAuth) { try { await DB.signOut(); } catch (e) {} }
    else sessionStorage.removeItem('clases_admin');
    checkLogged();
  };

  /* ---------- Pestañas ---------- */
  function showTab(which) {
    $('paneEx').classList.toggle('hidden', which !== 'ex');
    $('paneSub').classList.toggle('hidden', which !== 'sub');
    $('paneStudents').classList.toggle('hidden', which !== 'students');
    $('tabEx').className = which === 'ex' ? '' : 'secondary';
    $('tabSub').className = which === 'sub' ? '' : 'secondary';
    $('tabStudents').className = which === 'students' ? '' : 'secondary';
    if (which === 'sub') renderSubs();
    if (which === 'students') renderStudents();
  }
  $('tabEx').onclick = () => showTab('ex');
  $('tabSub').onclick = () => showTab('sub');
  $('tabStudents').onclick = () => showTab('students');

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
    if (!list.length) {
      ul.innerHTML = '<p class="muted">Aún no hay ejercicios.</p>';
      // Botón para cargar los 6 ejercicios de ejemplo a la base compartida.
      if (window.EJERCICIOS && window.EJERCICIOS.length) {
        const b = document.createElement('button');
        b.textContent = '⬇️ Cargar 6 ejercicios de ejemplo';
        b.onclick = async () => {
          b.disabled = true; b.textContent = 'Cargando…';
          try {
            for (const ex of window.EJERCICIOS) await DB.createExercise(ex);
          } catch (e) {
            alert('Error al cargar: ' + (e.message || e));
          }
          renderAdminExList(); refreshSubFilter();
        };
        ul.appendChild(b);
      }
      return;
    }
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

  let subStudentFilter = ''; // filtro opcional por alumno (desde la pestaña Alumnos)

  function updateSubStudentTag() {
    const tag = $('subStudentTag');
    if (!subStudentFilter) { tag.innerHTML = ''; return; }
    tag.innerHTML = `<span class="pill pending">Alumno: ${esc(subStudentFilter)}</span>
      <button class="secondary" id="clearStudent" style="padding:3px 10px;margin-left:8px">Quitar filtro</button>`;
    $('clearStudent').onclick = () => { subStudentFilter = ''; renderSubs(); };
  }

  async function renderSubs() {
    const exId = $('subFilter').value;
    const filtro = {};
    if (exId) filtro.exerciseId = exId;
    if (subStudentFilter) filtro.student = subStudentFilter;
    const subs = await DB.listSubmissions(filtro);
    updateSubStudentTag();
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

  /* ---------- Lista de alumnos ---------- */
  async function renderStudents() {
    const subs = await DB.listSubmissions({});
    const totalEx = (await DB.listExercises()).length;
    const box = $('studentsList');
    if (!subs.length) { box.innerHTML = '<p class="muted">Aún no hay entregas de ningún alumno.</p>'; return; }

    // Agrupa por alumno.
    const porAlumno = {};
    for (const s of subs) {
      const a = porAlumno[s.student] || (porAlumno[s.student] = {
        name: s.student, entregas: 0, resueltos: new Set(), intentados: new Set(), ultimo: s.created_at,
      });
      a.entregas++;
      a.intentados.add(s.exercise_id);
      if (s.passed) a.resueltos.add(s.exercise_id);
      if (s.created_at > a.ultimo) a.ultimo = s.created_at;
    }
    const alumnos = Object.values(porAlumno).sort((x, y) => x.name.localeCompare(y.name));

    box.innerHTML = `<table class="methods">
      <tr><th>Alumno</th><th>Resueltos</th><th>Intentados</th><th>Entregas</th><th>Última actividad</th><th></th></tr>
      ${alumnos.map((a, i) => `
        <tr>
          <td><strong>${esc(a.name)}</strong></td>
          <td>${a.resueltos.size} / ${totalEx}</td>
          <td>${a.intentados.size}</td>
          <td>${a.entregas}</td>
          <td class="muted">${new Date(a.ultimo).toLocaleString()}</td>
          <td><button class="secondary verSub" data-i="${i}" style="padding:4px 10px">Ver entregas</button></td>
        </tr>`).join('')}
    </table>
    <p class="muted" style="margin-top:10px">Total de alumnos: ${alumnos.length}</p>`;

    box.querySelectorAll('.verSub').forEach(btn => {
      btn.onclick = () => {
        subStudentFilter = alumnos[+btn.dataset.i].name;
        $('subFilter').value = '';
        showTab('sub');
      };
    });
  }

  // Init
  loadIntoEditor(null);
  checkLogged();
})();
