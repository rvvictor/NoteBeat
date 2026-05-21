import Image from "next/image";
import Link from "next/link";

const featureRows = [
  {
    tag: "Create Note",
    title: "Create notes with music and context",
    description:
      "Write freely, attach a song, and capture the moment in seconds. Everything is set for you to listen to it again.",
    media: "Creation view",
  },
  {
    tag: "Share Note",
    title: "Share notes that feel real",
    description:
      "Share your notes with friends and receive responses with emotions, reactions, and recommended music.",
    media: "Interactions and reactions",
  },
  {
    tag: "Feed",
    title: "A feed that inspires you",
    description:
      "Explore recent notes, discover moods, and save new songs to fuel your own creative flow.",
    media: "Notes feed",
  },
];

const communityNotes = [
  {
    title: "Quiet rain",
    text: "I wrote about coming home and letting the music organize my thoughts.",
    author: "Victor",
    date: "18 May 2026",
    song: "Afterglow",
    artist: "Rina Sawayama",
    accent: "#dde7ff",
  },
  {
    title: "Slow Sunday",
    text: "A slow day with coffee and a list of soft songs to close out the week.",
    author: "Yojan777",
    date: "16 May 2026",
    song: "Sunset Drive",
    artist: "Kali Uchis",
    accent: "#e5dfff",
  },
  {
    title: "Mental reset",
    text: "A short note to remind myself to breathe and listen to something that calms me.",
    author: "FerV24",
    date: "14 May 2026",
    song: "Open Window",
    artist: "The Japanese House",
    accent: "#f8dceb",
  },
  {
    title: "Friends and beats",
    text: "We shared notes from the night and the AI prepared an emotional summary for us.",
    author: "Seebastiaaan",
    date: "12 May 2026",
    song: "Night in Motion",
    artist: "SG Lewis",
    accent: "#e3edff",
  },
  {
    title: "New beginning",
    text: "First day writing here. I liked how the music accompanies the story.",
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
            <Image
              src="/brand/logoSOscuro.svg"
              alt="NoteBeat logo"
              width={180}
              height={48}
              className="h-10 w-auto sm:h-12"
              priority
            />
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
              Video coming soon
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
                  <p className="text-sm font-semibold">Emotional summary</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    Summarizes what you write and highlights the main feeling.
                  </p>
                </div>
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Music suggestions</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    The AI finds songs that match your note.
                  </p>
                </div>
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Shareable context</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    Highlights key points to explain your note to others.
                  </p>
                </div>
                <div className="card-soft p-4">
                  <p className="text-sm font-semibold">Smart memory</p>
                  <p className="text-xs text-(--nb-ink-muted)">
                    Find similar notes in seconds with semantic search.
                  </p>
                </div>
              </div>
              <div className="media-placeholder ai-glow aspect-square flex items-center justify-center text-sm uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                AI Panel
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
                  <span>By {note.author}</span>
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
                Capture emotions, talk with AI, and unlock a community built around real thoughts and shared moments
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Sections
              </p>
              <a className="block hover:underline" href="#flow">
                Flow
              </a>
              <a className="block hover:underline" href="#features">
                Features
              </a>
              <a className="block hover:underline" href="#ai">
                AI
              </a>
              <a className="block hover:underline" href="#community">
                Community
              </a>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Resources
              </p>
              <a className="block hover:underline" href="/login">
                Login
              </a>
              <a className="block hover:underline" href="/register">
                Create account
              </a>
              <span className="block hover:underline text-(--nb-ink-muted)">
                Support (soon)
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-(--nb-ink-muted)">
                Legal
              </p>
              <a className="block hover:underline text-(--nb-ink-muted)">
                Terms & Privacy
              </a>
              <span className="block hover:underline text-(--nb-ink-muted)">
                Legal Notice
              </span>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 text-xs text-(--nb-ink-muted) sm:flex-row sm:items-center sm:justify-between">
            <span>Back to top</span>
            <span>© 2026 NoteBeat. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}