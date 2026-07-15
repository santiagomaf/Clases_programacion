/*
 * Implementación de la capa de datos con Supabase (base de datos compartida).
 * Misma interfaz que LocalDB (js/db.js), así que el resto de la app no cambia.
 * Si no hay configuración o no cargó la librería, se queda con LocalDB.
 *
 * Seguridad:
 *  - Alumnos (anónimos): leen ejercicios SIN la columna "solution", y pueden
 *    insertar/leer entregas. Todo controlado por RLS + grants en Supabase.
 *  - Profesor (autenticado con email/contraseña): lee todo y edita.
 */
(function () {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || !window.supabase) {
    console.warn('Supabase no configurado o librería no cargada: usando almacenamiento local.');
    return; // deja window.DB = LocalDB
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  // Columnas visibles para alumnos (sin "solution"). El profe autenticado ve todo.
  const PUBLIC_COLS = 'id,created_at,title,description,starter_code,test_type,match_mode,io_cases,test_code';
  let hasSession = false;
  const exCols = () => (hasSession ? '*' : PUBLIC_COLS);

  function ok(res) {
    if (res.error) throw new Error(res.error.message || 'Error de Supabase');
    return res.data;
  }

  const SupabaseDB = {
    _isSupabase: true,
    _sb: sb,

    /* ----- Autenticación del profesor ----- */
    async signIn(email, password) {
      const data = ok(await sb.auth.signInWithPassword({ email, password }));
      hasSession = true;
      return data;
    },
    async signOut() {
      await sb.auth.signOut();
      hasSession = false;
    },
    async currentUser() {
      const { data } = await sb.auth.getSession();
      hasSession = !!(data && data.session);
      return hasSession ? data.session.user : null;
    },

    /* ----- Ejercicios ----- */
    async listExercises() {
      return ok(await sb.from('exercises').select(exCols()).order('created_at', { ascending: false }));
    },
    async getExercise(id) {
      return ok(await sb.from('exercises').select(exCols()).eq('id', id).single());
    },
    async createExercise(datos) {
      return ok(await sb.from('exercises').insert(datos).select().single());
    },
    async updateExercise(id, datos) {
      return ok(await sb.from('exercises').update(datos).eq('id', id).select().single());
    },
    async deleteExercise(id) {
      ok(await sb.from('exercises').delete().eq('id', id));
    },

    /* ----- Entregas ----- */
    async createSubmission(datos) {
      return ok(await sb.from('submissions').insert(datos).select().single());
    },
    async listSubmissions(filtro = {}) {
      let q = sb.from('submissions').select('*').order('created_at', { ascending: false });
      if (filtro.exerciseId) q = q.eq('exercise_id', filtro.exerciseId);
      if (filtro.student) q = q.eq('student', filtro.student);
      return ok(await q);
    },
    async updateSubmission(id, datos) {
      return ok(await sb.from('submissions').update(datos).eq('id', id).select().single());
    },
  };

  // Reemplaza LocalDB por la base compartida.
  window.DB = SupabaseDB;
})();
