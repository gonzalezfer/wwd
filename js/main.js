// === CONFIGURACIÓN DE GOOGLE APPS SCRIPT ===
// Pega aquí la URL de la aplicación web obtenida al implementar google_apps_script.js en Google Sheets
let GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygb0kdh3SwgSJRUGLyl-4-6V24bOVdCuouA_hsjQj2LACKRN_FoQx1i5s59IZkkO5-cw/exec';

// === SUPABASE ===
const SUPABASE_URL = 'https://kgplgxvbnofzpocymaoh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncGxneHZibm9menBvY3ltYW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTExODMsImV4cCI6MjEwNjg4NzE4M30.0bXmmRe768PnBaoAW-Qfabe4hUcb4BsJtDxi38rD9Vw';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// === HELPER PARA EL MANEJO DE ZONAS HORARIAS ===
// Convierte una fecha ingresada (por defecto en Hora Centro de EE. UU. / CST/CDT) a la zona horaria local del usuario.
function parseDateInCentralTime(dateStr) {
    if (!dateStr) return null;
    let normalized = dateStr.trim().replace(' ', 'T');
    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized);
    if (hasTimezone) {
        return new Date(normalized);
    }
    if (normalized.length === 10) {
        normalized += 'T00:00:00';
    } else if (normalized.length === 16) {
        normalized += ':00';
    }
    try {
        const [datePart, timePart] = normalized.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, min, sec] = (timePart || '00:00:00').split(':').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, hour, min, sec || 0));
        const invDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const diff = utcDate.getTime() - invDate.getTime();
        return new Date(utcDate.getTime() + diff);
    } catch (e) {
        return new Date(normalized + '-06:00');
    }
}

