/* Ejercicios iniciales. Versionado: al subir SEED_VERSION, el navegador
   borra los ejercicios y entregas viejos y carga este conjunto nuevo.
   La "solution" solo la usa el admin; el alumno nunca la ve. */
const SEED_VERSION = 2;

const EJERCICIOS = [
  // 1 ── io ── variables, for, if/else, listas, append, funciones (sum/len)
  {
    title: 'Notas del curso',
    test_type: 'io',
    match_mode: 'contains',
    description:
`Pide la cantidad de alumnos y luego la nota de cada uno.
- Por cada nota imprime "Aprobado" si es >= 4, o "Reprobado" si es < 4.
- Al final muestra:
    Aprobados: X | Reprobados: Y
    Promedio: Z   (redondeado a 1 decimal)

Ejemplo:
  Cantidad de alumnos: 3
  Nota: 5
  Aprobado
  Nota: 3
  Reprobado
  Nota: 4
  Aprobado
  Aprobados: 2 | Reprobados: 1
  Promedio: 4.0`,
    starter_code: 'n = int(input("Cantidad de alumnos: "))\n# tu código aquí\n',
    solution:
`n = int(input("Cantidad de alumnos: "))
notas = []
aprobados = 0
for i in range(n):
    nota = float(input("Nota: "))
    notas.append(nota)
    if nota >= 4:
        print("Aprobado")
        aprobados += 1
    else:
        print("Reprobado")
promedio = sum(notas) / len(notas)
print(f"Aprobados: {aprobados} | Reprobados: {n - aprobados}")
print(f"Promedio: {round(promedio, 1)}")`,
    io_cases: [
      { stdin: '3\n5\n3\n4', expected: 'Aprobado\nReprobado\nAprobado\nAprobados: 2 | Reprobados: 1\nPromedio: 4.0' },
      { stdin: '2\n7\n6', expected: 'Aprobado\nAprobado\nAprobados: 2 | Reprobados: 0\nPromedio: 6.5' },
    ],
  },

  // 2 ── io ── variables, while, break, if/elif/else
  {
    title: 'Inventario de la tienda',
    test_type: 'io',
    match_mode: 'contains',
    description:
`Se ingresan precios de productos hasta que el usuario escriba 0 para terminar.
Clasifica cada producto:
- precio < 500          -> barato
- 500 <= precio <= 2000 -> normal
- precio > 2000         -> caro

Al final muestra:
  Total: $<suma de todos los precios>
  Baratos: A | Normales: B | Caros: C

Ejemplo:
  Precio (0 para terminar): 350
  Precio (0 para terminar): 1200
  Precio (0 para terminar): 3500
  Precio (0 para terminar): 0
  Total: $5050
  Baratos: 1 | Normales: 1 | Caros: 1`,
    starter_code: '# usa un while que termine cuando el precio sea 0\n',
    solution:
`barato = normal = caro = 0
total = 0
while True:
    p = int(input("Precio (0 para terminar): "))
    if p == 0:
        break
    total += p
    if p < 500:
        barato += 1
    elif p <= 2000:
        normal += 1
    else:
        caro += 1
print(f"Total: \${total}")
print(f"Baratos: {barato} | Normales: {normal} | Caros: {caro}")`,
    io_cases: [
      { stdin: '350\n1200\n3500\n0', expected: 'Total: $5050\nBaratos: 1 | Normales: 1 | Caros: 1' },
      { stdin: '0', expected: 'Total: $0\nBaratos: 0 | Normales: 0 | Caros: 0' },
      { stdin: '200\n300\n0', expected: 'Total: $500\nBaratos: 2 | Normales: 0 | Caros: 0' },
    ],
  },

  // 3 ── code ── funciones, if/elif/else, return
  {
    title: 'Función clasificar_edad(edad)',
    test_type: 'code',
    description:
`Crea una función clasificar_edad(edad) que reciba un número y devuelva:
- "niño"        si la edad es menor a 13
- "adolescente" si tiene entre 13 y 17 (incluidos)
- "adulto"      si tiene 18 o más

Ejemplo:
  clasificar_edad(10)  ->  "niño"
  clasificar_edad(15)  ->  "adolescente"
  clasificar_edad(30)  ->  "adulto"`,
    starter_code: 'def clasificar_edad(edad):\n    # usa if / elif / else y return\n    pass\n',
    solution:
`def clasificar_edad(edad):
    if edad < 13:
        return "niño"
    elif edad < 18:
        return "adolescente"
    else:
        return "adulto"`,
    test_code:
`assert clasificar_edad(5) == "niño"
assert clasificar_edad(12) == "niño"
assert clasificar_edad(13) == "adolescente"
assert clasificar_edad(17) == "adolescente"
assert clasificar_edad(18) == "adulto"
assert clasificar_edad(40) == "adulto"`,
  },

  // 4 ── code ── funciones, for, listas, diccionarios
  {
    title: 'Función crear_agenda(nombres, numeros)',
    test_type: 'code',
    description:
`Crea una función crear_agenda(nombres, numeros) que reciba dos listas
del mismo largo (una de nombres y otra de números de teléfono) y devuelva
un DICCIONARIO que asocie cada nombre con su número.

Ejemplo:
  crear_agenda(["Ana", "Luis"], [111, 222])
  ->  {"Ana": 111, "Luis": 222}

Pista: usa un for con range(len(nombres)) para recorrer ambas listas por posición.`,
    starter_code: 'def crear_agenda(nombres, numeros):\n    agenda = {}\n    # recorre las listas y llena el diccionario\n    return agenda\n',
    solution:
`def crear_agenda(nombres, numeros):
    agenda = {}
    for i in range(len(nombres)):
        agenda[nombres[i]] = numeros[i]
    return agenda`,
    test_code:
`a = crear_agenda(["Ana", "Luis"], [111, 222])
assert a == {"Ana": 111, "Luis": 222}
assert a["Ana"] == 111
assert crear_agenda([], []) == {}
assert crear_agenda(["Sol"], [999])["Sol"] == 999`,
  },

  // 5 ── code ── funciones, for, listas, append, pop, if
  {
    title: 'Función procesar_carrito(agregar, quitar)',
    test_type: 'code',
    description:
`Simula un carrito de compras. Crea una función procesar_carrito(agregar, quitar):
- "agregar" es una lista de productos que se deben AÑADIR al carrito (con append).
- "quitar" es un número: cuántos productos hay que SACAR del final (con pop).
- Si el carrito queda vacío no debe fallar (no saques de un carrito vacío).
- Devuelve la lista final del carrito.

Ejemplo:
  procesar_carrito(["pan", "leche", "huevos"], 1)  ->  ["pan", "leche"]
  procesar_carrito(["agua"], 3)                    ->  []`,
    starter_code: 'def procesar_carrito(agregar, quitar):\n    carrito = []\n    # añade con append y saca con pop\n    return carrito\n',
    solution:
`def procesar_carrito(agregar, quitar):
    carrito = []
    for item in agregar:
        carrito.append(item)
    for _ in range(quitar):
        if carrito:
            carrito.pop()
    return carrito`,
    test_code:
`assert procesar_carrito(["pan", "leche", "huevos"], 1) == ["pan", "leche"]
assert procesar_carrito(["agua"], 3) == []
assert procesar_carrito(["a", "b"], 0) == ["a", "b"]
assert procesar_carrito([], 2) == []`,
  },

  // 6 ── io ── variables, for, if/elif/else, listas, append, diccionarios, min/max/sum
  {
    title: 'Torneo de karting',
    test_type: 'io',
    match_mode: 'contains',
    description:
`Pide la cantidad de pilotos y el tiempo de cada uno. Clasifica cada tiempo:
- tiempo < 75          -> "Directo"
- 75 <= tiempo < 80    -> "Repechaje"
- tiempo >= 80         -> "Eliminado"

Al final muestra:
  Directo: A | Repechaje: B | Eliminado: C
  Min: <menor> | Max: <mayor> | Promedio: <prom a 1 decimal>

Ejemplo:
  Cantidad de pilotos: 4
  Tiempo: 70
  Directo
  Tiempo: 77
  Repechaje
  Tiempo: 82
  Eliminado
  Tiempo: 67
  Directo
  Directo: 2 | Repechaje: 1 | Eliminado: 1
  Min: 67 | Max: 82 | Promedio: 74.0`,
    starter_code: 'n = int(input("Cantidad de pilotos: "))\n# usa una lista, un diccionario para contar, y min/max/sum al final\n',
    solution:
`n = int(input("Cantidad de pilotos: "))
conteo = {"directo": 0, "repechaje": 0, "eliminado": 0}
tiempos = []
for i in range(n):
    t = int(input("Tiempo: "))
    tiempos.append(t)
    if t < 75:
        print("Directo")
        conteo["directo"] += 1
    elif t < 80:
        print("Repechaje")
        conteo["repechaje"] += 1
    else:
        print("Eliminado")
        conteo["eliminado"] += 1
print(f"Directo: {conteo['directo']} | Repechaje: {conteo['repechaje']} | Eliminado: {conteo['eliminado']}")
print(f"Min: {min(tiempos)} | Max: {max(tiempos)} | Promedio: {round(sum(tiempos) / n, 1)}")`,
    io_cases: [
      { stdin: '4\n70\n77\n82\n67', expected: 'Directo\nRepechaje\nEliminado\nDirecto\nDirecto: 2 | Repechaje: 1 | Eliminado: 1\nMin: 67 | Max: 82 | Promedio: 74.0' },
      { stdin: '2\n90\n95', expected: 'Eliminado\nEliminado\nDirecto: 0 | Repechaje: 0 | Eliminado: 2\nMin: 90 | Max: 95 | Promedio: 92.5' },
    ],
  },
];

/* Carga/actualiza el seed. Expone window.seedReady (promesa).
   - Si cambió la versión: borra lo viejo y carga el conjunto nuevo.
   - Si no hay NINGÚN ejercicio: los crea igual (aunque la versión coincida). */
window.seedReady = (async function () {
  const stored = localStorage.getItem('clases_seed_version');
  const existentes = await DB.listExercises();
  const cambioVersion = stored !== String(SEED_VERSION);

  if (!cambioVersion && existentes.length > 0) return; // todo en orden, no tocar

  if (cambioVersion) {
    // Cambió la versión: borra lo viejo para reemplazarlo por el conjunto nuevo.
    localStorage.removeItem('clases_exercises');
    localStorage.removeItem('clases_submissions');
  }
  for (const ex of EJERCICIOS) await DB.createExercise(ex);
  localStorage.setItem('clases_seed_version', String(SEED_VERSION));
  console.log(`Ejercicios cargados (versión ${SEED_VERSION}).`);
})();
