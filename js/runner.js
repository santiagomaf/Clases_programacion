/*
 * Motor de ejecución: corre Python en el navegador con Pyodide.
 * Soporta dos tipos de ejercicio:
 *   - "io"   : programas con input()/print(). Se dan casos {stdin, expected}.
 *   - "code" : funciones. Se corre el código del alumno + un bloque de asserts.
 */
(function () {
  let pyodideReady = null;

  // Carga Pyodide una sola vez (bajo demanda).
  function loadPyodideOnce(onStatus) {
    if (pyodideReady) return pyodideReady;
    pyodideReady = (async () => {
      if (onStatus) onStatus('Cargando Python (primera vez, ~5s)…');
      // Carga el script de Pyodide desde el CDN.
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('No se pudo cargar Pyodide (¿hay internet?)'));
        document.head.appendChild(s);
      });
      const py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
      // Módulo de apoyo en Python: ejecuta código del alumno de forma aislada.
      py.runPython(`
import sys, io, builtins

def _run_io(code, stdin_text):
    """Ejecuta 'code' alimentando input() con las líneas de stdin_text.
       Devuelve (salida_impresa, error_o_None). No hace eco del prompt."""
    lineas = stdin_text.split("\\n") if stdin_text else []
    idx = {"i": 0}
    def fake_input(prompt=""):
        i = idx["i"]
        if i < len(lineas):
            idx["i"] = i + 1
            return lineas[i]
        raise EOFError("El programa pidió más entradas de las que se le dieron")
    buf = io.StringIO()
    ns = {"__name__": "__main__"}
    old_out, old_in = sys.stdout, builtins.input
    sys.stdout = buf
    builtins.input = fake_input
    err = None
    try:
        exec(code, ns)
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
    finally:
        sys.stdout = old_out
        builtins.input = old_in
    return buf.getvalue(), err

def _run_code(code, test_code):
    """Ejecuta 'code' y luego 'test_code' (asserts) en el mismo espacio.
       Devuelve (ok, mensaje, salida_impresa)."""
    ns = {"__name__": "__main__"}
    buf = io.StringIO()
    old_out = sys.stdout
    sys.stdout = buf
    try:
        exec(code, ns)
        exec(test_code, ns)
        ok, msg = True, ""
    except AssertionError as e:
        ok, msg = False, f"Falló una comprobación: {e}" if str(e) else "Falló una comprobación (assert)"
    except Exception as e:
        ok, msg = False, f"{type(e).__name__}: {e}"
    finally:
        sys.stdout = old_out
    return [ok, msg, buf.getvalue()]
`);
      return py;
    })();
    return pyodideReady;
  }

  // Normaliza texto para comparar salidas de forma tolerante.
  function normLines(text) {
    return String(text)
      .replace(/\r/g, '')
      .split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(l => l.length > 0);
  }

  function compareIO(actual, expected, mode) {
    const a = normLines(actual);
    const e = normLines(expected);
    if (mode === 'exact') {
      return a.join('\n').toLowerCase() === e.join('\n').toLowerCase();
    }
    // "contains": cada línea esperada debe aparecer, en orden, dentro de la salida.
    let j = 0;
    for (const line of e) {
      const needle = line.toLowerCase();
      let found = false;
      while (j < a.length) {
        if (a[j].toLowerCase().includes(needle)) { found = true; j++; break; }
        j++;
      }
      if (!found) return false;
    }
    return true;
  }

  /*
   * Ejecuta un ejercicio con el código del alumno.
   * Devuelve: { passed, cases: [{name, ok, expected, got, error}] }
   */
  async function runExercise(code, exercise, onStatus) {
    const py = await loadPyodideOnce(onStatus);
    if (onStatus) onStatus('Ejecutando…');

    if (exercise.test_type === 'code') {
      const fn = py.globals.get('_run_code');
      const res = fn(code, exercise.test_code || '');
      const [ok, msg, out] = res.toJs();
      res.destroy(); fn.destroy();
      return {
        passed: ok,
        cases: [{ name: 'Comprobaciones', ok, expected: '(asserts del profesor)', got: out, error: ok ? '' : msg }],
      };
    }

    // test_type === 'io'
    const cases = exercise.io_cases || [];
    const fn = py.globals.get('_run_io');
    const results = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const res = fn(code, c.stdin || '');
      const [out, err] = res.toJs();
      res.destroy();
      const ok = !err && compareIO(out, c.expected || '', exercise.match_mode || 'contains');
      results.push({
        name: c.name || `Caso ${i + 1}`,
        ok,
        expected: c.expected || '',
        got: out,
        error: err || '',
      });
    }
    fn.destroy();
    return { passed: results.length > 0 && results.every(r => r.ok), cases: results };
  }

  /*
   * Ejecuta código suelto (para la guía de estudio / playground).
   * Devuelve { out, err }. stdin opcional para ejemplos con input().
   */
  async function runRaw(code, stdin, onStatus) {
    const py = await loadPyodideOnce(onStatus);
    const fn = py.globals.get('_run_io');
    const res = fn(code, stdin || '');
    const [out, err] = res.toJs();
    res.destroy(); fn.destroy();
    return { out, err };
  }

  window.Runner = { runExercise, runRaw, loadPyodideOnce };
})();
