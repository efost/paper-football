# Paper Football

A browser game of American cafeteria-table paper football. Flick a folded paper triangle down a Formica table, hang it on the far edge for a touchdown, then kick through finger goalposts.

Open `index.html` in a local server (modules need HTTP):

```bash
cd ~/Projects/paper-football
python3 -m http.server 8765
```

Then visit [http://localhost:8765](http://localhost:8765).

## Rules used here

Paper football has no single league book. These rules follow the common school-table game plus the four-down tournament form used in bar and rec-league writeups (NFA-style / Monocacy tournament sheet, GameRules, Howcast, Wikipedia).

### The ball and the table

Fold a half-sheet of notebook paper into a tight triangle and tuck the tail. Players sit at opposite ends of a smooth table. The offense flicks the triangle so it **slides** — it is not thrown.

### Possession

A coin toss decides who starts. The ball begins flush on the possessing player’s edge. That player has **four downs** to score. Each flick starts from where the ball came to rest.

### Scoring

| Play | Points | How |
| --- | --- | --- |
| Touchdown | 6 | The ball **stops** with any part hanging over the opponent’s end, and the center of mass still on the table. |
| Extra point | 1 | After a touchdown, one airborne kick from midfield through the finger posts. |
| Field goal | 3 | On fourth down you may kick from the current spot instead of going for the hang. |

The extra point and field goal use the same kick: stand the triangle on a point, hold the top, and flick it through posts made by thumbs-together and index fingers up. The **center** of the ball must pass over the thumbs and between the uprights. A bounce off an upright still counts if the ball continues through the scoring window. Hitting the table first is no good.

### Turnovers

- If the ball falls off any edge, the other player starts on **their** edge.
- After four downs without a score, the opponent takes over **where the ball lies** and flicks the other way.
- After a score or a missed kick, the other player starts on their edge.

### Winning

Play first to 21, or a five-minute clock (tournament length). A timed tie is settled by alternating field goals until one player leads after an equal number of kicks.

## Physics

The slide model is a paper triangle on laminate:

- A flick is an impulse: direction of the drag, speed from pull length, plus spin from an off-center hit.
- After contact, only kinetic friction acts. Speed falls at a roughly constant rate (`a ≈ μ g`), so long flicks can hang or fall off the far edge.
- A touchdown is a statics check: part of the triangle past the end, centroid still supported. If the centroid crosses an edge, the ball tips off — the usual “almost” that falls to the floor.
- Kicks are projectiles with gravity, light air drag, and simple upright / crossbar caroms.

## Controls

- **Field:** drag through the ball toward the far end, release to flick.
- **Fourth down:** optional **Kick field goal** button.
- **Kick:** drag to set aim (left/right), loft (up), and power, then release.

Versus computer or two players at one keyboard. Sound is synthesized in the browser and can be muted.
