S W A R M A T I O N
===================

The multiplayer pixel formation game. Winner of the 2010 Node.js Knockout.

Arrow keys to move, "s" to lock into place, spacebar to flash with color. Move into formations with other pixels for points.


Getting Started for Developers
------------------------------

Obtain a `Secrets` file with the deployment tokens, or make an empty one:

```shell
$ touch Secrets
```

Install the dependencies for `canvas`:

```shell
$ brew install pkg-config cairo libpng jpeg giflib
```

Run it:

```shell
$ make dev
```

Visit http://localhost:3000/
