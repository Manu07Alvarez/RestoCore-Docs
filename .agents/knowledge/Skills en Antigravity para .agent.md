# Arquitectura e Implementación Técnica de Agent Skills en Google Antigravity

## Fundamentos Teóricos y Patrón de Revelación Progresiva

El ecosistema de desarrollo guiado por inteligencia artificial en Google Antigravity introduce las _Agent Skills_ como un estándar abierto y declarativo diseñado para extender las capacidades operativas de los agentes basados en modelos de lenguaje de gran tamaño<sup>1</sup>. Tradicionalmente, la inyección de conocimiento procedural y reglas de negocio en los agentes se realizaba mediante instrucciones de sistema permanentes (_System Prompts_). Sin embargo, este enfoque presenta serias limitaciones de escalabilidad: a medida que el proyecto crece, la inclusión continua de reglas estáticas satura la ventana de contexto (_context window_), incrementa los costos de inferencia y provoca la degradación del razonamiento del modelo, fenómeno conocido como _context rot_<sup>2</sup>.

Para mitigar estas ineficiencias, las _Agent Skills_ implementan un patrón arquitectónico denominado **Revelación Progresiva** (_Progressive Disclosure_)<sup>2</sup>. Este paradigma opera mediante un desacoplamiento estricto entre la presencia del conocimiento en disco y su instanciación en la memoria del modelo<sup>2</sup>. En lugar de cargar conjuntos masivos de instrucciones al inicio de cada sesión, el agente mantiene únicamente un catálogo ligero indexado por metadatos<sup>2</sup>.

El ciclo de vida operativo de una habilidad bajo el patrón de revelación progresiva se desarrolla a través de tres fases secuenciales perfectamente integradas<sup>1</sup>:

La fase inicial de **Descubrimiento** ocurre al instanciar cualquier sesión en las interfaces de Antigravity (IDE, CLI, SDK o plataforma Desktop), momento en el cual el sistema expone al agente únicamente un listado resumido con los nombres e identificadores semánticos de las habilidades registradas<sup>1</sup>. Posteriormente, la fase de **Activación** se desencadena de manera automática cuando el motor de enrutamiento evalúa la intención de la solicitud del usuario y detecta una coincidencia semántica con la descripción de una habilidad específica, procediendo a leer e inyectar el contenido completo del archivo SKILL.md en la ventana de contexto activo<sup>1</sup>. Finalmente, en la fase de **Ejecución**, el agente asimila las reglas procedimentales, restricciones y recursos ejecutables del paquete cargado para resolver la tarea encomendada de forma autónoma o asistida<sup>1</sup>. Este enfoque desacoplado asegura un uso eficiente de los recursos computacionales y minimiza la tasa de alucinación del modelo al mantener el contexto enfocado exclusivamente en la tarea presente<sup>2</sup>.

## Jerarquía de Rutas y Ámbitos de Almacenamiento

Las habilidades en Antigravity se estructuran en diferentes niveles de alcance, determinando si una capacidad estará restringida a las reglas de un repositorio específico o si estará disponible transversalmente en todas las instancias de ejecución del usuario<sup>1</sup>. La resolución de prioridades favorece sistemáticamente las definiciones encontradas en el espacio de trabajo local sobre las configuraciones globales de usuario, permitiendo que un proyecto redefina el comportamiento de una habilidad global en caso de coincidencia en el identificador<sup>1</sup>.

