import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Outfit";
import { colors, fontFamilyBody, fontFamilyDisplay } from "./tokens";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "500", "600", "700", "800"],
});

/**
 * The hero is cut from real screen captures of NoteBeat running locally
 * (see public/capture). Every shot below is footage of the actual product:
 * the recordings are 1440x900 CSS pixels at 2x, so a focus rect is expressed
 * in those source coordinates and the shot maps it onto the 1920x1080 frame.
 */

export const FRAME_W = 1920;
export const FRAME_H = 1080;
const SOURCE_W = 1440;
const SOURCE_H = 900;
const OVERLAP = 9;

type Focus = { x: number; y: number; w: number };

type Shot = {
  clip: string;
  durationInFrames: number;
  caption?: Caption;
} & (
  | { kind: "card" }
  | { kind: "punch"; from: Focus; to: Focus }
);

type Caption = { kicker: string; title: string };

const CAPTION_OPEN: Caption = {
  kicker: "NoteBeat",
  title: "Where your notes meet your music.",
};
const CAPTION_WRITE: Caption = {
  kicker: "Capture",
  title: "Write it, add the song, post it.",
};
const CAPTION_THREAD: Caption = {
  kicker: "Threads",
  title: "Turn a private note into a public thread.",
};
const CAPTION_FEED: Caption = {
  kicker: "Feed",
  title: "A feed that sounds like people.",
};
const CAPTION_EMOTIONS: Caption = {
  kicker: "Emotions",
  title: "See the pattern in how you feel.",
};
const CAPTION_RECAP: Caption = {
  kicker: "Recap",
  title: "Your year, in notes and songs.",
};

const INTRO = 60;
const OUTRO = 96;

/**
 * Panel geometry of the captured app, measured from the live DOM at 1440x900:
 * notes rail x 21-360, center panel x 360-1098, stats rail x 1098-1419,
 * composer y 104-434, feed post y 448-870, thread modal 360-1080 / 128-772,
 * recap modal 340-1100 / 63-837. Crops land on those seams so a shot never
 * slices a panel down the middle.
 */
const shots: Shot[] = [
  {
    clip: "login.mp4",
    kind: "punch",
    from: { x: 720, y: 450, w: 1620 },
    to: { x: 720, y: 450, w: 1480 },
    durationInFrames: 138,
    caption: CAPTION_OPEN,
  },
  {
    clip: "overview.mp4",
    kind: "card",
    durationInFrames: 90,
    caption: CAPTION_OPEN,
  },
  {
    clip: "write.mp4",
    kind: "punch",
    from: { x: 729, y: 340, w: 900 },
    to: { x: 729, y: 310, w: 730 },
    durationInFrames: 150,
    caption: CAPTION_WRITE,
  },
  {
    clip: "song.mp4",
    kind: "punch",
    from: { x: 729, y: 300, w: 790 },
    to: { x: 729, y: 320, w: 730 },
    durationInFrames: 195,
    caption: CAPTION_WRITE,
  },
  {
    clip: "post.mp4",
    kind: "punch",
    from: { x: 729, y: 320, w: 730 },
    to: { x: 729, y: 400, w: 745 },
    durationInFrames: 120,
    caption: CAPTION_WRITE,
  },
  {
    clip: "profile.mp4",
    kind: "card",
    durationInFrames: 84,
    caption: CAPTION_WRITE,
  },
  {
    clip: "threadopen.mp4",
    kind: "punch",
    from: { x: 720, y: 450, w: 1620 },
    to: { x: 720, y: 450, w: 1200 },
    durationInFrames: 150,
    caption: CAPTION_THREAD,
  },
  {
    clip: "threadpub.mp4",
    kind: "punch",
    from: { x: 720, y: 450, w: 1200 },
    to: { x: 720, y: 450, w: 1560 },
    durationInFrames: 135,
    caption: CAPTION_THREAD,
  },
  {
    clip: "feedlike.mp4",
    kind: "punch",
    from: { x: 729, y: 580, w: 900 },
    to: { x: 729, y: 655, w: 730 },
    durationInFrames: 150,
    caption: CAPTION_FEED,
  },
  {
    clip: "feedsave.mp4",
    kind: "punch",
    from: { x: 729, y: 655, w: 730 },
    to: { x: 729, y: 610, w: 860 },
    durationInFrames: 114,
    caption: CAPTION_FEED,
  },
  {
    clip: "feedtabs.mp4",
    kind: "punch",
    from: { x: 729, y: 228, w: 740 },
    to: { x: 729, y: 430, w: 740 },
    durationInFrames: 120,
    caption: CAPTION_FEED,
  },
  {
    clip: "emotions.mp4",
    kind: "punch",
    from: { x: 720, y: 460, w: 1320 },
    to: { x: 720, y: 500, w: 1250 },
    durationInFrames: 150,
    caption: CAPTION_EMOTIONS,
  },
  {
    clip: "recap.mp4",
    kind: "punch",
    from: { x: 720, y: 450, w: 1400 },
    to: { x: 720, y: 450, w: 1300 },
    durationInFrames: 210,
    caption: CAPTION_RECAP,
  },
];

