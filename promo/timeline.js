// Scene times (seconds) shared by the animation page and the sound design. Edit here to retime the video.
const TL = {
  total: 30,
  hook:    { start: 0.0,  snap: 1.85, pomeo: 2.4,  end: 3.45 },
  timer:   { start: 3.45, text: 3.85, end: 7.0 },
  garden:  { start: 7.0,  text: 7.7,  stages: [7.4, 8.1, 8.7, 9.25, 9.8], harvest: 10.25, sparkle: 10.95, pet: 11.35, end: 12.0 },
  boss:    { start: 12.0, text: 12.6, hit: 13.35, end: 16.0 },
  together:{ start: 16.0, text: 16.6, podium: 17.4, end: 20.0 },
  montage: { start: 20.0, step: 0.62, items: ['Harvests ★★★★★', 'Pets', 'Streaks & stats', 'Flashcards', 'Reminders', 'True Minimalist'], end: 24.0 },
  promise: { start: 24.0, badges: [24.25, 24.95, 25.5], sub: 25.9, end: 27.5 },
  end:     { start: 27.5, logo: 27.6, link: 28.1, cta: 28.5, end: 30.0 },
};
if (typeof module !== 'undefined') module.exports = TL;