function getCurrentChicagoTime() {
                const dateUTC = new Date();
                try {
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Chicago',
                        year: 'numeric', month: 'numeric', day: 'numeric',
                        hour: 'numeric', minute: 'numeric', second: 'numeric',
                        hour12: false
                    });
                    const parts = formatter.formatToParts(dateUTC);
                    const map = {};
                    parts.forEach(p => { map[p.type] = p.value; });

                // Formatear chicago como si fuera UTC
                const chicagoAsUTC = Date.UTC(
                    parseInt(map.year, 10),
                    parseInt(map.month, 10) - 1,
                    parseInt(map.day, 10),
                    parseInt(map.hour, 10),
                    parseInt(map.minute, 10),
                    parseInt(map.second, 10)
                );

                // La diferencia es el offset de Chicago respecto a UTC
                const offset = chicagoAsUTC - dateUTC.getTime();

                // Ajustamos la fecha para representar la hora correcta en la zona local del cliente
                return new Date(dateUTC.getTime() - offset);
            } catch (e) {
                // Fallback: usar el offset promedio de -6 horas
                return new Date(dateUTC.getTime() + (6 * 60 * 60 * 1000));
            }
        }

        const STEP_CONFIG = [
            {
                title: 'Información de contacto',
                desc: 'Ingresa tus datos para coordinar y confirmar tu participación.',
                fields: ['nombre', 'email', 'whatsapp', 'rol']
            },
            {
                title: 'Sobre tu proyecto',
                desc: 'Cuéntanos sobre lo que vas a presentar ante la comunidad.',
                fields: ['proyecto', 'fase', 'descripcion', 'link']
            },
            {
                title: 'Objetivo y feedback',
                desc: 'Define el tipo de retroalimentación que te gustaría recibir.',
                fields: ['feedbacktipo', 'buscacolaboradores', 'feedbackTipo', 'buscaColaboradores']
            },
            {
                title: 'Verificación de correo',
                desc: 'Ingresa el código que acabamos de enviarte.',
                fields: []
            }
        ];

        let currentWizardStep = 1;

        const CAMPOS_DEFAULT = [
            { id: 'nombre', etiqueta: 'Nombre y apellidos', tipo: 'text', placeholder: 'Carlos Mendoza', obligatorio: true },
            { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', placeholder: 'tu@correo.com', obligatorio: true },
            { id: 'whatsapp', etiqueta: 'WhatsApp (código de país)', tipo: 'tel', placeholder: '+52 55 1234 5678', obligatorio: true },
            { id: 'rol', etiqueta: 'Rol o especialidad', tipo: 'select', opciones: ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'IA / Data', 'DevOps / Cloud', 'UI / UX', 'Estudiante', 'Otro'], placeholder: 'Selecciona una opción...', obligatorio: true },
            { id: 'proyecto', etiqueta: 'Nombre del proyecto', tipo: 'text', placeholder: 'Ej. DevFlow', obligatorio: true },
            { id: 'fase', etiqueta: 'Fase actual', tipo: 'select', opciones: ['Idea preliminar / Diseño', 'Prototipo / MVP en desarrollo', 'Proyecto funcional / Demo en vivo', 'En producción / Open Source'], placeholder: 'Selecciona una opción...', obligatorio: true },
            { id: 'descripcion', etiqueta: 'Descripción y tecnologías', tipo: 'textarea', placeholder: '¿De qué trata tu proyecto y qué tecnologías estás usando?', obligatorio: true },
            { id: 'link', etiqueta: 'Enlace o demo (opcional)', tipo: 'url', placeholder: 'https://github.com/... o https://midemo.com', obligatorio: false },
            { id: 'feedbackTipo', etiqueta: 'Tipo de feedback', tipo: 'select', opciones: ['Feedback general y opiniones', 'Arquitectura y código', 'Diseño y experiencia (UI/UX)', 'Practicar pitch y exposición en vivo'], placeholder: 'Selecciona una opción...', obligatorio: true },
            { id: 'buscaColaboradores', etiqueta: '¿Buscas colaboradores?', tipo: 'select', opciones: ['No, solo feedback y opiniones', 'Sí, busco miembros para el equipo'], placeholder: 'Selecciona una opción...', obligatorio: true }
        ];

        function setWizardStep(step) {
            currentWizardStep = step;
            const cfg = STEP_CONFIG[step - 1];

            document.getElementById('wizard-title').textContent = cfg.title;
            document.getElementById('wizard-badge').textContent = `Paso ${step} de 4`;
            document.getElementById('wizard-desc').textContent = cfg.desc;

            for (let i = 1; i <= 4; i++) {
                const seg = document.getElementById(`prog-seg-${i}`);
                if (seg) seg.classList.toggle('active', i <= step);

                const panel = document.getElementById(`step-panel-${i}`);
                if (panel) panel.classList.toggle('active', i === step);
            }

            const prevBtn = document.getElementById('btn-wizard-prev');
            if (prevBtn) prevBtn.style.visibility = step > 1 ? 'visible' : 'hidden';

            const nextBtnText = document.getElementById('btn-wizard-text');
            const nextBtnIcon = document.getElementById('btn-wizard-icon');
            if (step === 4) {
                nextBtnText.textContent = 'Confirmar registro';
                nextBtnIcon.className = 'ri-check-line';
            } else if (step === 3) {
                nextBtnText.textContent = 'Continuar a verificación';
                nextBtnIcon.className = 'ri-arrow-right-line';
            } else {
                nextBtnText.textContent = 'Continuar';
                nextBtnIcon.className = 'ri-arrow-right-line';
            }
        }

        function changeWizardStep(delta) {
            const next = currentWizardStep + delta;
            if (next >= 1 && next <= 4) {
                setWizardStep(next);
            }
        }

        function validateCurrentStep() {
            const panel = document.getElementById(`step-panel-${currentWizardStep}`);
            if (!panel) return true;

            const requiredFields = panel.querySelectorAll('input[required], select[required], textarea[required]');
            let isValid = true;
            let firstInvalid = null;

            requiredFields.forEach(el => {
                if (!el.value || !el.value.trim()) {
                    isValid = false;
                    el.classList.add('is-invalid');
                    if (!firstInvalid) firstInvalid = el;

                    el.addEventListener('input', () => el.classList.remove('is-invalid'), { once: true });
                    el.addEventListener('change', () => el.classList.remove('is-invalid'), { once: true });
                } else {
                    el.classList.remove('is-invalid');
                }
            });

            if (firstInvalid) {
                firstInvalid.focus();
            }

            return isValid;
        }

        function getModalOtpValue() {
            let otp = '';
            document.querySelectorAll('#fields-step-4 .otp-box').forEach(el => otp += el.value);
            return otp;
        }

        function handleWizardNextOrSubmit(event) {
            if (!validateCurrentStep()) return;

            if (currentWizardStep < 3) {
                changeWizardStep(1);
            } else if (currentWizardStep === 3) {
                const submitBtn = document.getElementById('btn-wizard-action');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i> Enviando código...';

                const emailInput = document.getElementById('net-email');
                if (emailInput && emailInput.value && supabaseClient) {
                    supabaseClient.auth.signInWithOtp({ email: emailInput.value.trim() })
                    .then(({ error }) => {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                        if (error) {
                            alert("Error al enviar código: " + error.message);
                        } else {
                            changeWizardStep(1);
                            setTimeout(() => { document.querySelector('#fields-step-4 .otp-box')?.focus(); }, 100);
                        }
                    });
                } else {
                    document.getElementById('networking-form').requestSubmit();
                }
            } else if (currentWizardStep === 4) {
                const otp = getModalOtpValue();
                if (otp.length < 6) {
                    document.querySelectorAll('#fields-step-4 .otp-box').forEach(b => { if(!b.value) b.style.borderColor = '#ef4444'; });
                    return;
                }
                const hiddenOtp = document.getElementById('net-modal-otp-hidden');
                if(hiddenOtp) hiddenOtp.value = otp;
                document.getElementById('networking-form').requestSubmit();
            }
        }

        function normalizarEtiqueta(etiqueta, id) {
            if (!etiqueta) return id || '';
            const clean = etiqueta.trim().toLowerCase();
            const dicc = {
                'nombre': 'Nombre y apellidos',
                'nombre y apellidos': 'Nombre y apellidos',
                'correo electrónico': 'Correo electrónico',
                'correo electronico': 'Correo electrónico',
                'email': 'Correo electrónico',
                'whatsapp': 'WhatsApp (código de país)',
                'whatsapp (con código de país)': 'WhatsApp (código de país)',
                'tu rol o especialidad': 'Rol o especialidad',
                'tu rol / especialidad': 'Rol o especialidad',
                'rol': 'Rol o especialidad',
                'nombre del proyecto o idea': 'Nombre del proyecto',
                'nombre del proyecto': 'Nombre del proyecto',
                'proyecto': 'Nombre del proyecto',
                'fase del proyecto': 'Fase actual',
                'fase': 'Fase actual',
                'tipo de feedback buscado': 'Tipo de feedback',
                'tipo de feedback': 'Tipo de feedback',
                'feedback': 'Tipo de feedback',
                'feedbacktipo': 'Tipo de feedback',
                '¿buscas colaboradores?': '¿Buscas colaboradores?',
                'buscacolaboradores': '¿Buscas colaboradores?',
                'descripción breve y stack tecnológico': 'Descripción y tecnologías',
                'descripción breve': 'Descripción y tecnologías',
                'descripcion': 'Descripción y tecnologías',
                'descripción': 'Descripción y tecnologías',
                'link del proyecto / repo / demo (opcional)': 'Enlace o demo (opcional)',
                'link del proyecto': 'Enlace o demo (opcional)',
                'link': 'Enlace o demo (opcional)'
            };
            return dicc[clean] || (etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1).toLowerCase());
        }

        function renderNetworkingFields(campos) {
            const c1 = document.getElementById('fields-step-1');
            const c2 = document.getElementById('fields-step-2');
            const c3 = document.getElementById('fields-step-3');
            if (!c1 || !c2 || !c3) return;

            c1.innerHTML = '';
            c2.innerHTML = '';
            c3.innerHTML = '';

            const list = Array.isArray(campos) && campos.length > 0 ? campos : CAMPOS_DEFAULT;

            list.forEach(campo => {
                const id = (campo.id || '').toLowerCase();
                const el = createFieldElement(campo);

                if (STEP_CONFIG[0].fields.map(f => f.toLowerCase()).includes(id)) {
                    c1.appendChild(el);
                } else if (STEP_CONFIG[2].fields.map(f => f.toLowerCase()).includes(id)) {
                    c3.appendChild(el);
                } else {
                    c2.appendChild(el);
                }
            });
        }

        function createFieldElement(campo) {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.className = 'form-label';
            label.htmlFor = `net-${campo.id}`;
            const etiquetaLimpia = normalizarEtiqueta(campo.etiqueta, campo.id);
            label.innerHTML = `${etiquetaLimpia}${campo.obligatorio ? '<span class="form-req">*</span>' : ''}`;
            group.appendChild(label);

            let inputEl;
            if (campo.tipo === 'textarea') {
                inputEl = document.createElement('textarea');
                inputEl.className = 'form-textarea';
                inputEl.rows = 3;
            } else if (campo.tipo === 'select') {
                inputEl = document.createElement('select');
                inputEl.className = 'form-select';

                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.disabled = true;
                defaultOpt.selected = true;
                defaultOpt.textContent = 'Selecciona una opción...';
                inputEl.appendChild(defaultOpt);

                (campo.opciones || []).forEach(opt => {
                    const optEl = document.createElement('option');
                    optEl.value = opt;
                    optEl.textContent = opt;
                    inputEl.appendChild(optEl);
                });
            } else {
                inputEl = document.createElement('input');
                inputEl.className = 'form-input';
                inputEl.type = campo.tipo || 'text';
            }

            inputEl.id = `net-${campo.id}`;
            inputEl.name = campo.id;

            // Sanitizar placeholder
            let ph = campo.placeholder || '';
            if (ph.includes('#ERROR') || ph.startsWith('=')) {
                ph = campo.id === 'whatsapp' ? '+52 55 1234 5678' : '';
            }
            if (ph && campo.tipo !== 'select') inputEl.placeholder = ph;
            if (campo.obligatorio) inputEl.required = true;

            // Formateo inteligente en tiempo real para teléfono / WhatsApp
            if (campo.id === 'whatsapp' || campo.tipo === 'tel') {
                inputEl.addEventListener('input', function (e) {
                    const cursor = this.selectionStart;
                    const prevVal = this.value;
                    const formatted = formatPhoneNumber(prevVal);
                    this.value = formatted;
                });
            }

            group.appendChild(inputEl);

            if (campo.hint) {
                const hint = document.createElement('span');
                hint.className = 'form-hint';
                hint.textContent = campo.hint;
                group.appendChild(hint);
            }

            return group;
        }

        function formatPhoneNumber(raw) {
            if (!raw) return '';

            // Extraer solo dígitos
            let digits = raw.replace(/\D/g, '');
            if (!digits) return raw.trim().startsWith('+') ? '+' : '';

            // Limitar a máximo 15 dígitos internacionales
            if (digits.length > 15) digits = digits.slice(0, 15);

            // Si empieza con 1 (EE.UU. / Canadá): +1 234 567 8900
            if (digits.startsWith('1')) {
                let cc = digits.slice(0, 1);
                let rest = digits.slice(1);
                let parts = [cc];
                if (rest.length > 0) parts.push(rest.slice(0, 3));
                if (rest.length > 3) parts.push(rest.slice(3, 6));
                if (rest.length > 6) parts.push(rest.slice(6, 10));
                return '+' + parts.join(' ');
            }

            // Códigos de 3 dígitos comunes en Latinoamérica
            const threeDigitCCs = ['502', '503', '504', '505', '506', '507', '591', '593', '595', '598', '509'];
            let is3Digit = threeDigitCCs.some(code => digits.startsWith(code));

            if (is3Digit) {
                let cc = digits.slice(0, 3);
                let rest = digits.slice(3);
                let parts = [cc];
                if (rest.length > 0) parts.push(rest.slice(0, 4));
                if (rest.length > 4) parts.push(rest.slice(4, 8));
                if (rest.length > 8) parts.push(rest.slice(8, 12));
                return '+' + parts.join(' ');
            }

            // Códigos de 2 dígitos (México +52, Colombia +57, Argentina +54, España +34, Chile +56, Perú +51, Venezuela +58, Brasil +55, etc.)
            let cc = digits.slice(0, 2);
            let rest = digits.slice(2);
            let parts = [cc];

            if (cc === '52') { // México: +52 55 1234 5678 (2 dígitos lada + 4 + 4)
                if (rest.length > 0) parts.push(rest.slice(0, 2));
                if (rest.length > 2) parts.push(rest.slice(2, 6));
                if (rest.length > 6) parts.push(rest.slice(6, 10));
            } else if (cc === '34') { // España: +34 612 34 56 78
                if (rest.length > 0) parts.push(rest.slice(0, 3));
                if (rest.length > 3) parts.push(rest.slice(3, 5));
                if (rest.length > 5) parts.push(rest.slice(5, 7));
                if (rest.length > 7) parts.push(rest.slice(7, 9));
            } else { // Estándar internacional: +57 300 123 4567
                if (rest.length > 0) parts.push(rest.slice(0, 3));
                if (rest.length > 3) parts.push(rest.slice(3, 6));
                if (rest.length > 6) parts.push(rest.slice(6, 10));
                if (rest.length > 10) parts.push(rest.slice(10, 14));
            }

            return '+' + parts.join(' ');
        }

        function formatFechaLegible(fechaStr) {
            if (!fechaStr) return '';
            if (typeof fechaStr === 'string' && (fechaStr.includes('GMT') || (fechaStr.includes('T') && fechaStr.includes('-')))) {
                const d = new Date(fechaStr);
                if (!isNaN(d.getTime())) {
                    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`;
                }
            }
            return fechaStr;
        }

        async function cargarConfiguracionNetworking() {
            if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith('http')) {
                renderNetworkingFields(CAMPOS_DEFAULT);
                return;
            }

            try {
                const response = await fetch(GOOGLE_SCRIPT_URL);
                const data = await response.json();
                if (data && data.status === 'ok') {
                    if (Array.isArray(data.campos) && data.campos.length > 0) {
                        renderNetworkingFields(data.campos);
                    }
                }
            } catch (e) {
                console.warn('Usando campos locales:', e);
                renderNetworkingFields(CAMPOS_DEFAULT);
            }
        }

        const GOOGLE_FORMS_NETWORKING_URL = 'https://forms.gle/id2HoKcyWn6eNvcG7';

        function openNetworkingModal() {
            window.open(GOOGLE_FORMS_NETWORKING_URL, '_blank');
        }

        function closeNetworkingModal() {
            const modal = document.getElementById('networking-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        }

        function openMemberProfileModal(memberData) {
            if (!memberData) return;
            const modal = document.getElementById('member-profile-modal');
            if (!modal) return;

            // Helper a prueba de fallos para obtener cadenas localizadas
            const safeText = (field, fallback = '') => {
                if (!field) return fallback;
                if (typeof window.getLocalizedString === 'function') {
                    const res = window.getLocalizedString(field);
                    if (res) return res;
                }
                if (typeof field === 'string') return field;
                if (Array.isArray(field)) return field;
                if (typeof field === 'object') {
                    const currentLang = window.currentLanguage || 'es';
                    return field[currentLang] || field['es'] || field['en'] || Object.values(field)[0] || fallback;
                }
                return fallback;
            };

            const nameEl = document.getElementById('member-modal-name');
            const roleEl = document.getElementById('member-modal-role');
            const avatarEl = document.getElementById('member-modal-avatar');
            const bannerEl = document.getElementById('member-modal-banner');
            const bannerWrap = document.getElementById('member-modal-banner-wrap');
            const badgesRow = document.getElementById('member-modal-badges');
            const groupsCard = document.getElementById('member-modal-groups-card');
            const groupsTags = document.getElementById('member-modal-groups-tags');
            const linksCard = document.getElementById('member-modal-links-card');
            const linksGrid = document.getElementById('member-modal-links-grid');

            const nombre = memberData.nombre || 'Miembro';
            const rol = safeText(memberData.descripcion) || (typeof window.getUiText === 'function' ? window.getUiText('defaultAdminRole') : '') || '';
            const foto = memberData.foto || 'img/default_profile.png';
            const banner = memberData.banner || '';

            if (nameEl) nameEl.textContent = nombre;
            if (roleEl) roleEl.textContent = rol;
            if (avatarEl) {
                avatarEl.src = foto;
                avatarEl.onerror = () => { avatarEl.src = '/img/default_profile.png'; };
            }

            // Badges (roles)
            if (badgesRow) {
                badgesRow.innerHTML = '';
                const rawRoles = safeText(memberData.roles, []);
                const roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).filter(Boolean);
                roles.forEach(r => {
                    const badge = document.createElement('span');
                    badge.className = 'member-badge member-badge-role';
                    badge.innerHTML = `<i class="ri-shield-check-line"></i> ${r}`;
                    badgesRow.appendChild(badge);
                });
            }

            // Grupos / Áreas (sin icono de grupo en cada tag)
            if (groupsCard && groupsTags) {
                groupsTags.innerHTML = '';
                const rawGrupos = safeText(memberData.grupos, []);
                const grupos = (Array.isArray(rawGrupos) ? rawGrupos : [rawGrupos]).filter(Boolean);
                if (grupos.length > 0) {
                    groupsCard.style.display = 'block';
                    grupos.forEach(g => {
                        const tag = document.createElement('span');
                        tag.className = 'member-badge member-badge-group';
                        tag.textContent = g;
                        groupsTags.appendChild(tag);
                    });
                } else {
                    groupsCard.style.display = 'none';
                }
            }

            // Enlaces Sociales (sin apariencia de botón: enlace limpio con icono, texto e icono de redirección)
            if (linksCard && linksGrid) {
                linksGrid.innerHTML = '';
                const links = (memberData.links || []).filter(l => l && l.url);
                if (links.length > 0) {
                    linksCard.style.display = 'block';
                    links.forEach(l => {
                        const linkEl = document.createElement('a');
                        linkEl.href = l.url;
                        linkEl.target = '_blank';
                        linkEl.rel = 'noopener noreferrer';
                        linkEl.className = 'member-link-item';

                        const tipo = (l.tipo || '').toLowerCase();
                        let icon = 'ri-link';
                        let label = 'Sitio Web';

                        if (tipo === 'github') {
                            icon = 'ri-github-line';
                            label = 'GitHub';
                        } else if (tipo === 'linkedin') {
                            icon = 'ri-linkedin-line';
                            label = 'LinkedIn';
                        } else if (tipo === 'twitter' || tipo === 'x') {
                            icon = 'ri-twitter-x-line';
                            label = 'Twitter / X';
                        } else if (tipo === 'portfolio' || tipo === 'web') {
                            icon = 'ri-global-line';
                            label = 'Portafolio Web';
                        }

                        linkEl.innerHTML = `
                            <i class="${icon} member-link-icon"></i>
                            <span>${label}</span>
                            <i class="ri-external-link-line member-redirect-icon"></i>
                        `;
                        linksGrid.appendChild(linkEl);
                    });
                } else {
                    linksCard.style.display = 'none';
                }
            }

            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeMemberProfileModal() {
            const modal = document.getElementById('member-profile-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        }

        window.openMemberProfileModal = openMemberProfileModal;
        window.closeMemberProfileModal = closeMemberProfileModal;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeNetworkingModal();
                closeMemberProfileModal();
            }
        });

        document.getElementById('networking-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'networking-modal') closeNetworkingModal();
        });

        document.getElementById('member-profile-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'member-profile-modal') closeMemberProfileModal();
        });

        function setupOtpInputs() {
            document.querySelectorAll('.otp-inputs-container').forEach(container => {
                const boxes = container.querySelectorAll('.otp-box');
                boxes.forEach((box, index) => {
                    box.addEventListener('input', (e) => {
                        box.value = box.value.replace(/[^0-9]/g, '');
                        box.style.borderColor = 'rgba(255,255,255,0.2)';
                        if (box.value.length === 1 && index < boxes.length - 1) boxes[index + 1].focus();
                    });
                    box.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && box.value === '' && index > 0) boxes[index - 1].focus();
                    });
                    box.addEventListener('paste', (e) => {
                        const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0,6);
                        if(pasteData) {
                            e.preventDefault();
                            for(let i=0; i<pasteData.length; i++) {
                                if(boxes[i]) {
                                    boxes[i].value = pasteData[i];
                                    if(i < boxes.length - 1) boxes[i+1].focus();
                                    else boxes[i].blur();
                                }
                            }
                        }
                    });
                });
            });
        }
        document.addEventListener('DOMContentLoaded', setupOtpInputs);

        async function handleNetworkingSubmit(event) {
            event.preventDefault();
            const submitBtn = document.getElementById('btn-wizard-action');
            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i> Confirmando...';
            }

            const form = event.target;
            const formData = {};
            const elements = form.querySelectorAll('input:not(.otp-box), select, textarea');
            elements.forEach(el => {
                if (el.name) {
                    formData[el.name] = el.value.trim();
                }
            });

            try {
                let result;

                if (supabaseClient) {
                    // Verificar OTP usando el input oculto
                    const otp = document.getElementById('net-modal-otp-hidden')?.value;

                    if (submitBtn) submitBtn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i> Verificando código...';

                    const { data: verifyData, error: verifyError } = await supabaseClient.auth.verifyOtp({ email: formData.email, token: otp, type: 'email' });
                    if (verifyError || !verifyData.user) throw new Error("Código incorrecto o expirado.");

                    if (submitBtn) submitBtn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i> Guardando registro...';

                    const payload = {
                        action: 'submitPitch',
                        region: typeof currentRegion !== 'undefined' ? currentRegion : 'latam',
                        lang: typeof currentLanguage !== 'undefined' ? currentLanguage : 'es',
                        ...formData,
                        timestamp: new Date().toISOString()
                    };
                    delete payload[""];
                    
                    const { error: insertError } = await supabaseClient.from('networking_pitches').insert([payload]);
                    if (insertError) throw new Error("Error al guardar en base de datos.");
                }

                // Generar resultado UI mock (fecha de sesión y cupos)
                {
                    await new Promise(r => setTimeout(r, 300));

                    let netCount = parseInt(localStorage.getItem('wwd_net_registrations_count') || '0', 10);
                    netCount++;
                    localStorage.setItem('wwd_net_registrations_count', netCount.toString());

                    const sesionNum = Math.floor((netCount - 1) / 8) + 1;
                    const cupoNum = ((netCount - 1) % 8) + 1;

                    const hoy = new Date();
                    const diaSemana = hoy.getDay();
                    let diasParaViernes = (5 - diaSemana + 7) % 7;
                    if (diasParaViernes === 0 && hoy.getHours() >= 20) diasParaViernes = 7;
                    const diasExtra = (sesionNum - 1) * 7;
                    const fechaObj = new Date();
                    fechaObj.setDate(hoy.getDate() + diasParaViernes + diasExtra);

                    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const fechaStr = `${dias[fechaObj.getDay()]}, ${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]} de ${fechaObj.getFullYear()}`;

                    result = {
                        status: 'success',
                        nombre: formData.nombre || 'Participante',
                        proyecto: formData.proyecto || 'Proyecto',
                        sesionNumero: `Sesión #${sesionNum}`,
                        fechaSesion: fechaStr,
                        horaSesion: '19:00 (GMT-6)',
                        cupoNumero: cupoNum,
                        cuposTotales: 8
                    };
                }

                if (result && result.status === 'success') {
                    document.getElementById('success-user-name').textContent = result.nombre || formData.nombre || 'Participante';
                    document.getElementById('success-project-name').textContent = result.proyecto || formData.proyecto || 'Proyecto';
                    document.getElementById('success-session-num').textContent = result.sesionNumero.startsWith('Sesión') ? result.sesionNumero : `Sesión #${result.sesionNumero}`;
                    document.getElementById('success-slot-num').textContent = `Cupo ${result.cupoNumero} de ${result.cuposTotales || 8}`;
                    document.getElementById('success-session-date').textContent = `${formatFechaLegible(result.fechaSesion)} • ${result.horaSesion || '19:00 (GMT-6)'}`;

                    document.getElementById('networking-form-view').style.display = 'none';
                    document.getElementById('networking-empty-view').style.display = 'none';
                    document.getElementById('networking-success-view').style.display = 'block';
                    form.reset();
                } else if (result && result.code === 'NO_SESSIONS_AVAILABLE') {
                    document.getElementById('networking-form-view').style.display = 'none';
                    document.getElementById('networking-success-view').style.display = 'none';
                    document.getElementById('networking-empty-view').style.display = 'block';
                } else {
                    alert(result?.message || 'Hubo un inconveniente al procesar el registro. Por favor intenta de nuevo.');
                }
            } catch (error) {
                console.error('Error enviando formulario:', error);
                alert(error.message || 'No se pudo enviar el registro. Revisa tu conexión o intenta nuevamente.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        }

        function scrollCarousel(containerId, directionMultiplier) {
            const container = document.getElementById(containerId);
            if (container) {
                const firstCard = container.querySelector('.yt-column-card, .card');
                const scrollAmount = firstCard ? (firstCard.offsetWidth + 20) : 340;
                container.scrollBy({ left: scrollAmount * directionMultiplier, behavior: 'smooth' });
            }
        }

        function scrollToSection(id) {
            const el = document.getElementById(id);
            if (el) {
                const navHeight = document.getElementById('navbar').offsetHeight || 70;
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = el.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - navHeight - 15;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'auto'
                });
            }
        }

        window.currentPageView = 'presentacion';

        // === ROUTING: Rutas con región e idioma ===
        // Formato: /{region}/{lang}/{page}
        // Ejemplo: /latam/es/grupos, /jp/en/proyectos
        const VALID_PAGES = ['presentacion', 'grupos', 'projects', 'eventos', 'equipo', 'faqs', 'networking', 'explorar'];

        // Mapeo de slugs localizados por idioma
        const PAGE_SLUGS_BY_LANG = {
            es: {
                'presentacion': '',
                'grupos': 'grupos',
                'projects': 'proyectos',
                'eventos': 'eventos',
                'equipo': 'equipo',
                'faqs': 'faqs',
                'networking': 'networking',
                'explorar': 'explorar'
            },
            en: {
                'presentacion': '',
                'grupos': 'groups',
                'projects': 'projects',
                'eventos': 'events',
                'equipo': 'team',
                'faqs': 'faqs',
                'explorar': 'explore'
            },
            pt: {
                'presentacion': '',
                'grupos': 'grupos',
                'projects': 'projetos',
                'eventos': 'eventos',
                'equipo': 'equipe',
                'faqs': 'faqs',
                'networking': 'networking',
                'explorar': 'explorar'
            },
            id: {
                'presentacion': '',
                'grupos': 'grup',
                'projects': 'proyek',
                'eventos': 'acara',
                'equipo': 'tim',
                'faqs': 'faq',
                'explorar': 'jelajah'
            },
            ja: {
                'presentacion': '',
                'grupos': 'groups',
                'projects': 'projects',
                'eventos': 'events',
                'equipo': 'team',
                'faqs': 'faqs',
                'explorar': 'explore'
            }
        };

        const PAGE_TO_SLUG = {
            'presentacion': '',
            'grupos': 'grupos',
            'projects': 'proyectos',
            'eventos': 'eventos',
            'equipo': 'equipo',
            'faqs': 'faqs',
            'explorar': 'explorar'
        };

        const SLUG_TO_PAGE = {
            '': 'presentacion',
            'presentacion': 'presentacion',
            'presentation': 'presentacion',
            'apresentacao': 'presentacion',
            'presentasi': 'presentacion',

            'grupos': 'grupos',
            'groups': 'grupos',
            'grup': 'grupos',

            'proyectos': 'projects',
            'projects': 'projects',
            'projetos': 'projects',
            'proyek': 'projects',

            'eventos': 'eventos',
            'events': 'eventos',
            'acara': 'eventos',

            'equipo': 'equipo',
            'team': 'equipo',
            'equipe': 'equipo',
            'tim': 'equipo',

            'faqs': 'faqs',
            'faq': 'faqs',

            'networking': 'networking',
            'explorar': 'explorar',
            'explore': 'explorar',
            'jelajah': 'explorar'
        };

        function buildRoutePath(region, lang, pageId, projectId = null) {
            const langKey = lang || (typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'es');
            const langSlugs = PAGE_SLUGS_BY_LANG[langKey] || PAGE_SLUGS_BY_LANG['es'];
            const slug = (langSlugs && langSlugs[pageId] !== undefined) ? langSlugs[pageId] : (PAGE_TO_SLUG[pageId] || '');
            if (!slug) return "/" + region + "/" + langKey;
            if (pageId === 'projects' && projectId) {
                return "/" + region + "/" + langKey + "/" + slug + "/" + projectId;
            }
            return "/" + region + "/" + langKey + "/" + slug;
        }

        function parseRoutePath(pathname) {
            const parts = pathname.replace(/^\/|\/$/g, '').split('/');
            return {
                region: parts[0] || null,
                lang: parts[1] || null,
                pageSlug: parts[2] || '',
                subSlug: parts[3] || null
            };
        }

        function updateUrlFromState(pageId, projectId = null) {
            const region = typeof currentRegion !== 'undefined' ? currentRegion : 'latam';
            const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'es';
            const newPath = buildRoutePath(region, lang, pageId, projectId);
            if (window.location.pathname !== newPath) {
                history.pushState({ pageId, region, lang, projectId }, '', newPath);
            }
        }

        function switchPage(pageId, pushState = true, projectId = null) {
            window.currentPageView = pageId;
            const navLinks = document.querySelectorAll('.nav-center-links .nav-link, .mobile-nav-links .mobile-nav-link');
            navLinks.forEach(link => link.classList.remove('active'));

            let activeLink = document.getElementById(`nav-link-${pageId}`) || 
                               document.getElementById(`nav-link-content-${pageId}`);
            if (!activeLink) {
                if (pageId === 'projects') activeLink = document.getElementById('nav-link-content-proyectos');
                else if (pageId === 'equipo') activeLink = document.getElementById('nav-link-content-admins');
            }
            if (activeLink) activeLink.classList.add('active');

            let activeMobLink = document.getElementById(`mob-link-${pageId}`) || 
                                  document.getElementById(`mob-link-content-${pageId}`);
            if (!activeMobLink) {
                if (pageId === 'projects') activeMobLink = document.getElementById('mob-link-content-proyectos');
                else if (pageId === 'equipo') activeMobLink = document.getElementById('mob-link-content-admins');
            }
            if (activeMobLink) activeMobLink.classList.add('active');

            // Si se pasa un projectId para proyectos, mostramos la sección de detalle
            const detailSec = document.getElementById('content-proyecto-detalle');
            if (pageId === 'projects' && projectId) {
                window.currentViewingProjectId = projectId;
                if (typeof renderProyectoDetalleById === 'function') {
                    renderProyectoDetalleById(projectId);
                }
            } else if (pageId === 'projects') {
                window.currentViewingProjectId = null;
            }

            // Mapeo de secciones visibles según la página seleccionada
            const sectionMap = {
                'presentacion': ['hero-slider', 'presentacion', 'stats'],
                'grupos': ['content-grupos'],
                'projects': (pageId === 'projects' && projectId) ? ['content-proyecto-detalle'] : ['content-proyectos'],
                'eventos': ['content-eventos'],
                'equipo': ['content-admins', 'content-colaboradores'],
                'faqs': ['content-faqs'],
                'networking': ['content-networking'],
                'explorar': ['hero-slider', 'presentacion', 'stats', 'content-grupos', 'content-proyectos', 'content-eventos', 'content-admins', 'content-colaboradores', 'content-faqs', 'content-networking']
            };

            const visibleSections = sectionMap[pageId] || sectionMap['presentacion'];
            const allSections = document.querySelectorAll('#dynamic-app-container > section, #comunidad-container > section');

            allSections.forEach(sec => {
                if (visibleSections.includes(sec.id)) {
                    sec.style.display = 'block';
                } else {
                    sec.style.display = 'none';
                }
            });

            // Controlar visibilidad del contenedor principal de secciones #comunidad
            const mainSec = document.getElementById('comunidad');
            if (mainSec) {
                const hasVisibleChild = Array.from(mainSec.querySelectorAll('section')).some(s => s.style.display !== 'none');
                mainSec.style.display = hasVisibleChild ? 'block' : 'none';
            }

            // Control de visibilidad del footer
            const footer = document.getElementById('site-footer');
            if (footer) footer.style.display = 'block';

            // Toggle clase en body para adaptar navbar transparente y aura desde arriba
            if (pageId === 'networking') {
                document.body.classList.add('page-networking');
            } else {
                document.body.classList.remove('page-networking');
            }

            // Scroll suave al inicio del contenedor
            const container = document.getElementById('site-page-container');
            if (container) {
                container.scrollTo({ top: 0, behavior: 'auto' });
            } else {
                window.scrollTo({ top: 0, behavior: 'auto' });
            }

            // === ROUTING: Actualizar la URL del navegador ===
            if (pushState) {
                updateUrlFromState(pageId, projectId);
            }
        }
        window.switchPage = switchPage;

        // Abrir detalle de proyecto
        function openProjectDetail(projectId, pushState = true) {
            switchPage('projects', pushState, projectId);
        }
        window.openProjectDetail = openProjectDetail;

        // Volver a la lista de proyectos
        function backToProjectsList(pushState = true) {
            switchPage('projects', pushState, null);
        }
        window.backToProjectsList = backToProjectsList;

        // === ROUTING: Navegar al presionar atrás/adelante en el navegador ===
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.pageId) {
                // Si cambió la región o idioma, recargar datos
                if (e.state.region && e.state.region !== currentRegion) {
                    localStorage.setItem('wwd_region', e.state.region);
                    if (e.state.lang) localStorage.setItem('wwd_lang', e.state.lang);
                    window.location.reload();
                    return;
                }
                if (e.state.lang && typeof getCurrentLanguage === 'function' && e.state.lang !== getCurrentLanguage()) {
                    localStorage.setItem('wwd_lang', e.state.lang);
                    window.location.reload();
                    return;
                }
                switchPage(e.state.pageId, false, e.state.projectId || null);
            } else {
                const parsed = parseRoutePath(window.location.pathname);
                const pageId = SLUG_TO_PAGE[parsed.pageSlug] || 'presentacion';
                const projectId = (pageId === 'projects') ? parsed.subSlug : null;
                switchPage(pageId, false, projectId);
            }
        });

        // === ROUTING: Detectar ruta inicial al cargar el sitio ===
        function getInitialStateFromUrl() {
            const parsed = parseRoutePath(window.location.pathname);
            const pageId = SLUG_TO_PAGE[parsed.pageSlug] || 'presentacion';
            const projectId = (pageId === 'projects') ? parsed.subSlug : null;
            return {
                region: parsed.region || null,
                lang: parsed.lang || null,
                pageId: pageId,
                projectId: projectId
            };
        }
        window._initialRouteState = getInitialStateFromUrl();
        window._initialRoutePageId = window._initialRouteState ? window._initialRouteState.pageId : 'presentacion';
        window._initialRouteProjectId = window._initialRouteState ? window._initialRouteState.projectId : null;

        function toggleMobileMenu() {
            const panel = document.getElementById('mobile-nav-panel');
            const toggle = document.getElementById('mobile-menu-toggle');
            const backdrop = document.getElementById('mobile-nav-backdrop');
            if (!panel || !toggle) return;
            const isOpen = panel.classList.contains('open');
            if (isOpen) {
                closeMobileMenu();
            } else {
                panel.classList.add('open');
                toggle.classList.add('active');
                toggle.setAttribute('aria-expanded', 'true');
                document.body.classList.add('menu-mobile-open');
                if (backdrop) backdrop.classList.add('active');
            }
        }
        window.toggleMobileMenu = toggleMobileMenu;

        function closeMobileMenu() {
            const panel = document.getElementById('mobile-nav-panel');
            const toggle = document.getElementById('mobile-menu-toggle');
            const backdrop = document.getElementById('mobile-nav-backdrop');
            if (panel) panel.classList.remove('open');
            if (toggle) {
                toggle.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
            }
            document.body.classList.remove('menu-mobile-open');
            if (backdrop) backdrop.classList.remove('active');
        }
        window.closeMobileMenu = closeMobileMenu;

        function switchPageAndCloseMobile(pageId) {
            switchPage(pageId);
            closeMobileMenu();
        }
        window.switchPageAndCloseMobile = switchPageAndCloseMobile;

        function openNetworkingModalAndCloseMobile() {
            closeMobileMenu();
            if (typeof openNetworkingModal === 'function') {
                openNetworkingModal();
            }
        }
        window.openNetworkingModalAndCloseMobile = openNetworkingModalAndCloseMobile;

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });

        // === FONDO DINÁMICO INTERACTIVO PARA NETWORKING (AURA FLUIDA + RED DE CONEXIONES) ===
        function initNetworkingAnimatedBackground() {
            const canvas = document.getElementById('networking-bg-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let width = 0;
            let height = 0;
            let animationFrameId = null;

            function resize() {
                const scrollContainer = document.getElementById('site-page-container');
                width = canvas.width = scrollContainer ? Math.max(scrollContainer.clientWidth, window.innerWidth) : window.innerWidth;
                height = canvas.height = scrollContainer ? Math.max(scrollContainer.scrollHeight, window.innerHeight) : window.innerHeight;
            }
            window.addEventListener('resize', resize);
            const scrollContainerEl = document.getElementById('site-page-container');
            if (scrollContainerEl && window.ResizeObserver) {
                const ro = new ResizeObserver(resize);
                ro.observe(scrollContainerEl);
            }
            resize();

            // Partículas que representan nodos de la red de talento y proyectos
            const nodeCount = 38;
            const nodes = [];
            for (let i = 0; i < nodeCount; i++) {
                nodes.push({
                    x: Math.random() * width,
                    y: Math.random() * (height * 0.75), // concentradas en la parte superior-media
                    vx: (Math.random() - 0.5) * 0.45,
                    vy: (Math.random() - 0.5) * 0.4,
                    radius: Math.random() * 2 + 1,
                    baseAlpha: Math.random() * 0.35 + 0.15,
                    pulseSpeed: Math.random() * 0.02 + 0.01,
                    pulseOffset: Math.random() * Math.PI * 2
                });
            }

            // Manchas orbe de luz orgánica fluida ancladas a la parte superior (0 a 450px) para que suban con el contenido al hacer scroll
            const orbs = [
                { xFactor: 0.5, yPx: 120, baseR: 480, rVar: 70, speedX: 0.0014, speedY: 0.0018, rSpeed: 0.0022, color: '18, 92, 235', alpha: 0.48 },
                { xFactor: 0.22, yPx: 200, baseR: 440, rVar: 60, speedX: 0.0018, speedY: 0.0012, rSpeed: 0.0026, color: '10, 52, 160', alpha: 0.42 },
                { xFactor: 0.78, yPx: 160, baseR: 460, rVar: 80, speedX: 0.0016, speedY: 0.0020, rSpeed: 0.0020, color: '30, 120, 255', alpha: 0.36 },
                { xFactor: 0.5, yPx: 320, baseR: 380, rVar: 50, speedX: 0.0022, speedY: 0.0015, rSpeed: 0.0024, color: '6, 28, 90', alpha: 0.52 }
            ];

            let time = 0;

            function render() {
                // Solo renderizar si la página actual es networking para ahorrar CPU/GPU
                const isNetworking = document.body.classList.contains('page-networking');
                if (!isNetworking) {
                    animationFrameId = requestAnimationFrame(render);
                    return;
                }

                time += 1;
                ctx.clearRect(0, 0, width, height);

                // 1. Fondo base degradado oscuro profundo hacia negro puro inferior
                const baseGrad = ctx.createLinearGradient(0, 0, 0, Math.min(height, 1200));
                baseGrad.addColorStop(0, '#000000');
                baseGrad.addColorStop(0.35, '#020716');
                baseGrad.addColorStop(0.7, '#050c1e');
                baseGrad.addColorStop(1, '#000000');
                ctx.fillStyle = baseGrad;
                ctx.fillRect(0, 0, width, height);

                // 2. Orbes de luz con movimiento fluido continuo
                ctx.save();
                ctx.globalCompositeOperation = 'screen';

                orbs.forEach((orb, i) => {
                    const cx = width * (orb.xFactor + Math.sin(time * orb.speedX + i * 1.5) * 0.14);
                    const cy = orb.yPx + Math.cos(time * orb.speedY + i * 1.2) * 50;
                    const radius = orb.baseR + Math.sin(time * orb.rSpeed + i) * orb.rVar;

                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(10, radius));
                    grad.addColorStop(0, `rgba(${orb.color}, ${orb.alpha})`);
                    grad.addColorStop(0.45, `rgba(${orb.color}, ${orb.alpha * 0.45})`);
                    grad.addColorStop(0.75, `rgba(${orb.color}, ${orb.alpha * 0.12})`);
                    grad.addColorStop(1, `rgba(${orb.color}, 0)`);

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();
                });

                // 3. Efecto onda aurora ondulante (curvas sinusoidales de luz en la cabecera)
                ctx.globalCompositeOperation = 'lighter';
                for (let w = 0; w < 3; w++) {
                    ctx.beginPath();
                    const waveY = 80 + w * 60;
                    const waveAmp = 35 + w * 15;
                    const waveFreq = 0.0022 - w * 0.0004;
                    const waveSpeed = time * (0.018 + w * 0.008);

                    ctx.moveTo(0, waveY);
                    for (let x = 0; x <= width; x += 25) {
                        const y = waveY + Math.sin(x * waveFreq + waveSpeed) * waveAmp + Math.cos(x * 0.001 - waveSpeed * 0.5) * (waveAmp * 0.5);
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(width, 0);
                    ctx.lineTo(0, 0);
                    ctx.closePath();

                    const waveGrad = ctx.createLinearGradient(0, 0, 0, waveY + waveAmp + 60);
                    const waveAlpha = 0.18 - w * 0.04;
                    waveGrad.addColorStop(0, `rgba(40, 130, 255, ${waveAlpha * 1.4})`);
                    waveGrad.addColorStop(0.5, `rgba(18, 70, 200, ${waveAlpha})`);
                    waveGrad.addColorStop(1, 'rgba(10, 40, 130, 0)');
                    ctx.fillStyle = waveGrad;
                    ctx.fill();
                }

                ctx.restore();

                // 4. Red constelación de nodos y conexiones de Networking (sutil y elegante)
                ctx.save();
                for (let i = 0; i < nodes.length; i++) {
                    const n1 = nodes[i];
                    n1.x += n1.vx;
                    n1.y += n1.vy;

                    // Rebote suave en los bordes
                    if (n1.x < 0 || n1.x > width) n1.vx *= -1;
                    if (n1.y < 0 || n1.y > Math.min(height, 750)) n1.vy *= -1;

                    // Conexiones entre nodos cercanos
                    for (let j = i + 1; j < nodes.length; j++) {
                        const n2 = nodes[j];
                        const dx = n1.x - n2.x;
                        const dy = n1.y - n2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const maxDist = 135;

                        if (dist < maxDist) {
                            const lineAlpha = (1 - dist / maxDist) * 0.22;
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(160, 205, 255, ${lineAlpha})`;
                            ctx.lineWidth = 0.75;
                            ctx.moveTo(n1.x, n1.y);
                            ctx.lineTo(n2.x, n2.y);
                            ctx.stroke();
                        }
                    }

                    // Dibujar nodo con pulso sutil
                    const pulse = Math.sin(time * n1.pulseSpeed + n1.pulseOffset);
                    const alpha = Math.max(0.08, n1.baseAlpha + pulse * 0.15);
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(210, 235, 255, ${alpha})`;
                    ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();

                animationFrameId = requestAnimationFrame(render);
            }

            render();
        }
        window.initNetworkingAnimatedBackground = initNetworkingAnimatedBackground;

        function applyPageVisibility() {
            if (typeof window.switchPage === 'function') {
                const targetPage = window._initialRoutePageId || window.currentPageView || 'presentacion';
                const targetProjectId = (targetPage === 'projects') ? window._initialRouteProjectId : null;
                window.switchPage(targetPage, false, targetProjectId);
            }
        }
        window.applyPageVisibility = applyPageVisibility;

        document.addEventListener('DOMContentLoaded', () => {
            // Sincronizar clase inicial en body según la ruta
            if (window._initialRoutePageId === 'networking') {
                document.body.classList.add('page-networking');
            }

            // Escuchar scroll en #site-page-container para activar backdrop-filter en la navbar cuando se desplaza
            const scrollContainer = document.getElementById('site-page-container');
            const navbarEl = document.getElementById('navbar');
            if (scrollContainer && navbarEl) {
                scrollContainer.addEventListener('scroll', () => {
                    if (scrollContainer.scrollTop > 20) {
                        navbarEl.classList.add('scrolled');
                    } else {
                        navbarEl.classList.remove('scrolled');
                    }
                }, { passive: true });
            }
            // Vincular eventos click a botones de la barra de navegacion
            const navBtnMap = [
                { id: 'nav-link-presentacion', page: 'presentacion' },
                { id: 'nav-link-grupos', page: 'grupos' },
                { id: 'nav-link-eventos', page: 'eventos' },
                { id: 'nav-link-equipo', page: 'equipo' },
                { id: 'nav-link-faqs', page: 'faqs' }
            ];
            navBtnMap.forEach(item => {
                const btn = document.getElementById(item.id);
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        switchPage(item.page);
                    });
                }
            });
            // Inicializar campos por defecto para networking inmediatamente
            renderNetworkingFields(CAMPOS_DEFAULT);
            cargarConfiguracionNetworking();
            initNetworkingAnimatedBackground();

            window._WWD_DATA = {
                carrusel: [],
                grupos: [],
                recursos: [],
                admins: [],
                colaboradores: [],
                eventos: [],
                faqs: [],
                footer: null
            };

            // Helper para determinar si un objeto dinámico es visible (descarta objetos de ejemplo/plantillas)
            function isItemVisible(item) {
                if (!item || typeof item !== 'object') return false;
                if (item.visible === false) return false;
                if (item.invisible === true) return false;
                if (item.oculto === true) return false;
                if (item.activo === false) return false;
                return true;
            }

            // === FETCH JSON DATA ===
            async function fetchData(file) {
                try {
                    const response = await fetch(file + '.json?t=' + new Date().getTime());
                    if (!response.ok) throw new Error('Error de red al cargar ' + file);
                    const rawData = await response.json();
                    const data = Array.isArray(rawData) ? rawData.filter(isItemVisible) : rawData;
                    if (window._WWD_DATA) window._WWD_DATA[file] = data;
                    return data;
                } catch (error) {
                    console.error('Error cargando ' + file + '.json:', error);
                    return [];
                }
            }

            // === LOAD HERO SHOWCASE SLIDER FROM CARRUSEL.JSON (15 SECONDS PER SLIDE) ===
            let slidesWrapper = document.getElementById('hero-slides-wrapper');
            let dotsWrapper = document.getElementById('hero-slider-dots');
            let progressBar = document.getElementById('hero-progress-bar');

            let heroSlides = [];
            let currentSlideIndex = 0;
            let slideInterval = null;
            let progressStartTime = 0;
            let progressAnimFrame = null;
            const SLIDE_DURATION = 15000; // 15 segundos


            function getCurrentLanguage() {
                if (currentLanguage) return currentLanguage;
                const regionObj = (typeof availableRegions !== 'undefined' && availableRegions) ? availableRegions.find(r => r.id === currentRegion) : null;
                if (regionObj && regionObj.idiomaPrincipal) return regionObj.idiomaPrincipal;
                if (currentRegion === 'id') return 'id';
                if (currentRegion === 'jp') return 'ja';
                return 'es';
            }

            function getLocalizedString(field) {
                if (!field) return '';
                if (typeof field === 'string' || Array.isArray(field)) return field;
                const lang = getCurrentLanguage();
                if (Array.isArray(field)) return field;
                // Smart fallback: if target lang key missing, prefer 'en' for non-Spanish regions, else 'es'
                const fallback = (lang !== 'es' && lang !== 'pt') ? (field['en'] || field['es']) : (field['es'] || field['en']);
                return field[lang] || fallback || Object.values(field)[0] || '';
            }

            let UI_TEXTS = {};


            function getUiText(key) {
                if (!UI_TEXTS[key]) return '';
                return getLocalizedString(UI_TEXTS[key]);
            }

            function updateLocaleLabel() {
                const labelEl = document.getElementById('locale-current-label');
                if (labelEl) {
                    const reg = (currentRegion || 'latam').toUpperCase();
                    const lang = getCurrentLanguage().toUpperCase();
                    labelEl.textContent = `${reg}/${lang}`;
                }
            }



            window.getLocalizedString = getLocalizedString;
            window.getUiText = getUiText;
            window.getCurrentLanguage = getCurrentLanguage;

            function updateStaticUiI18n() {
                updateLocaleLabel();

                if (!window._WWD_CONFIG || !window._WWD_CONFIG.sections) return;

                const desktopNav = document.getElementById('nav-center-links') || document.querySelector('.nav-center-links');
                const mobileNav = document.getElementById('mobile-nav-links') || document.querySelector('.mobile-nav-links');
                
                if (desktopNav) desktopNav.innerHTML = '';
                if (mobileNav) mobileNav.innerHTML = '';

                window._WWD_CONFIG.sections.forEach(sec => {
                    if (sec.showInNav && sec.navLabel) {
                        const labelText = getLocalizedString(sec.navLabel) || sec.id;
                        
                        // Desktop button
                        if (desktopNav) {
                            const dBtn = document.createElement('button');
                            dBtn.type = 'button';
                            dBtn.className = 'nav-link';
                            dBtn.id = 'nav-link-' + sec.id;
                            dBtn.setAttribute('onclick', sec.navAction);
                            dBtn.textContent = labelText;
                            desktopNav.appendChild(dBtn);
                        }

                        // Mobile button
                        if (mobileNav) {
                            const mBtn = document.createElement('button');
                            mBtn.type = 'button';
                            mBtn.className = 'mobile-nav-link';
                            mBtn.id = 'mob-link-' + sec.id;
                            // For mobile we must close the menu when clicked
                            mBtn.setAttribute('onclick', sec.navAction.replace(')', ") || closeMobileMenu()").replace('switchPage(', 'switchPageAndCloseMobile('));
                            
                            const span = document.createElement('span');
                            span.textContent = labelText;
                            mBtn.appendChild(span);
                            mobileNav.appendChild(mBtn);
                        }
                    }
                });
                
                applyPageVisibility(); // To re-apply the "active" class
            }

            function updateSlidePositions() {
                const slides = document.querySelectorAll('.hero-slide');
                const dots = document.querySelectorAll('.hero-slider-dot');
                if (!slides.length) return;

                slides.forEach((slide, i) => {
                    const isActive = (i === currentSlideIndex);
                    slide.classList.toggle('active', isActive);
                });

                dots.forEach((d, idx) => {
                    const isActive = (idx === currentSlideIndex);
                    d.classList.toggle('active', isActive);
                    if (!isActive) {
                        d.classList.remove('running');
                    }
                });
            }

            function renderSlides() {
                if (!slidesWrapper) return;
                slidesWrapper.innerHTML = '';
                if (dotsWrapper) dotsWrapper.innerHTML = '';
                const visibleSlides = (heroSlides || []).filter(isItemVisible);

                visibleSlides.forEach((slide, index) => {
                    const slideEl = document.createElement('div');
                    slideEl.className = 'hero-slide';
                    slideEl.id = `hero-slide-${index}`;
                    slideEl.setAttribute('data-slide-index', index);

                    let mediaHtml = '';
                    const isVideo = slide.tipo === 'video' || (slide.archivo && slide.archivo.endsWith('.mp4'));
                    if (isVideo) {
                        mediaHtml = `<video class="hero-slide-media" src="${slide.archivo || slide.src}" autoplay muted loop playsinline></video>`;
                    } else {
                        mediaHtml = `<img class="hero-slide-media" src="${slide.archivo || slide.src}" alt="${getLocalizedString(slide.titulo || slide.title || '').replace(/<[^>]*>?/gm, '')}">`;
                    }

                    // Renderizar exactamente 1 botón por tarjeta
                    let buttonsHtml = '';
                    if (Array.isArray(slide.botones) && slide.botones.length > 0) {
                        const btn = slide.botones[0];
                        const isExternal = btn.externo || (btn.link && btn.link.startsWith('http'));
                        const targetAttr = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
                        const tabAttr = btn.tab ? `data-tab="${btn.tab}"` : '';

                        buttonsHtml = `
                            <a href="${btn.link || '#'}" ${targetAttr} class="hero-slide-btn" ${tabAttr}>
                                <span>${getLocalizedString(btn.texto)}</span>
                                <i class="ri-arrow-right-line"></i>
                            </a>
                        `;
                    }

                    // Renderizar cuenta regresiva si el slide tiene fecha_countdown
                    let countdownHtml = '';
                    if (slide.fecha_countdown) {
                        const lblDays = getUiText('countdownDays') || 'Días';
                        const lblHours = getUiText('countdownHours') || 'Horas';
                        const lblMinutes = getUiText('countdownMinutes') || 'Min';
                        const lblSeconds = getUiText('countdownSeconds') || 'Seg';

                        countdownHtml = `
                            <div class="hero-countdown" data-countdown="${slide.fecha_countdown}">
                                <div class="hero-countdown-segment">
                                    <span class="hero-countdown-val countdown-days">00</span>
                                    <span class="hero-countdown-lbl">${lblDays}</span>
                                </div>
                                <div class="hero-countdown-sep">:</div>
                                <div class="hero-countdown-segment">
                                    <span class="hero-countdown-val countdown-hours">00</span>
                                    <span class="hero-countdown-lbl">${lblHours}</span>
                                </div>
                                <div class="hero-countdown-sep">:</div>
                                <div class="hero-countdown-segment">
                                    <span class="hero-countdown-val countdown-minutes">00</span>
                                    <span class="hero-countdown-lbl">${lblMinutes}</span>
                                </div>
                                <div class="hero-countdown-sep">:</div>
                                <div class="hero-countdown-segment">
                                    <span class="hero-countdown-val countdown-seconds">00</span>
                                    <span class="hero-countdown-lbl">${lblSeconds}</span>
                                </div>
                            </div>
                        `;
                    }

                    slideEl.innerHTML = `
                        ${mediaHtml}
                        <div class="hero-slide-overlay"></div>
                        <div class="hero-slide-content">
                            <h1 class="hero-title">${getLocalizedString(slide.titulo || slide.title || '')}</h1>
                            ${countdownHtml}
                            <p class="hero-description">${getLocalizedString(slide.descripcion || slide.description || '')}</p>
                            ${buttonsHtml ? `<div class="hero-cta">${buttonsHtml}</div>` : ''}
                        </div>
                    `;
                    slidesWrapper.appendChild(slideEl);

                    if (dotsWrapper) {
                        const dot = document.createElement('button');
                        dot.className = `hero-slider-dot ${index === 0 ? 'active' : ''}`;
                        dot.setAttribute('aria-label', `Diapositiva ${index + 1}`);
                        dot.innerHTML = '<span class="hero-dot-progress-fill"></span>';
                        dot.addEventListener('click', () => {
                            goToSlide(index, true);
                        });
                        dotsWrapper.appendChild(dot);
                    }
                });

                // Posicionar tarjetas al centro y comprimidas en los costados
                updateSlidePositions();

                // Manejo de scroll o acciones para botones de diapositivas vinculados a secciones/modales
                document.querySelectorAll('.hero-slide-btn[data-tab]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tabName = btn.getAttribute('data-tab');
                        if (tabName) {
                            e.preventDefault();
                            if (tabName === 'networking-modal') {
                                openNetworkingModal();
                            } else {
                                scrollToSection(`content-${tabName}`);
                            }
                        }
                    });
                });
            }

            // Vibración háptica ligera para interacción táctil o manual
            function triggerHapticFeedback() {
                try {
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        // Pulso sutil y ligero de 15ms
                        navigator.vibrate(15);
                    }
                } catch (e) {
                    // Ignorar si el navegador o dispositivo no permite vibración
                }
            }

            let isSliding = false;

            function goToSlide(index, isManual = false) {
                const slides = document.querySelectorAll('.hero-slide');
                if (!slides.length) return;

                if (isSliding) return;
                isSliding = true;
                setTimeout(() => {
                    isSliding = false;
                }, 320);

                const targetIndex = (index + slides.length) % slides.length;
                if (targetIndex === currentSlideIndex && !isManual) return;
                currentSlideIndex = targetIndex;

                if (isManual) {
                    triggerHapticFeedback();
                }
                updateSlidePositions();
                startSliderTimer();
            }

            function nextSlide(isManual = false) {
                if (heroSlides.length <= 1) return;
                goToSlide(currentSlideIndex + 1, isManual);
            }

            function prevSlide(isManual = false) {
                if (heroSlides.length <= 1) return;
                goToSlide(currentSlideIndex - 1, isManual);
            }

            function startSliderTimer() {
                if (slideInterval) clearInterval(slideInterval);
                if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);

                const dots = document.querySelectorAll('.hero-slider-dot');
                dots.forEach(d => d.classList.remove('running'));

                if (heroSlides.length <= 1) return;

                // Activar animación CSS nativa en el siguiente frame sin competir con JS
                progressAnimFrame = requestAnimationFrame(() => {
                    const activeDot = dots[currentSlideIndex];
                    if (activeDot) {
                        activeDot.classList.add('running');
                    }
                });

                slideInterval = setInterval(() => {
                    nextSlide();
                }, SLIDE_DURATION);
            }

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (slideInterval) clearInterval(slideInterval);
                    if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
                    const dots = document.querySelectorAll('.hero-slider-dot');
                    dots.forEach(d => d.classList.remove('running'));
                } else {
                    startSliderTimer();
                }
            });



            function handleNavbarScroll() {
                const navbarEl = document.getElementById('navbar');
                const pageContainer = document.getElementById('site-page-container');
                if (!navbarEl) return;
                const scrollY = pageContainer ? pageContainer.scrollTop : window.scrollY;
                if (scrollY > 20) {
                    navbarEl.classList.add('scrolled');
                } else {
                    navbarEl.classList.remove('scrolled');
                }
            }

            window.addEventListener('scroll', handleNavbarScroll, { passive: true });
            const pageContainer = document.getElementById('site-page-container');
            if (pageContainer) {
                pageContainer.addEventListener('scroll', handleNavbarScroll, { passive: true });
            }
            handleNavbarScroll();





            // === BYTEPLUS-STYLE HERO GROUPS STRIP ===
            function renderHeroGroupsStrip(gruposData) {
                const stripContainer = document.getElementById('hero-bento-strip');
                if (!stripContainer) return;

                const grupos = gruposData || (window._WWD_DATA && window._WWD_DATA.grupos) || [];
                const visible = grupos.filter(isItemVisible);
                const featured = visible.slice(0, 3);

                let html = '';
                featured.forEach(g => {
                    const title = getLocalizedString(g.titulo) || '';
                    const desc = getLocalizedString(g.descripcion) || '';
                    const link = g.link || '#';
                    const icon = g.imagen
                        ? `<img src="${g.imagen}" alt="${title}" onerror="this.parentElement.innerHTML='<i class=\\\'ri-whatsapp-line\\\'></i>'">`
                        : `<i class="ri-whatsapp-line"></i>`;

                    html += `
                        <a href="${link}" target="_blank" rel="noopener noreferrer" class="hero-strip-card" title="${title}">
                            <div class="hero-strip-thumb">${icon}</div>
                            <div class="hero-strip-info">
                                <span class="hero-strip-title">${title}</span>
                                <span class="hero-strip-desc">${desc}</span>
                            </div>
                        </a>`;
                });

                const exploreText = getUiText('exploreAllGroups') || 'Explorar todos los grupos';
                html += `
                    <button type="button" class="hero-strip-explore" id="hero-strip-explore-btn">
                        <span>${exploreText}</span>
                        <i class="ri-arrow-right-line"></i>
                    </button>`;

                stripContainer.innerHTML = html;

                const exploreBtn = document.getElementById('hero-strip-explore-btn');
                if (exploreBtn) {
                    exploreBtn.addEventListener('click', () => {
                        switchPage('grupos');
                    });
                }
            }

            // === LOAD GRUPOS (ESTRUCTURA TIPO LISTA YT MUSIC: 4 ELEMENTOS POR COLUMNA) ===
            function renderGrupos(grupos) {
                renderHeroGroupsStrip(grupos);
                const grid = document.getElementById('grupos-grid');
                grid.innerHTML = '';
                const visibleGrupos = (grupos || []).filter(isItemVisible);

                if (visibleGrupos && visibleGrupos.length > 0) {

                    // Agrupar en chunks de 4 elementos
                    for (let i = 0; i < visibleGrupos.length; i += 4) {
                        const chunk = visibleGrupos.slice(i, i + 4);
                        const columnCard = document.createElement('div');
                        columnCard.className = 'yt-column-card';

                        chunk.forEach(grupo => {
                            const item = document.createElement('a');
                            item.href = grupo.link;
                            item.target = '_blank';
                            item.className = 'yt-list-item';

                            let langBadgesHtml = '';
                            const idiomasList = Array.isArray(grupo.idiomas) ? grupo.idiomas : (grupo.idioma ? [grupo.idioma] : ['es']);

                            langBadgesHtml = idiomasList.map(lang => {
                                const l = lang.toLowerCase();
                                return `<span class="lang-badge lang-${l}">${l.toUpperCase()}</span>`;
                            }).join('');

                            item.innerHTML = `
                                <div class="yt-item-thumb">
                                    ${grupo.imagen ? `<img src="${grupo.imagen}" alt="${getLocalizedString(getLocalizedString(grupo.titulo))}" onerror="this.parentElement.innerHTML='<i class=\\\'ri-whatsapp-line\\\'></i>'">` : `<i class="ri-whatsapp-line"></i>`}
                                </div>
                                <div class="yt-item-body">
                                    <div class="yt-item-title-row">
                                        <div class="yt-item-title" title="${getLocalizedString(getLocalizedString(grupo.titulo))}">${getLocalizedString(getLocalizedString(grupo.titulo))}</div>
                                        ${langBadgesHtml}
                                    </div>
                                    <div class="yt-item-subtitle" title="${grupo.descripcion || ''}">${getLocalizedString(grupo.descripcion) || getUiText('defaultGroupSubtitle')}</div>
                                </div>
                                <i class="ri-arrow-right-s-line yt-item-action"></i>
                            `;
                            columnCard.appendChild(item);
                        });

                        grid.appendChild(columnCard);
                    }
                } else {
                    grid.innerHTML = `<p class="loading">${getUiText('noGroups')}</p>`;
                }
            }

                        // === LOAD EVENTOS ===
            function renderEventos(eventos) {
                const grid = document.getElementById('eventos-grid');
                if (!grid) return;
                grid.innerHTML = '';
                const visibleEventos = (eventos || []).filter(isItemVisible);

                if (visibleEventos && visibleEventos.length > 0) {
                    visibleEventos.forEach(evento => {
                        const card = document.createElement('a');
                        card.href = evento.link || '#';
                        card.target = '_blank';
                        card.rel = 'noopener noreferrer';
                        card.className = 'card event-card';

                        const titulo = getLocalizedString(evento.titulo) || '';
                        const desc = getLocalizedString(evento.descripcion) || '';
                        const fecha = evento.fecha_inicio ? new Date(evento.fecha_inicio).toLocaleDateString() : '';

                        card.innerHTML = `
                            <div class="event-card-media">
                                <img src="${evento.imagen || 'img/networking_ad.png'}" alt="${titulo}" onerror="this.onerror=null; this.src='/img/networking_ad.png'">
                            </div>
                            <div class="event-card-gradient"></div>
                            ${fecha ? `<div class="event-card-date-chip"><i class="ri-calendar-event-line"></i><span>${fecha}</span></div>` : ''}
                            <div class="event-card-body">
                                <h3 class="event-card-title">${titulo}</h3>
                                <p class="event-card-desc">${desc}</p>
                                <span class="event-card-link"><span>${getUiText('viewMore') || 'Ver más'}</span><i class="ri-arrow-right-line"></i></span>
                            </div>
                        `;
                        grid.appendChild(card);
                    });
                } else {
                    grid.innerHTML = `<p class="loading">${getUiText('noEvents') || 'No hay eventos disponibles'}</p>`;
                }
            }

            // === LOAD ADMINS ===
            function extractAndApplyDominantColor(imgEl, cardEl) {
                if (!imgEl || !cardEl) return;
                const process = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 16;
                        canvas.height = 16;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(imgEl, 0, 0, 16, 16);
                        const data = ctx.getImageData(0, 0, 16, 16).data;
                        let r = 0, g = 0, b = 0, count = 0;
                        let bestSaturation = -1;
                        let vibrantR = 40, vibrantG = 40, vibrantB = 45;

                        for (let i = 0; i < data.length; i += 4) {
                            const red = data[i], green = data[i + 1], blue = data[i + 2];
                            const lum = 0.299 * red + 0.587 * green + 0.114 * blue;
                            if (lum > 25 && lum < 235) {
                                r += red;
                                g += green;
                                b += blue;
                                count++;

                                const max = Math.max(red, green, blue);
                                const min = Math.min(red, green, blue);
                                const sat = max === 0 ? 0 : (max - min) / max;
                                if (sat > bestSaturation && max > 50) {
                                    bestSaturation = sat;
                                    vibrantR = red;
                                    vibrantG = green;
                                    vibrantB = blue;
                                }
                            }
                        }

                        if (bestSaturation > 0.18) {
                            cardEl.style.setProperty('--dominant-rgb', `${vibrantR}, ${vibrantG}, ${vibrantB}`);
                        } else if (count > 0) {
                            const avgR = Math.round(r / count);
                            const avgG = Math.round(g / count);
                            const avgB = Math.round(b / count);
                            cardEl.style.setProperty('--dominant-rgb', `${avgR}, ${avgG}, ${avgB}`);
                        } else {
                            cardEl.style.setProperty('--dominant-rgb', '35, 35, 40');
                        }
                    } catch (e) {
                        cardEl.style.setProperty('--dominant-rgb', '42, 42, 48');
                    }
                };

                if (imgEl.complete && imgEl.naturalWidth > 0) {
                    process();
                } else {
                    imgEl.addEventListener('load', process, { once: true });
                }
            }

            function attachMemberCardEvents(card) {
                const toggleCard = () => {
                    const isExpanded = card.classList.contains('is-expanded');
                    if (isExpanded) {
                        card.classList.remove('is-expanded');
                    } else {
                        // Cerrar otras tarjetas abiertas en la misma sección
                        document.querySelectorAll('.admin-card.is-expanded').forEach(c => {
                            if (c !== card) c.classList.remove('is-expanded');
                        });
                        card.classList.add('is-expanded');
                        triggerHapticFeedback();
                    }
                };

                const closeCard = () => {
                    card.classList.remove('is-expanded');
                };



                // Evitar menú contextual nativo en móvil
                card.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });

                let touchMoved = false;
                let touchStartX = 0;
                let touchStartY = 0;
                let lastTouchTime = 0;

                // Soporte táctil optimizado para móvil: un tap abre y se mantiene abierto
                card.addEventListener('touchstart', (e) => {
                    touchMoved = false;
                    if (e.touches && e.touches[0]) {
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                    }
                }, { passive: true });

                card.addEventListener('touchmove', (e) => {
                    if (e.touches && e.touches[0]) {
                        const diffX = Math.abs(e.touches[0].clientX - touchStartX);
                        const diffY = Math.abs(e.touches[0].clientY - touchStartY);
                        // Si el usuario hace scroll, no es un tap
                        if (diffX > 10 || diffY > 10) {
                            touchMoved = true;
                        }
                    }
                }, { passive: true });

                card.addEventListener('touchend', (e) => {
                    // Si el usuario deslizó el carrusel o la pantalla, ignorar
                    if (touchMoved) return;

                    // Si presionó un enlace de redes sociales, permitir navegación
                    if (e.target.closest('a')) return;

                    lastTouchTime = Date.now();
                    toggleCard();
                });

                // Clic estándar para desktop (evitando duplicar el disparo en móvil tras touchend)
                card.addEventListener('click', (e) => {
                    if (Date.now() - lastTouchTime < 450) return;
                    if (e.target.closest('a')) return;
                    toggleCard();
                });
            }

            function buildSocialLinksHtml(links) {
                if (!links || !links.length) return '';
                const validLinks = links.filter(l => l && l.url);
                if (!validLinks.length) return '';

                let html = '';
                validLinks.forEach(l => {
                    const tipo = (l.tipo || '').toLowerCase();
                    let icon = 'ri-link';
                    let label = 'Sitio Web';

                    if (tipo === 'github') {
                        icon = 'ri-github-line';
                        label = 'GitHub';
                    } else if (tipo === 'linkedin') {
                        icon = 'ri-linkedin-line';
                        label = 'LinkedIn';
                    } else if (tipo === 'twitter' || tipo === 'x') {
                        icon = 'ri-twitter-x-line';
                        label = 'Twitter / X';
                    } else if (tipo === 'portfolio' || tipo === 'web') {
                        icon = 'ri-global-line';
                        label = 'Portafolio Web';
                    }

                    html += `
                        <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="admin-social-item">
                            <i class="${icon} social-icon"></i>
                            <span>${label}</span>
                            <i class="ri-external-link-line redirect-icon"></i>
                        </a>
                    `;
                });
                return html;
            }

            function renderProyectos(proyectos) {
                const grid = document.getElementById('proyectos-grid');
                if (!grid) return;
                grid.innerHTML = '';
                const visibleProyectos = (proyectos || []).filter(isItemVisible);
                window._CURRENT_PROYECTOS_LIST = visibleProyectos;

                if (visibleProyectos && visibleProyectos.length > 0) {
                    const gridContainer = document.createElement('div');
                    gridContainer.className = 'projects-showcase-grid';

                    visibleProyectos.forEach(proyecto => {
                        const card = document.createElement('div');
                        card.className = 'project-card';
                        card.setAttribute('role', 'button');
                        card.setAttribute('tabindex', '0');

                        const pId = proyecto.id || (getLocalizedString(proyecto.nombre) || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        card.setAttribute('data-project-id', pId);
                        
                        const logoSrc = proyecto.logo || '/img/logo.enc';
                        const bustUrl = logoSrc.includes('?') ? logoSrc + '&t=' + new Date().getTime() : logoSrc + '?t=' + new Date().getTime();
                        const nombre = getLocalizedString(proyecto.nombre) || '';
                        const titular = getLocalizedString(proyecto.titular) || getLocalizedString(proyecto.descripcion) || '';
                        const websiteClean = (proyecto.website || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
                        const subtitulo = proyecto.autor || websiteClean;

                        card.innerHTML = `
                            <div class="project-card-thumb">
                                <div class="project-card-logo-wrap">
                                    <img src="${bustUrl}" alt="${nombre}" class="project-card-logo" loading="lazy">
                                </div>
                            </div>
                        `;

                        // Handle click and Enter key to navigate to project detail
                        card.addEventListener('click', (e) => {
                            e.preventDefault();
                            openProjectDetail(pId, true);
                        });

                        card.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openProjectDetail(pId, true);
                            }
                        });

                        gridContainer.appendChild(card);
                    });
                    grid.appendChild(gridContainer);

                    // Si al cargar estábamos esperando ver el detalle de un proyecto
                    if (window.currentViewingProjectId) {
                        renderProyectoDetalleById(window.currentViewingProjectId);
                    }
                } else {
                    grid.innerHTML = `<p class="section-desc" style="text-align: center;">${getUiText('comingSoon') || 'Próximamente publicaremos proyectos de la comunidad.'}</p>`;
                }
            }

                        // Parser de Video (YouTube, Vimeo, HTML5 direct video)
            function parseProjectVideo(videoUrl) {
                if (!videoUrl || typeof videoUrl !== 'string') return null;
                const url = videoUrl.trim();
                if (!url) return null;

                // YouTube
                const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytMatch && ytMatch[1]) {
                    return {
                        type: 'youtube',
                        id: ytMatch[1],
                        embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
                        thumbUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
                        originalUrl: url
                    };
                }

                // Vimeo
                const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
                if (vimeoMatch && vimeoMatch[3]) {
                    return {
                        type: 'vimeo',
                        id: vimeoMatch[3],
                        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`,
                        thumbUrl: null,
                        originalUrl: url
                    };
                }

                // Direct video (mp4, webm, ogg, etc.)
                return {
                    type: 'html5',
                    src: url,
                    originalUrl: url
                };
            }

            function renderProyectoDetalleById(projectId) {
                const detailContent = document.getElementById('proyecto-detalle-content');
                if (!detailContent) return;

                const proyectos = window._CURRENT_PROYECTOS_LIST || (window._WWD_DATA && window._WWD_DATA.projects) || [];
                const proyecto = proyectos.find(p => (p.id === projectId) || ((getLocalizedString(p.nombre) || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === projectId));

                if (!proyecto) {
                    detailContent.innerHTML = `
                        <div class="project-detail-wrapper">
                            <button type="button" class="project-detail-back-btn" onclick="backToProjectsList(true)">
                                <i class="ri-arrow-left-line"></i> ${getUiText('backToProjects')}
                            </button>
                            <div class="project-detail-body" style="text-align: center; padding: 48px 24px;">
                                <h3 style="font-size: 1.4rem; color: #fff; margin-bottom: 8px;">Proyecto no encontrado</h3>
                                <p style="color: var(--color-text-secondary); margin-bottom: 24px;">El proyecto que buscas no existe o ya no está disponible.</p>
                                <div>
                                    <button type="button" class="btn btn-primary" onclick="backToProjectsList(true)">
                                        ${getUiText('backToProjects')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    return;
                }

                const nombre = getLocalizedString(proyecto.nombre) || '';
                const titular = getLocalizedString(proyecto.titular) || '';
                const descripcion = getLocalizedString(proyecto.descripcion) || '';
                const logoSrc = proyecto.logo || '/img/logo.enc';
                const bustUrl = logoSrc.includes('?') ? logoSrc + '&t=' + new Date().getTime() : logoSrc + '?t=' + new Date().getTime();
                const websiteUrl = proyecto.website || '';
                const autor = proyecto.autor || '';

                // Formatear párrafos respetando saltos de línea y etiquetas <br>
                const paragraphs = descripcion.split(/<br\s*[\/]?>/gi).filter(p => p.trim().length > 0);
                const descHtml = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');

                const websiteDomain = websiteUrl ? websiteUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';
                const authorClean = autor || websiteDomain;

                // === CARRUSEL DE MEDIOS (VIDEO AL INICIO + IMÁGENES ILIMITADAS) ===
                const videoUrl = proyecto.video || proyecto.videoUrl || '';
                const rawImages = proyecto.imagenes || proyecto.images || proyecto.galeria || proyecto.previews || [];
                const mediaItems = [];

                // 1. Espacio para video al inicio si existe
                if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim()) {
                    const parsedVideo = parseProjectVideo(videoUrl.trim());
                    if (parsedVideo) {
                        mediaItems.push({
                            type: 'video',
                            parsed: parsedVideo,
                            title: `${nombre} - Video de presentación`
                        });
                    }
                }

                // 2. Imágenes ilimitadas
                if (Array.isArray(rawImages)) {
                    rawImages.forEach((imgUrl, idx) => {
                        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
                            mediaItems.push({
                                type: 'image',
                                url: imgUrl.trim(),
                                title: `${nombre} - Vista previa ${idx + 1}`
                            });
                        }
                    });
                }

                let galleryHtml = '';
                if (mediaItems.length > 0) {
                    // Títulos y descripciones para cada slide
                    mediaItems.forEach((item, idx) => {
                        if (item.type === 'video') {
                            item.captionTitle = `${nombre} — Demostración en video`;
                            item.captionDesc = titular || `Video de presentación de ${nombre}.`;
                        } else {
                            if (idx === 1 || (idx === 0 && !videoUrl)) {
                                item.captionTitle = `${nombre} — Vista previa`;
                                item.captionDesc = paragraphs[0] || titular || `Vista previa del proyecto.`;
                            } else {
                                item.captionTitle = `${nombre} — Captura ${idx + 1}`;
                                item.captionDesc = paragraphs[1] || paragraphs[0] || titular || `Captura del proyecto.`;
                            }
                        }
                    });

                    // Build simple slides: just images, no window frame
                    function buildSlideHtml(item, idx) {
                        const safeTitle = item.title.replace(/'/g, "\\'");
                        if (item.type === 'video') {
                            return `
                                <div class="swiper-slide project-gallery-slide">
                                    <div class="project-gallery-video-wrap">
                                        ${item.parsed.type === 'html5' ? `
                                            <video controls playsinline preload="metadata">
                                                <source src="${item.parsed.src}" type="video/mp4">
                                            </video>
                                        ` : `
                                            <iframe src="${item.parsed.embedUrl}" title="${item.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                                        `}
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="swiper-slide project-gallery-slide" onclick="openProjectLightbox('${item.url}', '${safeTitle}')">
                                    <img src="${item.url}" alt="${item.title}" loading="eager" decoding="async">
                                    <button type="button" class="project-gallery-zoom" onclick="event.stopPropagation(); openProjectLightbox('${item.url}', '${safeTitle}')" aria-label="Ampliar">
                                        <i class="ri-fullscreen-line"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }

                    const slidesHtml = mediaItems.map((item, idx) => buildSlideHtml(item, idx)).join('');

                    const navBtns = mediaItems.length > 1 ? `
                        <div class="project-gallery-nav">
                            <button type="button" class="project-gallery-nav-btn" id="project-gallery-prev" aria-label="Anterior">
                                <i class="ri-arrow-left-s-line"></i>
                            </button>
                            <button type="button" class="project-gallery-nav-btn" id="project-gallery-next" aria-label="Siguiente">
                                <i class="ri-arrow-right-s-line"></i>
                            </button>
                        </div>
                    ` : '';

                    galleryHtml = `
                        <section class="project-gallery-section" aria-label="Galería del proyecto">
                            <div class="project-gallery-header" style="justify-content: flex-end;">
                                ${navBtns}
                            </div>
                            <div class="swiper project-gallery-swiper" id="project-gallery-swiper">
                                <div class="swiper-wrapper">
                                    ${slidesHtml}
                                </div>
                            </div>
                        </section>
                    `;
                }

                detailContent.innerHTML = `
                    <div class="project-detail-wrapper">


                        <header class="project-detail-hero">
                            <div class="project-detail-hero-left">
                                <h1 class="project-detail-hero-title">${nombre}</h1>

                                ${titular ? `<p class="project-detail-hero-desc">${titular}</p>` : ''}
                                ${websiteUrl ? `
                                    <div class="project-detail-hero-cta">
                                        <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="project-detail-btn-pill">
                                            <span>${getUiText('visitProject')}</span>
                                            <i class="ri-external-link-line"></i>
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="project-detail-hero-right">
                                <div class="project-detail-hero-thumb">
                                    <img src="${bustUrl}" alt="${nombre}" class="project-detail-hero-logo">
                                </div>
                            </div>
                        </header>

                        ${galleryHtml}

                        <article class="project-detail-content">
                            <div class="project-detail-prose">
                                ${descHtml || `<p>${titular}</p>`}
                                ${authorClean ? `
                                    <p class="project-detail-author-credit" style="margin-top: 20px; font-weight: 500; color: #A1A1AA;">
                                        Autor: ${authorClean}
                                    </p>
                                ` : ''}
                            </div>
                            <footer class="project-detail-footer-meta">
                                ${autor ? `
                                    <div class="project-meta-pill">
                                        <span class="project-meta-label">${getUiText('projectCreator')}</span>
                                        <span class="project-meta-val">${autor}</span>
                                    </div>
                                ` : ''}
                            </footer>
                        </article>
                    </div>
                `;

                // Inicializar Swiper
                if (mediaItems.length > 0) {
                    window.projectMediaItems = mediaItems;
                    window.currentFilmstripIndex = 0;

                    // Calculate image height based on viewport
                    const calcHeight = () => {
                        const vh = window.innerHeight || 650;
                        const imgH = Math.max(220, Math.min(440, vh - 200));
                        const section = document.querySelector('.project-gallery-section');
                        if (section) section.style.setProperty('--gallery-img-height', `${imgH}px`);
                        document.documentElement.style.setProperty('--gallery-img-height', `${imgH}px`);
                    };
                    calcHeight();
                    window._calcGalleryHeight = calcHeight;

                    const startSwiper = () => {
                        if (typeof window.initProjectGallerySwiper === 'function') {
                            window.initProjectGallerySwiper();
                        }
                    };

                    if (typeof Swiper !== 'undefined') {
                        setTimeout(startSwiper, 40);
                    } else {
                        let attempts = 0;
                        const check = setInterval(() => {
                            attempts++;
                            if (typeof Swiper !== 'undefined') { clearInterval(check); startSwiper(); }
                            else if (attempts > 30) clearInterval(check);
                        }, 80);
                    }
                }
            }
            window.renderProyectoDetalleById = renderProyectoDetalleById;

            // Swiper init for project gallery
            window.initProjectGallerySwiper = function() {
                if (window.projectSwiper && typeof window.projectSwiper.destroy === 'function') {
                    try { window.projectSwiper.destroy(true, true); } catch(e){}
                    window.projectSwiper = null;
                }

                const container = document.getElementById('project-gallery-swiper');
                if (!container || typeof Swiper === 'undefined') return;

                const items = window.projectMediaItems || [];
                const canLoop = false; // Infinite scroll disabled by user request

                window.projectSwiper = new Swiper('#project-gallery-swiper', {
                    loop: canLoop,
                    loopAdditionalSlides: canLoop ? 2 : 0,
                    slidesPerView: 'auto',
                    spaceBetween: 6,
                    speed: 380,
                    grabCursor: true,
                    keyboard: { enabled: true },
                    navigation: {
                        nextEl: '#project-gallery-next',
                        prevEl: '#project-gallery-prev',
                    },
                    on: {
                        slideChange: function() {
                            const realIdx = this.realIndex;
                            window.currentFilmstripIndex = realIdx;
                            const activeItem = items[realIdx];
                            const capTitle = document.getElementById('gallery-caption-title');
                            const capDesc = document.getElementById('gallery-caption-desc');
                            if (capTitle && capDesc && activeItem) {
                                capTitle.textContent = activeItem.captionTitle;
                                capDesc.textContent = activeItem.captionDesc;
                            }
                            // Pausar videos
                            document.querySelectorAll('.project-gallery-section video').forEach(v => v.pause());
                            document.querySelectorAll('.project-gallery-section iframe').forEach(iframe => {
                                try { iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch(e){}
                            });
                        }
                    }
                });
            };

            // Keep old function names as aliases for compatibility
            window.calculateFilmstripDimensions = function() {
                if (typeof window._calcGalleryHeight === 'function') window._calcGalleryHeight();
            };
            window.updateProjectFilmstrip = function() {
                if (window.projectSwiper) window.projectSwiper.update();
            };
            window.navigateProjectFilmstrip = function(dir) {
                if (window.projectSwiper) { dir > 0 ? window.projectSwiper.slideNext() : window.projectSwiper.slidePrev(); }
            };
            window.onProjectFilmstripCardClick = function(idx) {
                if (window.projectSwiper) window.projectSwiper.slideToLoop(idx);
            };

            window.addEventListener('resize', () => {
                if (document.getElementById('project-gallery-swiper')) {
                    if (typeof window._calcGalleryHeight === 'function') window._calcGalleryHeight();
                    if (window.projectSwiper) window.projectSwiper.update();
                }
            });

            window.openProjectLightbox = function(imgSrc, title) {
                let lb = document.getElementById('project-lightbox-modal');
                if (!lb) {
                    lb = document.createElement('div');
                    lb.id = 'project-lightbox-modal';
                    lb.className = 'project-lightbox-modal';
                    lb.innerHTML = `
                        <div class="project-lightbox-backdrop" onclick="closeProjectLightbox()"></div>
                        <div class="project-lightbox-dialog">
                            <button type="button" class="project-lightbox-close" onclick="closeProjectLightbox()" aria-label="Cerrar">
                                <i class="ri-close-line"></i>
                            </button>
                            <img id="project-lightbox-img" src="" alt="">
                            <p id="project-lightbox-caption" class="project-lightbox-caption"></p>
                        </div>
                    `;
                    document.body.appendChild(lb);

                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && lb.classList.contains('open')) {
                            closeProjectLightbox();
                        }
                    });
                }

                const img = document.getElementById('project-lightbox-img');
                const cap = document.getElementById('project-lightbox-caption');
                if (img) img.src = imgSrc;
                if (cap) cap.textContent = title || '';
                lb.classList.add('open');
                document.body.style.overflow = 'hidden';
            };

            window.closeProjectLightbox = function() {
                const lb = document.getElementById('project-lightbox-modal');
                if (lb) lb.classList.remove('open');
                document.body.style.overflow = '';
            };

            function renderAdmins(admins) {
                const grid = document.getElementById('admins-grid');
                if (!grid) return;
                grid.innerHTML = '';
                const visibleAdmins = (admins || []).filter(isItemVisible);

                if (visibleAdmins && visibleAdmins.length > 0) {
                    visibleAdmins.forEach(admin => {
                        const card = document.createElement('div');
                        card.className = 'card admin-card';
                        card.setAttribute('role', 'button');
                        card.setAttribute('tabindex', '0');
                        card.setAttribute('aria-label', `Perfil de ${admin.nombre}`);
                        const defaultPhoto = '/img/default_profile.png';
                        const photoSrc = admin.foto || defaultPhoto;
                        const socialsHtml = buildSocialLinksHtml(admin.links);

                        card.innerHTML = `
                            <div class="admin-bg-wrapper">
                                <img src="${photoSrc}" alt="${admin.nombre}" class="admin-bg-img" crossorigin="anonymous" onerror="this.onerror=null; this.src='${defaultPhoto}'">
                                <div class="admin-bg-overlay"></div>
                            </div>
                            <div class="admin-info">
                                <h3 class="admin-name">${admin.nombre}</h3>
                                <p class="admin-role">${getLocalizedString(admin.descripcion) || getUiText('defaultAdminRole')}</p>
                                <div class="admin-socials">
                                    ${socialsHtml}
                                </div>
                            </div>
                        `;

                        const bgImg = card.querySelector('.admin-bg-img');
                        extractAndApplyDominantColor(bgImg, card);

                        attachMemberCardEvents(card);

                        grid.appendChild(card);
                    });
                } else {
                    grid.innerHTML = `<p class="loading">${getUiText('noAdmins')}</p>`;
                }
            }

            // === LOAD COLABORADORES ===
            function renderColaboradores(colaboradores) {
                const grid = document.getElementById('colaboradores-grid');
                if (!grid) return;
                grid.innerHTML = '';
                const visibleColabs = (colaboradores || []).filter(isItemVisible);

                if (visibleColabs && visibleColabs.length > 0) {
                    visibleColabs.forEach(colaborador => {
                        const card = document.createElement('div');
                        card.className = 'card admin-card';
                        card.setAttribute('role', 'button');
                        card.setAttribute('tabindex', '0');
                        card.setAttribute('aria-label', `Perfil de ${colaborador.nombre}`);
                        const defaultPhoto = '/img/default_profile.png';
                        const photoSrc = colaborador.foto || defaultPhoto;
                        const socialsHtml = buildSocialLinksHtml(colaborador.links);

                        card.innerHTML = `
                            <div class="admin-bg-wrapper">
                                <img src="${photoSrc}" alt="${colaborador.nombre}" class="admin-bg-img" crossorigin="anonymous" onerror="this.onerror=null; this.src='${defaultPhoto}'">
                                <div class="admin-bg-overlay"></div>
                            </div>
                            <div class="admin-info">
                                <h3 class="admin-name">${colaborador.nombre}</h3>
                                <p class="admin-role">${getLocalizedString(colaborador.descripcion) || ''}</p>
                                <div class="admin-socials">
                                    ${socialsHtml}
                                </div>
                            </div>
                        `;

                        const bgImg = card.querySelector('.admin-bg-img');
                        extractAndApplyDominantColor(bgImg, card);

                        attachMemberCardEvents(card);

                        grid.appendChild(card);
                    });
                } else {
                    grid.innerHTML = `<p class="loading">${getUiText('noColaboradores')}</p>`;
                }
            }

            // === LOAD FAQS ===
            function renderFaqs(faqs) {
                const container = document.getElementById('faqs-container');
                container.innerHTML = '';
                const visibleFaqs = (faqs || []).filter(isItemVisible);

                if (visibleFaqs && visibleFaqs.length > 0) {
                    visibleFaqs.forEach(faq => {
                        const item = document.createElement('div');
                        item.className = 'faq-item';
                        item.innerHTML = `
                            <button class="faq-question">
                                <span>${getLocalizedString(getLocalizedString(faq.pregunta))}</span>
                                <i class="ri-arrow-down-s-line faq-icon"></i>
                            </button>
                            <div class="faq-answer">
                                <div class="faq-answer-inner">
                                    <p>${getLocalizedString(getLocalizedString(faq.respuesta))}</p>
                                </div>
                            </div>
                        `;
                        container.appendChild(item);

                        const question = item.querySelector('.faq-question');
                        const answer = item.querySelector('.faq-answer');

                        question.addEventListener('click', () => {
                            const isOpen = question.classList.contains('active');

                            // Close other open FAQs
                            document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('active'));
                            document.querySelectorAll('.faq-answer').forEach(a => a.style.maxHeight = '0');

                            if (!isOpen) {
                                question.classList.add('active');
                                answer.style.maxHeight = answer.scrollHeight + 'px';
                            }
                        });
                    });
                } else {
                    container.innerHTML = `<p class="loading">${getUiText('noFaqs')}</p>`;
                }
            }

            // === RENDER FOOTER DINÁMICO POR REGIÓN ===
            function renderFooter(footerData) {
                const footerEl = document.getElementById('site-footer');
                if (!footerEl) return;
                if (!footerData) {
                    footerEl.style.display = 'none';
                    footerEl.innerHTML = '';
                    return;
                }

                const brand = footerData.brand || {};
                const brandDesc = getLocalizedString(brand.description) || '';
                const logoText = brand.logoText || 'W';
                const logoName = brand.name || "World Wide Dev's";

                const buildLinkHtml = (link) => {
                    const label = getLocalizedString(link.label) || '';
                    if (link.page) {
                        const projParam = link.projectId ? `'${link.projectId}'` : 'null';
                        return `<a href="javascript:void(0)" class="footer-link" onclick="switchPage('${link.page}', true, ${projParam}); return false;">${label}</a>`;
                    } else if (link.action) {
                        return `<a href="javascript:void(0)" class="footer-link" onclick="${link.action}; return false;">${label}</a>`;
                    } else if (link.target) {
                        return `<a href="#${link.target}" class="footer-link" onclick="scrollToSection('${link.target}')">${label}</a>`;
                    } else if (link.url) {
                        const targetAttr = link.targetBlank !== false ? 'target="_blank" rel="noopener noreferrer"' : '';
                        return `<a href="${link.url}" ${targetAttr} class="footer-link">${label}</a>`;
                    }
                    return `<span class="footer-link">${label}</span>`;
                };

                let gridHtml = '';

                // Si trae columnGroups (diseño organizado tipo OpenAI con subsecciones agrupadas)
                if (Array.isArray(footerData.columnGroups) && footerData.columnGroups.length > 0) {
                    footerData.columnGroups.forEach(colGroup => {
                        let sectionsHtml = '';
                        (colGroup.sections || []).forEach(sec => {
                            const title = getLocalizedString(sec.title) || '';
                            let linksHtml = '';
                            (sec.links || []).forEach(link => {
                                linksHtml += buildLinkHtml(link);
                            });
                            sectionsHtml += `
                                <div class="footer-col-block">
                                    <h4 class="footer-title">${title}</h4>
                                    <div class="footer-links">
                                        ${linksHtml}
                                    </div>
                                </div>
                            `;
                        });
                        gridHtml += `
                            <div class="footer-col">
                                ${sectionsHtml}
                            </div>
                        `;
                    });
                } else {
                    // Fallback para estructura simple de columnas
                    const columns = footerData.columns || [];
                    columns.forEach(col => {
                        const colTitle = getLocalizedString(col.title) || '';
                        let linksHtml = '';
                        (col.links || []).forEach(link => {
                            linksHtml += buildLinkHtml(link);
                        });
                        gridHtml += `
                            <div class="footer-col">
                                <div class="footer-col-block">
                                    <h4 class="footer-title">${colTitle}</h4>
                                    <div class="footer-links">
                                        ${linksHtml}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

                // Redes sociales
                const socials = footerData.socials || [];
                let socialsHtml = '';
                socials.forEach(soc => {
                    socialsHtml += `
                        <a href="${soc.url || '#'}" target="_blank" rel="noopener noreferrer" class="footer-social" title="${soc.name || ''}" aria-label="${soc.name || ''}">
                            <i class="${soc.icon || 'ri-link'}"></i>
                        </a>
                    `;
                });

                // Copyright
                const copyrightText = getLocalizedString(footerData.copyright) || `© 2026 ${logoName}. Todos los derechos reservados.`;

                footerEl.innerHTML = `
                    <div class="container">
                        <div class="footer-grid">
                            ${gridHtml}
                        </div>

                        <div class="footer-bottom">
                            <div class="footer-socials">
                                ${socialsHtml}
                            </div>
                            <div class="footer-bottom-meta">
                                <p class="footer-copy">${copyrightText}</p>
                            </div>
                        </div>
                    </div>
                `;
                footerEl.style.display = '';
            }

            // === CONFIGURATION-DRIVEN UI (ORQUESTADOR) ===
            // Priorizar región/idioma de la URL sobre localStorage
            const _routeState = window._initialRouteState || {};
            let currentRegion = _routeState.region || localStorage.getItem('wwd_region') || 'latam';
            let currentLanguage = _routeState.lang || localStorage.getItem('wwd_lang') || null;
            // Guardar en localStorage para futuras visitas
            if (_routeState.region) localStorage.setItem('wwd_region', _routeState.region);
            if (_routeState.lang) localStorage.setItem('wwd_lang', _routeState.lang);
            let availableRegions = [];

            const SECTION_RENDERERS = {
                'hero-slider': (data, sectionConfig) => {
                    const container = document.getElementById('dynamic-app-container');
                    const html = `
                        <section class="hero-slider-section" id="hero-slider">
                            <div class="container hero-bento-container">
                                <!-- Showcase Principal (Carrusel Comunitario) -->
                                <div class="hero-bento-main">
                                    <div class="hero-slides-wrapper" id="hero-slides-wrapper"></div>
                                    <div class="hero-slider-controls">
                                        <div class="hero-slider-dots" id="hero-slider-dots"></div>
                                    </div>
                                </div>
                                <!-- Bento Columna Lateral (2 Tarjetas Comunitarias) -->
                                <div class="hero-bento-aside">
                                    <div class="hero-aside-card card-eventos" id="hero-card-eventos" role="button" tabindex="0">
                                        <div class="hero-aside-icon">
                                            <i class="ri-calendar-event-line"></i>
                                        </div>
                                        <i class="ri-arrow-right-line hero-aside-arrow"></i>
                                        <div class="hero-aside-content">
                                            <h3 class="hero-aside-title">${getUiText('bentoEventsTitle') || 'Próximos Eventos'}</h3>
                                            <p class="hero-aside-desc">${getUiText('bentoEventsDesc') || 'Charlas técnicas, mentorías y talleres en vivo de la comunidad.'}</p>
                                        </div>
                                    </div>
                                    <div class="hero-aside-card card-colaboradores" id="hero-card-colaboradores" role="button" tabindex="0">
                                        <div class="hero-aside-icon">
                                            <i class="ri-star-line"></i>
                                        </div>
                                        <i class="ri-arrow-right-line hero-aside-arrow"></i>
                                        <div class="hero-aside-content">
                                            <h3 class="hero-aside-title">${getUiText('bentoColabTitle') || 'Colaboradores Destacados'}</h3>
                                            <p class="hero-aside-desc">${getUiText('bentoColabDesc') || 'Conoce a los miembros y curadores que impulsan nuestra comunidad.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Fila inferior estilo BytePlus con 3 grupos destacados y botón Explorar -->
                            <div class="container hero-bento-strip" id="hero-bento-strip"></div>
                        </section>`;
                    container.insertAdjacentHTML('beforeend', html);
                    slidesWrapper = document.getElementById('hero-slides-wrapper');
                    dotsWrapper = document.getElementById('hero-slider-dots');

                    // Renderizar franja de grupos si los datos ya están disponibles
                    renderHeroGroupsStrip();

                    // Eventos de clic para las tarjetas laterales Bento
                    const cardEvents = document.getElementById('hero-card-eventos');
                    if (cardEvents) {
                        cardEvents.addEventListener('click', () => {
                            switchPage('eventos');
                        });
                    }

                    const cardColab = document.getElementById('hero-card-colaboradores');
                    if (cardColab) {
                        cardColab.addEventListener('click', () => {
                            switchPage('equipo');
                        });
                    }

                    // Soporte de gestos táctiles (Swipe) e interacción de avance en el Showcase
                    if (slidesWrapper) {
                        let touchStartX = 0;
                        let touchStartY = 0;
                        let swipedRecently = false;
                        let swipeTimeout = null;

                        slidesWrapper.addEventListener('touchstart', (e) => {
                            if (!e.changedTouches || !e.changedTouches[0]) return;
                            touchStartX = e.changedTouches[0].clientX;
                            touchStartY = e.changedTouches[0].clientY;
                        }, { passive: true });

                        slidesWrapper.addEventListener('touchend', (e) => {
                            if (!e.changedTouches || !e.changedTouches[0]) return;
                            const diffX = e.changedTouches[0].clientX - touchStartX;
                            const diffY = e.changedTouches[0].clientY - touchStartY;
                            if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
                                swipedRecently = true;
                                clearTimeout(swipeTimeout);
                                swipeTimeout = setTimeout(() => {
                                    swipedRecently = false;
                                }, 400);

                                if (diffX > 0) {
                                    prevSlide(true);
                                } else {
                                    nextSlide(true);
                                }
                            }
                        }, { passive: true });

                        slidesWrapper.addEventListener('click', (e) => {
                            if (swipedRecently) return;
                            if (e.target.closest('a, button, [role="button"]')) return;

                            // Clic en la mitad izquierda o derecha del showcase para navegar
                            const rect = slidesWrapper.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const w = rect.width;
                            if (clickX < w * 0.35) {
                                prevSlide(true);
                            } else if (clickX > w * 0.65) {
                                nextSlide(true);
                            }
                        });
                    }

                    if (data && data.length > 0) heroSlides = data;
                    renderSlides();
                    startSliderTimer();
                },
                'presentation': (data, sectionConfig) => {
                    const container = document.getElementById('dynamic-app-container');
                    const html = `
                        <section class="presentation-section" id="${sectionConfig.id}">
                            <div class="container">
                                <div class="presentation-header">
                                    <h2 class="presentation-title">${getLocalizedString(sectionConfig.title)}</h2>
                                    <p class="presentation-desc">${getLocalizedString(sectionConfig.subtitle)}</p>
                                </div>
                                <div class="presentation-grid" id="presentation-grid">
                                    <!-- Cards rendered dynamically if needed, or hardcoded for now if data is empty -->
                                </div>
                            </div>
                        </section>`;
                    container.insertAdjacentHTML('beforeend', html);
                    // Render presentation cards if they come from data, or fallback default community pillars
                    const grid = document.getElementById('presentation-grid');
                    const presentationCards = (data && data.length > 0) ? data : [
                        {
                            icono: 'ri-group-line',
                            titulo: {
                                es: 'Comunidad & Networking',
                                en: 'Community & Networking',
                                pt: 'Comunidade & Networking',
                                id: 'Komunitas & Networking',
                                ja: 'コミュニティとネットワーキング'
                            },
                            descripcion: {
                                es: 'Conecta con programadores de toda la región, comparte tus proyectos, resuelve dudas técnicas y amplía tu red profesional.',
                                en: 'Connect with developers across the region, share your projects, solve technical questions, and expand your professional network.',
                                pt: 'Conecte-se com desenvolvedores de toda a região, compartilhe seus projetos e expanda sua rede profissional.',
                                id: 'Terhubung dengan pengembang di seluruh wilayah, bagikan proyek Anda, dan perluas jaringan profesional Anda.',
                                ja: '地域の開発者とつながり、プロジェクトを共有し、技術的な疑問を解決して、専門的なネットワークを広げましょう。'
                            }
                        },
                        {
                            icono: 'ri-book-open-line',
                            titulo: {
                                es: 'Salas de Estudio & Recursos',
                                en: 'Study Rooms & Resources',
                                pt: 'Salas de Estudo & Recursos',
                                id: 'Ruang Belajar & Sumber Daya',
                                ja: '学習ルームとリソース'
                            },
                            descripcion: {
                                es: 'Accede a grupos temáticos de WhatsApp por tecnología, repositorios colaborativos, guías prácticas y materiales educativos de libre acceso.',
                                en: 'Access technology-specialized WhatsApp groups, collaborative repositories, practical guides, and free educational materials.',
                                pt: 'Acesse grupos temáticos de WhatsApp por tecnologia, repositórios colaborativos, guias práticos e materiais educativos gratuitos.',
                                id: 'Akses grup WhatsApp bertema berdasarkan teknologi, repositori kolaboratif, panduan praktis, dan materi edukasi gratis.',
                                ja: '技術別のWhatsAppグループ、共同リポジトリ、実践ガイド、無料の教育資料にアクセス。'
                            }
                        },
                        {
                            icono: 'ri-calendar-check-line',
                            titulo: {
                                es: 'Eventos & Mentorías',
                                en: 'Events & Mentorship',
                                pt: 'Eventos & Mentorias',
                                id: 'Acara & Mentorship',
                                ja: 'イベントとメンターシップ'
                            },
                            descripcion: {
                                es: 'Participa en sesiones de networking en vivo, prácticas de pitch, talleres interactivos y charlas dictadas por miembros experimentados.',
                                en: 'Participate in live networking sessions, pitch practice, interactive technical workshops, and talks by experienced members.',
                                pt: 'Participe de sessões ao vivo de networking, práticas de pitch, workshops técnicos e palestras de membros experientes.',
                                id: 'Ikuti sesi networking langsung, latihan pitch, workshop teknis interaktif, dan webinar bersama mentor berpengalaman.',
                                ja: 'ライブネットワーキング、ピッチ練習、体験型ワークショップ、経験豊富なメンバーによる講演に参加。'
                            }
                        }
                    ];

                    if (grid) {
                        grid.innerHTML = '';
                        presentationCards.forEach(card => {
                            grid.innerHTML += `
                            <div class="presentation-card">
                                <div class="presentation-card-icon"><i class="${card.icono || 'ri-star-line'}"></i></div>
                                <h3 class="presentation-card-title">${getLocalizedString(card.titulo)}</h3>
                                <p class="presentation-card-text">${getLocalizedString(card.descripcion)}</p>
                            </div>`;
                        });
                    }
                },
                'stats-strip': (data, sectionConfig) => {
                    const container = document.getElementById('dynamic-app-container');
                    const html = `
                        <section class="stats-strip" id="${sectionConfig.id}">
                            <div class="container">
                                <div class="stats-strip-grid" id="stats-grid">
                                </div>
                            </div>
                        </section>`;
                    container.insertAdjacentHTML('beforeend', html);
                    const grid = document.getElementById('stats-grid');
                    if (data && data.length > 0 && grid) {
                        data.forEach(stat => {
                            grid.innerHTML += `
                            <div class="stat-item">
                                <div class="stat-number">${stat.valor}</div>
                                <div class="stat-label">${getLocalizedString(stat.etiqueta)}</div>
                            </div>`;
                        });
                    }
                },
                'grupos-grid': (data, sectionConfig) => {
                    createSectionWrapper(sectionConfig, 'grupos-grid', 'groups');
                    renderGrupos(data);
                },
                'proyectos-grid': (data, sectionConfig) => {
                    createSectionWrapper(sectionConfig, 'proyectos-grid', 'laptop-code');
                    renderProyectos(data);
                },
                'eventos-carousel': (data, sectionConfig) => {
                    createSectionWrapper(sectionConfig, 'eventos-grid', 'calendar-alt');
                    renderEventos(data);
                },
                'admins-roster': (data, sectionConfig) => {
                    createSectionWrapper(sectionConfig, 'admins-grid', 'shield-alt');
                    renderAdmins(data);
                },
                'colaboradores-roster': (data, sectionConfig) => {
                    const visibleData = (data || []).filter(isItemVisible);
                    if (visibleData.length === 0) return;
                    createSectionWrapper(sectionConfig, 'colaboradores-grid', 'star');
                    renderColaboradores(visibleData);
                },
                'faqs-accordion': (data, sectionConfig) => {
                    createFaqWrapper(sectionConfig);
                    renderFaqs(data);
                },
                'networking-section': (data, sectionConfig) => {
                    renderNetworkingSection(data, sectionConfig);
                },
                'footer': (data, sectionConfig) => {
                    renderFooter(data);
                }
            };

            
            function renderNetworkingSection(sponsorsData, sectionConfig) {
                const container = document.getElementById('dynamic-app-container');
                let mainSec = document.getElementById('comunidad');
                if (!mainSec) {
                    mainSec = document.createElement('main');
                    mainSec.id = 'comunidad';
                    mainSec.className = 'main-section';
                    mainSec.innerHTML = '<div class="container" id="comunidad-container"></div>';
                    container.appendChild(mainSec);
                }
                const comContainer = document.getElementById('comunidad-container');

                const title = getLocalizedString(sectionConfig.title) || 'Networking & Pitches';
                const subtitle = getLocalizedString(sectionConfig.subtitle) || 'Presenta tu proyecto en vivo ante la comunidad, recibe retroalimentación constructiva y conecta con talento clave.';

                const sponsorsList = (sponsorsData && sponsorsData.length > 0) ? sponsorsData.filter(isItemVisible) : [];
                let sponsorsHtml = '';
                if (sponsorsList.length > 0) {
                    const marqueeList = [...sponsorsList, ...sponsorsList];
                    let cardsHtml = '';
                    marqueeList.forEach(sp => {
                        cardsHtml += `
                            <div class="sponsor-card" title="${sp.nombre}">
                                <div class="sponsor-logo-box">
                                    <img src="${sp.logo}" alt="${sp.nombre}" onerror="this.style.display='none'">
                                </div>
                            </div>
                        `;
                    });

                    sponsorsHtml = `
                        <div class="networking-sponsors-section">
                            <div class="networking-sponsors-header">
                                <h3 class="networking-sponsors-title">${getUiText('networkingSponsorsTitle') || 'Patrocinadores & Aliados'}</h3>
                                <p class="networking-sponsors-desc">${getUiText('networkingSponsorsDesc') || 'Empresas, herramientas y comunidades que impulsan nuestras sesiones de Networking.'}</p>
                            </div>
                            <div class="sponsors-marquee-container">
                                <div class="sponsors-marquee-track">
                                    ${cardsHtml}
                                </div>
                            </div>
                        </div>
                    `;
                }

                const sectionHtml = `
                <section id="${sectionConfig.id}" class="content-section networking-content-section">
                    <div class="section-header-flex">
                        <div class="section-header">
                            <h2 class="section-title">${title}</h2>
                            <p class="section-subtitle">${subtitle}</p>
                        </div>
                    </div>

                    <div class="networking-form-card" style="text-align: center; padding: 48px 24px; max-width: 680px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(168,85,247,0.2)); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem; color: #60a5fa;">
                            <i class="ri-rocket-2-line"></i>
                        </div>
                        <h3 style="font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 12px;">Inscripción de Proyectos</h3>
                        <p style="color: #94a3b8; font-size: 1.05rem; line-height: 1.6; max-width: 520px; margin: 0 auto 28px;">
                            Presenta tu proyecto ante la comunidad, practica tu pitch en vivo y recibe feedback de desarrolladores y líderes tech de Latinoamérica.
                        </p>
                        <a href="https://forms.gle/id2HoKcyWn6eNvcG7" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-size: 1.05rem; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600;">
                            <span>Inscribir mi Proyecto en Google Forms</span>
                            <i class="ri-external-link-line"></i>
                        </a>
                        <div style="margin-top: 24px; display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; color: #64748b; font-size: 0.9rem;">
                            <span><i class="ri-check-line" style="color: #10b981;"></i> 100% Gratuito</span>
                            <span><i class="ri-check-line" style="color: #10b981;"></i> Feedback en vivo</span>
                            <span><i class="ri-check-line" style="color: #10b981;"></i> Conecta con talento</span>
                        </div>
                    </div>

                    ${sponsorsHtml}
                </section>`;

                const existingSec = document.getElementById(sectionConfig.id);
                if (existingSec) {
                    existingSec.outerHTML = sectionHtml;
                } else {
                    comContainer.insertAdjacentHTML('beforeend', sectionHtml);
                }
            }

            function createSectionWrapper(config, targetId, icon) {
                const container = document.getElementById('dynamic-app-container');
                let mainSec = document.getElementById('comunidad');
                if (!mainSec) {
                    mainSec = document.createElement('main');
                    mainSec.id = 'comunidad';
                    mainSec.className = 'main-section';
                    mainSec.innerHTML = '<div class="container" id="comunidad-container"></div>';
                    container.appendChild(mainSec);
                }
                const comContainer = document.getElementById('comunidad-container');

                const title = getLocalizedString(config.title) || config.titleI18n;
                const subtitle = getLocalizedString(config.subtitle) || config.subtitleI18n;

                // Special handling for proyectos: regular responsive grid instead of carousel with arrows
                if (targetId === 'proyectos-grid') {
                    const html = `
                    <section id="${config.id}" class="content-section">
                        <div class="section-header-flex">
                            <div class="section-header">
                                <h2 class="section-title">${title}</h2>
                                <p class="section-subtitle">${subtitle}</p>
                            </div>
                        </div>
                        <div id="${targetId}" class="projects-grid-wrapper">
                            <div class="loading"><i class="ri-loader-4-line fa-spin"></i> ${getUiText('loading')}</div>
                        </div>
                    </section>
                    <section id="content-proyecto-detalle" class="content-section project-detail-section" style="display: none;">
                        <div id="proyecto-detalle-content"></div>
                    </section>`;
                    comContainer.insertAdjacentHTML('beforeend', html);
                    return;
                }

                const html = `
                <section id="${config.id}" class="content-section">
                    <div class="section-header-flex">
                        <div class="section-header">
                            <h2 class="section-title">${title}</h2>
                            <p class="section-subtitle">${subtitle}</p>
                        </div>
                    </div>
                    <div id="${targetId}" class="content-carousel">
                        <div class="loading"><i class="ri-loader-4-line fa-spin"></i> ${getUiText('loading')}</div>
                    </div>
                    <div class="section-carousel-nav">
                        <button class="carousel-arrow" onclick="scrollCarousel('${targetId}', -1)" aria-label="${getUiText('prevSlide')}"><i class="ri-arrow-left-s-line"></i></button>
                        <button class="carousel-arrow" onclick="scrollCarousel('${targetId}', 1)" aria-label="${getUiText('nextSlide')}"><i class="ri-arrow-right-s-line"></i></button>
                    </div>
                </section>`;
                comContainer.insertAdjacentHTML('beforeend', html);
            }

            function createFaqWrapper(config) {
                const comContainer = document.getElementById('comunidad-container');
                if (!comContainer) return;
                const title = getLocalizedString(config.title) || config.titleI18n;
                const subtitle = getLocalizedString(config.subtitle) || config.subtitleI18n;

                const html = `
                <section id="${config.id}" class="content-section">
                    <div class="section-header-flex">
                        <div class="section-header">
                            <h2 class="section-title">${title}</h2>
                            <p class="section-subtitle">${subtitle}</p>
                        </div>
                    </div>
                    <div class="faqs-container" id="faqs-container">
                        <div class="loading"><i class="ri-loader-4-line fa-spin"></i> ${getUiText('loading')}</div>
                    </div>
                </section>`;
                comContainer.insertAdjacentHTML('beforeend', html);
            }

            async function initOrchestrator() {
                // Cargar UI Texts
                try {
                    const uiRes = await fetch('/data/ui.json?t=' + new Date().getTime());
                    if (uiRes.ok) {
                        UI_TEXTS = await uiRes.json();
                    }
                } catch(e) {
                    console.error('Error cargando ui.json', e);
                }

                try {
                    // 1. Cargar catálogo de regiones
                    const catalogRes = await fetch(`/data/regions.json?t=${new Date().getTime()}`);
                    if (!catalogRes.ok) throw new Error('No se pudo cargar regions.json');
                    const catalog = await catalogRes.json();
                    availableRegions = catalog.regions || [];

                    if (!availableRegions.find(r => r.id === currentRegion)) {
                        currentRegion = catalog.defaultRegion || 'latam';
                    }

                    setupCustomLocaleSelector();
                    updateStaticUiI18n();
                    await loadRegionData(currentRegion);
                    updateStaticUiI18n();
                    applyPageVisibility();
                } catch (error) {
                    console.error("Error al inicializar el orquestador CDUI:", error);
                }
            }

            function setupCustomLocaleSelector() {
                const trigger = document.getElementById('locale-dropdown-trigger');
                const dropdown = document.getElementById('locale-dropdown-menu');
                const regionsList = document.getElementById('locale-regions-list');
                const languagesList = document.getElementById('locale-languages-list');
                const mobRegionsList = document.getElementById('mobile-regions-list');
                const mobLanguagesList = document.getElementById('mobile-languages-list');

                if (!trigger || !dropdown) return;

                updateLocaleLabel();

                const regionMeta = {
                    latam: { name: 'Latinoamérica' },
                    jp: { name: 'Japón' }
                };

                const langNames = {
                    es: 'Español',
                    en: 'English',
                    pt: 'Português',
                    ja: '日本語'
                };

                // Render regions (sin iconos ni emojis)
                if (regionsList) {
                    regionsList.innerHTML = '';
                    availableRegions.forEach(r => {
                        const meta = regionMeta[r.id] || { name: r.nombre || r.id.toUpperCase() };
                        const isActive = r.id === currentRegion;
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = `locale-option-item ${isActive ? 'active' : ''}`;
                        btn.setAttribute('data-region', r.id);
                        btn.innerHTML = `<span class="locale-option-name">${r.nombre || meta.name}</span>`;
                        btn.addEventListener('click', () => {
                            if (r.id !== currentRegion) {
                                const newRegion = r.id;
                                const currLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : (currentLanguage || 'es');
                                let newLang = currLang;
                                if (!r.idiomasDisponibles || !r.idiomasDisponibles.includes(currLang)) {
                                    newLang = r.idiomaPrincipal || (r.idiomasDisponibles && r.idiomasDisponibles[0]) || 'es';
                                }
                                localStorage.setItem('wwd_region', newRegion);
                                localStorage.setItem('wwd_lang', newLang);
                                const parsed = parseRoutePath(window.location.pathname);
                                const targetPage = SLUG_TO_PAGE[parsed.pageSlug] || window.currentPageView || 'presentacion';
                                const newUrl = buildRoutePath(newRegion, newLang, targetPage);
                                window.location.href = newUrl;
                            }
                        });
                        regionsList.appendChild(btn);
                    });
                }

                // Render mobile regions
                if (mobRegionsList) {
                    mobRegionsList.innerHTML = '';
                    availableRegions.forEach(r => {
                        const meta = regionMeta[r.id] || { name: r.nombre || r.id.toUpperCase() };
                        const isActive = r.id === currentRegion;
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = `mobile-locale-btn ${isActive ? 'active' : ''}`;
                        btn.setAttribute('data-region', r.id);
                        btn.innerHTML = `<span>${r.nombre || meta.name}</span>`;
                        btn.addEventListener('click', () => {
                            if (r.id !== currentRegion) {
                                const newRegion = r.id;
                                const currLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : (currentLanguage || 'es');
                                let newLang = currLang;
                                if (!r.idiomasDisponibles || !r.idiomasDisponibles.includes(currLang)) {
                                    newLang = r.idiomaPrincipal || (r.idiomasDisponibles && r.idiomasDisponibles[0]) || 'es';
                                }
                                localStorage.setItem('wwd_region', newRegion);
                                localStorage.setItem('wwd_lang', newLang);
                                closeMobileMenu();
                                const parsed = parseRoutePath(window.location.pathname);
                                const targetPage = SLUG_TO_PAGE[parsed.pageSlug] || window.currentPageView || 'presentacion';
                                const newUrl = buildRoutePath(newRegion, newLang, targetPage);
                                window.location.href = newUrl;
                            }
                        });
                        mobRegionsList.appendChild(btn);
                    });
                }

                // Render languages for current region (sin iconos ni emojis)
                if (languagesList) {
                    languagesList.innerHTML = '';
                    const currentRegionObj = availableRegions.find(r => r.id === currentRegion);
                    const currentLang = getCurrentLanguage();
                    if (currentRegionObj && currentRegionObj.idiomasDisponibles) {
                        currentRegionObj.idiomasDisponibles.forEach(langCode => {
                            const isActive = langCode === currentLang;
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = `locale-option-item ${isActive ? 'active' : ''}`;
                            btn.setAttribute('data-lang', langCode);
                            btn.innerHTML = `
                                <span class="locale-option-name">${langNames[langCode] || langCode}</span>
                                <span class="locale-option-badge">${langCode.toUpperCase()}</span>
                            `;
                            btn.addEventListener('click', () => {
                                if (langCode !== currentLang) {
                                    localStorage.setItem('wwd_lang', langCode);
                                    const parsed = parseRoutePath(window.location.pathname);
                                    const targetPage = SLUG_TO_PAGE[parsed.pageSlug] || window.currentPageView || 'presentacion';
                                    const newUrl = buildRoutePath(currentRegion, langCode, targetPage);
                                    window.location.href = newUrl;
                                }
                            });
                            languagesList.appendChild(btn);
                        });
                    }
                }

                // Render mobile languages
                if (mobLanguagesList) {
                    mobLanguagesList.innerHTML = '';
                    const currentRegionObj = availableRegions.find(r => r.id === currentRegion);
                    const currentLang = getCurrentLanguage();
                    if (currentRegionObj && currentRegionObj.idiomasDisponibles) {
                        currentRegionObj.idiomasDisponibles.forEach(langCode => {
                            const isActive = langCode === currentLang;
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = `mobile-locale-btn ${isActive ? 'active' : ''}`;
                            btn.setAttribute('data-lang', langCode);
                            btn.innerHTML = `<span>${langNames[langCode] || langCode}</span>`;
                            btn.addEventListener('click', () => {
                                if (langCode !== currentLang) {
                                    localStorage.setItem('wwd_lang', langCode);
                                    closeMobileMenu();
                                    const parsed = parseRoutePath(window.location.pathname);
                                    const targetPage = SLUG_TO_PAGE[parsed.pageSlug] || window.currentPageView || 'presentacion';
                                    const newUrl = buildRoutePath(currentRegion, langCode, targetPage);
                                    window.location.href = newUrl;
                                }
                            });
                            mobLanguagesList.appendChild(btn);
                        });
                    }
                }

                // Toggle dropdown
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    const isOpen = dropdown.classList.contains('open');
                    if (isOpen) {
                        dropdown.classList.remove('open');
                        trigger.classList.remove('open');
                        trigger.setAttribute('aria-expanded', 'false');
                    } else {
                        dropdown.classList.add('open');
                        trigger.classList.add('open');
                        trigger.setAttribute('aria-expanded', 'true');
                    }
                };

                // Close on click outside
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
                        dropdown.classList.remove('open');
                        trigger.classList.remove('open');
                        trigger.setAttribute('aria-expanded', 'false');
                    }
                });

                // Close on Escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && dropdown.classList.contains('open')) {
                        dropdown.classList.remove('open');
                        trigger.classList.remove('open');
                        trigger.setAttribute('aria-expanded', 'false');
                    }
                });
            }

            async function loadRegionData(regionId) {
                try {
                    const config = await fetch(`/data/${regionId}/config.json?t=${new Date().getTime()}`).then(r => r.json());
                    window._WWD_CONFIG = config;
                    const container = document.getElementById('dynamic-app-container');
                    if (container) container.innerHTML = '';

                    updateStaticUiI18n();

                    for (const section of config.sections) {
                        const renderer = SECTION_RENDERERS[section.type];
                        if (renderer) {
                            if (section.dataFile) {
                                const dataRes = await fetch(`/data/${regionId}/${section.dataFile}?t=${new Date().getTime()}`);
                                if (dataRes.ok) {
                                    const rawData = await dataRes.json();
                                    const data = Array.isArray(rawData) ? rawData.filter(isItemVisible) : rawData;
                                    if (window._WWD_DATA) window._WWD_DATA[section.dataFile.replace('.json', '')] = data;
                                    renderer(data, section);
                                } else {
                                    console.warn(`Datos no encontrados para: ${section.dataFile}`);
                                    renderer([], section);
                                }
                            } else {
                                renderer([], section);
                            }
                        }
                    }

                    // Cargar recursos de la región correspondiente
                    try {
                        const recRes = await fetch(`/data/${regionId}/resources.json?t=${new Date().getTime()}`);
                        if (recRes.ok) {
                            const rawRec = await recRes.json();
                            const recData = Array.isArray(rawRec) ? rawRec.filter(isItemVisible) : rawRec;
                            if (window._WWD_DATA) window._WWD_DATA.recursos = recData;
                        }
                    } catch (e) { }

                    // Cargar footer de la región correspondiente si no se procesó en config.sections
                    if (!window._WWD_DATA || !window._WWD_DATA.footer) {
                        try {
                            const footRes = await fetch(`/data/${regionId}/footer.json?t=${new Date().getTime()}`);
                            if (footRes.ok) {
                                const footData = await footRes.json();
                                if (window._WWD_DATA) window._WWD_DATA.footer = footData;
                                renderFooter(footData);
                            }
                        } catch (e) { }
                    }

                    updateStaticUiI18n();
                } catch (error) {
                    console.error(`Error cargando región ${regionId}:`, error);
                }
            }

            // Inicializar el orquestador
            initOrchestrator();

            // === LOGICA DE CUENTA REGRESIVA GLOBAL ===

            function updateCountdowns() {
                const elements = document.querySelectorAll('[data-countdown]');
                elements.forEach(el => {
                    const targetDateStr = el.getAttribute('data-countdown');
                    if (!targetDateStr) return;

                    const targetDate = parseDateInCentralTime(targetDateStr);
                    const now = new Date();
                    const diff = targetDate.getTime() - now.getTime();

                    if (diff <= 0) {
                        if (el.classList.contains('hero-countdown')) {
                            el.innerHTML = `<div class="countdown-finished-badge" style="margin-top: 0;"><i class="fas fa-satellite-dish fa-fade"></i> ¡Evento en vivo!</div>`;
                        } else {
                            el.className = 'countdown-finished-badge';
                            el.innerHTML = `<i class="fas fa-satellite-dish fa-fade"></i> ¡En vivo!`;
                        }
                        return;
                    }

                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                    const daysValEl = el.querySelector('.countdown-days');
                    const hoursValEl = el.querySelector('.countdown-hours');
                    const minutesValEl = el.querySelector('.countdown-minutes');
                    const secondsValEl = el.querySelector('.countdown-seconds');

                    if (daysValEl && hoursValEl && minutesValEl && secondsValEl) {
                        daysValEl.textContent = String(days).padStart(2, '0');
                        hoursValEl.textContent = String(hours).padStart(2, '0');
                        minutesValEl.textContent = String(minutes).padStart(2, '0');
                        secondsValEl.textContent = String(seconds).padStart(2, '0');
                    } else {
                        el.innerHTML = `<i class="fas fa-clock"></i> Faltan: ${days}d ${hours}h ${minutes}m ${seconds}s`;
                    }
                });
            }

            updateCountdowns();
            setInterval(updateCountdowns, 1000);
        });

        // === PREVENIR ZOOM EN EL SITIO WEB (GESTOS TÁCTILES Y ATAJOS DE TECLADO/MOUSE) ===
        // Bloquear gestos de pellizco (pinch-to-zoom en Safari iOS / Android)
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

        // Bloquear doble toque para zoom en móviles
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (e) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Bloquear zoom con Ctrl + rueda del mouse
        window.addEventListener('wheel', function (e) {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // Bloquear atajos de zoom de teclado (Ctrl + +, Ctrl + -, Ctrl + 0)
        window.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
                e.preventDefault();
            }
        });

        // ========================================================
        // ASISTENTE DE CHAT CON IA (Byte — Streaming & ChatGPT UI)
        // ========================================================
        const OPENROUTER_API_KEY = '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';
        const OPENROUTER_MODELS = [
            'minimax/minimax-m3:free',
            'nvidia/nemotron-3.5-lightning:free',
            'poolside/laguna-s-2.1:free',
            'deepseek/deepseek-chat'
        ];

        let aiChatOpen = false;
        let aiChatHistory = [];
        let aiIsGenerating = false;
        let aiAbortController = null;

        function toggleAIChat() {
            aiChatOpen = !aiChatOpen;
            const windowEl = document.getElementById('ai-chat-window');
            const backdropEl = document.getElementById('ai-chat-backdrop');
            const chevron = document.getElementById('ai-bar-chevron');

            if (!windowEl) return;

            if (aiChatOpen) {
                windowEl.classList.add('open');
                windowEl.setAttribute('aria-hidden', 'false');
                if (backdropEl) {
                    backdropEl.classList.add('active');
                    backdropEl.setAttribute('aria-hidden', 'false');
                }
                if (chevron) chevron.className = 'ri-arrow-down-s-line';

                if (aiChatHistory.length === 0) {
                    renderAIWelcomeMessage();
                }

                setTimeout(() => {
                    const isMobile = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
                    if (!isMobile) {
                        const inputEl = document.getElementById('ai-chat-input');
                        if (inputEl) inputEl.focus();
                    }
                }, 200);
            } else {
                windowEl.classList.remove('open');
                windowEl.setAttribute('aria-hidden', 'true');
                if (backdropEl) {
                    backdropEl.classList.remove('active');
                    backdropEl.setAttribute('aria-hidden', 'true');
                }
                if (chevron) chevron.className = 'ri-arrow-up-s-line';
            }
        }

        function clearAIChat() {
            if (aiIsGenerating) abortAIGeneration();
            aiChatHistory = [];
            renderAIWelcomeMessage();
        }

        function renderAIWelcomeMessage() {
            const messagesContainer = document.getElementById('ai-chat-messages');
            if (!messagesContainer) return;

            messagesContainer.innerHTML = `
                <div class="ai-empty-state">
                    <div class="ai-empty-title">¿En qué puedo ayudarte hoy?</div>
                    <div class="ai-empty-desc">Pregúntale a Byte Mini sobre los grupos de WhatsApp, recursos de programación, networking o la comunidad.</div>
                    
                    <div class="ai-prompts-grid">
                        <div class="ai-prompt-card" onclick="sendAIQuickPrompt('¿Cuáles son todos los grupos de WhatsApp disponibles y sus enlaces?')">
                            <div class="ai-prompt-card-icon"><i class="ri-whatsapp-line"></i></div>
                            <div class="ai-prompt-card-title">Grupos de WhatsApp</div>
                            <div class="ai-prompt-card-subtitle">Ver enlaces directos por tecnología</div>
                        </div>
                        <div class="ai-prompt-card" onclick="sendAIQuickPrompt('¿Cómo funcionan las sesiones de Networking de los viernes y cómo me inscribo?')">
                            <div class="ai-prompt-card-icon"><i class="ri-macbook-line"></i></div>
                            <div class="ai-prompt-card-title">Networking de los viernes</div>
                            <div class="ai-prompt-card-subtitle">Presenta proyectos y recibe feedback</div>
                        </div>
                        <div class="ai-prompt-card" onclick="sendAIQuickPrompt('¿Qué carpetas de recursos gratuitos de estudio en Google Drive tienen?')">
                            <div class="ai-prompt-card-icon"><i class="fas fa-folder-open"></i></div>
                            <div class="ai-prompt-card-title">Recursos de estudio</div>
                            <div class="ai-prompt-card-subtitle">Carpetas en Google Drive</div>
                        </div>
                        <div class="ai-prompt-card" onclick="sendAIQuickPrompt('¿Quiénes son los administradores y cuáles son las normas de la comunidad?')">
                            <div class="ai-prompt-card-icon"><i class="fas fa-shield-halved"></i></div>
                            <div class="ai-prompt-card-title">Equipo y Normas</div>
                            <div class="ai-prompt-card-subtitle">Admins, roles y reglas</div>
                        </div>
                    </div>
                </div>
            `;
            messagesContainer.scrollTop = 0;
        }

        function sendAIQuickPrompt(promptText) {
            const inputEl = document.getElementById('ai-chat-input');
            if (inputEl) {
                inputEl.value = promptText;
                handleAIChatSubmit(new Event('submit'));
            }
        }

        function handleAIChatInputChange() {
            // Placeholder para futuras validaciones dinámicas
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function copyCode(btn) {
            const block = btn.closest('.ai-code-block');
            const pre = block ? block.querySelector('pre code') : null;
            if (pre) {
                navigator.clipboard.writeText(pre.textContent).then(() => {
                    btn.innerHTML = '<i class="ri-check-line"></i> Copiado';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="far fa-copy"></i> Copiar';
                    }, 2000);
                });
            }
        }

        function copyMessageText(btn) {
            const wrap = btn.closest('.ai-msg-content-wrap');
            const bubble = wrap ? wrap.querySelector('.ai-bot-bubble') : null;
            if (bubble) {
                navigator.clipboard.writeText(bubble.innerText).then(() => {
                    btn.innerHTML = '<i class="ri-check-line"></i> Copiado';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="far fa-copy"></i>';
                    }, 2000);
                });
            }
        }

        function formatAIMarkdown(rawText) {
            if (!rawText) return '';

            // 0. Extraer y formatear procesos de pensamiento (DeepThink / <think> / Thinking Process)
            const thoughtBlocks = [];
            let text = rawText;

            // Formato 1: Etiquetas estándar de razonamiento (<think>...</think>)
            text = text.replace(/<think>([\s\S]*?)(?:<\/think>|$)/gi, function (match, thoughtContent) {
                const id = `__THOUGHT_BLOCK_${thoughtBlocks.length}__`;
                const content = thoughtContent.trim();
                if (content) {
                    thoughtBlocks.push(
                        `<details class="ai-thought-block">` +
                        `<summary class="ai-thought-summary">` +
                        `<span class="ai-thought-label"><i class="fas fa-brain"></i> Proceso de razonamiento</span>` +
                        `<i class="ri-arrow-down-s-line ai-thought-chevron"></i>` +
                        `</summary>` +
                        `<div class="ai-thought-content">${formatAIMarkdownInner(content)}</div>` +
                        `</details>`
                    );
                    return id;
                }
                return '';
            });

            // Formato 2: Encabezados en texto plano ("Here's a thinking process:" / "Thinking Process:")
            text = text.replace(/^(?:Here\'s a thinking process:|Thinking Process:|Proceso de pensamiento:|Proceso de razonamiento:)[\s\S]*?(?=\n\n(?:[A-Z¿¡#1-9]|$))/i, function (match) {
                const id = `__THOUGHT_BLOCK_${thoughtBlocks.length}__`;
                thoughtBlocks.push(
                    `<details class="ai-thought-block">` +
                    `<summary class="ai-thought-summary">` +
                    `<span class="ai-thought-label"><i class="fas fa-brain"></i> Proceso de razonamiento</span>` +
                    `<i class="ri-arrow-down-s-line ai-thought-chevron"></i>` +
                    `</summary>` +
                    `<div class="ai-thought-content">${formatAIMarkdownInner(match.trim())}</div>` +
                    `</details>`
                );
                return id;
            });

            let html = formatAIMarkdownInner(text);

            // Restaurar bloques de pensamiento
            thoughtBlocks.forEach((thoughtHtml, idx) => {
                html = html.split(`__THOUGHT_BLOCK_${idx}__`).join(thoughtHtml);
            });

            // Limpieza de saltos antes y después del bloque de pensamiento
            html = html.replace(/(?:<br>)*(<details class="ai-thought-block">[\s\S]*?<\/details>)(?:<br>)*/g, '$1');

            return html;
        }

        function formatAIMarkdownInner(rawText) {
            if (!rawText) return '';

            // 1. Proteger bloques de código ```lang\ncode\n```
            const codeBlocks = [];
            let text = rawText.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (match, lang, code) {
                const id = `@@@CODEBLOCK${codeBlocks.length}@@@`;
                const language = lang.trim() || 'código';
                const escapedCode = escapeHtml(code.trim());
                codeBlocks.push(
                    `<div class="ai-code-block">` +
                    `<div class="ai-code-header"><span>${escapeHtml(language)}</span><button type="button" onclick="copyCode(this)" class="ai-copy-btn"><i class="far fa-copy"></i> Copiar</button></div>` +
                    `<pre><code>${escapedCode}</code></pre>` +
                    `</div>`
                );
                return id;
            });

            // 2. Proteger código inline `code`
            const inlineCodes = [];
            text = text.replace(/`([^`\n]+)`/g, function (match, inlineCode) {
                const id = `@@@INLINECODE${inlineCodes.length}@@@`;
                inlineCodes.push(`<code class="ai-inline-code">${escapeHtml(inlineCode)}</code>`);
                return id;
            });

            // 3. Sanitizar todo el contenido restante para prevenir inyección HTML / XSS
            text = escapeHtml(text);

            // 4. Tablas Markdown (Procesador línea por línea robusto)
            const lines = text.split('\n');
            const processedLines = [];

            const isSeparator = (line) => {
                const stripped = line.trim().replace(/^\||\|$/g, '').trim();
                if (!stripped) return false;
                const parts = stripped.split('|').map(p => p.trim());
                return parts.length > 0 && parts.every(p => /^:?-+:?$/.test(p));
            };

            const isTableRow = (line) => {
                const stripped = line.trim();
                return stripped.includes('|') && !stripped.startsWith('```');
            };

            const splitCells = (line) => {
                let stripped = line.trim();
                if (stripped.startsWith('|')) stripped = stripped.slice(1);
                if (stripped.endsWith('|')) stripped = stripped.slice(0, -1);
                return stripped.split('|').map(c => c.trim());
            };

            let i = 0;
            while (i < lines.length) {
                const line = lines[i];
                if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
                    const headers = splitCells(line);
                    i += 2;
                    const rows = [];
                    while (i < lines.length && isTableRow(lines[i]) && !isSeparator(lines[i])) {
                        if (lines[i].trim()) {
                            rows.push(splitCells(lines[i]));
                        }
                        i++;
                    }

                    let tableHtml = '<div class="ai-table-wrapper"><table class="ai-table"><thead><tr>';
                    headers.forEach(h => {
                        tableHtml += `<th>${h}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';

                    rows.forEach(r => {
                        tableHtml += '<tr>';
                        headers.forEach((h, colIdx) => {
                            const cellVal = r[colIdx] !== undefined ? r[colIdx] : '';
                            tableHtml += `<td>${cellVal}</td>`;
                        });
                        tableHtml += '</tr>';
                    });

                    tableHtml += '</tbody></table></div>';
                    processedLines.push(tableHtml);
                } else {
                    processedLines.push(line);
                    i++;
                }
            }

            let html = processedLines.join('\n');

            // 5. Citas / Blockquotes (> Cita o &gt; Cita)
            html = html.replace(/(?:^|\n)(?:>|&gt;) (.*$)/gim, '<blockquote class="ai-quote"><i class="fas fa-quote-left ai-quote-icon"></i> <span>$1</span></blockquote>');

            // 6. Líneas divisorias horizontales (---, ***, ___)
            html = html.replace(/^(?:---|___|\*\*\*)$/gim, '<hr class="ai-hr">');

            // 7. Checklists / Tareas (- [x] o - [ ])
            html = html.replace(/^[\*\-] \[x\] (.*$)/gim, '<div class="ai-task checked"><i class="ri-check-line-square"></i> <span>$1</span></div>');
            html = html.replace(/^[\*\-] \[ \] (.*$)/gim, '<div class="ai-task"><i class="far fa-square"></i> <span>$1</span></div>');

            // 8. Títulos con encabezados (# H1, ## H2, ### H3, #### H4)
            html = html.replace(/^#### (.*$)/gim, '<h5 class="ai-h4">$1</h5>');
            html = html.replace(/^### (.*$)/gim, '<h4 class="ai-h3">$1</h4>');
            html = html.replace(/^## (.*$)/gim, '<h3 class="ai-h2">$1</h3>');
            html = html.replace(/^# (.*$)/gim, '<h2 class="ai-h1">$1</h2>');

            // 9. Listas no ordenadas (*, -, +)
            html = html.replace(/^[\*\-\+] (.*$)/gim, '<li class="ai-list-item"><span class="ai-list-bullet">•</span>$1</li>');

            // 10. Listas numeradas (1. Item, 2. Item)
            html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="ai-num-item" value="$1"><span class="ai-num-badge">$1.</span>$2</li>');

            // 11. Links enriquecidos (WhatsApp, Drive, genéricos)
            html = html.replace(/\[([^\]]+)\]\((https?:\/\/chat\.whatsapp\.com\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-wa-link"><i class="ri-whatsapp-line"></i> $1</a>');
            html = html.replace(/\[([^\]]+)\]\((https?:\/\/drive\.google\.com\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-drive-link"><i class="fab fa-google-drive"></i> $1</a>');
            html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-generic-link">$1 <i class="fas fa-external-link-alt" style="font-size:0.7em;"></i></a>');

            // Auto-link standalone URLs not already in <a> tags
            html = html.replace(/(^|[^">])(https?:\/\/chat\.whatsapp\.com\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-wa-link"><i class="ri-whatsapp-line"></i> Unirse al grupo</a>');
            html = html.replace(/(^|[^">])(https?:\/\/drive\.google\.com\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-drive-link"><i class="fab fa-google-drive"></i> Ver carpeta</a>');
            html = html.replace(/(^|[^">])(https?:\/\/(?!chat\.whatsapp\.com|drive\.google\.com)[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-generic-link">$2</a>');

            // 12. Estilos de texto (Bold, Italic, Strikethrough)
            html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
            html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
            html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
            html = html.replace(/(?:^|\s)_([^_\n]+)_(?:\s|$)/g, ' <em>$1</em> ');
            html = html.replace(/~~([^~]+)~~/g, '<del class="ai-del">$1</del>');

            // 13. Salto de línea
            html = html.replace(/\n/g, '<br>');

            // Limpieza de saltos de línea innecesarios alrededor de bloques
            html = html.replace(/(?:<br>)*(<div class="ai-table-wrapper">[\s\S]*?<\/div>)(?:<br>)*/g, '$1');
            html = html.replace(/(?:<br>)*(<hr class="ai-hr">)(?:<br>)*/g, '$1');
            html = html.replace(/(?:<br>)*(<blockquote class="ai-quote">[\s\S]*?<\/blockquote>)(?:<br>)*/g, '$1');

            // 14. Restaurar bloques de código y código inline (escapados y seguros)
            inlineCodes.forEach((codeHtml, idx) => {
                html = html.split(`@@@INLINECODE${idx}@@@`).join(codeHtml);
            });

            codeBlocks.forEach((blockHtml, idx) => {
                html = html.split(`@@@CODEBLOCK${idx}@@@`).join(blockHtml);
            });

            return html;
        }

        function appendUserMessage(text) {
            const messagesContainer = document.getElementById('ai-chat-messages');
            if (!messagesContainer) return;

            if (messagesContainer.querySelector('.ai-empty-state')) {
                messagesContainer.innerHTML = '';
            }

            const row = document.createElement('div');
            row.className = 'ai-msg-row user';
            row.innerHTML = `
                <div class="ai-msg-content-wrap">
                    <div class="ai-user-bubble">${escapeHtml(text)}</div>
                </div>
            `;
            messagesContainer.appendChild(row);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function createBotMessagePlaceholder() {
            const messagesContainer = document.getElementById('ai-chat-messages');
            if (!messagesContainer) return null;

            const row = document.createElement('div');
            row.className = 'ai-msg-row bot';
            row.innerHTML = `
                <div class="ai-msg-content-wrap">
                    <div class="ai-bot-bubble"><span class="ai-streaming-cursor"></span></div>
                    <div class="ai-msg-actions" style="display:none;">
                        <button type="button" class="ai-msg-action-btn" onclick="copyMessageText(this)" title="Copiar mensaje">
                            <i class="far fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(row);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return row;
        }

        function updateBotMessageContent(row, text, isFinal = false) {
            if (!row) return;
            const bubble = row.querySelector('.ai-bot-bubble');
            const actions = row.querySelector('.ai-msg-actions');

            if (bubble) {
                if (isFinal) {
                    bubble.innerHTML = formatAIMarkdown(text);
                    if (actions) actions.style.display = 'flex';
                } else {
                    bubble.innerHTML = formatAIMarkdown(text) + '<span class="ai-streaming-cursor"></span>';
                }
            }

            const messagesContainer = document.getElementById('ai-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }

        function abortAIGeneration() {
            if (aiAbortController) {
                aiAbortController.abort();
                aiAbortController = null;
            }
            setGeneratingState(false);
        }

        function setGeneratingState(generating) {
            aiIsGenerating = generating;
            const actionBtn = document.getElementById('ai-chat-action-btn');
            const icon = document.getElementById('ai-action-icon');
            const input = document.getElementById('ai-chat-input');

            if (generating) {
                if (actionBtn) {
                    actionBtn.className = 'ai-chat-action-btn stop';
                    actionBtn.title = 'Detener generación';
                }
                if (icon) icon.className = 'fas fa-square';
            } else {
                if (actionBtn) {
                    actionBtn.className = 'ai-chat-action-btn send';
                    actionBtn.title = 'Enviar mensaje';
                }
                if (icon) icon.className = 'ri-arrow-up-line';
                const isMobile = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
                if (!isMobile && input) input.focus();
            }
        }

        function getUserRealtimeContext() {
            const now = new Date();

            // Zona horaria y localización del usuario
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            const userLocale = navigator.language || 'es-ES';

            // Mapeo detallado de zonas horarias a países de habla hispana y América
            const timezoneToCountry = {
                'America/Mexico_City': 'México (Centro)',
                'America/Monterrey': 'México (Norte)',
                'America/Cancun': 'México (Sureste)',
                'America/Tijuana': 'México (Baja California)',
                'America/Bogota': 'Colombia',
                'America/Lima': 'Perú',
                'America/Buenos_Aires': 'Argentina',
                'America/Argentina/Cordoba': 'Argentina',
                'America/Santiago': 'Chile',
                'America/Caracas': 'Venezuela',
                'America/La_Paz': 'Bolivia',
                'America/Quito': 'Ecuador',
                'America/Guayaquil': 'Ecuador',
                'America/Asuncion': 'Paraguay',
                'America/Montevideo': 'Uruguay',
                'America/Santo_Domingo': 'República Dominicana',
                'America/Guatemala': 'Guatemala',
                'America/Tegucigalpa': 'Honduras',
                'America/San_Salvador': 'El Salvador',
                'America/Managua': 'Nicaragua',
                'America/Costa_Rica': 'Costa Rica',
                'America/Panama': 'Panamá',
                'America/Havana': 'Cuba',
                'America/Puerto_Rico': 'Puerto Rico',
                'Europe/Madrid': 'España',
                'Atlantic/Canary': 'España (Canarias)',
                'America/New_York': 'Estados Unidos (Hora Este)',
                'America/Chicago': 'Estados Unidos (Hora Centro)',
                'America/Denver': 'Estados Unidos (Hora Montaña)',
                'America/Los_Angeles': 'Estados Unidos (Hora Pacífico)'
            };

            const country = timezoneToCountry[userTimezone] || (userTimezone.includes('/') ? userTimezone.split('/')[1].replace(/_/g, ' ') : userTimezone);

            // Offset UTC del usuario
            const offsetMin = -now.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(offsetMin) / 60);
            const offsetRemainingMin = Math.abs(offsetMin) % 60;
            const offsetSign = offsetMin >= 0 ? '+' : '-';
            const offsetStr = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetRemainingMin.toString().padStart(2, '0')}`;

            // Fecha y hora local del usuario formateada
            const userLocalDate = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const userLocalTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

            // Fecha y hora en Hora Centro USA (CST/CDT) - Referencia de la comunidad
            let centralDate = '';
            let centralTime = '';
            try {
                centralDate = now.toLocaleDateString('es-ES', { timeZone: 'America/Chicago', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                centralTime = now.toLocaleTimeString('es-ES', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) {
                centralDate = userLocalDate;
                centralTime = userLocalTime;
            }

            return {
                nowIso: now.toISOString(),
                userDate: userLocalDate,
                userTime: userLocalTime,
                userTimezone: userTimezone,
                country: country,
                offset: offsetStr,
                centralDate: centralDate,
                centralTime: centralTime,
                userLocale: userLocale
            };
        }

        function buildSystemPrompt() {
            const data = window._WWD_DATA || {};
            const ctx = getUserRealtimeContext();

            let prompt = `Eres "Byte Mini", la versión rápida y compacta del asistente oficial de Inteligencia Artificial de "World Wide Dev's" (WWD), una comunidad de programación, tecnología y desarrollo de software para Latinoamérica y todo el mundo hispanohablante.

CONTEXTO TEMPORAL Y DE UBICACIÓN ACTUAL DEL USUARIO:
- Fecha actual del usuario: ${ctx.userDate}
- Hora actual del usuario: ${ctx.userTime} (${ctx.offset}, Zona horaria: ${ctx.userTimezone})
- País / Región estimada del usuario: ${ctx.country}
- Idioma preferido: ${ctx.userLocale}
- Fecha y hora actual en la sede de la comunidad (Hora Centro USA / CST-CDT): ${ctx.centralDate}, ${ctx.centralTime}

PAUTAS DE RESPUESTA Y FORMATO VISUAL OBLIGATORIO:
1. TABLAS COMPARATIVAS Y RESÚMENES: Siempre que el usuario solicite un cuadro comparativo, tabla, resumen estructurado, lista o comparativa de cualquier tema (grupos, recursos, eventos, diferencias de lenguajes, etc.), DEBES generar OBLIGATORIAMENTE una TABLA MARKDOWN estándar completa con encabezados y separadores (ejemplo: | Columna 1 | Columna 2 |\\n| --- | --- |\\n| Fila 1 | Fila 2 |).
2. ENCABEZADOS Y ESTRUCTURA: Emplea encabezados Markdown (## y ###) para jerarquizar los temas de manera visual.
3. CITAS Y NOTAS: Usa citas con "> " para notas destacadas, advertencias o aclaraciones de interés.
4. TAREAS Y CHECKLISTS: Usa listas con casillas de verificación "- [x] " y "- [ ] " para pasos o listas de tareas.
5. Consciencia temporal activa: Tienes conocimiento exacto del día y la hora actual. Puedes calcular cuántos días u horas faltan para próximos eventos (ej. las sesiones de networking de los viernes a las 6:00 PM CST).
6. Adaptación horaria: Si te preguntan por horarios de eventos, explica la hora en Hora Centro USA (referencia oficial) y también indícale la hora equivalente en la zona horaria del usuario (${ctx.userTimezone} / ${ctx.country}).
7. Saludo contextual: Si saludas, utiliza el momento del día del usuario (buenos días / buenas tardes / buenas noches).
8. Enlaces oficiales: Si te preguntan por grupos o recursos, proporciona SIEMPRE los enlaces en formato Markdown [Texto](URL).
9. Responde de forma cordial, concisa, cercana, profesional, altamente visual y en español.

BASE DE DATOS OFICIAL DE WORLD WIDE DEV'S:
`;

            if (Array.isArray(data.grupos) && data.grupos.length) {
                prompt += `\n### GRUPOS DE WHATSAPP DISPONIBLES (${data.grupos.length} grupos):\n`;
                data.grupos.forEach(g => {
                    prompt += `- **${g.titulo}**: ${g.descripcion} (Idiomas: ${(g.idiomas || []).join(', ')}) -> Enlace: ${g.link}\n`;
                });
            }

            if (Array.isArray(data.recursos) && data.recursos.length) {
                prompt += `\n### RECURSOS Y MATERIALES DE ESTUDIO EN GOOGLE DRIVE:\n`;
                data.recursos.forEach(r => {
                    prompt += `- **${r.titulo}**: ${r.descripcion} -> Enlace: ${r.link}\n`;
                });
            }

            if (Array.isArray(data.eventos) && data.eventos.length) {
                prompt += `\n### EVENTOS PROGRAMADOS:\n`;
                data.eventos.forEach(e => {
                    prompt += `- **${e.titulo}**: ${e.descripcion} (Fecha: ${e.fecha_inicio}) -> Enlace: ${e.link}\n`;
                });
            }

            if (Array.isArray(data.admins) && data.admins.length) {
                prompt += `\n### EQUIPO ADMINISTRATIVO:\n`;
                data.admins.forEach(a => {
                    prompt += `- **${a.nombre}** (${a.descripcion || 'Admin'}): Roles [${(a.roles || []).join(', ')}] | Grupos [${(a.grupos || []).join(', ')}]\n`;
                });
            }

            if (Array.isArray(data.colaboradores) && data.colaboradores.length) {
                prompt += `\n### COLABORADORES DESTACADOS:\n`;
                data.colaboradores.forEach(c => {
                    prompt += `- **${c.nombre}**: ${c.descripcion} | Áreas: ${(c.grupos || []).join(', ')}\n`;
                });
            }

            if (Array.isArray(data.faqs) && data.faqs.length) {
                prompt += `\n### PREGUNTAS FRECUENTES Y NORMAS:\n`;
                data.faqs.forEach(f => {
                    prompt += `- P: ${f.pregunta}\n  R: ${f.respuesta}\n`;
                });
            }

            return prompt;
        }

        async function streamFromOpenRouter(model, messagesPayload, signal, onChunk) {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin || 'https://worldwidedevs.com',
                    'X-Title': 'World Wide Devs Byte Mini AI',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messagesPayload,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
                }),
                signal: signal
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulatedText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    if (trimmed === 'data: [DONE]') continue;

                    try {
                        const parsed = JSON.parse(trimmed.slice(6));
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            accumulatedText += delta;
                            onChunk(accumulatedText);
                        }
                    } catch (e) { }
                }
            }

            return accumulatedText;
        }

        async function handleAIChatSubmit(e) {
            if (e) e.preventDefault();
            if (aiIsGenerating) {
                abortAIGeneration();
                return;
            }

            const inputEl = document.getElementById('ai-chat-input');
            if (!inputEl) return;

            const userText = inputEl.value.trim();
            if (!userText) return;

            inputEl.value = '';
            appendUserMessage(userText);
            aiChatHistory.push({ role: 'user', content: userText });

            setGeneratingState(true);
            aiAbortController = new AbortController();

            const botMsgRow = createBotMessagePlaceholder();
            let accumulatedResponse = '';
            let lastError = null;

            try {
                const systemPrompt = buildSystemPrompt();
                const messagesPayload = [
                    { role: 'system', content: systemPrompt },
                    ...aiChatHistory.slice(-8)
                ];

                for (const model of OPENROUTER_MODELS) {
                    try {
                        accumulatedResponse = await streamFromOpenRouter(
                            model,
                            messagesPayload,
                            aiAbortController.signal,
                            (currentText) => {
                                updateBotMessageContent(botMsgRow, currentText, false);
                            }
                        );

                        if (accumulatedResponse) {
                            break;
                        }
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            break;
                        }
                        lastError = err;
                        console.warn(`Streaming con ${model} falló:`, err.message);
                    }
                }

                if (!accumulatedResponse && lastError && lastError.name !== 'AbortError') {
                    throw lastError;
                }

                updateBotMessageContent(botMsgRow, accumulatedResponse || 'Respuesta detenida.', true);
                if (accumulatedResponse) {
                    aiChatHistory.push({ role: 'assistant', content: accumulatedResponse });
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error en Byte IA:', err);
                    updateBotMessageContent(botMsgRow, `⚠️ Lo siento, ocurrió un error: *${err.message || 'Error de conexión'}*. Por favor intenta nuevamente.`, true);
                }
            } finally {
                setGeneratingState(false);
                aiAbortController = null;
            }
        }