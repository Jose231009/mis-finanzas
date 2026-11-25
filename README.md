# Mis Finanzas

App personal (PWA) para registrar ingresos, gastos, pagos fijos y la meta de ahorro. Se instala desde Chrome o el celular.

- Los datos viven en Supabase, en tablas `fin_*` protegidas por reglas de acceso (RLS): solo los usuarios autorizados en `fin_usuarios` leen o escriben.
- La clave que figura en `app.js` es la clave **publicable** del proyecto (pública por diseño). La seguridad la dan las reglas de la base, no el código.
- `#demo` al final del link muestra la app con datos de ejemplo, sin guardar nada.