| **Ámbito de Aplicación**                     | **Ruta del Directorio**                                     | **Alcance de Visibilidad**                      | **Casos de Uso Recomendados**                                                                        |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Espacio de Trabajo (Estándar Actual)         | &lt;workspace-root&gt;/.agents/skills/&lt;skill-folder&gt;/ | Exclusivo del proyecto activo                   | Convenciones de testing, reglas de arquitectura internas, scripts de despliegue locales<sup>1</sup>. |
| ---                                          | ---                                                         | ---                                             | ---                                                                                                  |
| Espacio de Trabajo (Compatibilidad Heredada) | &lt;workspace-root&gt;/.agent/skills/&lt;skill-folder&gt;/  | Exclusivo del proyecto activo                   | Soporte para repositorios y flujos configurados en versiones previas de Antigravity<sup>1</sup>.     |
| ---                                          | ---                                                         | ---                                             | ---                                                                                                  |
| Global de Usuario (Entorno Gemini)           | ~/.gemini/config/skills/&lt;skill-folder&gt;/               | Transversal a todos los proyectos de la máquina | Utilidades personales de formato, generadores de boilerplate, herramientas generales<sup>1</sup>.    |
| ---                                          | ---                                                         | ---                                             | ---                                                                                                  |
| Global de CLI (Antigravity CLI)              | ~/.gemini/antigravity-cli/skills/                           | Instancias de consola interactiva (agy)         | Comandos directos de terminal, herramientas de infraestructura y comandos Slash<sup>7</sup>.         |
| ---                                          | ---                                                         | ---                                             | ---                                                                                                  |

## Anatomía Estándar de un Paquete de Skill

Una habilidad dentro del entorno de Antigravity no es un mero archivo de texto aislado, sino un paquete modular organizado en el sistema de archivos local<sup>1</sup>. Aunque la presencia del archivo principal SKILL.md constituye el único requisito estricto para que el sistema reconozca el paquete, la arquitectura estándar de Antigravity promueve la separación clara de responsabilidades en subdirectorios especializados<sup>1</sup>.

.agents/skills/database-schema-validator/ ├── SKILL.md ├── scripts/ │ └── validate_schema.py ├── references/ │ └── database-rules.md └── assets/ └── response-template.json

### Especificación del Archivo SKILL.md y Frontmatter YAML

El archivo SKILL.md combina un bloque de metadatos en formato YAML (_Frontmatter_) en su encabezado con un cuerpo explicativo redactado en Markdown estándar<sup>1</sup>. El _Frontmatter_ es consumido directamente por el enrutador del modelo para determinar la pertinencia del paquete antes de su carga completa<sup>2</sup>.

| **Campo Frontmatter** | **Requerido** | **Tipo de Dato** | **Descripción Arquitectónica y Función**                                                                                                                  |
| --------------------- | ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                  | No            | String           | Identificador único de la habilidad en minúsculas y separado por guiones. Si se omite, el sistema adopta el nombre de la carpeta contenedora<sup>1</sup>. |
| ---                   | ---           | ---              | ---                                                                                                                                                       |
| description           | Sí            | String           | Frase de activación semántica (_trigger phrase_). Describe detalladamente la función de la habilidad y las condiciones de activación<sup>1</sup>.         |
| ---                   | ---           | ---              | ---                                                                                                                                                       |
| tools                 | No            | String / List    | Declaración de integraciones con servidores externos del Protocolo de Contexto de Agente (MCP) autorizados<sup>10</sup>.                                  |
| ---                   | ---           | ---              | ---                                                                                                                                                       |

### Estructura del Cuerpo Markdown y Grados de Libertad

El cuerpo del documento orienta la conducta del modelo una vez que el paquete ha sido activado<sup>1</sup>. Para maximizar la precisión, la redacción debe articularse en torno a cuatro componentes fundamentales: la definición explícita del objetivo operativo de la habilidad, la secuencia lógica de pasos a ejecutar, ejemplos ilustrativos de entradas y salidas (_few-shot examples_), y las restricciones infranqueables de seguridad (como la prohibición expresa de ejecutar comandos destructivos)<sup>1</sup>.

La efectividad de una habilidad depende de adaptar la precisión de sus instrucciones según la naturaleza de la tarea, gestionando lo que la arquitectura de Antigravity define como grados de libertad del agente<sup>8</sup>.

