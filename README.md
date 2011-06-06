Muchmala-scripts
================

CLI scripts for muchmala.

# Documentation

## create-puzzle

Generates puzzle and adds it to queue.

    create-puzzle [-n "Puzzle Name"] [-x <num>] [-p] [-v] <path/to/image>[ <path/to/image2>...]

    -n --name       Puzzle name. If not specified, file name will be used.
    -x --piecesize  Size of a puzzle element.
    -p --private    Flag, marks puzzle as private.
    -v --verbose    Flag, makes output verbose.
    -h --help       Prints this message

# Installation

1. Install muchmala-scripts with npm globally

        [sudo] npm install muchmala-scripts --registry http://registry.npm.muchmala.com --global

2. If you need to redefine default configuration run

    2.1. Generate local config

            node scripts/config-generator.js

    2.2. Edit file `~/.muchmala_scripts_rc`

            vim ~/.muchmala_scripts_rc

