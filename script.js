// --- 1. CONFIGURACIÓN ---
const API_URL = "https://script.google.com/macros/s/AKfycbzuw33LrXs7Zn7uXQt-ufHrcTIufBGwPphrQEpBoYFCoOngjI8zLaxP0TXLqDecChXolw/exec";

let cropperInstancia = null;
let idFotoActual = '';
let elementoFotoActual = null;

// --- REFERENCIAS DE PANTALLAS Y BOTONES ---
const pantallaTienda = document.getElementById('pantalla-tienda');
const pantallaEditor = document.getElementById('pantalla-editor');
const pantallaExito  = document.getElementById('pantalla-exito');

const btnComprar  = document.getElementById('btn-comprar');
const btnPublicar = document.getElementById('btn-publicar');
const btnCopiar   = document.getElementById('btn-copiar');
const inputLink   = document.getElementById('link-generado');

// --- 2. FUNCIONES DE INTERFAZ (UI) ---
function mostrarPantalla(pantallaMostrar) {
    pantallaTienda.classList.replace('visible', 'oculto');
    pantallaEditor.classList.replace('visible', 'oculto');
    pantallaExito.classList.replace('visible', 'oculto');
    
    setTimeout(() => {
        pantallaMostrar.classList.replace('oculto', 'visible');
    }, 50); 
}

function mostrarLoader(mensaje) {
    document.getElementById('loader-texto').innerText = mensaje;
    const loader = document.getElementById('loader-global');
    loader.classList.remove('hidden');
    loader.classList.add('flex');
    setTimeout(() => { loader.style.opacity = '1'; }, 10);
}

function ocultarLoader() {
    const loader = document.getElementById('loader-global');
    loader.style.opacity = '0';
    setTimeout(() => { 
        loader.classList.remove('flex');
        loader.classList.add('hidden'); 
    }, 300);
}

function mostrarToast(mensaje, esError = false) {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const estiloColor = esError ? 'border-l-4 border-red-500 text-gray-800' : 'border-l-4 border-emerald-500 text-gray-800';
    const icono = esError ? '❌' : '✨';

    toast.className = `flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white/95 backdrop-blur-sm transform transition-all duration-500 translate-x-[120%] pointer-events-auto ${estiloColor}`;
    toast.innerHTML = `<span class="text-xl drop-shadow-sm">${icono}</span><p class="font-medium tracking-wide">${mensaje}</p>`;
    
    contenedor.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-[120%]');
            toast.classList.add('translate-x-0');
        });
    });

    setTimeout(() => {
        toast.classList.remove('translate-x-0');
        toast.classList.add('translate-x-[120%]', 'opacity-0');
        setTimeout(() => { toast.remove(); }, 500);
    }, 3000); 
}

// --- 3. BASE DE DATOS Y LÓGICA DEL CANVAS ---
async function guardarCambio(key, nuevoValor, esImagen = false, esAudio = false, mimeType = "text/plain") {
    if(esImagen) mostrarLoader("Inyectando foto en la base de datos...");
    else if(esAudio) mostrarLoader("Subiendo canción a tu servidor... (esto puede demorar)");
    else mostrarToast(`Guardando texto...`, false);

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                key: key, 
                value: nuevoValor, 
                isImage: esImagen, 
                isAudio: esAudio, 
                mimeType: mimeType 
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const resultado = await respuesta.json();

        if(resultado.status === "exito") {
            if(esImagen || esAudio) ocultarLoader();
            mostrarToast("¡Guardado con éxito! ✔️");
        } else {
            throw new Error(resultado.mensaje);
        }
    } catch (error) {
        console.error(error);
        if(esImagen || esAudio) ocultarLoader();
        mostrarToast("Error al guardar ❌", true);
    }
}