const shotStarts = shots.reduce<number[]>((acc, shot, index) => {
  const previous = index === 0 ? INTRO : acc[index - 1] + shots[index - 1].durationInFrames - OVERLAP;
  acc.push(previous);
  return acc;
}, []);

const lastShotEnd =
  shotStarts[shots.length - 1] + shots[shots.length - 1].durationInFrames;

export const HERO_DURATION = lastShotEnd + OUTRO - OVERLAP;

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(180deg, #fbfbff 0%, #f4f4fd 55%, #eef1fb 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        width: 1100,
        height: 1100,
        borderRadius: "50%",
        top: -420,
        left: -320,
        background: "radial-gradient(circle, rgba(108,99,255,0.18), transparent 70%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 1100,
        height: 1100,
        borderRadius: "50%",
        bottom: -460,
        right: -320,
        background: "radial-gradient(circle, rgba(57,198,180,0.18), transparent 70%)",
      }}
    />
  </AbsoluteFill>
);

const lerpFocus = (from: Focus, to: Focus, t: number): Focus => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  w: from.w + (to.w - from.w) * t,
});

const ClipFrame: React.FC<{ shot: Shot; index: number }> = ({ shot, index }) => {
  const frame = useCurrentFrame();

  const appear = interpolate(frame, [0, OVERLAP], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = index === 0 ? 1 : appear;

  const progress = interpolate(frame, [0, shot.durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const video = (
    <OffthreadVideo
      src={staticFile(`capture/${shot.clip}`)}
      muted
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: SOURCE_W,
        height: SOURCE_H,
      }}
    />
  );

  if (shot.kind === "card") {
    const pad = 240;
    const cardScale = (FRAME_W - pad * 2) / SOURCE_W;
    const drift = interpolate(progress, [0, 1], [1, 1.03]);
    const width = SOURCE_W * cardScale;
    const height = SOURCE_H * cardScale;

    return (
      <AbsoluteFill style={{ opacity }}>
        <Backdrop />
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              width,
              height,
              borderRadius: 26,
              overflow: "hidden",
              position: "relative",
              transform: `scale(${drift})`,
              boxShadow: colors.shadowLg,
              border: `1px solid ${colors.strokeSoft}`,
              background: colors.paper,
            }}
          >
            <div
              style={{
                position: "absolute",
                width,
                height,
                left: 0,
                top: 0,
              }}
            >
              <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top left" }}>
                {video}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const focus = lerpFocus(shot.from, shot.to, progress);
  const scale = FRAME_W / focus.w;

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", background: colors.paper }}>
      <div
        style={{
          position: "absolute",
          left: FRAME_W / 2 - focus.x * scale,
          top: FRAME_H / 2 - focus.y * scale,
          width: SOURCE_W * scale,
          height: SOURCE_H * scale,
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {video}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CaptionPill: React.FC<{ caption: Caption; durationInFrames: number }> = ({
  caption,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    fps,
    frame,
    config: { damping: 200, stiffness: 120 },
    durationInFrames: 16,
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = enter * exit;
  const translateY = interpolate(enter, [0, 1], [26, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start" }}>
      <div
        style={{
          margin: "0 0 74px 74px",
          padding: "26px 40px 28px",
          borderRadius: 26,
          background: "rgba(13, 16, 32, 0.92)",
          boxShadow: "0 30px 70px rgba(10, 12, 28, 0.35)",
          opacity,
          transform: `translateY(${translateY}px)`,
          maxWidth: 1080,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: fontFamilyBody,
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#8b84ff",
          }}
        >
          {caption.kicker}
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontFamily: fontFamilyDisplay,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.1,
            color: "#ffffff",
          }}
        >
          {caption.title}
        </p>
      </div>
    </AbsoluteFill>
  );
};

const Logo: React.FC<{ width: number }> = ({ width }) => (
  <Img src={staticFile("brand/logoSOscuro.svg")} style={{ width }} />
);

const IntroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    fps,
    frame,
    config: { damping: 200, stiffness: 110 },
    durationInFrames: 22,
  });
  const out = interpolate(frame, [INTRO - OVERLAP, INTRO], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        }}
      >
        <div style={{ opacity: enter }}>
          <Logo width={420} />
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: fontFamilyDisplay,
            fontWeight: 700,
            fontSize: 74,
            color: colors.ink,
            opacity: interpolate(frame, [8, 26], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(frame, [8, 26], [22, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })}px)`,
          }}
        >
          Give rhythm to what you feel.
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    fps,
    frame,
    config: { damping: 200, stiffness: 110 },
    durationInFrames: 20,
  });
  const appear = interpolate(frame, [0, OVERLAP], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: appear }}>
      <Backdrop />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", gap: 30 }}
      >
        <div style={{ opacity: enter, transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})` }}>
          <Logo width={380} />
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: fontFamilyDisplay,
            fontWeight: 700,
            fontSize: 62,
            color: colors.ink,
            opacity: interpolate(frame, [10, 28], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Every emotion tells a story
        </p>
        <div
          style={{
            marginTop: 8,
            padding: "22px 54px",
            borderRadius: 999,
            background: colors.ink,
            color: "#ffffff",
            fontFamily: fontFamilyBody,
            fontWeight: 700,
            fontSize: 30,
            opacity: interpolate(frame, [20, 38], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(frame, [20, 38], [18, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })}px)`,
          }}
        >
          Start writing
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

type CaptionRun = { caption: Caption; from: number; durationInFrames: number };

const captionRuns: CaptionRun[] = [];
shots.forEach((shot, index) => {
  if (!shot.caption) {
    return;
  }
  const start = shotStarts[index];
  const end = start + shot.durationInFrames;
  const current = captionRuns[captionRuns.length - 1];
  if (current && current.caption === shot.caption) {
    current.durationInFrames = end - current.from - OVERLAP;
    return;
  }
  captionRuns.push({
    caption: shot.caption,
    from: start + 6,
    durationInFrames: end - start - 6 - OVERLAP,
  });
});

export const HeroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <Sequence durationInFrames={INTRO}>
        <IntroCard />
      </Sequence>

      {shots.map((shot, index) => (
        <Sequence
          key={shot.clip}
          from={shotStarts[index]}
          durationInFrames={shot.durationInFrames}
        >
          <ClipFrame shot={shot} index={index} />
        </Sequence>
      ))}

      {captionRuns.map((run) => (
        <Sequence
          key={`${run.caption.title}-${run.from}`}
          from={run.from}
          durationInFrames={run.durationInFrames}
        >
          <CaptionPill
            caption={run.caption}
            durationInFrames={run.durationInFrames}
          />
        </Sequence>
      ))}

      <Sequence from={lastShotEnd - OVERLAP} durationInFrames={OUTRO}>
        <OutroCard />
      </Sequence>
    </AbsoluteFill>
  );
};