| **Nivel de Libertad** | **Formato de Instrucción**                            | **Escenario de Aplicación**                                                               | **Mecanismo de Control**                                       |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Alto                  | Prosa descriptiva cualitativa en Markdown             | Tareas creativas, revisión de estilo de código, redacción de documentación<sup>8</sup>.   | Guías generales y principios orientadores<sup>8</sup>.         |
| ---                   | ---                                                   | ---                                                                                       | ---                                                            |
| Medio                 | Pseudocódigo, algoritmos paso a paso y plantillas     | Flujos de trabajo estandarizados pero adaptables según contexto<sup>8</sup>.              | Secuencias de pasos con parámetros opcionales<sup>8</sup>.     |
| ---                   | ---                                                   | ---                                                                                       | ---                                                            |
| Bajo                  | Scripts ejecutables dedicados (Python, Bash, Node.js) | Operaciones frágiles, cálculos matemáticos, modificaciones sintácticas en BD<sup>2</sup>. | Delegación estricta en herramientas deterministas<sup>2</sup>. |
| ---                   | ---                                                   | ---                                                                                       | ---                                                            |

## Implementación Práctica de Skills en el Entorno .agent

A continuación se exponen dos patrones de implementación representativos para el entorno de trabajo ubicado en la carpeta del repositorio .agents/skills/ (o su equivalente heredado .agent/skills/)<sup>1</sup>.

### Patrón 1: Habilidad Procedimental Declarativa

Este patrón resulta idóneo para tareas donde el razonamiento simbólico del modelo es suficiente para completar el objetivo sin requerir la ejecución de scripts en el sistema operativo<sup>2</sup>.

Definición del archivo .agents/skills/git-commit-formatter/SKILL.md:

## name: git-commit-formatter description: Formatea mensajes de commit de Git siguiendo rigurosamente la especificación Conventional Commits. Usar cuando el usuario pida confirmar cambios, crear un commit o formatear un mensaje de control de versiones

# Formateador de Commits de Git

Cuando debas generar o evaluar un mensaje de commit, debes aplicar estrictamente la especificación de Conventional Commits.

## Estructura del Mensaje

El formato obligatorio es: &lt;tipo&gt;\[ámbito opcional\]: &lt;descripción&gt;

## Tipos Permitidos

- feat: Una nueva funcionalidad para el usuario.
- fix: Resolución de un error o corrección de software.
- docs: Cambios exclusivamente en la documentación.
- style: Ajustes de formato, espacios en blanco o punto y coma sin cambio en lógica.
- refactor: Reestructuración de código que no corrige errores ni añade funciones.
- test: Inclusión o corrección de pruebas automatizadas.
- chore: Actualización de tareas de construcción o herramientas auxiliar.

## Instrucciones Procedimentales

1. Analizar las diferencias de código (git diff) para determinar el tipo primario.
2. Identificar el módulo o archivo afectado para definir el ámbito si corresponde.
3. Escribir la descripción en modo imperativo y en minúsculas.
4. Si existen cambios rompientes, incluir una línea al final con el encabezado BREAKING CHANGE:.

Al solicitar verbalmente al agente que confirme los cambios realizados en el módulo de autenticación, el enrutador evalúa el contexto, identifica la habilidad git-commit-formatter, la carga en memoria y estructura automáticamente la orden con el formato normalizado<sup>1</sup>.

### Patrón 2: Habilidad de Ejecución Determinista mediante Scripts Híbridos

Para evitar errores en tareas sensibles como validaciones de esquemas o migraciones de bases de datos, el archivo SKILL.md delega el cálculo determinista a scripts internos ejecutados mediante la herramienta run_command<sup>2</sup>.

Estructura de archivos del paquete:

.agents/skills/schema-validator/ ├── SKILL.md └── scripts/ └── validate.py

Código del script en .agents/skills/schema-validator/scripts/validate.py:

Python

