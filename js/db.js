/*
 * Capa de datos AISLADA.
 * Ahora mismo guarda todo en el navegador (localStorage).
 * Para pasar a base de datos compartida (Supabase) solo hay que
 * reemplazar la implementación de abajo por SupabaseDB; el resto
 * de la app (student.js / admin.js) no cambia porque usan la misma interfaz.
 *
 * Interfaz:
 *   DB.listExercises()                -> [ejercicio, ...]
 *   DB.getExercise(id)                -> ejercicio | null
 *   DB.createExercise(datos)          -> ejercicio
 *   DB.updateExercise(id, datos)      -> ejercicio
 *   DB.deleteExercise(id)             -> void
 *   DB.createSubmission(datos)        -> entrega
 *   DB.listSubmissions(filtro?)       -> [entrega, ...]   filtro: {exerciseId, student}
 *   DB.updateSubmission(id, datos)    -> entrega          (para la revisión del profe)
 */
(function () {
  const KEY_EX = 'clases_exercises';
  const KEY_SUB = 'clases_submissions';

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const LocalDB = {
    async listExercises() {
      return read(KEY_EX).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async getExercise(id) {
      return read(KEY_EX).find(e => e.id === id) || null;
    },
    async createExercise(datos) {
      const list = read(KEY_EX);
      const ex = { id: uid(), created_at: new Date().toISOString(), ...datos };
      list.push(ex);
      write(KEY_EX, list);
      return ex;
    },
    async updateExercise(id, datos) {
      const list = read(KEY_EX);
      const i = list.findIndex(e => e.id === id);
      if (i === -1) throw new Error('Ejercicio no encontrado');
      list[i] = { ...list[i], ...datos };
      write(KEY_EX, list);
      return list[i];
    },
    async deleteExercise(id) {
      write(KEY_EX, read(KEY_EX).filter(e => e.id !== id));
      // borra también las entregas de ese ejercicio
      write(KEY_SUB, read(KEY_SUB).filter(s => s.exercise_id !== id));
    },
    async createSubmission(datos) {
      const list = read(KEY_SUB);
      const sub = {
        id: uid(),
        created_at: new Date().toISOString(),
        reviewed: false,
        grade: null,
        feedback: '',
        ...datos,
      };
      list.push(sub);
      write(KEY_SUB, list);
      return sub;
    },
    async listSubmissions(filtro = {}) {
      let list = read(KEY_SUB);
      if (filtro.exerciseId) list = list.filter(s => s.exercise_id === filtro.exerciseId);
      if (filtro.student) list = list.filter(s => s.student === filtro.student);
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async updateSubmission(id, datos) {
      const list = read(KEY_SUB);
      const i = list.findIndex(s => s.id === id);
      if (i === -1) throw new Error('Entrega no encontrada');
      list[i] = { ...list[i], ...datos };
      write(KEY_SUB, list);
      return list[i];
    },
  };

  // Punto único de intercambio: hoy LocalDB, mañana SupabaseDB.
  window.DB = LocalDB;
})();