async function iniciarCanvas() {
    mostrarLoader("Preparando tu entorno de diseño...");
    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();

        for (const key in datos) {
            const elemento = document.getElementById(key);
            if (elemento) {
                // 1. SI ES FOTO
                if (elemento.tagName === 'IMG') {
                    elemento.src = datos[key];
                    const contenedorFoto = elemento.parentElement;
                    const nuevoContenedor = contenedorFoto.cloneNode(true);
                    contenedorFoto.parentNode.replaceChild(nuevoContenedor, contenedorFoto);
                    nuevoContenedor.addEventListener('click', () => {
                        idFotoActual = key;
                        elementoFotoActual = nuevoContenedor.querySelector('img');
                        const inputArchivo = document.createElement('input');
                        inputArchivo.type = 'file';
                        inputArchivo.accept = 'image/png, image/jpeg, image/webp';
                        inputArchivo.onchange = (evento) => {
                            const archivo = evento.target.files[0];
                            if (!archivo) return;
                            const lector = new FileReader();
                            lector.onload = (e) => { inicializarCropper(e.target.result); };
                            lector.readAsDataURL(archivo);
                        };
                        inputArchivo.click(); 
                    });
                } 
                // 2. SI ES MÚSICA
                else if (elemento.tagName === 'AUDIO') {
                    elemento.src = datos[key]; 
                    
                    const btnCambiarMusica = document.getElementById('btn-cambiar-musica');
                    if(btnCambiarMusica) {
                        const nuevoBtnMusica = btnCambiarMusica.cloneNode(true);
                        btnCambiarMusica.parentNode.replaceChild(nuevoBtnMusica, btnCambiarMusica);

                        nuevoBtnMusica.addEventListener('click', () => {
                            const inputArchivo = document.createElement('input');
                            inputArchivo.type = 'file';
                            inputArchivo.accept = 'audio/mpeg, audio/mp3, audio/wav'; 
                            
                            inputArchivo.onchange = (evento) => {
                                const archivo = evento.target.files[0];
                                if (!archivo) return;

                                if(archivo.size > 5000000) { 
                                    alert("La canción es muy pesada para el servidor. Por favor, elegí un archivo menor a 5MB.");
                                    return;
                                }

                                const lector = new FileReader();
                                lector.onload = async (e) => {
                                    const base64Audio = e.target.result;
                                    elemento.src = base64Audio;
                                    elemento.play(); 
                                    await guardarCambio(key, base64Audio, false, true, archivo.type);
                                };
                                lector.readAsDataURL(archivo);
                            };
                            inputArchivo.click(); 
                        });
                    }
                } 
             // 3. SI ES TEXTO O UN CALENDARIO (INPUT)
                else {
                    // Si es el calendario de la fecha
                    if (elemento.tagName === 'INPUT') {
                        // Limpiamos el formato largo de Google para que el calendario lo entienda (ej: 2026-10-20T21:30)
                        elemento.value = datos[key].toString().substring(0, 16);
                        
                        const nuevoElemento = elemento.cloneNode(true);
                        elemento.parentNode.replaceChild(nuevoElemento, elemento);
                        
                        // Guardamos cuando el cliente elige una nueva fecha en el calendario
                        nuevoElemento.addEventListener('change', (e) => {
                            const nuevaFecha = e.target.value;
                            if(nuevaFecha && nuevaFecha !== datos[key]){
                                guardarCambio(key, nuevaFecha);
                                datos[key] = nuevaFecha;
                            }
                        });
                    } 
                    // Si es un texto normal (Títulos, Nombres, Lugar)
                    else {
                        elemento.innerText = datos[key];
                        elemento.setAttribute('contenteditable', 'true');
                        elemento.classList.add('editable-hover');
                        
                        const nuevoElemento = elemento.cloneNode(true);
                        elemento.parentNode.replaceChild(nuevoElemento, elemento);

                        nuevoElemento.addEventListener('blur', (e) => {
                            const nuevoTexto = e.target.innerText;
                            if(nuevoTexto !== datos[key]){
                                guardarCambio(key, nuevoTexto);
                                datos[key] = nuevoTexto;
                            }
                        });
                    }
                }
            }
        }

        // --- INICIAMOS EL CONTADOR AL TERMINAR DE CARGAR ---
        actualizarContador();

    } catch (error) {
        console.error("Error inicial:", error);
        mostrarToast("Error al cargar los datos", true);
    } finally {
        ocultarLoader();
    }
}

// --- 4. LÓGICA DEL CROPPER ---
function inicializarCropper(src) {
    const imagen = document.getElementById('imagen-a-recortar');
    imagen.src = src;
    document.getElementById('cropper-modal').classList.remove('hidden');
    document.getElementById('cropper-modal').classList.add('flex');

    if (cropperInstancia) cropperInstancia.destroy();
    
    cropperInstancia = new Cropper(imagen, {
        aspectRatio: 16 / 9, 
        viewMode: 2,
        background: false
    });
}

function cerrarCropper() {
    document.getElementById('cropper-modal').classList.remove('flex');
    document.getElementById('cropper-modal').classList.add('hidden');
    if (cropperInstancia) { cropperInstancia.destroy(); cropperInstancia = null; }
}

