import Link from "next/link";

const featureRows = [
  {
    tag: "Create Note",
    title: "Crea notas con musica y contexto",
    description:
      "Escribe libremente, adjunta una cancion y guarda el momento en segundos. Todo queda listo para volver a escucharlo.",
    media: "Vista de creacion",
  },
  {
    tag: "Share Note",
    title: "Comparte notas que se sienten reales",
    description:
      "Comparte tus notas con amigos y recibe respuestas con emociones, reacciones y musica recomendada.",
    media: "Interacciones y reacciones",
  },
  {
    tag: "Feed",
    title: "Un feed que te inspira",
    description:
      "Explora notas recientes, descubre moods y guarda nuevas canciones para tu propio flujo creativo.",
    media: "Feed de notas",
  },
];

const communityNotes = [
  {
    title: "Lluvia tranquila",
    text: "Escribi sobre volver a casa y dejar que la musica ordene mis pensamientos.",
    author: "Vitor",
    date: "18 May 2026",
    song: "Afterglow",
    artist: "Rina Sawayama",
    accent: "#dde7ff",
  },
  {
    title: "Domingo lento",
    text: "Un dia lento con cafe y una lista de canciones suaves para cerrar la semana.",
    author: "Yoan777",
    date: "16 May 2026",
    song: "Sunset Drive",
    artist: "Kali Uchis",
    accent: "#e5dfff",
  },
  {
    title: "Reset mental",
    text: "Una nota corta para recordarme respirar y escuchar algo que me calme.",
    author: "FerV24",
    date: "14 May 2026",
    song: "Open Window",
    artist: "The Japanese House",
    accent: "#f8dceb",
  },
  {
    title: "Amigos y beats",
    text: "Compartimos notas de la noche y la IA nos preparo un resumen emotivo.",
    author: "Seabastian",
    date: "12 May 2026",
    song: "Night in Motion",
    artist: "SG Lewis",
    accent: "#fff1c7",
  },
  {
    title: "Nuevo comienzo",
    text: "Primer dia escribiendo aqui. Me gusto como la musica acompana la historia.",
    author: "Diana",
    date: "10 May 2026",
    song: "Bloom",
    artist: "Troye Sivan",
    accent: "#e6f4ff",
  },
];

