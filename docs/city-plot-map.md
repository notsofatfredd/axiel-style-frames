# City plot map

Status: PROPOSED (G2-8, provisional). This is the layout the G2 style frames use, and it can change at G3.
Source of truth in code: `LAYOUT`, `ARCH` and `plots()` in `js/kit/city.js`.

Axes: x is east (+) and west (−). z runs into the world (more negative = further from the paper wall). y is up. One unit is about one metre.
Every rect is written `x0..x1`, `z0` (near edge) `..z1` (far edge).

## Fixed areas

| Area | x | z | Notes |
|---|---|---|---|
| Cliff lip (the ground edge above the strata) | | −6 | The city starts here |
| Main street | −8.5..8.5 | −6..−39.5 | The Cartographer's route: (0, −14) to (2, −37) |
| Fault building | −1..9 | −39..−49 | h 22, shop. Faces the street at z −39 (the empty display window and blank nameplate, G2-1) |
| Cross street | −9..−1 | −39..−49 | Between the fault building and its neighbour |
| Neighbour | −19..−9 | −39..−49 | h 20, shop. Takes the AMOS stain (SF-06) |
| Square | −8.5..16 | −49..−64 | Open, so the K10 → K11 climb has a clear corridor |
| Clearing | centre (10, −92), r 28 | | The Living Core's ground; nothing built inside r + 1 |

## Building grid

- Columns are 11.5 to 12 wide each side of the main street, out to x ±87.5.
- Rows step back from z −7.5. Up to z −64 they follow the street blocks. Past that, rows are 8 deep with a wider gap every third row, out to z −190.
- Plots that touch the main street, cross street, fault building or square are left empty. The end-row plot east of the fault building is trimmed to start at x 9.5.
- Plots with any corner or the centre within r + 1 of the clearing are left empty.

## Archetypes (every building is a website, §3.2)

| Archetype | Ground floor | Floor height | Bays | Height | Where |
|---|---|---|---|---|---|
| brochure | 4.6 | 3.4 | 3.2 wide, large windows | 18 to 22 | Near street (45%), fill |
| shop | 5.6 with arcade | 3.0 | 2.2 wide | 20 to 27 | Near street (55%), fill |
| app | 4.4 | 2.6 | 1.6 wide, tall narrow windows | 28 to 40 | Fill only (60% of fill) |

"Near street" means |x| < 22 and z > −66. Those plots sit exactly on the grid. Fill plots get a small random inset so the far city doesn't read as a grid.

The mid tier drops plots with |x| > 36 or z < −110.

## Known issue

- The K10 → K11 corridor passes close to the fault building's north-east corner (x 9, z −49, top y 22). It clears in the current keys but has little margin. Check this again when the camera spline is built at G3.