document.getElementById('btn-cancelar').addEventListener('click', cerrarCropper);
document.getElementById('btn-cerrar-cropper').addEventListener('click', cerrarCropper);

document.getElementById('btn-aplicar-recorte').addEventListener('click', async () => {
    if (!cropperInstancia) return;

    const canvas = cropperInstancia.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 });
    const base64Comprimido = canvas.toDataURL('image/jpeg', 0.6);
    
    elementoFotoActual.src = base64Comprimido;
    cerrarCropper();

    await guardarCambio(idFotoActual, base64Comprimido, true, "image/jpeg");
});

// --- 5. LÓGICA DE NAVEGACIÓN (EL FLUJO SAAS) ---

// Paso 1: Comprar (Automático con API)
const mp = new MercadoPago('APP_USR-756306cf-c1d4-4a7a-919a-a0288aae4869'); 

btnComprar.addEventListener('click', async () => {
    mostrarLoader("Verificando producto...");
    
    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "crear_preferencia",
                productId: "boda_premium_01" // MANDAMOS SOLO EL ID
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const resultado = await respuesta.json();
        
        if(resultado.status === "exito") {
            ocultarLoader();
            mp.checkout({
                preference: { id: resultado.id_preferencia },
                autoOpen: true 
            });
        } else {
            throw new Error(resultado.mensaje);
        }
    } catch (error) {
        ocultarLoader();
        mostrarToast("Error: " + error.message, true);
    }
});

// --- DETECTOR DE PAGO AUTOMÁTICO ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pago') === 'exito') {
        window.history.replaceState({}, document.title, window.location.pathname);
        mostrarPantalla(pantallaEditor);
        iniciarCanvas();
        setTimeout(() => mostrarToast("¡Pago acreditado! Ya podés diseñar.", false), 1000);
    }
});

// Paso 2: Publicar y Descontar Créditos
btnPublicar.addEventListener('click', async () => {
    const elementoCreditos = document.getElementById('creditos'); 
    
    // Si no creaste el <p id="creditos"> en HTML, simulamos que hay 3 para que no de error
    let creditosActuales = elementoCreditos ? parseInt(elementoCreditos.innerText) : 3;

    if (creditosActuales > 0) {
        mostrarLoader("Generando y publicando tu web...");
        
        creditosActuales--;
        if(elementoCreditos) elementoCreditos.innerText = creditosActuales;
        await guardarCambio('creditos', creditosActuales);
        
        ocultarLoader();
        
        const idUnico = Math.floor(Math.random() * 10000); 
        inputLink.value = `https://mi-agencia-digital.com/invitacion/${idUnico}`;
        mostrarPantalla(pantallaExito);
    } else {
        alert("Has alcanzado el límite máximo de 3 modificaciones. Para volver a publicar, por favor adquiere una recarga de créditos.");
    }
});

// Paso 3: Copiar Link
btnCopiar.addEventListener('click', () => {
    inputLink.select();
    document.execCommand('copy'); 
    
    const textoOriginal = btnCopiar.innerText;
    btnCopiar.innerText = "¡Copiado! ✔️";
    btnCopiar.classList.replace('bg-gray-800', 'bg-green-600');
    
    setTimeout(() => {
        btnCopiar.innerText = textoOriginal;
        btnCopiar.classList.replace('bg-green-600', 'bg-gray-800');
    }, 2000);
});

// --- 6. CONTADOR CORREGIDO ---
function actualizarContador() {
    const elementoFecha = document.getElementById('fecha_contador');
    if(!elementoFecha) return; 

    setInterval(() => {
        // Ahora usamos .value porque es un Input de calendario
        const fechaTexto = elementoFecha.value; 
        if(!fechaTexto) return; // Si está vacío, no hacemos nada

        const fechaObjetivo = new Date(fechaTexto).getTime();
        const ahora = new Date().getTime();
        
        if(isNaN(fechaObjetivo)) return;

        const diferencia = fechaObjetivo - ahora;

        if (diferencia > 0) {
            document.getElementById('dias').innerText = Math.floor(diferencia / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
            document.getElementById('horas').innerText = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            document.getElementById('minutos').innerText = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            document.getElementById('segundos').innerText = Math.floor((diferencia % (1000 * 60)) / 1000).toString().padStart(2, '0');
        } else {
            // Si la fecha ya pasó
            document.getElementById('dias').innerText = "00";
            document.getElementById('horas').innerText = "00";
            document.getElementById('minutos').innerText = "00";
            document.getElementById('segundos').innerText = "00";
        }
    }, 1000);
}
