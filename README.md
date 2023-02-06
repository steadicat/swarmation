# S W A R M A T I O N

The multiplayer pixel formation game. Winner of the 2010 Node.js Knockout.

Arrow keys to move, "s" to lock into place, spacebar to flash with color. Move into formations with other pixels for points.

## Getting Started for Developers

Make sure you have the latest Node and Yarn installed.

Run it:

```shell
$ make dev
```

Visit http://localhost:3000/

## Troubleshooting

If `yarn install` fails trying to compile `canvas`, install these native dependencies:

```shell
$ brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
```