export default function Home() {
  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <div className="nb-container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[rgba(108,99,255,0.12)] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5 text-(--nb-accent-2)"
                fill="currentColor"
              >
                <path d="M12 3c2.4 0 4.4 1.9 4.4 4.3v6.4a3.6 3.6 0 0 1-3.6 3.6c-1.8 0-3.4-1.3-3.6-3.1a3.4 3.4 0 0 1 3.3-3.8c.5 0 1 .1 1.4.3V7.3c0-1-.9-1.9-2-1.9s-2 .8-2 1.9v8.6a4.6 4.6 0 1 1-9.2 0V9.2h2.1v6.7a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5V7.3C7.8 5 9.8 3 12 3z" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">NoteBeat</span>
          </div>
          <Link href="/login" className="btn-primary">
            Start writing
          </Link>
        </div>
      </header>

      <main className="pb-0">
        <section className="nb-container pt-20 pb-10 lg:pt-24 lg:pb-12">
          <div className="mx-auto max-w-5xl text-center space-y-6 rise">
            <h1 className="hero-title">
              Turn emotions into conversations
            </h1>
            <p className="hero-copy mx-auto max-w-2xl">
              A new way to journal, express emotions, and connect with friends through music and thoughts
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link href="/login" className="btn-primary">
                Start writing
              </Link>
            </div>
          </div>
        </section>

        <section id="flow" className="nb-container -mt-4 pt-0 pb-16 lg:-mt-6 lg:pt-2">
          <div className="text-center space-y-6">
            <div className="media-placeholder aspect-video mx-auto max-w-4xl flex items-center justify-center text-sm uppercase tracking-[0.2em] text-(--nb-ink-muted)">
              Proximamente video
            </div>
          </div>
        </section>

        <section id="features" className="section-muted">
          <div className="nb-container section-space">
            <div className="text-center space-y-4">
              <h2 className="font-display text-3xl lg:text-4xl">
                Built for every emotion
              </h2>
            </div>
            <div className="mt-12 space-y-16">
              {featureRows.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`flex flex-col gap-10 lg:items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
                  }`}
                >
                  <div className="flex-1 space-y-4">
                    <h3 className="font-display text-2xl lg:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="text-base text-(--nb-ink-muted)">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="media-placeholder aspect-4/3 flex items-center justify-center text-sm uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                      {feature.media}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ai" className="section-dark">
          <div className="nb-container section-space">
            <div className="text-center space-y-4">
              <h2 className="font-display text-3xl lg:text-4xl">
                Turn feelings into clarity
              </h2>
            </div>
            <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Resumen emocional</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    Resume lo que escribes y destaca el sentimiento principal.
                  </p>
                </div>
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Sugerencias de musica</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    La IA encuentra canciones que combinan con tu nota.
                  </p>
                </div>
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Contexto para compartir</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    Resalta los puntos clave para explicar tu nota a otros.
                  </p>
                </div>
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Memoria inteligente</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    Encuentra notas similares en segundos con busqueda semantica.
                  </p>
                </div>
              </div>
              <div className="media-placeholder ai-glow aspect-square flex items-center justify-center text-sm uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Panel IA
              </div>
            </div>
          </div>
        </section>

        <section id="community" className="nb-container section-space">
          <div className="text-center space-y-4">
            <h2 className="font-display text-3xl lg:text-4xl">
              Emotions already speaking on NoteBeat
            </h2>
          </div>
          <div className="mt-8 flex gap-6 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory">
            {communityNotes.map((note) => (
              <article key={note.title} className="note-card snap-start">
                <div className="flex items-center gap-2">
                  <span
                    className="note-accent"
                    style={{ backgroundColor: note.accent }}
                  />
                  <h3 className="text-lg font-semibold">{note.title}</h3>
                </div>
                <p className="mt-2 text-sm text-(--nb-ink-muted)">
                  {note.text}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-(--nb-ink-muted)">
                  <span>Por {note.author}</span>
                  <span>{note.date}</span>
                </div>
                <div className="mt-4 song-chip">
                  <div
                    className="h-9 w-9 rounded-lg"
                    style={{ backgroundColor: note.accent }}
                  />
                  <div>
                    <p className="text-xs font-semibold">{note.song}</p>
                    <p className="text-[11px] text-(--nb-ink-muted)">
                      {note.artist}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-cta">
          <div className="nb-container section-space text-center space-y-6">
            <h2 className="font-display text-3xl lg:text-4xl">
              Every emotion tells a story
            </h2>
            <Link href="/login" className="btn-primary">
              Start writing
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer-dark border-t border-(--nb-stroke) bg-[#111827]">
        <div className="nb-container py-10">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[rgba(108,99,255,0.12)] flex items-center justify-center">
                  <span className="text-sm font-semibold">NB</span>
                </div>
                <span className="text-base font-semibold">NoteBeat</span>
              </div>
              <p className="text-sm text-(--nb-ink-muted)">
                Toma notas, siente la musica y comparte tu historia.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Secciones
              </p>
              <a className="block hover:underline" href="#flow">
                Flujo
              </a>
              <a className="block hover:underline" href="#features">
                Funciones
              </a>
              <a className="block hover:underline" href="#ai">
                IA
              </a>
              <a className="block hover:underline" href="#community">
                Comunidad
              </a>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Recursos
              </p>
              <a className="block hover:underline" href="/login">
                Login
              </a>
              <a className="block hover:underline" href="/register">
                Crear cuenta
              </a>
              <span className="block text-(--nb-ink-muted)">
                Soporte (pronto)
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Legal
              </p>
              <span className="block text-(--nb-ink-muted)">
                Terminos y privacidad
              </span>
              <span className="block text-(--nb-ink-muted)">
                Aviso legal
              </span>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 text-xs text-(--nb-ink-muted) sm:flex-row sm:items-center sm:justify-between">
            <span>Regresar a las secciones</span>
            <span>© 2026 NoteBeat. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}