import sys  
import re  
<br/>def validate_sql(file_path):  
with open(file_path, 'r') as f:  
content = f.read()  
<br/>errors = \[\]  
if re.search(r'\\bDROP\\b', content, re.IGNORECASE):  
errors.append("Seguridad: Se detectó la sentencia prohibida 'DROP'.")  
<br/>if not re.search(r'\\bPRIMARY KEY\\b', content, re.IGNORECASE):  
errors.append("Estructura: La tabla debe definir explícitamente una PRIMARY KEY.")  
<br/>if errors:  
print("FALLO_VALIDACION:")  
for err in errors:  
print(f"- {err}")  
sys.exit(1)  
else:  
print("EXITO: El esquema cumple con todas las políticas organizacionales.")  
sys.exit(0)  
<br/>if \__name__== "\__main_\_":  
if len(sys.argv) < 2:  
print("Uso: python validate.py &lt;ruta_al_archivo.sql&gt;")  
sys.exit(1)  
validate_sql(sys.argv\[1\])

Código de la habilidad en .agents/skills/schema-validator/SKILL.md:

## name: schema-validator description: Valida archivos de esquema SQL locales para verificar el cumplimiento de las políticas de seguridad y estructura antes de aplicar migraciones

# Validador de Esquemas SQL

Esta habilidad ejecuta una verificación determinista sobre archivos .sql mediante scripts en Python.

## Reglas de Invocación

1. No intentes validar el archivo SQL leyendo directamente el texto mediante visión del LLM.
2. Invoca el script de validación utilizando la herramienta run_command:python .agents/skills/schema-validator/scripts/validate.py &lt;ruta_del_archivo&gt;

## Interpretación de Resultados

- Si el código de salida del script es 0: Informa al usuario que el esquema es válido.
- Si el código de salida es 1: Transcribe los errores emitidos en stdout al usuario y propone las correcciones necesarias sin aplicar cambios automáticamente.

## Arquitectura de Configuración Dinámica mediante .agent/skills.config.yaml

Un desafío común en la adopción de habilidades reutilizables es la rigidez implícita en las instrucciones escritas directamente en Markdown<sup>6</sup>. Cuando un equipo requiere adaptar parámetros específicos (como incluir tipos de commits adicionales o cambiar las convenciones de nombrado de un proyecto), el enfoque tradicional obliga a duplicar y bifurcar (_fork_) el paquete de la habilidad, generando problemas de mantenimiento a largo plazo<sup>6</sup>.

Para resolver esta limitación, la comunidad del ecosistema Antigravity ha consolidado el patrón **Configurable Agent Skills**<sup>6</sup>. Esta arquitectura desacopla la lógica procedimental de la parametrización mediante un esquema de fusión de configuraciones en cascada<sup>6</sup>.

El sistema se fundamenta en la interacción de tres elementos: en primer lugar, un archivo config.default.yaml empaquetado junto con la habilidad define los valores predeterminados del flujo<sup>6</sup>. En segundo lugar, un archivo .agent/skills.config.yaml situado en la raíz del proyecto permite al desarrollador declarar exclusivamente los parámetros a personalizar<sup>6</sup>. Finalmente, un script ejecutable denominado resolve_config.py realiza una fusión profunda (_deep-merge_) entre la configuración por defecto y las sobreescrituras del espacio de trabajo, entregando al agente el conjunto final de parámetros activos en tiempo de ejecución<sup>6</sup>.

El flujo de procesamiento opera de forma totalmente local y determinista: cuando la habilidad es activada por el agente, la primera instrucción del SKILL.md le ordena ejecutar el resolutor en Python<sup>6</sup>. El script busca la presencia del archivo de configuración del proyecto recorriendo la jerarquía de directorios hacia arriba<sup>6</sup>. Una vez localizado, combina las estructuras YAML asegurando que las reglas locales del usuario prevalezcan sobre los valores por defecto del paquete, imprimiendo el resultado final en la salida estándar (stdout) para que el agente asimile los parámetros activos antes de continuar<sup>6</sup>.

### Implementación del Patrón Configurable

Valores predeterminados en .agents/skills/git-commit-formatter/config.default.yaml:

YAML

style: conventional  
allowed_types:  
\- feat  
\- fix  
\- docs  
\- refactor  
require_scope: false

Sobreescritura específica del proyecto en .agent/skills.config.yaml:

