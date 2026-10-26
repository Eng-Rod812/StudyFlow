"use strict";

// 1. CLASE TAREA: Sirve para representar cada pendiente

class Tarea {
  constructor(nombre, completa = false) {
    this.nombre = nombre;
    this.completa = completa;
  }

  cambiarEstado() {
    this.completa = !this.completa;
  }

  editar(nuevoNombre) {
    this.nombre = nuevoNombre;
  }

  eliminar() {
    // La tarea se elimina de la lista a través de GestorDeTareas.
    // Este método identifica la operación solicitada.
    return true;
  }
}


// 2. GESTOR: su función es administrar y guardar las tareas

class GestorDeTareas {
  constructor() {
    this.tareas = [];

    try {
      const datosGuardados = localStorage.getItem("studyflow-tareas");
      const datos = datosGuardados ? JSON.parse(datosGuardados) : [];

      if (!Array.isArray(datos)) {
        throw new Error("Los datos guardados no son una lista.");
      }

      this.tareas = datos
        .filter((dato) => dato && typeof dato.nombre === "string")
        .map((dato) => new Tarea(dato.nombre, dato.completa === true));
    } catch (error) {
      console.warn("No se pudieron recuperar las tareas:", error);
      // Si falla la lectura, empezamos con una lista vacía.
      // No sobrescribimos automáticamente los datos anteriores.
    }
  }

  agregarTarea(nombre) {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return Promise.resolve();

    this.tareas.push(new Tarea(nombreLimpio));
    return this.guardarTareas();
  }

  cambiarEstado(indice) {
    const tarea = this.tareas[indice];
    if (!tarea) return Promise.resolve();

    tarea.cambiarEstado();
    return this.guardarTareas();
  }

  editarTarea(indice, nuevoNombre) {
    const tarea = this.tareas[indice];
    const nombreLimpio = nuevoNombre.trim();
    if (!tarea || !nombreLimpio) return Promise.resolve();

    tarea.editar(nombreLimpio);
    return this.guardarTareas();
  }

  eliminarTarea(indice) {
    const tarea = this.tareas[indice];
    if (!tarea) return Promise.resolve();

    if (tarea.eliminar()) {
      this.tareas.splice(indice, 1);
    }
    return this.guardarTareas();
  }

  // LocalStorage es síncrono; usamos Promise.
  guardarTareas() {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem("studyflow-tareas", JSON.stringify(this.tareas));
        resolve("Tareas guardadas correctamente");
      } catch (error) {
        reject(error);
      }
    });
  }
}

// 3. ELEMENTOS DEL HTML Y MENSAJES

const gestor = new GestorDeTareas();
const formulario = document.getElementById("formulario-tarea");
const entrada = document.getElementById("nueva-tarea");
const lista = document.getElementById("lista-tareas");
const mensaje = document.getElementById("mensaje");

// Cada acción maneja los errores de persistencia.
const mostrarError = (error) => {
  console.error("No se pudieron guardar los cambios:", error);
  mensaje.textContent = "Los cambios se ven en pantalla, pero no pudieron guardarse.";
};

const finalizarCambio = (promesa) => {
  mensaje.textContent = "";
  mostrarTareas();
  promesa.catch(mostrarError);
};

// 4. DOM: DIBUJAR LAS TAREAS

const mostrarTareas = () => {
  lista.replaceChildren();

  // let es útil porque el contador cambia en cada vuelta del forEach.
  let completadas = 0;

  gestor.tareas.forEach((tarea, indice) => {
    if (tarea.completa) completadas++;

    const elemento = document.createElement("li");

    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.checked = tarea.completa;
    casilla.setAttribute(
      "aria-label",
      `${tarea.completa ? "Marcar como pendiente" : "Marcar como completada"}: ${tarea.nombre}`
    );
    casilla.addEventListener("change", () => {
      finalizarCambio(gestor.cambiarEstado(indice));
    });

    const texto = document.createElement("span");
    texto.textContent = tarea.nombre;
    if (tarea.completa) texto.style.textDecoration = "line-through";

    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.textContent = "Editar";
    botonEditar.setAttribute("aria-label", `Editar: ${tarea.nombre}`);
    botonEditar.addEventListener("click", () => {
      const nuevoNombre = prompt("Escribe el nuevo nombre de la tarea:", tarea.nombre);
      if (nuevoNombre === null) return;
      if (!nuevoNombre.trim()) {
        mensaje.textContent = "El nombre de una tarea no puede estar vacío.";
        return;
      }
      finalizarCambio(gestor.editarTarea(indice, nuevoNombre));
    });

    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.setAttribute("aria-label", `Eliminar: ${tarea.nombre}`);
    botonEliminar.addEventListener("click", () => {
      if (confirm(`¿Deseas eliminar "${tarea.nombre}"?`)) {
        finalizarCambio(gestor.eliminarTarea(indice));
      }
    });

    elemento.append(casilla, texto, botonEditar, botonEliminar);
    lista.appendChild(elemento);
  });

  // Texto informativo para el usuario; se actualiza sin recargar la página.
  const resumen = document.createElement("li");
  resumen.textContent = `Completadas: ${completadas} de ${gestor.tareas.length}`;
  resumen.style.listStyle = "none";
  resumen.style.background = "transparent";
  resumen.style.border = "none";
  resumen.style.paddingLeft = "0";
  lista.appendChild(resumen);
};

// 5. EVENTO DEL FORMULARIO

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nombre = entrada.value.trim();

  if (!nombre) {
    mensaje.textContent = "Escribe una tarea antes de agregarla.";
    return;
  }

  finalizarCambio(gestor.agregarTarea(nombre));
  entrada.value = "";
});

// 6. CARGA INICIAL

mostrarTareas();
