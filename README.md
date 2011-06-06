Muchmala-scripts
================

CLI scripts for muchmala.

# Documentation

## generate-puzzle

Generates puzzle and adds it to queue.

    generate-puzzle [-n "Puzzle Name"] [-x <num>] [-p] [-v] <path/to/image>[ <path/to/image2>...]

    -n --name       Puzzle name. If not specified, file name will be used.
    -x --piecesize  Size of a puzzle element.
    -p --private    Flag, marks puzzle as private.
    -v --verbose    Flag, makes output verbose.
    -h --help       Prints this message

# Installation

1. Clone this project

        git clone https://github.com/muchmala/muchmala-scripts.git

2. Install

        cd muchmala-scripts

        npm install --registry http://registry.npm.muchmala.com --global