YAML

git-commit-formatter:  
style: gitmoji  
allowed_types:  
\- feat  
\- fix  
\- docs  
\- refactor  
\- ci  
\- build  
require_scope: true

Script resolutor en .agents/skills/git-commit-formatter/scripts/resolve_config.py:

Python

import os  
import sys  
import yaml  
from pathlib import Path  
<br/>def deep_merge(default, override):  
merged = default.copy()  
for key, value in override.items():  
if isinstance(value, dict) and key in merged and isinstance(merged\[key\], dict):  
merged\[key\] = deep_merge(merged\[key\], value)  
else:  
merged\[key\] = value  
return merged  
<br/>def resolve(skill_name, skill_dir):  
default_path = Path(skill_dir) / "config.default.yaml"  
defaults = {}  
if default_path.is_file():  
with open(default_path, 'r') as f:  
defaults = yaml.safe_load(f) or {}  
<br/>project_config = {}  
curr = Path.cwd().resolve()  
for parent in \[curr, \*curr.parents\]:  
candidate = parent / ".agent" / "skills.config.yaml"  
if candidate.is_file():  
with open(candidate, 'r') as f:  
full_config = yaml.safe_load(f) or {}  
project_config = full_config.get(skill_name, {})  
break  
<br/>effective = deep_merge(defaults, project_config)  
print(yaml.dump(effective))  
<br/>if \__name__ == "\__main_\_":  
if len(sys.argv) >= 3:  
resolve(sys.argv\[1\], sys.argv\[2\])

Instrucciones de invocación dentro de .agents/skills/git-commit-formatter/SKILL.md:

## name: git-commit-formatter description: Genera mensajes de commit personalizados dinámicamente según la configuración local del proyecto

# Formateador Configurable

## Fase de Inicialización

Antes de formatear el mensaje, DEBES resolver la configuración del proyecto ejecutando:python .agents/skills/git-commit-formatter/scripts/resolve_config.py git-commit-formatter .agents/skills/git-commit-formatter

## Aplicación de Reglas

Aplica las reglas devueltas en la salida estándar (stdout) del comando anterior:

- Si style es "gitmoji", prefija el commit con el icono correspondiente.
- Aplica únicamente los tipos presentes en la lista allowed_types.
- Si require_scope es verdadero, no aceptes ningún commit sin ámbito definido.

## Ecosistema Ampliado: Plugins, Subagentes y Protocolo MCP

Las _Agent Skills_ en Google Antigravity se integran formalmente dentro de un marco de extensibilidad más amplio, interactuando de forma nativa con Plugins, Subagentes asíncronos y servidores habilitados para el Protocolo de Contexto de Agente (MCP)<sup>5</sup>.

Los Plugins representan la unidad empaquetada de distribución global<sup>7</sup>. A diferencia de un skill individual que reside en el proyecto, un plugin empaquetado en ~/.gemini/antigravity-cli/plugins/&lt;plugin-name&gt;/ puede agrupar múltiples habilidades, reglas estáticas de código, definiciones de subagentes y servidores MCP dentro de un mismo manifiesto plugin.json<sup>7</sup>. Esta integración permite que una habilidad invoque subagentes secundarios para ejecutar tareas pesadas en segundo plano de manera asíncrona sin bloquear el hilo principal de interacción<sup>5</sup>.

Asimismo, las habilidades pueden extender sus capacidades de lectura e interacción con sistemas remotos o bases de datos mediante la declaración de servidores MCP en el metadato del SKILL.md<sup>7</sup>. La especificación autoriza el uso de comodines (por ejemplo, tools: mcp_google-developer-knowledge_\*), lo que permite que la habilidad exponga herramientas dinámicas al agente solo durante la ventana de ejecución del skill<sup>10</sup>.

En las herramientas de interfaz de línea de comandos como Antigravity CLI (agy), las habilidades registradas en el directorio del repositorio o a nivel global se compilan automáticamente como comandos tipo slash (/)<sup>7</sup>. Esta funcionalidad habilita la invocación explícita por parte del desarrollador (como /schema-validator), complementando la activación implícita basada en la coincidencia semántica del prompt<sup>1</sup>.

