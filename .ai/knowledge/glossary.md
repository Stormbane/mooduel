# Glossary

**Round** — One step in the game: user sees 2-3 movie posters and picks one.

**Pick** — The user's selection in a round. Records the chosen movie and the alternatives.

**MovieProfile** — Running data structure representing the user's emerging taste. Contains genre weights, mood scores, era preferences, and pick history. Updated after every pick.

**Session** — One continuous play-through. Starts when the user begins playing, ends when they get a recommendation or leave. Contains all rounds/picks and the final profile.

**Convergence** — The process by which rounds become more targeted as the profile sharpens. Early rounds are exploratory; later rounds should feel like "yes, you get me."

**Exploration pick** — A deliberate wildcard in each round — a movie that doesn't match the current profile, included to prevent echo chambers and discover unexpected preferences.

**Taste profile** — Long-term preference model aggregated across multiple sessions. Distinct from MovieProfile which is per-session.

**TMDB** — The Movie Database. External API providing movie metadata, posters, genres, and discovery endpoints.

**Debug panel** — Developer/power-user overlay showing the MovieProfile data in real-time as the user plays. Visible in dev mode or toggled by the user.

**Claiming** — The act of creating an account and associating previously anonymous session data with it.
