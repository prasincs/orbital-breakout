{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20    # Node.js runtime
    nodePackages.npm    # npm package manager
  ];

  shellHook = ''
    echo "Node.js development environment ready"
    echo "Run 'npm install' to install dependencies"
    echo "Run 'npm start' to start the game"
  '';
} 