## Conclusiones Técnicas y Recomendaciones de Despliegue

La adopción del estándar de _Agent Skills_ en el directorio .agent o .agents constituye una práctica fundamental para escalar la automatización de flujos de trabajo en Google Antigravity<sup>1</sup>. La sustitución de prompts de sistema rígidos por paquetes modulares regidos por el principio de revelación progresiva garantiza un uso eficiente de la ventana de contexto y preserva la capacidad analítica del modelo<sup>2</sup>.

Para garantizar un despliegue robusto en entornos de producción e ingeniería de software, se establecen cuatro recomendaciones clave:

En primer lugar, se debe procurar la modularidad y atomicidad en el diseño de cada habilidad, garantizando que cada paquete resuelva un único dominio técnico bien delimitado en lugar de construir agentes monolíticos de propósito general<sup>1</sup>. En segundo lugar, se debe prestar especial atención a la redacción semántica del campo description en el _Frontmatter_ YAML, ya que este fragmento actúa como la clave de enrutamiento que el modelo evalúa para la activación implícita<sup>2</sup>. En tercer lugar, las operaciones con efectos secundarios o con requerimientos de alta precisión deben aislarse en scripts ejecutables (Python o Bash) colocados en la carpeta scripts/, manteniendo el cuerpo del Markdown enfocado en la orquestación y presentación de resultados<sup>2</sup>. Por último, para habilidades compartidas entre múltiples equipos de trabajo, se recomienda adoptar el patrón de configuración dinámica skills.config.yaml, evitando la proliferación de bifurcaciones del código fuente y facilitando el mantenimiento centralizado del conocimiento procedural<sup>6</sup>.

#### Fuentes citadas

1. Skills - Google Antigravity Docs, <https://antigravity.google/docs/skills>
2. Authoring Google Antigravity Skills - Codelabs, <https://codelabs.developers.google.com/getting-started-with-antigravity-skills>
3. Antigravity: Build Your First AI Agent Skill - YouTube, <https://www.youtube.com/watch?v=gRAndTHbHWo>
4. Tutorial : Getting Started with Google Antigravity Skills - Medium, <https://medium.com/google-cloud/tutorial-getting-started-with-antigravity-skills-864041811e0d>
5. Home - Google Antigravity Docs, <https://antigravity.google/docs/home>
6. How to Make Your Antigravity Agent Skills Configurable (Without Forking Them), <https://www.freecodecamp.org/news/make-your-antigravity-agent-skills-configurable-without-forking-them/>
7. Plugins & Skills - Google Antigravity Docs, <https://antigravity.google/docs/cli/plugins>
8. Agent Skill best practices | Gemini CLI, <https://geminicli.com/docs/cli/skills-best-practices/>
9. <https://www.freecodecamp.org/news/make-your-antigravity-agent-skills-configurable-without-forking-them/#:~:text=up%20to%20speed.-,What%20Are%20Antigravity%20Agent%20Skills%3F,instructions%20written%20in%20plain%20Markdown>.
10. Deep Dive: Antigravity Agent Skills | by George Mao | Google Cloud - Community | Medium, <https://medium.com/google-cloud/deep-dive-antigravity-agent-skills-b303bf05085b>
11. How to Make Your Antigravity Agent Skills Configurable... - daily.dev, <https://daily.dev/posts/how-to-make-your-antigravity-agent-skills-configurable-without-forking-them--4ljsnocck>
12. GitHub - keepdeploying/configurable-agent-skills: Tune any Antigravity Skill through config instead of forking it., <https://github.com/keepdeploying/configurable-agent-skills>
13. Make Antigravity Agent Skills Configurable Without Forking - CodeFriends, <https://www.codefriends.net/feed/2026-07-29-how-to-make-your-antigravity-agent-skills-configurable-without-forking-t-1a7db99054>